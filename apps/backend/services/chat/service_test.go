package chat

import (
	"context"
	"errors"
	"testing"
	"time"
)

// MockRepository is a func-field mock — same pattern as
// services/result/service_test.go's MockRepository.
type MockRepository struct {
	CreateConversationFunc       func(ctx context.Context, conv *Conversation) error
	GetConversationFunc          func(ctx context.Context, id string) (*Conversation, error)
	GetOpenConversationByUIDFunc func(ctx context.Context, uid string) (*Conversation, error)
	UpdateConversationFunc       func(ctx context.Context, conv *Conversation) error
	AppendMessageFunc            func(ctx context.Context, conversationID string, msg *Message) error
	ListMessagesFunc             func(ctx context.Context, conversationID, cursor string, limit int) ([]Message, string, error)
	RecentMessagesFunc           func(ctx context.Context, conversationID string, limit int) ([]Message, error)
	CountMessagesSinceFunc       func(ctx context.Context, conversationID, role string, since time.Time) (int, error)
}

var _ RepositoryInterface = (*MockRepository)(nil)

func (m *MockRepository) CreateConversation(ctx context.Context, conv *Conversation) error {
	if m.CreateConversationFunc != nil {
		return m.CreateConversationFunc(ctx, conv)
	}
	return nil
}

func (m *MockRepository) GetConversation(ctx context.Context, id string) (*Conversation, error) {
	if m.GetConversationFunc != nil {
		return m.GetConversationFunc(ctx, id)
	}
	return nil, nil
}

func (m *MockRepository) GetOpenConversationByUID(ctx context.Context, uid string) (*Conversation, error) {
	if m.GetOpenConversationByUIDFunc != nil {
		return m.GetOpenConversationByUIDFunc(ctx, uid)
	}
	return nil, nil
}

func (m *MockRepository) UpdateConversation(ctx context.Context, conv *Conversation) error {
	if m.UpdateConversationFunc != nil {
		return m.UpdateConversationFunc(ctx, conv)
	}
	return nil
}

func (m *MockRepository) AppendMessage(ctx context.Context, conversationID string, msg *Message) error {
	if m.AppendMessageFunc != nil {
		return m.AppendMessageFunc(ctx, conversationID, msg)
	}
	return nil
}

func (m *MockRepository) ListMessages(ctx context.Context, conversationID, cursor string, limit int) ([]Message, string, error) {
	if m.ListMessagesFunc != nil {
		return m.ListMessagesFunc(ctx, conversationID, cursor, limit)
	}
	return nil, "", nil
}

func (m *MockRepository) RecentMessages(ctx context.Context, conversationID string, limit int) ([]Message, error) {
	if m.RecentMessagesFunc != nil {
		return m.RecentMessagesFunc(ctx, conversationID, limit)
	}
	return nil, nil
}

func (m *MockRepository) CountMessagesSince(ctx context.Context, conversationID, role string, since time.Time) (int, error) {
	if m.CountMessagesSinceFunc != nil {
		return m.CountMessagesSinceFunc(ctx, conversationID, role, since)
	}
	return 0, nil
}

// stubModelClient is a controllable modelClient for engine/service tests.
type stubModelClient struct {
	reply    string
	escalate bool
	reason   string
	err      error
	calls    int
}

func (m *stubModelClient) Generate(_ context.Context, _ string, _ []Turn) (string, bool, string, error) {
	m.calls++
	if m.err != nil {
		return "", false, "", m.err
	}
	return m.reply, m.escalate, m.reason, nil
}

// mockSlack records escalation calls without hitting the network.
type mockSlack struct {
	calls int
	last  EscalationCard
}

func (m *mockSlack) SendEscalation(_ context.Context, card EscalationCard) {
	m.calls++
	m.last = card
}

func engineWithStub(reply string, escalate bool, reason string) *Engine {
	return NewEngine(&stubModelClient{reply: reply, escalate: escalate, reason: reason}, "system prompt")
}

// UT-001: Start conversation — new.
func TestServiceStartConversationNew(t *testing.T) {
	var created *Conversation
	var appended []*Message
	mock := &MockRepository{
		GetOpenConversationByUIDFunc: func(_ context.Context, _ string) (*Conversation, error) {
			return nil, nil
		},
		CreateConversationFunc: func(_ context.Context, conv *Conversation) error {
			created = conv
			return nil
		},
		AppendMessageFunc: func(_ context.Context, _ string, msg *Message) error {
			appended = append(appended, msg)
			return nil
		},
		RecentMessagesFunc: func(_ context.Context, _ string, _ int) ([]Message, error) {
			return nil, nil
		},
	}
	svc := NewService(mock, engineWithStub("Hello! How can I help?", false, ""), nil)

	conv, customerMsg, botMsg, err := svc.StartConversation(context.Background(), "uid-1", ChannelWebApp, "en", "Hi there")
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if conv.Status != StatusBot {
		t.Errorf("status = %s, want bot", conv.Status)
	}
	if created == nil || created.ID != conv.ID {
		t.Fatal("conversation was not created via repo")
	}
	if customerMsg == nil || customerMsg.Role != RoleCustomer {
		t.Fatal("customer message not stored")
	}
	if botMsg == nil || botMsg.Role != RoleBot || botMsg.Text != "Hello! How can I help?" {
		t.Fatalf("bot reply = %+v, want stored reply text", botMsg)
	}
	if len(appended) != 2 {
		t.Fatalf("appended messages = %d, want 2 (customer + bot)", len(appended))
	}
}

// UT-002: Start conversation — reuse open.
func TestServiceStartConversationReuseOpen(t *testing.T) {
	existing := &Conversation{ID: "conv-1", UserID: "uid-1", Status: StatusBot, Channel: ChannelWebApp}
	var createCalls int
	var appended []*Message
	mock := &MockRepository{
		GetOpenConversationByUIDFunc: func(_ context.Context, _ string) (*Conversation, error) {
			return existing, nil
		},
		CreateConversationFunc: func(_ context.Context, _ *Conversation) error {
			createCalls++
			return nil
		},
		AppendMessageFunc: func(_ context.Context, _ string, msg *Message) error {
			appended = append(appended, msg)
			return nil
		},
	}
	svc := NewService(mock, engineWithStub("reply", false, ""), nil)

	conv, _, _, err := svc.StartConversation(context.Background(), "uid-1", ChannelWebApp, "en", "second message")
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if conv.ID != "conv-1" {
		t.Errorf("conversation id = %s, want reused conv-1", conv.ID)
	}
	if createCalls != 0 {
		t.Errorf("CreateConversation called %d times, want 0 (reuse)", createCalls)
	}
	if len(appended) != 2 {
		t.Fatalf("appended messages = %d, want 2", len(appended))
	}
}

// UT-003: Send message — bot replies.
func TestServiceSendCustomerMessageBotReplies(t *testing.T) {
	conv := &Conversation{ID: "conv-1", UserID: "uid-1", Status: StatusBot, Channel: ChannelWebApp}
	mock := &MockRepository{
		GetConversationFunc: func(_ context.Context, id string) (*Conversation, error) {
			return conv, nil
		},
	}
	svc := NewService(mock, engineWithStub("bot answer", false, ""), nil)

	_, customerMsg, botMsg, err := svc.SendCustomerMessage(context.Background(), "uid-1", "conv-1", "question")
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if customerMsg.Role != RoleCustomer {
		t.Errorf("customer message role = %s", customerMsg.Role)
	}
	if botMsg == nil || botMsg.Text != "bot answer" {
		t.Fatalf("bot reply = %+v, want 'bot answer'", botMsg)
	}
}

// UT-004: Send message — escalated, no AI.
func TestServiceSendCustomerMessageEscalatedNoAI(t *testing.T) {
	conv := &Conversation{ID: "conv-1", UserID: "uid-1", Status: StatusEscalated, Channel: ChannelWebApp}
	engineCalls := &stubModelClient{}
	mock := &MockRepository{
		GetConversationFunc: func(_ context.Context, id string) (*Conversation, error) {
			return conv, nil
		},
	}
	svc := NewService(mock, NewEngine(engineCalls, "system"), nil)

	_, customerMsg, botMsg, err := svc.SendCustomerMessage(context.Background(), "uid-1", "conv-1", "still need help")
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if customerMsg == nil {
		t.Fatal("customer message not stored")
	}
	if botMsg != nil {
		t.Errorf("bot reply = %+v, want nil (no AI once escalated)", botMsg)
	}
	if engineCalls.calls != 0 {
		t.Errorf("engine.Generate called %d times, want 0", engineCalls.calls)
	}
}

// UT-005: Send message — not owner.
func TestServiceSendCustomerMessageNotOwner(t *testing.T) {
	conv := &Conversation{ID: "conv-1", UserID: "owner-uid", Status: StatusBot, Channel: ChannelWebApp}
	mock := &MockRepository{
		GetConversationFunc: func(_ context.Context, id string) (*Conversation, error) {
			return conv, nil
		},
	}
	svc := NewService(mock, engineWithStub("reply", false, ""), nil)

	_, _, _, err := svc.SendCustomerMessage(context.Background(), "intruder", "conv-1", "hello")
	if !errors.Is(err, ErrConversationNotFound) {
		t.Fatalf("error = %v, want ErrConversationNotFound", err)
	}
}

// UT-006: Send message — closed conversation starts a new one transparently.
func TestServiceSendCustomerMessageClosedStartsNew(t *testing.T) {
	closedConv := &Conversation{ID: "conv-old", UserID: "uid-1", Status: StatusClosed, Channel: ChannelWebApp}
	var createdIDs []string
	mock := &MockRepository{
		GetConversationFunc: func(_ context.Context, id string) (*Conversation, error) {
			return closedConv, nil
		},
		GetOpenConversationByUIDFunc: func(_ context.Context, _ string) (*Conversation, error) {
			return nil, nil // no open conversation -> StartConversation creates a new one
		},
		CreateConversationFunc: func(_ context.Context, conv *Conversation) error {
			createdIDs = append(createdIDs, conv.ID)
			return nil
		},
	}
	svc := NewService(mock, engineWithStub("reply", false, ""), nil)

	newConv, customerMsg, _, err := svc.SendCustomerMessage(context.Background(), "uid-1", "conv-old", "hello again")
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if len(createdIDs) != 1 {
		t.Fatalf("CreateConversation called %d times, want 1 (transparent restart)", len(createdIDs))
	}
	if newConv.ID == "conv-old" {
		t.Error("expected a brand-new conversation ID, got the closed one")
	}
	if customerMsg == nil {
		t.Fatal("customer message not stored on the new conversation")
	}
}

// UT-007: Send message — too long.
func TestServiceSendCustomerMessageTooLong(t *testing.T) {
	svc := NewService(&MockRepository{}, engineWithStub("reply", false, ""), nil)

	longText := make([]rune, 4001)
	for i := range longText {
		longText[i] = 'a'
	}

	_, _, _, err := svc.SendCustomerMessage(context.Background(), "uid-1", "conv-1", string(longText))
	if !errors.Is(err, ErrMessageTooLong) {
		t.Fatalf("error = %v, want ErrMessageTooLong", err)
	}
}

// UT-008: List messages — pagination.
func TestServiceListMessagesPagination(t *testing.T) {
	all := make([]Message, 60)
	for i := range all {
		all[i] = Message{ID: string(rune('a' + i%26)), Role: RoleCustomer, Text: "msg"}
	}

	conv := &Conversation{ID: "conv-1", UserID: "uid-1"}
	mock := &MockRepository{
		GetConversationFunc: func(_ context.Context, _ string) (*Conversation, error) {
			return conv, nil
		},
		ListMessagesFunc: func(_ context.Context, _ string, cursor string, limit int) ([]Message, string, error) {
			start := 0
			if cursor == "page2" {
				start = 50
			}
			end := start + limit
			if end > len(all) {
				end = len(all)
			}
			next := ""
			if end < len(all) {
				next = "page2"
			}
			return all[start:end], next, nil
		},
	}
	svc := NewService(mock, nil, nil)

	page1, cursor1, err := svc.ListMessages(context.Background(), "uid-1", "conv-1", "", 50)
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if len(page1) != 50 {
		t.Fatalf("page1 len = %d, want 50", len(page1))
	}
	if cursor1 != "page2" {
		t.Fatalf("cursor1 = %s, want page2", cursor1)
	}

	page2, cursor2, err := svc.ListMessages(context.Background(), "uid-1", "conv-1", cursor1, 50)
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if len(page2) != 10 {
		t.Fatalf("page2 len = %d, want 10", len(page2))
	}
	if cursor2 != "" {
		t.Fatalf("cursor2 = %q, want empty (no more pages)", cursor2)
	}
}

// UT-009: Escalate — sets status + idempotent (single Slack alert).
func TestServiceEscalateIdempotent(t *testing.T) {
	conv := &Conversation{ID: "conv-1", UserID: "uid-1", Status: StatusBot, Channel: ChannelWebApp}
	mock := &MockRepository{
		GetConversationFunc: func(_ context.Context, _ string) (*Conversation, error) {
			return conv, nil
		},
		UpdateConversationFunc: func(_ context.Context, updated *Conversation) error {
			conv = updated
			return nil
		},
	}
	slack := &mockSlack{}
	svc := NewService(mock, nil, slack)

	if err := svc.Escalate(context.Background(), "conv-1", "customer asked for a human"); err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if conv.Status != StatusEscalated {
		t.Fatalf("status = %s, want escalated", conv.Status)
	}
	if conv.EscalatedAt == nil {
		t.Fatal("escalatedAt not set")
	}
	if slack.calls != 1 {
		t.Fatalf("slack calls = %d, want 1", slack.calls)
	}

	// Calling again must not duplicate the Slack alert.
	if err := svc.Escalate(context.Background(), "conv-1", "customer asked again"); err != nil {
		t.Fatalf("unexpected error on second escalate: %v", err)
	}
	if slack.calls != 1 {
		t.Fatalf("slack calls after second escalate = %d, want still 1 (idempotent)", slack.calls)
	}
}

// UT-010: Status transitions — legal/illegal.
func TestServiceUpdateStatusTransitions(t *testing.T) {
	tests := []struct {
		name    string
		from    string
		to      string
		wantErr error
	}{
		{name: "bot to escalated is legal", from: StatusBot, to: StatusEscalated},
		{name: "bot to closed is legal", from: StatusBot, to: StatusClosed},
		{name: "bot to human is illegal", from: StatusBot, to: StatusHuman, wantErr: ErrInvalidTransition},
		{name: "escalated to human is legal", from: StatusEscalated, to: StatusHuman},
		{name: "escalated to bot is illegal", from: StatusEscalated, to: StatusBot, wantErr: ErrInvalidTransition},
		{name: "human to bot is legal (hand-back)", from: StatusHuman, to: StatusBot},
		{name: "human to closed is legal", from: StatusHuman, to: StatusClosed},
		{name: "closed to bot is illegal", from: StatusClosed, to: StatusBot, wantErr: ErrInvalidTransition},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			conv := &Conversation{ID: "conv-1", Status: tt.from}
			mock := &MockRepository{
				GetConversationFunc: func(_ context.Context, _ string) (*Conversation, error) {
					return conv, nil
				},
				UpdateConversationFunc: func(_ context.Context, updated *Conversation) error {
					conv = updated
					return nil
				},
			}
			svc := NewService(mock, nil, nil)

			err := svc.UpdateStatus(context.Background(), "agent-1", "conv-1", tt.to)
			if tt.wantErr != nil {
				if !errors.Is(err, tt.wantErr) {
					t.Fatalf("error = %v, want %v", err, tt.wantErr)
				}
				return
			}
			if err != nil {
				t.Fatalf("unexpected error: %v", err)
			}
			if conv.Status != tt.to {
				t.Errorf("status = %s, want %s", conv.Status, tt.to)
			}
		})
	}
}

// UT-011: Rate limit — msg burst.
func TestServiceSendCustomerMessageRateLimited(t *testing.T) {
	conv := &Conversation{ID: "conv-1", UserID: "uid-1", Status: StatusBot, Channel: ChannelWebApp}
	mock := &MockRepository{
		GetConversationFunc: func(_ context.Context, _ string) (*Conversation, error) {
			return conv, nil
		},
		CountMessagesSinceFunc: func(_ context.Context, _ string, _ string, _ time.Time) (int, error) {
			return 10, nil // already at the 10 msg/min cap
		},
	}
	svc := NewService(mock, engineWithStub("reply", false, ""), nil)

	_, _, _, err := svc.SendCustomerMessage(context.Background(), "uid-1", "conv-1", "11th message")
	if !errors.Is(err, ErrRateLimited) {
		t.Fatalf("error = %v, want ErrRateLimited", err)
	}
}

func TestServiceGetOpenConversationByUIDNone(t *testing.T) {
	mock := &MockRepository{
		GetOpenConversationByUIDFunc: func(_ context.Context, _ string) (*Conversation, error) {
			return nil, nil
		},
	}
	svc := NewService(mock, nil, nil)

	conv, err := svc.GetOpenConversationByUID(context.Background(), "uid-1")
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if conv != nil {
		t.Fatalf("conv = %+v, want nil", conv)
	}
}

func TestServiceEscalateNotFound(t *testing.T) {
	mock := &MockRepository{
		GetConversationFunc: func(_ context.Context, _ string) (*Conversation, error) {
			return nil, nil
		},
	}
	svc := NewService(mock, nil, nil)

	err := svc.Escalate(context.Background(), "missing", "reason")
	if !errors.Is(err, ErrConversationNotFound) {
		t.Fatalf("error = %v, want ErrConversationNotFound", err)
	}
}
