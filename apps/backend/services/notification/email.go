package notification

import (
	"bytes"
	"context"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"time"

	"github.com/sathittham/factory-sync-solutions/apps/backend/services/scoring"
)

const (
	cloudflareAPIBaseURL = "https://api.cloudflare.com/client/v4"
	maxEmailSendAttempts = 3
)

// EmailSender sends the transactional emails FactorySync produces. Defined as an
// interface so the notification Service can be tested with a mock and the
// provider can be swapped without touching callers.
type EmailSender interface {
	SendResult(ctx context.Context, to, contactName, companyName string, overallScore float64, diagnosis string, scores []scoring.DimensionScore, strengths, weaknesses []string) error
	SendInvitation(ctx context.Context, to, inviterEmail, companyName, role string, expiresAt time.Time, link string) error
}

// EmailClient sends emails via the Cloudflare Email Sending REST API.
type EmailClient struct {
	httpClient *http.Client
	baseURL    string
	accountID  string
	apiToken   string
	from       string
}

// NewEmailClient builds a Cloudflare Email Sending client. from is the sender in
// "Name <address@domain>" form; its domain must be onboarded to Email Sending.
func NewEmailClient(accountID, apiToken, from string) *EmailClient {
	return &EmailClient{
		httpClient: &http.Client{Timeout: 10 * time.Second},
		baseURL:    cloudflareAPIBaseURL,
		accountID:  accountID,
		apiToken:   apiToken,
		from:       from,
	}
}

type cfEmailRequest struct {
	From    string   `json:"from"`
	To      []string `json:"to"`
	Subject string   `json:"subject"`
	HTML    string   `json:"html"`
}

type cfEmailError struct {
	Code    int    `json:"code"`
	Message string `json:"message"`
}

type cfEmailResponse struct {
	Success bool           `json:"success"`
	Errors  []cfEmailError `json:"errors"`
}

// send posts a single transactional email through Cloudflare Email Sending,
// retrying only on rate-limit (429) and server (5xx) responses.
func (e *EmailClient) send(ctx context.Context, to []string, subject, html string) error {
	payload, err := json.Marshal(cfEmailRequest{From: e.from, To: to, Subject: subject, HTML: html})
	if err != nil {
		return fmt.Errorf("marshal cloudflare email request: %w", err)
	}
	url := fmt.Sprintf("%s/accounts/%s/email/sending/send", e.baseURL, e.accountID)

	var lastErr error
	for attempt := 1; attempt <= maxEmailSendAttempts; attempt++ {
		status, body, err := e.doSend(ctx, url, payload)
		switch {
		case err != nil:
			lastErr = fmt.Errorf("cloudflare email send: %w", err)
		case status == http.StatusOK:
			var parsed cfEmailResponse
			if err := json.Unmarshal(body, &parsed); err != nil {
				return fmt.Errorf("decode cloudflare email response: %w", err)
			}
			if !parsed.Success {
				return fmt.Errorf("cloudflare email send failed: %s", cfErrorMessage(parsed.Errors))
			}
			return nil
		case status == http.StatusTooManyRequests || status >= http.StatusInternalServerError:
			lastErr = fmt.Errorf("cloudflare email send: retryable status %d: %s", status, bytes.TrimSpace(body))
		default:
			return fmt.Errorf("cloudflare email send: status %d: %s", status, bytes.TrimSpace(body))
		}

		if attempt < maxEmailSendAttempts {
			select {
			case <-ctx.Done():
				return ctx.Err()
			case <-time.After(time.Duration(attempt) * 200 * time.Millisecond):
			}
		}
	}
	return lastErr
}

func (e *EmailClient) doSend(ctx context.Context, url string, payload []byte) (int, []byte, error) {
	req, err := http.NewRequestWithContext(ctx, http.MethodPost, url, bytes.NewReader(payload))
	if err != nil {
		return 0, nil, fmt.Errorf("build request: %w", err)
	}
	req.Header.Set("Authorization", "Bearer "+e.apiToken)
	req.Header.Set("Content-Type", "application/json")

	resp, err := e.httpClient.Do(req)
	if err != nil {
		return 0, nil, err
	}
	defer resp.Body.Close()

	body, err := io.ReadAll(io.LimitReader(resp.Body, 8<<10))
	if err != nil {
		return resp.StatusCode, nil, fmt.Errorf("read response: %w", err)
	}
	return resp.StatusCode, body, nil
}

func cfErrorMessage(errs []cfEmailError) string {
	if len(errs) == 0 {
		return "unknown error"
	}
	return fmt.Sprintf("%d %s", errs[0].Code, errs[0].Message)
}
