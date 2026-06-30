package middleware

import (
	"context"
	"log/slog"
	"net/http"
	"strings"

	"cloud.google.com/go/firestore"
	firebaseAuth "firebase.google.com/go/v4/auth"
	"google.golang.org/grpc/codes"
	"google.golang.org/grpc/status"

	"github.com/sathittham/factory-sync-solutions/apps/backend/pkg"
)

type contextKey string

const uidContextKey contextKey = "uid"
const emailContextKey contextKey = "email"
const displayNameContextKey contextKey = "displayName"
const photoURLContextKey contextKey = "photoURL"

const msgMissingAuth = "missing auth"
const msgAccessDenied = "access denied"

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
				slog.Error("FirebaseAuth: VerifyIDToken failed", "error", err, "tokenPrefix", idToken[:min(20, len(idToken))])
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
			if photoURL, ok := token.Claims["picture"].(string); ok {
				ctx = context.WithValue(ctx, photoURLContextKey, photoURL)
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
				pkg.RespondError(w, http.StatusUnauthorized, "UNAUTHORIZED", msgMissingAuth)
				return
			}

			user, err := authClient.GetUser(r.Context(), uid)
			if err != nil {
				pkg.RespondError(w, http.StatusForbidden, "FORBIDDEN", msgAccessDenied)
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

// GetPhotoURL extracts the verified profile photo URL from the request context.
func GetPhotoURL(r *http.Request) string {
	photoURL, _ := r.Context().Value(photoURLContextKey).(string)
	return photoURL
}

// RequireFirestoreRole returns a middleware that allows only requests whose
// Firestore profile role matches one of the given roles.
// Must be used after FirebaseAuth.
func RequireFirestoreRole(fsClient *firestore.Client, roles ...string) func(http.Handler) http.Handler {
	allowed := make(map[string]bool, len(roles))
	for _, r := range roles {
		allowed[r] = true
	}
	return func(next http.Handler) http.Handler {
		return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			uid := GetUID(r)
			if uid == "" {
				pkg.RespondError(w, http.StatusUnauthorized, "UNAUTHORIZED", msgMissingAuth)
				return
			}

			doc, err := fsClient.Collection("users").Doc(uid).Get(r.Context())
			if err != nil {
				if status.Code(err) == codes.NotFound {
					pkg.RespondError(w, http.StatusForbidden, "FORBIDDEN", msgAccessDenied)
					return
				}
				slog.Error("RequireFirestoreRole: firestore fetch failed", "uid", uid, "error", err.Error())
				pkg.RespondError(w, http.StatusInternalServerError, "INTERNAL_ERROR", "internal error")
				return
			}

			role, _ := doc.Data()["role"].(string)
			if !allowed[role] {
				pkg.RespondError(w, http.StatusForbidden, "FORBIDDEN", "insufficient role")
				return
			}

			next.ServeHTTP(w, r)
		})
	}
}

// RequireBackofficeRole returns a middleware that allows only requests whose
// token's backofficeRole custom claim matches one of the given roles.
// Must be used after FirebaseAuth.
//
// Usage — allow both staff roles:
//
//	r.Use(middleware.RequireBackofficeRole(authClient, "superadmin", "staff"))
//
// Usage — superadmin-only route:
//
//	r.Use(middleware.RequireBackofficeRole(authClient, "superadmin"))
func RequireBackofficeRole(authClient *firebaseAuth.Client, roles ...string) func(http.Handler) http.Handler {
	allowed := make(map[string]bool, len(roles))
	for _, role := range roles {
		allowed[role] = true
	}
	return func(next http.Handler) http.Handler {
		return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			uid := GetUID(r)
			if uid == "" {
				pkg.RespondError(w, http.StatusUnauthorized, "UNAUTHORIZED", msgMissingAuth)
				return
			}

			user, err := authClient.GetUser(r.Context(), uid)
			if err != nil {
				pkg.RespondError(w, http.StatusForbidden, "FORBIDDEN", msgAccessDenied)
				return
			}

			backofficeRole, _ := user.CustomClaims["backofficeRole"].(string)
			if !allowed[backofficeRole] {
				pkg.RespondError(w, http.StatusForbidden, "FORBIDDEN", "backoffice access required")
				return
			}

			next.ServeHTTP(w, r)
		})
	}
}
