package pkg

import (
	"fmt"
	"net/url"
)

// BuildPasswordResetActionURL rewrites a Firebase-generated password reset link
// to the branded web app action handler while preserving the one-time code.
func BuildPasswordResetActionURL(appURL, firebaseLink string) (string, error) {
	actionURL, err := url.Parse(appURL)
	if err != nil {
		return "", fmt.Errorf("parse app url: %w", err)
	}
	if actionURL.Scheme == "" || actionURL.Host == "" {
		return "", fmt.Errorf("parse app url: missing scheme or host")
	}
	actionURL.Path = "/auth/action"
	actionURL.RawQuery = ""
	actionURL.Fragment = ""

	firebaseURL, err := url.Parse(firebaseLink)
	if err != nil {
		return "", fmt.Errorf("parse firebase action link: %w", err)
	}

	sourceQuery := firebaseURL.Query()
	oobCode := sourceQuery.Get("oobCode")
	if oobCode == "" {
		return "", fmt.Errorf("parse firebase action link: missing oobCode")
	}

	mode := sourceQuery.Get("mode")
	if mode == "" {
		mode = "resetPassword"
	}

	targetQuery := url.Values{}
	targetQuery.Set("mode", mode)
	targetQuery.Set("oobCode", oobCode)
	for _, key := range []string{"apiKey", "lang", "continueUrl"} {
		if value := sourceQuery.Get(key); value != "" {
			targetQuery.Set(key, value)
		}
	}
	actionURL.RawQuery = targetQuery.Encode()

	return actionURL.String(), nil
}
