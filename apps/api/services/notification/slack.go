package notification

import (
	"bytes"
	"context"
	"encoding/json"
	"fmt"
	"net/http"
	"time"
)

// SlackClient sends messages to Slack via Incoming Webhooks.
type SlackClient struct {
	httpClient *http.Client
}

func NewSlackClient() *SlackClient {
	return &SlackClient{
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

// SendRegistration posts a registration notification to Slack.
func (s *SlackClient) SendRegistration(ctx context.Context, webhookURL, companyName, contactName, industryType string) error {
	msg := slackMessage{
		Text: fmt.Sprintf("New registration: %s", companyName),
		Blocks: []slackBlock{
			{
				Type: "section",
				Text: &slackText{
					Type: "mrkdwn",
					Text: fmt.Sprintf("*New Registration*\n• Company: %s\n• Contact: %s\n• Industry: %s\n• Time: %s",
						companyName, contactName, industryType, time.Now().UTC().Format(time.RFC3339)),
				},
			},
		},
	}
	return s.post(ctx, webhookURL, msg)
}

// SendQuizResult posts a quiz result notification to Slack.
func (s *SlackClient) SendQuizResult(ctx context.Context, webhookURL, companyName string, score float64, diagnosis string) error {
	msg := slackMessage{
		Text: fmt.Sprintf("Quiz result: %s — %.2f (%s)", companyName, score, diagnosis),
		Blocks: []slackBlock{
			{
				Type: "section",
				Text: &slackText{
					Type: "mrkdwn",
					Text: fmt.Sprintf("*Quiz Result Submitted*\n• Company: %s\n• Score: %.2f / 5.00\n• Diagnosis: %s\n• Time: %s",
						companyName, score, diagnosis, time.Now().UTC().Format(time.RFC3339)),
				},
			},
		},
	}
	return s.post(ctx, webhookURL, msg)
}

func (s *SlackClient) post(ctx context.Context, webhookURL string, msg slackMessage) error {
	if webhookURL == "" {
		return nil // skip if not configured
	}

	body, err := json.Marshal(msg)
	if err != nil {
		return fmt.Errorf("marshal slack message: %w", err)
	}

	req, err := http.NewRequestWithContext(ctx, http.MethodPost, webhookURL, bytes.NewReader(body))
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
