---
version: 1.0.0
lastUpdated: 2026-06-10
author: Sathittham Sangthong
status: Done
---

# Notification Service — Feature Spec

> Backend-only service that sends two types of notifications across two channels
> (email via Resend, Slack via Incoming Webhooks). All notifications are
> fire-and-forget goroutines — failures are logged but never surface to the API
> caller.

---

## 1. Summary

The notification service (`apps/fs-backend/services/notification/`) is a pure
backend service with no frontend surface. It fires two events:

| Event | Email | Slack |
|-------|-------|-------|
| **New registration** | — | ✅ Always |
| **Quiz result submitted** | ✅ Opt-in (user's `emailNotifications` flag) | ✅ Always |

**Key design choices:**

- **Fire-and-forget** — notifications run in a `go` goroutine launched from
  the handler. The HTTP response to the client is not blocked; failures are
  only logged.
- **Email is opt-in** — the `emailNotifications` boolean on the user's profile
  gates result emails. Slack notifications bypass this flag.
- **Graceful degradation** — if `RESEND_API_KEY` is not set, `EmailClient` is
  `nil` and email is silently skipped. If a Slack webhook URL is empty, the post
  is silently skipped.
- **Email job audit trail** — every attempted result email creates an
  `email_jobs` Firestore document tracking `pending → sent | failed`.

---

## 2. Goals & Non-Goals

### Goals

- Notify the internal team on every new user registration (Slack).
- Deliver a formatted assessment result email to the user after quiz submission,
  if they opted in.
- Notify the internal team on every quiz result (Slack).
- Persist an `EmailJob` record per email attempt for auditability.
- Isolate failures so that a broken Resend/Slack config never fails an API
  request.

### Non-Goals

- Frontend notification UI (in-app toasts or notification bell).
- Scheduling / queuing / retrying failed emails (no worker — fire-and-forget
  only).
- User-facing unsubscribe link or preference management via API (the
  `emailNotifications` flag is set at registration and via admin role change;
  no self-service toggle endpoint exists yet).
- Marketing / campaign emails (only transactional events are handled here).
- SMS or push notifications.

---

## 3. Current State

| Component | Location | Status |
|-----------|----------|--------|
| Notification service | `apps/fs-backend/services/notification/service.go` | ✅ Built |
| Email client (Resend) | `apps/fs-backend/services/notification/email.go` | ✅ Built |
| Slack client | `apps/fs-backend/services/notification/slack.go` | ✅ Built |
| `EmailJob` model | `apps/fs-backend/services/notification/models.go` | ✅ Built |
| Service wiring | `apps/fs-backend/main.go` (lines 109–129) | ✅ Built |
| Registration trigger | `apps/fs-backend/services/profile/handler.go` `CreateProfile` | ✅ Built |
| Quiz result trigger | `apps/fs-backend/services/quiz/handler.go` `SubmitQuiz` | ✅ Built |
| Resend self-service retry | — | ❌ Not implemented |
| User unsubscribe endpoint | — | ❌ Not implemented |
| Email template engine | — | ❌ HTML built via `strings.Builder` (no template) |

---

## 4. Architecture

```
HTTP Request
    │
    ├─ POST /profile (CreateProfile)
    │       └─ go handler.notifSvc.NotifyRegistration(...)
    │                   └─ slack.SendRegistration
    │
    └─ POST /quiz/submit (SubmitQuiz)
            └─ go notifSvc.NotifyQuizResult(...)
                        ├─ if emailNotifications:
                        │       ├─ createEmailJob (status: pending)
                        │       ├─ email.SendResult
                        │       └─ updateEmailJob (status: sent | failed)
                        └─ slack.SendQuizResult (always)
```

Both goroutines use `context.Background()` (not the request context) so they
survive after the HTTP response is written.

---

## 5. Event: New Registration

**Trigger:** `profile.Handler.CreateProfile` — after a profile document is
successfully written to Firestore.

```go
go h.notifSvc.NotifyRegistration(
    context.Background(),
    profile.CompanyName,
    profile.ContactName,
    profile.IndustryType,
)
```

**Channel:** Slack only. Webhook URL: `os.Getenv("SLACK_WEBHOOK_REGISTRATION")`.

**Slack message format:**
```
*New Registration*
• Company:  Acme Co.
• Contact:  Jane Doe
• Industry: manufacturing
• Time:     2026-06-10T08:00:00Z
```

Fallback text (for notifications without block rendering): `"New registration: Acme Co."`

---

## 6. Event: Quiz Result Submitted

**Trigger:** `quiz.Handler.SubmitQuiz` — after the assessment document is stored
in Firestore.

```go
go s.notifSvc.NotifyQuizResult(
    ctx,
    assessment,
    contactEmail,
    contactName,
    companyName,
    emailNotifications,
    scoringResult.DimensionScores,
)
```

The quiz handler fetches the user's profile via `profileGetter.GetProfileData`
to obtain `contactEmail`, `contactName`, `companyName`, and `emailNotifications`
before calling `NotifyQuizResult`. If the profile fetch fails, the goroutine is
still launched with empty strings — Slack is posted with empty company name,
email is skipped (empty `contactEmail`).

### 6.1 Email (opt-in)

Gated by `emailNotifications == true`. Sequence within the goroutine:

```
1. Generate UUID → jobID
2. Create email_jobs/{jobID}  { status: "pending", uid, assessmentId, createdAt }
3. email.SendResult(to: contactEmail, ...)
4. Update email_jobs/{jobID}
       success → { status: "sent",   sentAt }
       failure → { status: "failed", error: err.Error() }
```

**Resend email fields:**

| Field | Value |
|-------|-------|
| From | `FactorySync Solutions <noreply@factorysyncsolutions.com>` |
| To | user's `contactEmail` |
| Subject | `FactorySync Solutions Result — {diagnosis} ({score:.2f}/5.00)` |
| Body | HTML — see §7 |

### 6.2 Slack (always)

Webhook URL: `os.Getenv("SLACK_WEBHOOK_QUIZ_RESULT")`.

**Slack message format:**
```
*Quiz Result Submitted*
• Company:   Acme Co.
• Score:     3.47 / 5.00
• Diagnosis: Established
• Time:      2026-06-10T09:00:00Z
```

Fallback text: `"Quiz result: Acme Co. — 3.47 (Established)"`

---

## 7. Email Template

The HTML is assembled via `strings.Builder` in `buildResultEmailHTML`. No
external template engine is used. The template is English-only — no i18n.

**Structure:**

```
[FactorySync Solutions] (h1, blue #1a56db)
Dear {contactName},
Here are the assessment results for {companyName}.

┌──────────────────────────────────────┐
│  Overall Score                       │
│  3.47 / 5.00                         │
│  Established                         │
└──────────────────────────────────────┘

Dimension Scores
┌───────────────────────────┬────────┐
│ Dimension                 │ Score  │
│ Basic Management          │ 3.83   │
│ Work Improvement          │ 3.25   │
│ …                         │ …      │
└───────────────────────────┴────────┘

Strengths          ← omitted if empty
• Quality Control & Assurance

Areas for Improvement   ← omitted if empty
• Cost Control

────────────────────────────────────────
This report was generated on 2026-06-10. FactorySync Solutions.
```

Inline CSS only (email client compatibility). Max width 600px. Font: sans-serif.

---

## 8. `EmailJob` Document (`email_jobs/{uuid}`)

Persisted in Firestore for every email attempt (not for registration Slack posts).

| Field | Type | Values |
|-------|------|--------|
| `id` | string | UUIDv4 |
| `uid` | string | Firebase UID of the user |
| `assessmentId` | string | UUIDv4 of the assessment |
| `status` | string | `"pending"` → `"sent"` \| `"failed"` |
| `createdAt` | string | ISO 8601 (UTC) |
| `sentAt` | string? | ISO 8601 (UTC) — only when `status == "sent"` |
| `error` | string? | Error message — only when `status == "failed"` |

The document is written twice per email:
1. Before `SendResult` — status `"pending"`
2. After `SendResult` — status `"sent"` or `"failed"`

If the Firestore write for the `pending` state itself fails, the error is logged
and the email send still proceeds (no abort).

---

## 9. Service Wiring (`main.go`)

```go
var emailClient *notification.EmailClient
if apiKey := os.Getenv("RESEND_API_KEY"); apiKey != "" {
    emailClient = notification.NewEmailClient(apiKey, "FactorySync Solutions <noreply@factorysyncsolutions.com>")
}
slackClient := notification.NewSlackClient()
notifSvc := notification.NewService(emailClient, slackClient, firestoreClient)
```

`emailClient` is `nil` when `RESEND_API_KEY` is absent. The `NotifyQuizResult`
method guards with `if s.email != nil` so email is cleanly skipped without
panicking in development environments.

---

## 10. Environment Variables

| Variable | Required | Purpose |
|----------|----------|---------|
| `RESEND_API_KEY` | No (email disabled if absent) | Resend API key for sending emails |
| `SLACK_WEBHOOK_REGISTRATION` | No (Slack skipped if empty) | Incoming webhook URL for registration events |
| `SLACK_WEBHOOK_QUIZ_RESULT` | No (Slack skipped if empty) | Incoming webhook URL for quiz result events |

All three can be absent simultaneously — the service degrades silently.

---

## 11. Failure Handling

| Failure point | Behaviour |
|---------------|-----------|
| Profile fetch fails before goroutine launch | Goroutine launched with empty strings; Slack posts with empty company; email skipped (empty `to` address) |
| `createEmailJob` Firestore write fails | Error logged; email send proceeds anyway |
| `email.SendResult` fails | Error logged; `EmailJob` updated to `"failed"` with error message |
| `updateEmailJob` Firestore write fails | Error logged; no retry |
| `slack.post` HTTP request fails | Error logged; no retry |
| Slack returns non-200 | Error logged; no retry |
| Webhook URL is empty string | `SlackClient.post` returns `nil` immediately — no log, no error |
| `RESEND_API_KEY` absent | `emailClient == nil` → email branch skipped silently |

No notification failure ever reaches the HTTP response. The quiz submission or
registration response is always independent of notification success.

---

## 12. Open Tasks

### 12.1 Email retry / dead-letter queue

Failed emails are recorded in Firestore (`status: "failed"`) but are never
retried. A background worker (Cloud Run Job, Cloud Tasks, or a scheduled
Firestore trigger) could query `email_jobs where status == "failed"` and retry
up to N times.

### 12.2 Thai-language email template

The result email (`buildResultEmailHTML`) is English-only. The user's profile
locale preference is not stored, so a Thai version cannot be selected
automatically. Options:
- Store locale at registration time in the profile.
- Send bilingual email (both TH and EN sections).
- Default to TH since most users are Thai.

### 12.3 Self-service email opt-out

There is no unsubscribe link in the email footer. The `emailNotifications` flag
can only be changed by an admin via `SetUserRole` or directly in Firestore.
Add an unsubscribe endpoint (`PUT /api/v1/profile/notifications`) that accepts
`{ emailNotifications: false }` so users can opt out without contacting support.
The email footer should include a one-click link pointing to this endpoint with a
signed token.

### 12.4 XSS risk in email template

`buildResultEmailHTML` interpolates user-controlled strings (company name,
contact name, dimension names, strengths, weaknesses) directly into HTML without
escaping. A company name containing `<script>` or `</td>` would break the table
layout or inject HTML.

**Fix:** Replace `fmt.Sprintf` interpolation with `html/template` or call
`html.EscapeString(value)` on all user-supplied fields before inserting.

### 12.5 Registration Slack only — no email

New registrations send Slack only. If an internal welcome email (to the admin
team or to the new user) is desired, add an `email.SendRegistration` method and
call it conditionally in `NotifyRegistration`.

---

## 13. Acceptance Criteria

- [ ] A new user completing registration triggers a Slack message to `SLACK_WEBHOOK_REGISTRATION` containing company name, contact name, industry, and timestamp.
- [ ] A user with `emailNotifications: true` submitting a quiz receives an email from `noreply@factorysyncsolutions.com` with subject `FactorySync Solutions Result — {diagnosis} ({score}/5.00)`.
- [ ] The result email contains: overall score, diagnosis, dimension scores table, strengths list (if any), weaknesses list (if any).
- [ ] A user with `emailNotifications: false` does not receive an email but the Slack post still fires.
- [ ] Submitting a quiz always posts to `SLACK_WEBHOOK_QUIZ_RESULT` with company, score, diagnosis, and timestamp.
- [ ] An `email_jobs` Firestore document is created for each email attempt, transitioning from `pending` to `sent` or `failed`.
- [ ] A Resend API failure does not cause the quiz submission endpoint to return an error.
- [ ] A Slack webhook failure does not cause the quiz submission or registration endpoint to return an error.
- [ ] When `RESEND_API_KEY` is absent, no email attempt is made and no `email_jobs` document is created.
- [ ] When a webhook URL env var is empty, no HTTP request is made.
- [ ] `make test-api` passes.

---

## 14. Testing

- **Unit (`service_test.go`):**
  - `NotifyRegistration` calls `SlackClient.SendRegistration` with the correct args and logs on error.
  - `NotifyQuizResult` with `emailNotifications: true` calls `email.SendResult` and creates/updates an `EmailJob`.
  - `NotifyQuizResult` with `emailNotifications: false` skips email, still calls `slack.SendQuizResult`.
  - `NotifyQuizResult` with `emailClient == nil` skips email entirely.
- **Unit (`email_test.go`):**
  - `buildResultEmailHTML` with empty `strengths` omits the Strengths section.
  - `buildResultEmailHTML` with empty `weaknesses` omits the Areas for Improvement section.
  - Output contains the correct score and diagnosis strings.
- **Unit (`slack_test.go`):**
  - `SlackClient.post` with empty `webhookURL` returns `nil` without making an HTTP call.
  - `SlackClient.post` with a non-200 response returns a wrapped error.
- **Integration:**
  - End-to-end: submit a quiz for a user with `emailNotifications: true` → assert `email_jobs` document exists with `status: "sent"` (requires Resend test mode or mock).

---

## 15. References

- Notification service: [service.go](../../../apps/fs-backend/services/notification/service.go)
- Email client: [email.go](../../../apps/fs-backend/services/notification/email.go)
- Slack client: [slack.go](../../../apps/fs-backend/services/notification/slack.go)
- `EmailJob` model: [models.go](../../../apps/fs-backend/services/notification/models.go)
- Service wiring: [main.go](../../../apps/fs-backend/main.go)
- Profile handler (registration trigger): [profile/handler.go](../../../apps/fs-backend/services/profile/handler.go)
- Quiz handler (quiz result trigger): [quiz/handler.go](../../../apps/fs-backend/services/quiz/handler.go)
- Profile model (`emailNotifications`): [profile/models.go](../../../apps/fs-backend/services/profile/models.go)
- Profile feature: [profile/feature-spec.md](../profile/feature-spec.md)
- Quiz feature: [quiz/feature-spec.md](../quiz/feature-spec.md)
