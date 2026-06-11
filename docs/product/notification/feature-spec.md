---
version: 1.1.0
lastUpdated: 2026-06-10
author: Sathittham Sangthong
status: Done — invitation email planned
---

# Notification Service — Feature Spec

> Backend-only service that sends notifications across two channels (email via
> Resend, Slack via Incoming Webhooks). All notifications are fire-and-forget
> goroutines — failures are logged but never surface to the API caller.

---

## 1. Summary

The notification service (`apps/fs-backend/services/notification/`) is a pure
backend service with no frontend surface. It fires two events:

| Event | Email | Slack |
|-------|-------|-------|
| **New registration** | — | ✅ Always |
| **Quiz result submitted** | ✅ Opt-in (user's `emailNotifications` flag) | ✅ Always |
| **Project invitation sent** | ✅ Always (email IS the delivery mechanism) | — |

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

**Key difference for invitation emails:**
Unlike quiz result emails, invitation emails are **not** gated by `emailNotifications`.
The email is the only delivery mechanism — the recipient cannot accept the invitation
without it. There is no Slack counterpart; it is a user-to-user message, not an ops event.

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
| Invitation email | `apps/fs-backend/services/notification/email.go` | ⏳ Planned (`SendInvitation` method) |

---

## 4. Architecture

```
HTTP Request
    │
    ├─ POST /profile (CreateProfile)
    │       └─ go handler.notifSvc.NotifyRegistration(...)
    │                   └─ slack.SendRegistration
    │
    ├─ POST /quiz/submit (SubmitQuiz)
    │       └─ go notifSvc.NotifyQuizResult(...)
    │                   ├─ if emailNotifications:
    │                   │       ├─ createEmailJob (status: pending)
    │                   │       ├─ email.SendResult
    │                   │       └─ updateEmailJob (status: sent | failed)
    │                   └─ slack.SendQuizResult (always)
    │
    └─ POST /project/invitations (CreateInvitation)
            └─ go notifSvc.NotifyProjectInvitation(...)
                        └─ email.SendInvitation (always — no opt-in check)
                               → on success: update project_invitations/{token}.emailSentAt
                               → on failure: update project_invitations/{token}.emailError
```

All goroutines use `context.Background()` so they survive after the HTTP
response is written. No goroutine ever blocks the HTTP response.

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

## 6.3 Event: Project Invitation Sent

**Trigger:** `project.Handler.CreateInvitation` — after the `project_invitations/{token}`
document is successfully written.

```go
go h.notifSvc.NotifyProjectInvitation(
    context.Background(),
    notification.InvitationData{
        To:          req.Email,           // invitee email
        Token:       invitation.Token,
        ProjectName: project.Name,
        InviterName: callerProfile.DisplayName,
        Role:        req.Role,
        ExpiresAt:   invitation.ExpiresAt,
        JoinURL:     baseURL + "/join?token=" + invitation.Token,
    },
)
```

**Channel:** Email only. Uses the same `RESEND_API_KEY` as result emails.

**No `emailNotifications` gate.** The email is the invitation — it must always be sent.

**Email fields:**

| Field | Value |
|-------|-------|
| From | `FactorySync Solutions <noreply@factorysyncsolutions.com>` |
| To | Invitee's email (from `POST /project/invitations` body) |
| Subject | `{inviterName} invited you to join {projectName}` |
| Body | HTML — see §7.2 |

**Audit trail on `project_invitations/{token}`:**
Unlike quiz result emails (which use a separate `email_jobs` collection), invitation
email status is tracked directly on the invitation document:

| Field | Set when |
|-------|---------|
| `emailSentAt` | Email delivered successfully |
| `emailError` | Email failed — stores error string |

This avoids a separate collection and keeps the full invitation lifecycle in one document.

**Resend invitation:** the `[Resend]` button in the Members UI calls
`POST /api/v1/project/invitations/{token}/resend`. The backend creates a
**new** invitation token (old one is revoked) and fires a new goroutine.
It does not attempt to resend via the original token.

---

## 7. Email Templates

All HTML is assembled via `strings.Builder`. No external template engine.
English-only — see §12.2 for i18n open task.

### 7.1 Quiz Result Email (`buildResultEmailHTML`)

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

### 7.2 Invitation Email (`buildInvitationEmailHTML`)

**Subject:** `{inviterName} invited you to join {projectName}`

```
[FactorySync Solutions] (h1, blue #1a56db)

{inviterName} has invited you to join {projectName}
as a {roleName}.

┌──────────────────────────────────────────────────────┐
│  🏭  {projectName}                                    │
│  Role: {roleName}                                     │
│  Invited by: {inviterName}                            │
└──────────────────────────────────────────────────────┘

  [  Accept Invitation  ]   ← CTA button, link to joinURL

This invitation expires on {expiresAt} (7 days).
If you did not expect this invitation, you can ignore this email.

────────────────────────────────────────────────────────
FactorySync Solutions  ·  This email was sent to {to}
```

**Role display names** (English):

| `role` value | Displayed as |
|---|---|
| `owner` | Owner |
| `system_admin` | System Admin |
| `manager` | Manager |
| `general_user` | General User |

**CTA button:** primary blue (`#1a56db`), white text, 12px border-radius.
`href` = `joinURL` (e.g. `https://app.factorysyncsolutions.com/join?token=<uuid>`).

Inline CSS only. Max width 600px. Font: sans-serif.

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
| `RESEND_API_KEY` | No (email disabled if absent) | Resend API key — used for both result emails and invitation emails |
| `SLACK_WEBHOOK_REGISTRATION` | No (Slack skipped if empty) | Incoming webhook URL for registration events |
| `SLACK_WEBHOOK_QUIZ_RESULT` | No (Slack skipped if empty) | Incoming webhook URL for quiz result events |

All three can be absent simultaneously — the service degrades silently.

**Note:** Invitation emails share the same `RESEND_API_KEY`. If the key is absent,
invitation emails are silently skipped and `project_invitations/{token}.emailError`
is set to `"email client not configured"`. The invitation document (and its token
link) is still created — the inviter can share the join URL directly.

---

## 11. Failure Handling

| Failure point | Behaviour |
|---------------|-----------|
| Profile fetch fails before goroutine launch | Goroutine launched with empty strings; Slack posts with empty company; email skipped (empty `to` address) |
| `createEmailJob` Firestore write fails | Error logged; email send proceeds anyway |
| `email.SendResult` fails | Error logged; `EmailJob` updated to `"failed"` with error message |
| `updateEmailJob` Firestore write fails | Error logged; no retry |
| `email.SendInvitation` fails | Error logged; `project_invitations/{token}.emailError` updated |
| `emailSentAt` / `emailError` Firestore write fails | Error logged; token document may lack audit fields — invitation is still valid |
| `slack.post` HTTP request fails | Error logged; no retry |
| Slack returns non-200 | Error logged; no retry |
| Webhook URL is empty string | `SlackClient.post` returns `nil` immediately — no log, no error |
| `RESEND_API_KEY` absent | `emailClient == nil` → both result emails and invitation emails skipped silently; invitation token still created |

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

### 12.5 Resend Invitation endpoint

`POST /api/v1/project/invitations/{token}/resend` revokes the old token and
creates a new one, then fires a new invitation email goroutine. The backend
does NOT attempt to resend the original token — resend = new token + new email.
This keeps token expiry simple (each token has its own 7-day window from creation).

### 12.6 Registration Slack only — no email

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
- [ ] Creating an invitation via `POST /project/invitations` triggers an invitation email to the supplied address.
- [ ] The invitation email subject is `{inviterName} invited you to join {projectName}`.
- [ ] The email body contains the project name, role display name, inviter name, CTA button linking to `/join?token=<uuid>`, and expiry date.
- [ ] On successful email delivery, `project_invitations/{token}.emailSentAt` is populated.
- [ ] On email failure, `project_invitations/{token}.emailError` is populated and the invitation token is still valid.
- [ ] When `RESEND_API_KEY` is absent, the invitation document is still created; `emailError` is set to `"email client not configured"`.
- [ ] `POST /project/invitations/{token}/resend` revokes the original token, creates a new one, and sends a new invitation email.
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
