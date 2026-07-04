# Status

> Tracks build progress for the Notification Service feature against
> [README.md](./README.md). Design detail is in [README.md](./README.md), requirements in
> [feature-spec.md](./feature-spec.md), and the per-component sub-docs.
>
> **Status legend:** ✅ done · ⚠️ partial · 📝 planning · ❌ not started (checklists use `[x]` / `[ ]`)

---

## Table of Contents

- [Current State](#current-state)
- [Build Checklist](#build-checklist)
- [Future Work](#future-work)
- [Related Documents](#related-documents)

---

## Current State

**Shipped end to end.** All three events are live: registration posts to Slack, quiz
submission sends the opt-in result email plus an always-on Slack post, and member
invitations send a bilingual (TH + EN) email with a 24-hour-expiring, single-use password
setup link. Every result-email attempt is audited in the `email_jobs` Firestore
collection (`pending → sent | failed`). Failure isolation works as designed — a broken
Resend key or Slack webhook is logged and never fails the calling API request, and each
channel degrades gracefully when its env var is absent (`RESEND_API_KEY`,
`SLACK_WEBHOOK_REGISTRATION`, `SLACK_WEBHOOK_QUIZ_RESULT`).

Known deliberate gaps (tracked as future work, not partial implementation): no retry of
failed emails, no self-service opt-out / unsubscribe link (`emailNotifications` is
admin-managed), the result email is English-only, and registration sends no welcome email.

One honesty note on tests: the dedicated suites described in
[feature-spec.md § 14](./feature-spec.md#14-testing) (`service_test.go`,
`email_invite_test.go`, `email_result_test.go`) are **not present on disk** under
`apps/backend/services/notification/` — no Go coverage number to record for this service
yet.

---

## Build Checklist

Single phase — mirrors [feature-spec.md § 3](./feature-spec.md#3-current-state):

- [x] Notification service — `apps/backend/services/notification/service.go`
- [x] Email client (transport) — `services/notification/email.go`
- [x] Invitation email template (bilingual) — `services/notification/email_invite.go`
- [x] Result email template — `services/notification/email_result.go`
- [x] Slack client — `services/notification/slack.go`
- [x] `EmailJob` model — `services/notification/models.go`
- [x] Service wiring (nil email client when `RESEND_API_KEY` absent) — `apps/backend/main.go`
- [x] Registration trigger — `services/profile/handler.go` (`CreateProfile`)
- [x] Quiz result trigger — `services/quiz/handler.go` (`SubmitQuiz`)
- [x] Invitation trigger (invite + resend) — `services/admin/handler.go`
- [ ] Resend self-service retry — not implemented
- [ ] User unsubscribe endpoint — not implemented

### Tests

Described in [feature-spec.md § 14](./feature-spec.md#14-testing); suites not yet on disk:

- [ ] `services/notification/service_test.go` — event orchestration, opt-in gating, nil-client guard
- [ ] `services/notification/email_invite_test.go` — TH/EN sections, role names, `expiresAt` formatting
- [ ] `services/notification/email_result_test.go` — strengths/weaknesses section omission
- [ ] Integration — `email_jobs` doc reaches `status: "sent"` after opted-in quiz submit

Coverage recorded:

- [ ] `go test ./services/notification/... -cover` → **no suite yet**

---

## Future Work

Mirrors [README.md § Open Items & Future Work](./README.md#open-items--future-work); all ❌ not started.

- [ ] Email retry / dead-letter worker for `email_jobs` with `status: "failed"`
- [ ] `PUT /api/v1/profile/notifications` self-service opt-out + signed one-click unsubscribe link in the email footer
- [ ] Bilingual result email (parity with the invitation email)
- [ ] Welcome email on registration (`email.SendRegistration`)

---

## Related Documents

- [README.md](./README.md) · [feature-spec.md](./feature-spec.md) · [email-channel.md](./email-channel.md) · [slack-channel.md](./slack-channel.md)
- [docs/iso29110/progress-log.md](../../iso29110/progress-log.md) · [risk-register.md](../../iso29110/risk-register.md)

---

*Version: 1.0.0*
*Last updated: 3 July 2026*
