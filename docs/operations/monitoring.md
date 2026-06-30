---
version: 1.3.1
lastUpdated: 2026-06-18
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

Cloud Run automatically sends stdout/stderr to Cloud Logging. No additional setup is required.

### Log Explorer Queries

```
-- Errors from a specific service
resource.type="cloud_run_revision"
resource.labels.service_name="profile-service"
severity>=ERROR

-- Requests by user
resource.type="cloud_run_revision"
jsonPayload.uid="user-123"

-- Slow requests (>1s)
resource.type="cloud_run_revision"
jsonPayload.duration_ms>1000

-- Recent errors with details
resource.type="cloud_run_revision"
severity=ERROR
timestamp>="2026-01-20T00:00:00Z"
```

### Log Retention

| Environment | Retention | Configuration |
|-------------|-----------|---------------|
| Staging | 14 days | Cloud Logging default or custom sink |
| Production | 90 days | Cloud Logging default or custom sink |

## Google Cloud Monitoring

### Cloud Run Built-in Metrics

Cloud Run automatically reports:
- **Request count**: Total requests
- **Request latency**: Duration per request
- **Container instance count**: Active instances
- **Memory utilization**: Memory usage per instance
- **CPU utilization**: CPU usage per instance
- **Billable container instance time**

## Domain Event Consumer Monitoring (Cloud Run + Pub/Sub)

The queue path has two failure surfaces:

1. Delivery and backlog in Pub/Sub (`factory-sync-domain-events`).
2. Processing health of the consumer service (`domain-event-consumer`).

### Cloud Run Worker Alerts (staging and production)

Set these policies on the worker service:

| Service | Condition | Recommendation |
|---------|-----------|----------------|
| `factory-sync-solutions-domain-event-consumer-staging` | `run.googleapis.com/request_count` with `response_code_class="5xx"` (error count spike) | `> 20` errors in `5m` |
| `factory-sync-solutions-domain-event-consumer-staging` | `run.googleapis.com/request_latencies` (`p95`) | `> 3s` for `5m` |
| `factory-sync-solutions-domain-event-consumer-staging` | `run.googleapis.com/request_count` drops to `0` unexpectedly | `= 0` for `10m` while events are arriving |
| `factory-sync-solutions-domain-event-consumer-staging` | `run.googleapis.com/container/restart_count` | `> 5` restarts in `5m` |
| `factory-sync-solutions-domain-event-consumer` (production) | same as above | same thresholds; tighten error threshold once baseline is stable |

Use the same metrics with service_name/region changes for production.

#### Suggested Cloud Monitoring console setup

1. Go to **Alerting → Create policy**.
2. Add one condition per row above.
3. Select:
   - **Resource**: `Cloud Run Revision`
   - **Metric**: names above
   - **Alignment period**: `1m`
   - **Evaluation window**: `5m` (or `10m` for DLQ-related policies)
4. Add notification channel: Slack (`#server-status`) or Cloud Function webhook.
5. Use `Runbook` with runbook text:
   - Check worker logs.
   - Verify Firestore availability and permission.
   - Check dead-letter queue growth.
   - Confirm domain-event producer is still writing to `DOMAIN_EVENT_PUBSUB_TOPIC`.

### Pub/Sub Subscription Alerts

Set these policies on the consumer subscription `factory-sync-domain-events-result-consumer`:

| Condition | Recommendation |
|-----------|----------------|
| `pubsub.googleapis.com/subscription/num_undelivered_messages` | `> 500` for `10m` |
| `pubsub.googleapis.com/subscription/oldest_unacked_message_age` | `> 300s` for `10m` |
| `pubsub.googleapis.com/subscription/num_undelivered_messages` with `resource.labels.subscription_id` | sustained slope increase for `15m` |

Add a policy for dead-letter topic health:

- `pubsub.googleapis.com/topic/send_message_operation_count` for `factory-sync-domain-events-dlq`
- alert on `> 0` in `5m` (treat as warning), then page if continuing.

If your project uses different Pub/Sub metric names in Cloud Monitoring, pick the matching variant from Metrics Explorer and keep the same threshold intent.

### One-time setup checklist

- Set worker service names correctly in each environment:
  - staging: `factory-sync-solutions-domain-event-consumer-staging`
  - production: `factory-sync-solutions-domain-event-consumer`
- Verify one shared topic and subscription:
  - topic: `factory-sync-domain-events`
  - subscription: `factory-sync-domain-events-result-consumer`
  - DLQ topic: `factory-sync-domain-events-dlq`
- Confirm `DOMAIN_EVENT_MODE=pubsub` and that `DOMAIN_EVENT_SUBSCRIPTION` points to the same subscription used by the worker.

### Bootstrap script

The following command generates ready-to-apply policy JSON files and prints
the exact `gcloud` create commands:

```bash
scripts/setup-domain-event-monitoring.sh \
  --environment staging \
  --project <GCP_PROJECT_ID>

# production
scripts/setup-domain-event-monitoring.sh \
  --environment production \
  --project <GCP_PROJECT_ID>

# via Makefile
make setup-domain-event-monitoring
make setup-domain-event-monitoring ENVIRONMENT=production GCP_PROJECT_ID=<GCP_PROJECT_ID>
```

If your environment has a Monitoring Slack/email channel for `#server-status`,
pass it and apply directly:

```bash
scripts/setup-domain-event-monitoring.sh \
  --environment staging \
  --project <GCP_PROJECT_ID> \
  --notification-channel-id <NOTIFICATION_CHANNEL_ID> \
  --apply
```

You can list notification channels with:

```bash
gcloud alpha monitoring channels list --project <GCP_PROJECT_ID>
```

After first apply, verify:
- alert policy names
- threshold units (seconds/rates) in the Cloud Console
- runbook links and notification channel routing

### Alerting Policies

Create alerting policies in Cloud Monitoring console or via Terraform:

| Alert | Condition | Notification |
|-------|-----------|-------------|
| Error rate spike | Error count > 10 in 5 min | Slack `#server-status` |
| High latency | p95 latency > 3s for 5 min | Slack `#server-status` |
| Container errors | Error count > 5 in 1 min | Slack `#server-status` |

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
| `#server-status` | Cloud Run health checks, error alerts |

See [../architecture/overview.md](../architecture/overview.md#slack-notifications) for implementation details.

## Health Check Endpoint

The Cloud Run service exposes a `/healthz` endpoint:

```go
r.Get("/healthz", func(w http.ResponseWriter, r *http.Request) {
    w.Header().Set("Content-Type", "application/json")
    w.WriteHeader(http.StatusOK)
    json.NewEncoder(w).Encode(map[string]string{"status": "ok"})
})
```

A Cloud Scheduler job pings each service's health endpoint and sends status to the `#server-status` Slack channel.

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

## See Also

- [../development/setup.md](../development/setup.md) — Deployment environments and branch strategy
- [../architecture/overview.md](../architecture/overview.md#slack-notifications) — Slack notification events and channels
- [security.md](security.md#sensitive-data-protection) — What to log and what not to log

---

## Changelog

| Version | Date | Description |
|---------|------|-------------|
| 1.0.0 | 2026-03-06 | Initial version |
| 1.1.0 | 2026-03-07 | Updated Cloud Functions → Cloud Run throughout, fixed resource.type filters, updated metrics |
| 1.2.0 | 2026-06-13 | Fix broken See Also links |
| 1.3.0 | 2026-06-18 | Add Domain Event Consumer monitoring playbook for Cloud Run + Pub/Sub |
| 1.3.1 | 2026-06-18 | Add monitoring bootstrap script guidance and Makefile usage |
