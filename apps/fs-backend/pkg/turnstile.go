package pkg

import (
	"context"
	"encoding/json"
	"fmt"
	"net/http"
	"net/url"
	"os"
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
		env := os.Getenv("ENVIRONMENT")
		// Bypass only in explicitly non-production environments.
		// Default to fail-closed so a missing env var doesn't open the gate in production.
		if env == "development" || env == "dev" || env == "staging" {
			return true, nil
		}
		return false, fmt.Errorf("turnstile: secret not configured")
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
