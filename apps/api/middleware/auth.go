package middleware

import (
	"context"
	"net/http"
	"strings"

	firebaseAuth "firebase.google.com/go/v4/auth"

	"github.com/sathittham/factory-health-check/apps/api/pkg"
)

type contextKey string

const uidContextKey contextKey = "uid"
const emailContextKey contextKey = "email"
const displayNameContextKey contextKey = "displayName"

// FirebaseAuth verifies the Firebase ID token from the Authorization header
// and injects the verified UID, email, and displayName into the request context.
func FirebaseAuth(authClient *firebaseAuth.Client) func(http.Handler) http.Handler {
	return func(next http.Handler) http.Handler {
		return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			authHeader := r.Header.Get("Authorization")
			if authHeader == "" || !strings.HasPrefix(authHeader, "Bearer ") {
				pkg.RespondError(w, http.StatusUnauthorized, "UNAUTHORIZED", "missing authorization header")
				return
			}

			idToken := strings.TrimPrefix(authHeader, "Bearer ")
			token, err := authClient.VerifyIDToken(r.Context(), idToken)
			if err != nil {
				pkg.RespondError(w, http.StatusUnauthorized, "UNAUTHORIZED", "invalid token")
				return
			}

			ctx := context.WithValue(r.Context(), uidContextKey, token.UID)

			// Extract email and displayName from token claims (Google Sign-In)
			if email, ok := token.Claims["email"].(string); ok {
				ctx = context.WithValue(ctx, emailContextKey, email)
			}
			if name, ok := token.Claims["name"].(string); ok {
				ctx = context.WithValue(ctx, displayNameContextKey, name)
			}

			next.ServeHTTP(w, r.WithContext(ctx))
		})
	}
}

// RequireAdmin checks the admin role from Firebase custom claims.
// Custom claims are the authoritative source of truth for roles.
func RequireAdmin(authClient *firebaseAuth.Client) func(http.Handler) http.Handler {
	return func(next http.Handler) http.Handler {
		return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			uid := GetUID(r)
			if uid == "" {
				pkg.RespondError(w, http.StatusUnauthorized, "UNAUTHORIZED", "missing auth")
				return
			}

			user, err := authClient.GetUser(r.Context(), uid)
			if err != nil {
				pkg.RespondError(w, http.StatusForbidden, "FORBIDDEN", "access denied")
				return
			}

			if role, ok := user.CustomClaims["role"].(string); !ok || role != "admin" {
				pkg.RespondError(w, http.StatusForbidden, "FORBIDDEN", "admin access required")
				return
			}

			next.ServeHTTP(w, r)
		})
	}
}

// GetUID extracts the verified Firebase UID from the request context.
func GetUID(r *http.Request) string {
	uid, _ := r.Context().Value(uidContextKey).(string)
	return uid
}

// GetEmail extracts the verified email from the request context.
func GetEmail(r *http.Request) string {
	email, _ := r.Context().Value(emailContextKey).(string)
	return email
}

// GetDisplayName extracts the verified display name from the request context.
func GetDisplayName(r *http.Request) string {
	name, _ := r.Context().Value(displayNameContextKey).(string)
	return name
}
