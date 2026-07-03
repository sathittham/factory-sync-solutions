# Email Channel — Resend (backend)

## Summary

The email side of the notification service: a Resend-backed transport
(`services/notification/email.go`) with two HTML templates — the assessment result email
(`email_result.go`, English-only) and the bilingual invitation email (`email_invite.go`)
— plus the `email_jobs` Firestore audit trail for result emails.

## Implementation

- `notification.NewEmailClient(apiKey, from) *EmailClient` — constructed in `main.go`
  **only when** `RESEND_API_KEY` is set; otherwise the service holds `nil` and both send
  paths guard with `if s.email != nil` (silent skip, warn log).
- `email.SendResult(to, …) error` — sends the result email. From:
  `FactorySync Solutions <no-reply@factorysyncsolutions.com>`; subject:
  `FactorySync Solutions Result — {diagnosis} ({score:.2f}/5.00)`.
- `email.SendInvitation(to, inviterEmail, companyName, role, expiresAt, link) error` —
  sends the bilingual invitation. **Never gated by `emailNotifications`** — the email is
  the invitation itself.
- All HTML is assembled via `html/template` (auto-escaping), inline CSS only (email-client
  compatibility), max width 600 px, sans-serif.

### Result email (`email_result.go`)

Header (blue `#1a56db`) → greeting with `{contactName}` / `{companyName}` → overall score
card (`3.47 / 5.00` + diagnosis) → dimension-scores table → Strengths list (omitted when
empty) → Areas for Improvement list (omitted when empty) → generated-on footer.
English-only today (future work: bilingual parity with the invitation email).

### Invitation email (`email_invite.go`)

Bilingual subject: `คุณได้รับคำเชิญเข้าร่วม FactorySync Solutions / You've been invited to
FactorySync Solutions`. Blue-branded header, TH section then EN section (inviter email,
company name, role display name in blue), CTA button, expiry warning, "ignore if not
requested" footer. `{expiresAt}` renders as `"2 Jan 2006 15:04 UTC"`.

| `role` key | TH | EN |
|---|---|---|
| `owner` | เจ้าของ | Owner |
| `system_admin` | ผู้ดูแลระบบ | System Admin |
| `manager` | ผู้จัดการ | Manager |
| `user` (default) | สมาชิก | Member |

CTA `href` = branded `/auth/action` password setup link: the backend generates a Firebase
password-reset link (`authClient.PasswordResetLinkWithSettings`), then rewrites it to the
authenticated app's `/auth/action` route preserving Firebase's `oobCode` and related
query parameters. The link expires 24 hours from (re)send — enforced via
`invitations/{uid}.expiresAt` at accept time, not inside the email.

### `email_jobs` audit trail (result emails only)

```
# pseudocode — inside the NotifyQuizResult goroutine, when emailNotifications is true
jobID = uuid()
write email_jobs/{jobID} { status: "pending", uid, assessmentId, createdAt }
err = email.SendResult(...)
if err == nil → update { status: "sent",   sentAt }
else          → update { status: "failed", error: err.Error() }
```

A failed `createEmailJob` write is logged and the send proceeds anyway; a failed update is
logged with no retry. Invitation and registration events create no `email_jobs` docs.

## Configuration

| Env var | Description |
|---------|-------------|
| `RESEND_API_KEY` | Resend API key, shared by result + invitation emails; email silently disabled when absent |

## Usage

Call sites: `services/notification/service.go` (`NotifyQuizResult` goroutine,
`SendInvitation` synchronous); wiring in `apps/backend/main.go`.

```
# pseudocode — wiring (main.go)
if RESEND_API_KEY set → emailClient = NewEmailClient(key, "FactorySync Solutions <no-reply@…>")
else                  → emailClient = nil
notifSvc = notification.NewService(emailClient, slackClient, firestoreClient)
```

Failures never surface to the API caller — every error is logged and swallowed inside the
notification path.

## Acceptance Criteria

- Given `emailNotifications: true`, when a quiz is submitted, then the result email is sent and an `email_jobs` doc transitions `pending → sent`.
- Given `emailNotifications: false`, when a quiz is submitted, then no email is sent (Slack still fires).
- Given a Resend API failure, when the result email fails, then the `email_jobs` doc reads `status: "failed"` and the quiz endpoint still succeeds.
- Given a member invitation (or resend), when processed, then a bilingual email with role display names, CTA link, and expiry timestamp is sent — regardless of `emailNotifications`.
- Given `RESEND_API_KEY` is absent, when either event fires, then no send is attempted, no `email_jobs` doc is created, and the invitation doc is still written.

## Status

- [x] `email.go` transport + `email_result.go` + `email_invite.go` implemented
- [x] `email_jobs` audit trail wired into `NotifyQuizResult`
- [x] Nil-client graceful degradation wired in `main.go`
- [ ] Template test suites (`email_invite_test.go`, `email_result_test.go`) — described in [feature-spec.md § 14](./feature-spec.md#14-testing), not yet on disk
- [ ] Bilingual result email · unsubscribe link (future work)

---

*Version: 1.0.0*
*Last updated: 3 July 2026*
