package middleware

import (
	"context"
	"net/http"
)

// SetTestAuthContext injects auth values into the context for testing.
// This should only be used in tests.
func SetTestAuthContext(r *http.Request, uid, email, displayName string) *http.Request {
	ctx := context.WithValue(r.Context(), uidContextKey, uid)
	ctx = context.WithValue(ctx, emailContextKey, email)
	ctx = context.WithValue(ctx, displayNameContextKey, displayName)
	return r.WithContext(ctx)
}
