package chat

import (
	"context"
	"errors"
	"fmt"
	"time"

	"github.com/google/uuid"
)

// Sentinel errors — SDD §3.1.2.
var (
	ErrConversationNotFound  = errors.New("conversation not found")
	ErrConversationClosed    = errors.New("conversation closed")
	ErrMessageTooLong        = errors.New("message too long")
	ErrInvalidTransition     = errors.New("invalid status transition")
	ErrChannelDeliveryFailed = errors.New("channel delivery failed")
	// ErrRateLimited is not listed in the SDD's sentinel table but is
	// required to distinguish 429 from other 400s at the handler (NFR-4.2).
	ErrRateLimited = errors.New("message rate limit exceeded")
)

const (
	maxMessageLength  = 4000
	rateLimitWindow   = time.Minute
	rateLimitMaxMsgs  = 10
	historyFetchLimit = 40
	previewMaxChars   = 200
)

// validTransitions encodes the status machine: bot -> escalated -> human ->
// closed; human -> bot (hand-back); * -> closed.
var validTransitions = map[string]map[string]bool{
	StatusBot:       {StatusEscalated: true, StatusClosed: true},
	StatusEscalated: {StatusHuman: true, StatusClosed: true},
	StatusHuman:     {StatusBot: true, StatusClosed: true},
	StatusClosed:    {},
}

// SlackNotifier sends the Phase-1 escalation card. Implemented by
// *SlackClient (slack.go).
type SlackNotifier interface {
	SendEscalation(ctx context.Context, card EscalationCard)
}

type Service struct {
	repo   RepositoryInterface
	engine *Engine
	slack  SlackNotifier
}

// NewService builds the chat Service. engine and slack may be nil — both
// degrade gracefully (nil engine -> canned fallback; nil slack -> no alert).
func NewService(repo RepositoryInterface, engine *Engine, slack SlackNotifier) *Service {
	return &Service{repo: repo, engine: engine, slack: slack}
}

// StartConversation creates (or reuses an existing open) conversation for the
// uid, stores the first message, and runs the AI engine for a bot reply.
func (s *Service) StartConversation(ctx context.Context, uid, channel, locale, text string) (*Conversation, *Message, *Message, error) {
	if err := validateMessageText(text); err != nil {
		return nil, nil, nil, err
	}
	if channel == "" {
		channel = ChannelWebApp
	}

	existing, err := s.repo.GetOpenConversationByUID(ctx, uid)
	if err != nil {
		return nil, nil, nil, fmt.Errorf("get open conversation for uid %s: %w", uid, err)
	}
	if existing != nil {
		conv, customerMsg, botMsg, err := s.appendCustomerMessage(ctx, existing, text)
		if err != nil {
			return nil, nil, nil, fmt.Errorf("start conversation (reuse existing): %w", err)
		}
		return conv, customerMsg, botMsg, nil
	}

	conv := &Conversation{
		ID:        uuid.New().String(),
		Channel:   channel,
		UserID:    uid,
		Status:    StatusBot,
		Locale:    locale,
		CreatedAt: time.Now().UTC(),
	}
	if err := s.repo.CreateConversation(ctx, conv); err != nil {
		return nil, nil, nil, fmt.Errorf("create conversation: %w", err)
	}

	conv, customerMsg, botMsg, err := s.appendCustomerMessage(ctx, conv, text)
	if err != nil {
		return nil, nil, nil, fmt.Errorf("start conversation: %w", err)
	}
	return conv, customerMsg, botMsg, nil
}

// GetOpenConversationByUID returns the caller's open (non-closed)
// conversation, if any. A nil conversation with a nil error means none exists
// (used by GET .../current, which maps that to 404 at the handler).
func (s *Service) GetOpenConversationByUID(ctx context.Context, uid string) (*Conversation, error) {
	conv, err := s.repo.GetOpenConversationByUID(ctx, uid)
	if err != nil {
		return nil, fmt.Errorf("get open conversation for uid %s: %w", uid, err)
	}
	return conv, nil
}

// SendCustomerMessage stores a customer message on an existing conversation
// and, while status is "bot", runs the AI engine for a reply.
//
// Deviation from the SDD's listed signature `(*Message, *Message, error)`:
// this also returns the *Conversation so the handler can surface the new
// conversationID when a closed conversation is transparently restarted
// (FR-004) — the caller has no other way to learn the new ID.
func (s *Service) SendCustomerMessage(ctx context.Context, uid, conversationID, text string) (*Conversation, *Message, *Message, error) {
	if err := validateMessageText(text); err != nil {
		return nil, nil, nil, err
	}

	conv, err := s.repo.GetConversation(ctx, conversationID)
	if err != nil {
		return nil, nil, nil, fmt.Errorf("get conversation %s: %w", conversationID, err)
	}
	if conv == nil || conv.UserID != uid {
		return nil, nil, nil, ErrConversationNotFound
	}

	if conv.Status == StatusClosed {
		// FR-004: closed conversations transparently start a new one.
		newConv, customerMsg, botMsg, err := s.StartConversation(ctx, uid, conv.Channel, conv.Locale, text)
		if err != nil {
			return nil, nil, nil, fmt.Errorf("restart closed conversation %s: %w", conversationID, err)
		}
		return newConv, customerMsg, botMsg, nil
	}

	if err := s.checkRateLimit(ctx, conv.ID); err != nil {
		return nil, nil, nil, err
	}

	if conv.Status != StatusBot {
		// FR-007: no AI reply once escalated/human — store & relay only.
		msg, err := s.storeCustomerMessageOnly(ctx, conv, text)
		if err != nil {
			return nil, nil, nil, fmt.Errorf("send customer message: %w", err)
		}
		return conv, msg, nil, nil
	}

	conv, customerMsg, botMsg, err := s.appendCustomerMessage(ctx, conv, text)
	if err != nil {
		return nil, nil, nil, fmt.Errorf("send customer message: %w", err)
	}
	return conv, customerMsg, botMsg, nil
}

// ListMessages returns a customer's own conversation history, ordered
// chronologically, with a cursor for incremental polling.
func (s *Service) ListMessages(ctx context.Context, uid, conversationID, cursor string, limit int) ([]Message, string, error) {
	conv, err := s.repo.GetConversation(ctx, conversationID)
	if err != nil {
		return nil, "", fmt.Errorf("get conversation %s: %w", conversationID, err)
	}
	if conv == nil || conv.UserID != uid {
		return nil, "", ErrConversationNotFound
	}
	if limit <= 0 {
		limit = 50
	}

	messages, nextCursor, err := s.repo.ListMessages(ctx, conversationID, cursor, limit)
	if err != nil {
		return nil, "", fmt.Errorf("list messages for conversation %s: %w", conversationID, err)
	}
	return messages, nextCursor, nil
}

// Escalate transitions a conversation to "escalated" and fires a single
// Slack alert. Idempotent: calling it again on an already
// escalated/human conversation is a no-op (no duplicate alert) — FR-006.
func (s *Service) Escalate(ctx context.Context, conversationID, reason string) error {
	conv, err := s.repo.GetConversation(ctx, conversationID)
	if err != nil {
		return fmt.Errorf("get conversation %s: %w", conversationID, err)
	}
	if conv == nil {
		return fmt.Errorf("escalate conversation %s: %w", conversationID, ErrConversationNotFound)
	}

	changed := escalateFields(conv, time.Now().UTC())
	if err := s.repo.UpdateConversation(ctx, conv); err != nil {
		return fmt.Errorf("update conversation %s: %w", conversationID, err)
	}
	if changed {
		s.notifySlackEscalation(ctx, conv, reason)
	}
	return nil
}

// UpdateStatus validates and applies a status transition (bot/backoffice use
// — the handler for this is wired in Phase 2, but the service logic and its
// tests land in Phase 1 per the SDD).
func (s *Service) UpdateStatus(ctx context.Context, agentUID, conversationID, newStatus string) error {
	conv, err := s.repo.GetConversation(ctx, conversationID)
	if err != nil {
		return fmt.Errorf("get conversation %s: %w", conversationID, err)
	}
	if conv == nil {
		return fmt.Errorf("update status for conversation %s: %w", conversationID, ErrConversationNotFound)
	}
	if conv.Status == newStatus {
		return nil
	}
	if !validTransitions[conv.Status][newStatus] {
		return ErrInvalidTransition
	}

	now := time.Now().UTC()
	conv.Status = newStatus
	switch newStatus {
	case StatusHuman:
		conv.AgentUID = agentUID
	case StatusEscalated:
		conv.EscalatedAt = &now
	case StatusClosed:
		conv.ClosedAt = &now
	}

	if err := s.repo.UpdateConversation(ctx, conv); err != nil {
		return fmt.Errorf("update conversation %s status: %w", conversationID, err)
	}
	return nil
}

// --- internal helpers ---

// appendCustomerMessage stores the customer message, runs the AI engine when
// status is "bot", stores any bot reply, and persists conversation metadata
// (lastMessageAt/preview/messageCount, and escalation if triggered) in a
// single final write.
func (s *Service) appendCustomerMessage(ctx context.Context, conv *Conversation, text string) (*Conversation, *Message, *Message, error) {
	now := time.Now().UTC()
	customerMsg := &Message{
		ID:        uuid.New().String(),
		Role:      RoleCustomer,
		Text:      text,
		SenderID:  conv.UserID,
		CreatedAt: now,
	}
	if err := s.repo.AppendMessage(ctx, conv.ID, customerMsg); err != nil {
		return nil, nil, nil, fmt.Errorf("append customer message: %w", err)
	}
	conv.LastMessageAt = now
	conv.LastMessagePreview = previewText(text)
	conv.MessageCount++

	var botMsg *Message
	var escalateReason string
	escalatedJustNow := false

	if conv.Status == StatusBot {
		history, err := s.repo.RecentMessages(ctx, conv.ID, historyFetchLimit)
		if err != nil {
			return nil, nil, nil, fmt.Errorf("load conversation history: %w", err)
		}

		replyText, escalate, reason := s.engine.Reply(ctx, toTurns(history), text)
		if escalate {
			escalatedJustNow = escalateFields(conv, time.Now().UTC())
			escalateReason = reason
		}

		if replyText != "" {
			botMsg = &Message{
				ID:        uuid.New().String(),
				Role:      RoleBot,
				Text:      replyText,
				SenderID:  "bot",
				CreatedAt: time.Now().UTC(),
			}
			if err := s.repo.AppendMessage(ctx, conv.ID, botMsg); err != nil {
				return nil, nil, nil, fmt.Errorf("append bot message: %w", err)
			}
			conv.LastMessageAt = botMsg.CreatedAt
			conv.LastMessagePreview = previewText(botMsg.Text)
			conv.MessageCount++
		}
	}

	if err := s.repo.UpdateConversation(ctx, conv); err != nil {
		return nil, nil, nil, fmt.Errorf("update conversation %s: %w", conv.ID, err)
	}
	if escalatedJustNow {
		s.notifySlackEscalation(ctx, conv, escalateReason)
	}

	return conv, customerMsg, botMsg, nil
}

// storeCustomerMessageOnly stores a customer message with no AI reply — used
// once a conversation has left "bot" status (FR-007).
func (s *Service) storeCustomerMessageOnly(ctx context.Context, conv *Conversation, text string) (*Message, error) {
	now := time.Now().UTC()
	msg := &Message{
		ID:        uuid.New().String(),
		Role:      RoleCustomer,
		Text:      text,
		SenderID:  conv.UserID,
		CreatedAt: now,
	}
	if err := s.repo.AppendMessage(ctx, conv.ID, msg); err != nil {
		return nil, fmt.Errorf("append customer message: %w", err)
	}
	conv.LastMessageAt = now
	conv.LastMessagePreview = previewText(text)
	conv.MessageCount++
	if err := s.repo.UpdateConversation(ctx, conv); err != nil {
		return nil, fmt.Errorf("update conversation %s: %w", conv.ID, err)
	}
	return msg, nil
}

func (s *Service) checkRateLimit(ctx context.Context, conversationID string) error {
	since := time.Now().UTC().Add(-rateLimitWindow)
	count, err := s.repo.CountMessagesSince(ctx, conversationID, RoleCustomer, since)
	if err != nil {
		return fmt.Errorf("check rate limit for conversation %s: %w", conversationID, err)
	}
	if count >= rateLimitMaxMsgs {
		return ErrRateLimited
	}
	return nil
}

func (s *Service) notifySlackEscalation(ctx context.Context, conv *Conversation, reason string) {
	if s.slack == nil {
		return
	}
	s.slack.SendEscalation(ctx, EscalationCard{
		ConversationID: conv.ID,
		Channel:        conv.Channel,
		CustomerLabel:  customerLabel(conv),
		LastMessage:    conv.LastMessagePreview,
		Reason:         reason,
	})
}

// escalateFields mutates conv in place to reflect escalation. Returns false
// (no-op) if the conversation is already escalated or already handed off to
// a human — the caller uses this to avoid a duplicate Slack alert.
func escalateFields(conv *Conversation, now time.Time) bool {
	if conv.Status == StatusEscalated || conv.Status == StatusHuman {
		return false
	}
	conv.Status = StatusEscalated
	conv.EscalatedAt = &now
	return true
}

func customerLabel(conv *Conversation) string {
	if conv.Channel == ChannelWebOfficial {
		return "Visitor"
	}
	return fmt.Sprintf("User %s", conv.UserID)
}

func validateMessageText(text string) error {
	if len([]rune(text)) > maxMessageLength {
		return ErrMessageTooLong
	}
	return nil
}

func previewText(text string) string {
	r := []rune(text)
	if len(r) <= previewMaxChars {
		return text
	}
	return string(r[:previewMaxChars]) + "…"
}

func toTurns(messages []Message) []Turn {
	turns := make([]Turn, 0, len(messages))
	for _, m := range messages {
		role := TurnRoleModel
		if m.Role == RoleCustomer {
			role = TurnRoleUser
		}
		turns = append(turns, Turn{Role: role, Text: m.Text})
	}
	return turns
}
