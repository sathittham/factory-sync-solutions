---
version: 1.0.0
lastUpdated: 2026-03-06
author: Sathittham Sangthong
---

# Logging & Monitoring Guide

## Structured Logging with `log/slog`

The project uses Go's standard `log/slog` package for structured JSON logging, compatible with Google Cloud Logging.

### Setup

```go
import "log/slog"

// Create in main.go or init() — one logger per service
logger := slog.New(slog.NewJSONHandler(os.Stdout, &slog.HandlerOptions{
    Level: slog.LevelInfo,
}))
slog.SetDefault(logger)
```

### Log Levels

| Level | Use Case | Example |
|-------|----------|---------|
| DEBUG | Development debugging | Variable values, flow tracing |
| INFO | Normal operations | Request received, operation completed |
| WARN | Recoverable issues | Retry attempted, deprecated usage |
| ERROR | Failures | Operation failed, external service error |

### Logging Patterns

```go
// Info log with context
slog.Info("user registered",
    "uid", uid,
    "company", companyName,
    "duration_ms", time.Since(start).Milliseconds(),
)

// Error log
slog.Error("failed to submit quiz",
    "uid", uid,
    "error", err.Error(),
)

// Debug log
slog.Debug("firestore query",
    "collection", "assessments",
    "uid", uid,
)

// Warning log
slog.Warn("retry attempted",
    "operation", "SendEmail",
    "attempt", attempt,
)
```

### Log Output Format

Logs are JSON objects written to stdout (Cloud Logging-compatible):

```json
{
    "time": "2026-01-20T10:00:00Z",
    "level": "INFO",
    "msg": "user registered",
    "uid": "abc-123",
    "company": "Factory Co.",
    "duration_ms": 42
}
```

### What to Log / What NOT to Log

**DO Log:**
```go
// Request metadata
slog.Info("request", "method", method, "path", path)

// Operation results
slog.Info("user registered", "uid", uid, "email", maskEmail(email))

// Performance metrics
slog.Info("firestore query", "collection", collection, "duration_ms", duration)

// Errors with context
slog.Error("operation failed", "operation", op, "error", err.Error())
```

**DON'T Log:**
```go
// NEVER log these — passwords, tokens, PII
slog.Info("login", "password", password)           // NEVER
slog.Info("token", "idToken", token)                // NEVER
slog.Debug("request body", "body", requestBody)     // NEVER
```

### Sensitive Data Masking

```go
func maskEmail(email string) string {
    parts := strings.Split(email, "@")
    if len(parts) != 2 || len(parts[0]) < 2 {
        return "***@***"
    }
    return parts[0][:2] + "***@" + parts[1]
}

func maskPhone(phone string) string {
    if len(phone) < 4 {
        return "****"
    }
    return "****" + phone[len(phone)-4:]
}
```

## Google Cloud Logging

Cloud Functions automatically send stdout/stderr to Cloud Logging. No additional setup is required.

### Log Explorer Queries

```
-- Errors from a specific service
resource.type="cloud_function"
resource.labels.function_name="profile-service"
severity>=ERROR

-- Requests by user
resource.type="cloud_function"
jsonPayload.uid="user-123"

-- Slow requests (>1s)
resource.type="cloud_function"
jsonPayload.duration_ms>1000

-- Recent errors with details
resource.type="cloud_function"
severity=ERROR
timestamp>="2026-01-20T00:00:00Z"
```

### Log Retention

| Environment | Retention | Configuration |
|-------------|-----------|---------------|
| Staging | 14 days | Cloud Logging default or custom sink |
| Production | 90 days | Cloud Logging default or custom sink |

## Google Cloud Monitoring

### Cloud Functions Built-in Metrics

Cloud Functions automatically reports:
- **Invocations**: Total function calls
- **Execution time**: Duration per invocation
- **Memory usage**: Memory consumed per invocation
- **Error count**: Failed invocations
- **Active instances**: Concurrent executions

### Alerting Policies

Create alerting policies in Cloud Monitoring console or via Terraform:

| Alert | Condition | Notification |
|-------|-----------|-------------|
| Error rate spike | Error count > 10 in 5 min | Slack `#server-status` |
| High latency | p95 latency > 3s for 5 min | Slack `#server-status` |
| Function failures | Execution errors > 5 in 1 min | Slack `#server-status` |

### Firestore Monitoring

Monitor Firestore usage to stay within free tier limits:

| Metric | Free Tier Limit | Alert Threshold |
|--------|----------------|-----------------|
| Document reads | 50,000/day | 40,000/day (80%) |
| Document writes | 20,000/day | 16,000/day (80%) |
| Document deletes | 20,000/day | 16,000/day (80%) |
| Storage | 1 GiB | 800 MiB (80%) |

## Slack Notifications

Real-time alerts sent to Slack channels via Incoming Webhooks:

| Channel | Events |
|---------|--------|
| `#registrations` | New user registration |
| `#quiz-results` | Quiz result submitted |
| `#ci-cd` | GitHub Actions pipeline status |
| `#server-status` | Cloud Function health checks, error alerts |

See [architecture.md](architecture.md#slack-notifications) for implementation details.

## Health Check Endpoint

Each Cloud Function should expose a `/healthz` endpoint:

```go
r.Get("/healthz", func(w http.ResponseWriter, r *http.Request) {
    w.Header().Set("Content-Type", "application/json")
    w.WriteHeader(http.StatusOK)
    json.NewEncoder(w).Encode(map[string]string{"status": "ok"})
})
```

A scheduled Cloud Function or Cloud Scheduler job pings each service's health endpoint and sends status to the `#server-status` Slack channel.

## Log Levels by Environment

| Environment | Log Level | Retention | Alerts |
|-------------|-----------|-----------|--------|
| Development | DEBUG | N/A (local) | None |
| Staging | DEBUG | 14 days | Warning only |
| Production | INFO | 90 days | Full alerting |

## Best Practices Summary

| Practice | Description |
|----------|-------------|
| Use structured logging | JSON format with `log/slog` |
| Include request context | User ID, operation name for tracing |
| Log at appropriate level | Don't log DEBUG in production |
| Never log secrets | Mask emails, phones, tokens |
| Set retention policies | Control costs with Cloud Logging sinks |
| Create actionable alerts | Alert on errors, not noise |
| Monitor Firestore usage | Stay within free tier limits |
| Use health checks | Proactive service monitoring |

---

## Changelog

| Version | Date | Description |
|---------|------|-------------|
| 1.0.0 | 2026-03-06 | Initial version |
