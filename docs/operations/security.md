---
version: 1.2.0
lastUpdated: 2026-06-13
author: Sathittham Sangthong
---

# Security Guide

## Authentication

### Firebase ID Token Verification

All authenticated API endpoints must verify the Firebase ID token:

```go
import firebaseAuth "firebase.google.com/go/v4/auth"

func verifyToken(ctx context.Context, authClient *firebaseAuth.Client, idToken string) (*firebaseAuth.Token, error) {
    token, err := authClient.VerifyIDToken(ctx, idToken)
    if err != nil {
        return nil, fmt.Errorf("verify token: %w", err)
    }
    return token, nil
}
```

**Rules:**
- Extract the token from `Authorization: Bearer <token>` header
- Always use `VerifyIDToken` — never decode the JWT manually
- The verified `token.UID` is the trusted user identity
- Never trust a UID from request body, query params, or path params for data access

### Token Flow

1. SPA authenticates user with Firebase Google Sign-In
2. SPA calls `getIdToken()` to get a Firebase ID token
3. SPA sends the token in `Authorization: Bearer <token>` header
4. Go backend verifies the token with Firebase Admin SDK
5. Verified `token.UID` is used to scope all data access

## Authorization

### Role-Based Access Control

The **primary source of truth** for roles is **Firebase custom claims** (set via Admin SDK). The `role` field in the `users` Firestore collection is a read-only mirror for display/query purposes — it must not be used for authorization decisions.

| Role | Access |
|------|--------|
| `user` | Own profile, quiz, results |
| `admin` | All data, admin dashboard, management endpoints |

```go
// Check admin role via Firebase custom claims
func isAdmin(ctx context.Context, authClient *firebaseAuth.Client, uid string) bool {
    user, err := authClient.GetUser(ctx, uid)
    if err != nil {
        return false
    }
    role, ok := user.CustomClaims["role"].(string)
    return ok && role == "admin"
}
```

### Data Scoping

Always scope Firestore queries to the authenticated user's UID:

```go
// Correct — user can only read their own data
doc, err := client.Collection("users").Doc(token.UID).Get(ctx)

// NEVER — user-supplied UID allows reading anyone's data
doc, err := client.Collection("users").Doc(req.UserID).Get(ctx)
```

## Firestore Security Rules

Server-side validation is primary; Firestore security rules are defense-in-depth:

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // Users can only read/write their own profile
    match /users/{uid} {
      allow read, update: if request.auth != null && request.auth.uid == uid;
      allow create: if request.auth != null && request.auth.uid == uid;
      allow delete: if false;
      // Admin can read any user
      allow read: if request.auth.token.role == 'admin';
    }

    // Assessments scoped to authenticated user
    match /assessments/{assessmentId} {
      allow read: if request.auth != null
        && resource.data.uid == request.auth.uid;
      allow create: if request.auth != null
        && request.resource.data.uid == request.auth.uid;
      allow update, delete: if false;
      // Admin can read any assessment
      allow read: if request.auth.token.role == 'admin';
    }

    // Email jobs — server-side only (Admin SDK bypasses rules)
    match /email_jobs/{jobId} {
      allow read, write: if false;
    }
  }
}
```

## Input Validation

### Struct Validation Tags

```go
type RegisterRequest struct {
    CompanyName    string `json:"companyName" validate:"required,min=2,max=200"`
    CompanyRegID   string `json:"companyRegId" validate:"required,len=13,numeric"`
    IndustryType   string `json:"industryType" validate:"required"`
    CompanySize    string `json:"companySize" validate:"required,oneof=small medium large"`
    ContactName    string `json:"contactName" validate:"required,min=2,max=100"`
    ContactEmail   string `json:"contactEmail" validate:"required,email"`
    ContactPhone   string `json:"contactPhone" validate:"required"`
    TurnstileToken string `json:"turnstileToken" validate:"required"`
}
```

### ID/Path Parameter Validation

Validate path parameters before using them in Firestore document paths:

```go
func validateUID(uid string) bool {
    // Firebase UIDs are alphanumeric, 1-128 characters
    matched, _ := regexp.MatchString(`^[a-zA-Z0-9]{1,128}$`, uid)
    return matched
}
```

## Cloudflare Turnstile (Bot Protection)

Verify the Turnstile token server-side on registration:

```go
func verifyTurnstile(ctx context.Context, token, secret string) (bool, error) {
    resp, err := http.PostForm("https://challenges.cloudflare.com/turnstile/v0/siteverify",
        url.Values{
            "secret":   {secret},
            "response": {token},
        },
    )
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
```

## CORS Configuration

```go
func corsMiddleware(next http.Handler) http.Handler {
    return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
        origin := r.Header.Get("Origin")
        allowedOrigins := strings.Split(os.Getenv("ALLOWED_ORIGINS"), ",")

        for _, allowed := range allowedOrigins {
            if strings.TrimSpace(allowed) == origin {
                w.Header().Set("Access-Control-Allow-Origin", origin)
                break
            }
        }

        w.Header().Set("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS")
        w.Header().Set("Access-Control-Allow-Headers", "Authorization, Content-Type")
        w.Header().Set("Access-Control-Allow-Credentials", "true")

        if r.Method == http.MethodOptions {
            w.WriteHeader(http.StatusNoContent)
            return
        }

        next.ServeHTTP(w, r)
    })
}
```

**Rules:**
- Never use wildcard `*` with `Allow-Credentials: true`
- Allowed origins come from `ALLOWED_ORIGINS` env var
- Dev: `http://localhost:5173`
- Staging: `https://factory-sync-solutions-staging.pages.dev`
- Production: `https://factory-sync-solutions.pages.dev`

## Rate Limiting

| Layer | Limit |
|-------|-------|
| Per-instance in-memory | 10 requests/second burst per IP (defense-in-depth) |
| Global (primary) | Cloudflare WAF rate limiting rules |

### Strategy for Cloud Run

In-memory rate limiters (e.g., `golang.org/x/time/rate`) **do not work** across Cloud Run container instances because each instance has its own memory. Use a layered approach:

1. **Cloudflare WAF / Rate Limiting Rules** (recommended primary layer): Configure rate limiting rules in Cloudflare dashboard. This handles per-IP rate limiting before requests reach Cloud Run.
2. **Per-instance in-memory limiter** (defense-in-depth): Protects individual instances from burst abuse. Not globally accurate but prevents a single instance from being overwhelmed.

```go
import (
    "net/http"
    "sync"
    "time"

    "golang.org/x/time/rate"
)

// Per-IP rate limiter (per-instance — defense-in-depth, not globally accurate)
var (
    limiters = make(map[string]*rate.Limiter)
    mu       sync.Mutex
)

func getLimiter(key string, rps rate.Limit, burst int) *rate.Limiter {
    mu.Lock()
    defer mu.Unlock()
    if lim, ok := limiters[key]; ok {
        return lim
    }
    lim := rate.NewLimiter(rps, burst)
    limiters[key] = lim
    return lim
}

func RateLimitByIP(next http.Handler) http.Handler {
    return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
        ip := r.RemoteAddr
        lim := getLimiter(ip, rate.Every(time.Second), 2)
        if !lim.Allow() {
            pkg.RespondError(w, http.StatusTooManyRequests, "RATE_LIMIT_EXCEEDED", "too many requests")
            return
        }
        next.ServeHTTP(w, r)
    })
}
```

> **Note**: For production, rely on Cloudflare rate limiting rules as the primary enforcement layer. The per-instance limiter above is a best-effort fallback.

## Sensitive Data Protection

### Never Log

- Firebase ID tokens
- Passwords or secrets
- Full email addresses (use masking)
- Credit card numbers
- Personal identification numbers

### Data Masking

```go
func maskEmail(email string) string {
    parts := strings.Split(email, "@")
    if len(parts) != 2 || len(parts[0]) < 2 {
        return "***@***"
    }
    return parts[0][:2] + "***@" + parts[1]
}
```

### Response Filtering

Never expose internal fields in API responses:

```go
// Correct — only return safe fields
type ProfileResponse struct {
    UID         string `json:"uid"`
    CompanyName string `json:"companyName"`
    Industry    string `json:"industry"`
    CreatedAt   string `json:"createdAt"`
}

// NEVER expose: internal IDs, tokens, role details beyond what's needed
```

## Security Headers

Set security headers on all responses:

```go
func securityHeaders(next http.Handler) http.Handler {
    return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
        w.Header().Set("X-Content-Type-Options", "nosniff")
        w.Header().Set("X-Frame-Options", "DENY")
        w.Header().Set("Strict-Transport-Security", "max-age=31536000; includeSubDomains")
        w.Header().Set("Referrer-Policy", "strict-origin-when-cross-origin")
        next.ServeHTTP(w, r)
    })
}
```

## Secrets Management

| Environment | Secret Store | Access |
|-------------|-------------|--------|
| Local dev | `.env` file (gitignored) | Developer only |
| Staging | GitHub Secrets | Injected at deploy via `--set-env-vars` |
| Production | GitHub Secrets | Injected at deploy via `--set-env-vars` |

**Rules:**
- Never hardcode secrets in source code
- Never commit `.env` files (only `.env.example`)
- Use GitHub Secrets for all deployed environments (migration path to GCP Secret Manager available)
- Rotate API keys regularly (Resend, Turnstile)

## Frontend Security

- No secrets or API keys in frontend code
- Only `VITE_` prefixed env vars are exposed to the browser
- Firebase config is public (project ID, API key) — security comes from Firebase security rules
- Never call Resend, Turnstile secret, or admin APIs from the frontend
- Sanitize user-generated content before rendering

## Security Checklist

| Category | Check |
|----------|-------|
| **Authentication** | Firebase ID token verified on all protected endpoints |
| **Authorization** | Admin role checked server-side |
| **Data scoping** | All queries scoped to authenticated user's UID |
| **Input validation** | Struct validation tags on all request DTOs |
| **Bot protection** | Turnstile verified on registration |
| **CORS** | Explicit origins, no wildcard in production |
| **Rate limiting** | Applied on public and authenticated endpoints |
| **Secrets** | GitHub Secrets (or GCP Secret Manager), never hardcoded |
| **Logging** | No sensitive data in logs |
| **Frontend** | No secrets exposed, VITE_ prefix only |

---

## See Also

- [../development/go-patterns.md](../development/go-patterns.md) — Firebase Auth middleware implementation
- [../development/code-review-checklist.md](../development/code-review-checklist.md) — Security review checklist
- [env-variables.md](env-variables.md) — All required environment variables and secrets
- [../architecture/overview.md](../architecture/overview.md) — CORS origins and Turnstile integration

---

## Changelog

| Version | Date | Description |
|---------|------|-------------|
| 1.0.0 | 2026-03-06 | Initial version |
| 1.1.0 | 2026-03-07 | Updated rate limiting values, Cloud Functions → Cloud Run, GCP Secret Manager → GitHub Secrets, removed max=255 from ContactEmail |
| 1.2.0 | 2026-06-13 | Fix broken See Also links (go-patterns, code-review-checklist, architecture all moved to sibling dirs) |
