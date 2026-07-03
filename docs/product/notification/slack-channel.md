# Slack Channel — Incoming Webhooks (backend)

## Summary

The internal-team side of the notification service: a thin Slack Incoming Webhook client
(`services/notification/slack.go`) that posts registration and quiz-result events to two
separately configured webhook URLs. Slack posts always fire — they are never gated by the
user's `emailNotifications` flag.

## Implementation

- `notification.NewSlackClient() *SlackClient` — constructed unconditionally in `main.go`
  (no API key; webhook URLs are read per event).
- `slack.SendRegistration(companyName, contactName, industryType)` — posts to
  `SLACK_WEBHOOK_REGISTRATION`.
- `slack.SendQuizResult(companyName, score, diagnosis)` — posts to
  `SLACK_WEBHOOK_QUIZ_RESULT`.
- `post(webhookURL, message)` — returns `nil` immediately when the webhook URL is an
  empty string (graceful skip). HTTP failures and non-200 responses are logged, never
  retried, and never surfaced to the API caller.

### Message formats

```
*New Registration*
• Company:  Acme Co.
• Contact:  Jane Doe
• Industry: manufacturing
• Time:     2026-06-10T08:00:00Z
```

```
*Quiz Result Submitted*
• Company:   Acme Co.
• Score:     3.47 / 5.00
• Diagnosis: Established
• Time:      2026-06-10T09:00:00Z
```

### Edge case — profile fetch failure

If the profile fetch fails before the notifying goroutine launches, the goroutine still
runs with empty strings: the Slack post goes out with an empty company name (and the
email path is skipped). Deliberate — visibility over completeness.

## Configuration

| Env var | Description |
|---------|-------------|
| `SLACK_WEBHOOK_REGISTRATION` | Incoming webhook URL for registration events; skipped when empty |
| `SLACK_WEBHOOK_QUIZ_RESULT` | Incoming webhook URL for quiz-result events; skipped when empty |

## Usage

Call sites: `services/notification/service.go`, fired from the profile and quiz handlers.

```
# pseudocode — fire-and-forget from the handlers
CreateProfile → go notifSvc.NotifyRegistration(ctx, companyName, contactName, industryType)
SubmitQuiz    → go notifSvc.NotifyQuizResult(ctx, assessment, …)   # slack.SendQuizResult always;
                                                                   # email only if opted in
```

Errors are logged inside the goroutine — the HTTP response to the user is never affected
by a Slack failure.

## Acceptance Criteria

- Given a completed registration, when the profile is written, then a Slack message with company, contact, industry, and timestamp posts to `SLACK_WEBHOOK_REGISTRATION`.
- Given any quiz submission, when the assessment is stored, then a Slack message with company, score, diagnosis, and timestamp posts to `SLACK_WEBHOOK_QUIZ_RESULT` — regardless of `emailNotifications`.
- Given a webhook HTTP failure or non-200 response, when a post is attempted, then the error is logged and the originating endpoint still succeeds.
- Given an empty webhook URL, when a post is attempted, then it is skipped silently (`post` returns `nil`).

## Status

- [x] `slack.go` client implemented (both events + empty-URL guard)
- [x] Wired to registration and quiz-result triggers via `service.go` goroutines
- [ ] `service_test.go` coverage of `NotifyRegistration` / `NotifyQuizResult` Slack calls — described in [feature-spec.md § 14](./feature-spec.md#14-testing), not yet on disk

---

*Version: 1.0.0*
*Last updated: 3 July 2026*
