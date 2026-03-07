package pkg

import (
	"context"
	"encoding/json"
	"fmt"
	"net/http"
	"net/url"
	"time"
)

const turnstileVerifyURL = "https://challenges.cloudflare.com/turnstile/v0/siteverify"

// TurnstileClient verifies Cloudflare Turnstile tokens.
type TurnstileClient struct {
	secret     string
	httpClient *http.Client
}

func NewTurnstileClient(secret string) *TurnstileClient {
	return &TurnstileClient{
		secret:     secret,
		httpClient: &http.Client{Timeout: 5 * time.Second},
	}
}

// Verify checks a Turnstile token with the Cloudflare API.
// Returns true if the token is valid.
func (t *TurnstileClient) Verify(ctx context.Context, token string) (bool, error) {
	if t.secret == "" {
		// Skip verification if no secret is configured (local dev without Turnstile)
		return true, nil
	}

	resp, err := t.httpClient.PostForm(turnstileVerifyURL, url.Values{
		"secret":   {t.secret},
		"response": {token},
	})
	if err != nil {
		return false, fmt.Errorf("turnstile request: %w", err)
	}
	defer resp.Body.Close()

	var result struct {
		Success bool `json:"success"`
	}
	if err := json.NewDecoder(resp.Body).Decode(&result); err != nil {
		return false, fmt.Errorf("turnstile decode: %w", err)
	}

	return result.Success, nil
}
