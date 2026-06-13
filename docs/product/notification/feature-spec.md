---
version: 1.2.0
lastUpdated: 2026-06-13
author: Sathittham Sangthong
status: Done
---

# Notification Service — Feature Spec

> Backend-only service that sends notifications across two channels (email via
> Resend, Slack via Incoming Webhooks). All notifications are fire-and-forget —
> failures are logged but never surface to the API caller.

---

## 1. Summary

The notification service (`apps/fs-backend/services/notification/`) is a pure
backend service with no frontend surface. It fires three events:

| Event | Email | Slack |
|-------|-------|-------|
| **New registration** | — | ✅ Always |
| **Quiz result submitted** | ✅ Opt-in (user's `emailNotifications` flag) | ✅ Always |
| **Member invitation sent** | ✅ Always (email IS the delivery mechanism) | — |

**Key design choices:**

- **Fire-and-forget** — invitation and notification calls are synchronous on the
  goroutine that calls them, but the HTTP response is never blocked by failures.
  Failures are only logged.
- **Email is opt-in** — the `emailNotifications` boolean on the user's profile
  gates result emails. Slack notifications bypass this flag.
- **Graceful degradation** — if `RESEND_API_KEY` is not set, `EmailClient` is
  `nil` and email is silently skipped.
- **Email job audit trail** — every attempted result email creates an
  `email_jobs` Firestore document tracking `pending → sent | failed`.
- **Invitation email is not gated** — the email IS the invitation; it always
  sends regardless of `emailNotifications`.

---

## 2. Goals & Non-Goals

### Goals

- Notify the internal team on every new user registration (Slack).
- Deliver a formatted assessment result email to the user after quiz submission,
  if they opted in.
- Notify the internal team on every quiz result (Slack).
- Persist an `EmailJob` record per email attempt for auditability.
- Isolate failures so that a broken Resend/Slack config never fails an API request.
- Send a bilingual (TH + EN) invitation email with company name, role, and a
  24-hour expiry notice when a member is invited.

### Non-Goals

- Frontend notification UI (in-app toasts or notification bell).
- Scheduling / queuing / retrying failed emails (fire-and-forget only).
- User-facing unsubscribe link or preference management via API.
- Marketing / campaign emails (only transactional events are handled here).
- SMS or push notifications.

---

## 3. Current State

| Component | Location | Status |
|-----------|----------|--------|
| Notification service | `services/notification/service.go` | ✅ Built |
| Email client (transport) | `services/notification/email.go` | ✅ Built |
| Invitation email template | `services/notification/email_invite.go` | ✅ Built |
| Result email template | `services/notification/email_result.go` | ✅ Built |
| Slack client | `services/notification/slack.go` | ✅ Built |
| `EmailJob` model | `services/notification/models.go` | ✅ Built |
| Service wiring | `apps/fs-backend/main.go` | ✅ Built |
| Registration trigger | `services/profile/handler.go` `CreateProfile` | ✅ Built |
| Quiz result trigger | `services/quiz/handler.go` `SubmitQuiz` | ✅ Built |
| Invitation trigger | `services/admin/handler.go` `InviteMember` | ✅ Built |
| Resend self-service retry | — | ❌ Not implemented |
| User unsubscribe endpoint | — | ❌ Not implemented |

---

## 4. Architecture

```
HTTP Request
    │
    ├─ POST /profile (CreateProfile)
    │       └─ go notifSvc.NotifyRegistration(...)
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
    └─ POST /admin/invitations (InviteMember)
            └─ notifSvc.SendInvitation(...)   ← synchronous, not a goroutine
                        └─ email.SendInvitation (always — no opt-in check)
```

`SendInvitation` is called synchronously (not in a goroutine) because its
failure is only logged — it does not block or change the HTTP response.

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
| From | `FactorySync Solutions <no-reply@factorysyncsolutions.com>` |
| To | user's `contactEmail` |
| Subject | `FactorySync Solutions Result — {diagnosis} ({score:.2f}/5.00)` |
| Body | HTML — see §7.1 |

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

---

## 6.3 Event: Member Invitation Sent

**Trigger:** `admin.Handler.InviteMember` (`POST /api/v1/admin/invitations`) and
`admin.Handler.ResendInvitation` (`POST /api/v1/manage/invitations/{uid}/resend`)
— after the Firebase Auth user is created/resolved and the `invitations/{uid}`
Firestore document is written.

```go
notifSvc.SendInvitation(
    ctx,
    req.Email,           // to
    inviterEmail,        // from whom
    inviterSnapshot.CompanyName,
    req.Role,
    expiresAt,           // time.Time — now + 24h
    link,                // Firebase password-reset link
)
```

**Channel:** Email only. Uses the same `RESEND_API_KEY` as result emails.

**No `emailNotifications` gate.** The email is the invitation — it must always be sent.

**Expiry:** The link expires **24 hours** from the time of invite (or resend). The
`expiresAt` timestamp is stored on the `invitations/{uid}` Firestore document and
checked by `AcceptInvitation`. A resend resets the expiry to a fresh 24 hours.

**Email fields:**

| Field | Value |
|-------|-------|
| From | `FactorySync Solutions <no-reply@factorysyncsolutions.com>` |
| To | Invitee's email |
| Subject | `คุณได้รับคำเชิญเข้าร่วม FactorySync Solutions / You've been invited to FactorySync Solutions` |
| Body | Bilingual HTML — see §7.2 |

**Firestore `invitations/{uid}` document fields set at invite time:**

| Field | Value |
|-------|-------|
| `uid` | Firebase UID of the invited user |
| `email` | Invitee's email |
| `role` | Role key (e.g. `"manager"`) |
| `invitedBy` | Inviter's email |
| `invitedAt` | ISO 8601 (UTC) |
| `expiresAt` | ISO 8601 (UTC) — `invitedAt + 24h` |
| `companyName` | Snapshot from inviter's profile |
| `companyRegId` | Snapshot from inviter's profile |
| `industryType` | Snapshot from inviter's profile |
| `companySize` | Snapshot from inviter's profile |

The document is deleted when the invitee accepts (`AcceptInvitation`), making
the invitation single-use.

---

## 7. Email Templates

All HTML is assembled via `html/template` (auto-escaping). Files are split by
email type under `services/notification/`.

### 7.1 Quiz Result Email (`email_result.go`)

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
│ …                         │ …      │
└───────────────────────────┴────────┘

Strengths          ← omitted if empty
• Quality Control & Assurance

Areas for Improvement   ← omitted if empty
• Cost Control

────────────────────────────────────────
This report was generated on 2026-06-10. FactorySync Solutions.
```

Inline CSS only (email client compatibility). Max width 600 px. Font: sans-serif.

---

### 7.2 Invitation Email (`email_invite.go`)

**Subject:** `คุณได้รับคำเชิญเข้าร่วม FactorySync Solutions / You've been invited to FactorySync Solutions`

**Structure:**

```
┌─────────────────────────────────────────────┐ ← blue header #1a56db
│  FactorySync Solutions                      │
│  ระบบประเมินสุขภาพโรงงาน                    │
└─────────────────────────────────────────────┘

คุณได้รับคำเชิญ!
{inviterEmail} ได้เชิญคุณเข้าร่วม {companyName} บน FactorySync Solutions
บทบาทของคุณ: {roleTH}          ← blue

────────────────────────────────────────────
{inviterEmail} has invited you to join {companyName} on FactorySync Solutions.
Your role: {roleEN}              ← blue

        [ ตั้งรหัสผ่านและเข้าสู่ระบบ ]   ← CTA button
          Set password & sign in

⚠️ ลิงก์นี้จะหมดอายุวันที่ {expiresAt}
   This link expires on {expiresAt}

────────────────────────────────────────────
หากคุณไม่ได้ร้องขอ กรุณาเพิกเฉยต่ออีเมลนี้
If you didn't request this, please ignore this email.

FactorySync Solutions — ระบบประเมินสุขภาพโรงงาน / Factory Health Assessment Platform
```

**`{expiresAt}` format:** `"2 Jan 2006 15:04 UTC"` (e.g. `14 Jun 2026 10:30 UTC`)

**Role display names:**

| `role` key | Thai (`{roleTH}`) | English (`{roleEN}`) |
|---|---|---|
| `owner` | เจ้าของ | Owner |
| `system_admin` | ผู้ดูแลระบบ | System Admin |
| `manager` | ผู้จัดการ | Manager |
| `user` (default) | สมาชิก | Member |

**CTA button:** `href` = Firebase password-reset link (generated by
`authClient.PasswordResetLinkWithSettings`). Primary blue `#1a56db`, white text,
8px border-radius.

Inline CSS only. Max width 600 px. Font: Helvetica/Arial/sans-serif.

---

## 8. `EmailJob` Document (`email_jobs/{uuid}`)

Persisted in Firestore for every **result** email attempt only (not for
invitation or registration events).

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

---

## 9. Service Wiring (`main.go`)

```go
var emailClient *notification.EmailClient
if apiKey := os.Getenv("RESEND_API_KEY"); apiKey != "" {
    emailClient = notification.NewEmailClient(apiKey, "FactorySync Solutions <no-reply@factorysyncsolutions.com>")
}
slackClient := notification.NewSlackClient()
notifSvc := notification.NewService(emailClient, slackClient, firestoreClient)
```

`emailClient` is `nil` when `RESEND_API_KEY` is absent. Both `NotifyQuizResult`
and `SendInvitation` guard with `if s.email != nil`.

---

## 10. Environment Variables

| Variable | Required | Purpose |
|----------|----------|---------|
| `RESEND_API_KEY` | No (email disabled if absent) | Resend API key — shared by result and invitation emails |
| `SLACK_WEBHOOK_REGISTRATION` | No (Slack skipped if empty) | Incoming webhook URL for registration events |
| `SLACK_WEBHOOK_QUIZ_RESULT` | No (Slack skipped if empty) | Incoming webhook URL for quiz result events |

---

## 11. Failure Handling

| Failure point | Behaviour |
|---------------|-----------|
| Profile fetch fails before goroutine launch | Goroutine launched with empty strings; Slack posts with empty company; email skipped |
| `createEmailJob` Firestore write fails | Error logged; email send proceeds anyway |
| `email.SendResult` fails | Error logged; `EmailJob` updated to `"failed"` |
| `updateEmailJob` Firestore write fails | Error logged; no retry |
| `email.SendInvitation` fails | Error logged; invitation doc and Firebase Auth user already exist — admin can resend |
| `slack.post` HTTP request fails | Error logged; no retry |
| Slack returns non-200 | Error logged; no retry |
| Webhook URL is empty string | `SlackClient.post` returns `nil` immediately |
| `RESEND_API_KEY` absent | `emailClient == nil` → invitation and result emails skipped silently |
| `AcceptInvitation` called after expiry | `410 INVITATION_EXPIRED` returned; Firestore doc is not deleted |

---

## 12. Open Tasks

### 12.1 Email retry / dead-letter queue

Failed result emails are recorded in Firestore (`status: "failed"`) but are never
retried. A background worker (Cloud Run Job, Cloud Tasks) could query
`email_jobs where status == "failed"` and retry up to N times.

### 12.2 Self-service email opt-out

No unsubscribe link exists in the result email footer. The `emailNotifications`
flag can only be changed by an admin. Add a
`PUT /api/v1/profile/notifications` endpoint so users can opt out without
contacting support. The email footer should include a signed one-click link.

### 12.3 Result email — bilingual

The result email (`email_result.go`) is English-only. The invitation email is
already bilingual. Options to bring parity: store locale at registration time,
or default to a bilingual layout matching the invitation email.

### 12.4 Registration — no email

New registrations send Slack only. A welcome email to the new user (or to the
admin team) could be added via `email.SendRegistration` if needed.

---

## 13. Acceptance Criteria

- [ ] A new user completing registration triggers a Slack message to `SLACK_WEBHOOK_REGISTRATION` containing company name, contact name, industry, and timestamp.
- [ ] A user with `emailNotifications: true` submitting a quiz receives an email from `no-reply@factorysyncsolutions.com` with subject `FactorySync Solutions Result — {diagnosis} ({score}/5.00)`.
- [ ] The result email contains: overall score, diagnosis, dimension scores table, strengths list (if any), weaknesses list (if any).
- [ ] A user with `emailNotifications: false` does not receive an email but the Slack post still fires.
- [ ] Submitting a quiz always posts to `SLACK_WEBHOOK_QUIZ_RESULT` with company, score, diagnosis, and timestamp.
- [ ] An `email_jobs` Firestore document is created for each result email attempt, transitioning from `pending` to `sent` or `failed`.
- [ ] A Resend API failure does not cause the quiz submission endpoint to return an error.
- [ ] A Slack webhook failure does not cause the quiz submission or registration endpoint to return an error.
- [ ] When `RESEND_API_KEY` is absent, no email attempt is made and no `email_jobs` document is created.
- [ ] `POST /api/v1/admin/invitations` sends a bilingual (TH + EN) invitation email to the supplied address.
- [ ] The invitation email subject is bilingual (TH + EN).
- [ ] The email body contains: inviter email, company name, role (TH + EN display names), CTA button (Firebase password-reset link), and expiry timestamp.
- [ ] The `invitations/{uid}` Firestore document stores `expiresAt` as `invitedAt + 24h`.
- [ ] `POST /api/v1/manage/invitations/{uid}/resend` resets `expiresAt` to a fresh 24 hours and sends a new invitation email.
- [ ] `POST /api/v1/invitations/accept` returns `410 INVITATION_EXPIRED` if the invitation's `expiresAt` is in the past.
- [ ] `POST /api/v1/invitations/accept` deletes the `invitations/{uid}` doc on success, making the invitation single-use.
- [ ] When `RESEND_API_KEY` is absent, `SendInvitation` is silently skipped; the invitation doc is still created.
- [ ] `make test-api` passes.

---

## 14. Testing

- **Unit (`service_test.go`):**
  - `NotifyRegistration` calls `SlackClient.SendRegistration` with the correct args.
  - `NotifyQuizResult` with `emailNotifications: true` calls `email.SendResult` and creates/updates an `EmailJob`.
  - `NotifyQuizResult` with `emailNotifications: false` skips email, still calls `slack.SendQuizResult`.
  - `SendInvitation` with `emailClient == nil` logs warn and returns without error.
- **Unit (`email_invite_test.go`):**
  - `buildInviteEmailHTML` renders both TH and EN sections.
  - Role display names map correctly for all four role values.
  - `expiresAt` appears formatted in the output.
- **Unit (`email_result_test.go`):**
  - `buildResultEmailHTML` with empty `strengths` omits the Strengths section.
  - `buildResultEmailHTML` with empty `weaknesses` omits the Areas for Improvement section.
- **Integration:**
  - Submit a quiz for a user with `emailNotifications: true` → assert `email_jobs` document exists with `status: "sent"`.

---

## 15. References

- Notification service: [service.go](../../../apps/fs-backend/services/notification/service.go)
- Email client (transport): [email.go](../../../apps/fs-backend/services/notification/email.go)
- Invitation email: [email_invite.go](../../../apps/fs-backend/services/notification/email_invite.go)
- Result email: [email_result.go](../../../apps/fs-backend/services/notification/email_result.go)
- Slack client: [slack.go](../../../apps/fs-backend/services/notification/slack.go)
- `EmailJob` model: [models.go](../../../apps/fs-backend/services/notification/models.go)
- Service wiring: [main.go](../../../apps/fs-backend/main.go)
- Invitation trigger: [admin/handler.go](../../../apps/fs-backend/services/admin/handler.go)
- Profile handler (registration trigger): [profile/handler.go](../../../apps/fs-backend/services/profile/handler.go)
- Quiz handler (quiz result trigger): [quiz/handler.go](../../../apps/fs-backend/services/quiz/handler.go)
- Admin API: [api/admin.md](../../api/admin.md)
