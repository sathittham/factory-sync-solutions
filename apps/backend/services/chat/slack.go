package chat

import (
	"bytes"
	"context"
	"encoding/json"
	"fmt"
	"log/slog"
	"net/http"
	"os"
	"time"
)

const slackPreviewMaxChars = 200

// EscalationCard is the data rendered into the Phase-1 Slack escalation
// notification (SDD §3.3 slack.go).
type EscalationCard struct {
	ConversationID string
	Channel        string
	CustomerLabel  string
	LastMessage    string
	Reason         string
}

// SlackClient posts Phase-1 escalation cards to the support Slack channel via
// an incoming webhook. Mirrors services/notification/slack.go's style
// (block-kit body, 5s timeout, skip-if-not-configured).
type SlackClient struct {
	webhookURL string
	httpClient *http.Client
}

// NewSlackClientFromEnv builds a SlackClient reading SLACK_WEBHOOK_SUPPORT.
// Always returns a non-nil client — SendEscalation is a no-op when the
// webhook URL is unset, matching notification.SlackClient's convention.
func NewSlackClientFromEnv() *SlackClient {
	return &SlackClient{
		webhookURL: os.Getenv("SLACK_WEBHOOK_SUPPORT"),
		httpClient: &http.Client{Timeout: 5 * time.Second},
	}
}

type slackMessage struct {
	Text   string       `json:"text"`
	Blocks []slackBlock `json:"blocks,omitempty"`
}

type slackBlock struct {
	Type string     `json:"type"`
	Text *slackText `json:"text,omitempty"`
}

type slackText struct {
	Type string `json:"type"`
	Text string `json:"text"`
}

// SendEscalation posts an escalation card. Fire-and-forget: failures are
// logged, never returned to the caller (FR-010).
func (s *SlackClient) SendEscalation(ctx context.Context, card EscalationCard) {
	if s == nil || s.webhookURL == "" {
		return
	}

	msg := slackMessage{
		Text: fmt.Sprintf("Chat escalated to human support: %s", card.CustomerLabel),
		Blocks: []slackBlock{
			{
				Type: "section",
				Text: &slackText{
					Type: "mrkdwn",
					Text: fmt.Sprintf(
						"*Chat Escalated to Human Support*\n• Customer: %s\n• Channel: %s\n• Conversation: %s\n• Reason: %s\n• Last message: %s\n• Time: %s",
						card.CustomerLabel,
						card.Channel,
						card.ConversationID,
						card.Reason,
						truncate(card.LastMessage, slackPreviewMaxChars),
						time.Now().UTC().Format(time.RFC3339),
					),
				},
			},
		},
	}

	if err := s.post(ctx, msg); err != nil {
		slog.Error("slack chat escalation notification failed", "error", err.Error(), "conversationID", card.ConversationID)
	}
}

func (s *SlackClient) post(ctx context.Context, msg slackMessage) error {
	body, err := json.Marshal(msg)
	if err != nil {
		return fmt.Errorf("marshal slack message: %w", err)
	}

	req, err := http.NewRequestWithContext(ctx, http.MethodPost, s.webhookURL, bytes.NewReader(body))
	if err != nil {
		return fmt.Errorf("create slack request: %w", err)
	}
	req.Header.Set("Content-Type", "application/json")

	resp, err := s.httpClient.Do(req)
	if err != nil {
		return fmt.Errorf("slack request: %w", err)
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		return fmt.Errorf("slack returned status %d", resp.StatusCode)
	}
	return nil
}

func truncate(s string, n int) string {
	r := []rune(s)
	if len(r) <= n {
		return s
	}
	return string(r[:n]) + "…"
}
