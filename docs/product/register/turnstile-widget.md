# Turnstile Widget

## Summary

Cloudflare Turnstile bot protection for the registration form. The widget component lives
at `apps/web-app/src/components/Turnstile.tsx`; the token is verified server-side by the
profile handler (`pkg/turnstile.go`) before any profile is created.

## Implementation

- The widget renders inside the registration form and yields a `turnstileToken` that is
  sent in the `POST /api/v1/profile` body.
- The form cannot submit without a token — a missing token shows the inline red banner
  "กรุณายืนยัน captcha".
- The backend verifies the token with Cloudflare; a failed verification responds
  `400 CAPTCHA_FAILED` and the frontend fires `registration_error`.

### Skip behaviour (config-gated)

When `VITE_CF_TURNSTILE_SITE_KEY` is **absent**, Turnstile is skipped entirely: the widget
is not rendered and the form submits with the placeholder token `"skip-for-now"`
([feature-spec.md § 8](./feature-spec.md#8-backend-api)). This is the local-dev path — the
widget must be active in production.

## Configuration

| Env var | Description |
|---------|-------------|
| `VITE_CF_TURNSTILE_SITE_KEY` | Cloudflare Turnstile site key (web-app build-time). Absent → widget skipped |

The matching server-side secret is backend configuration (`pkg/turnstile.go`); secrets are
git-ignored per project rules — never committed.

## Usage

Call site: `apps/web-app/src/pages/RegisterPage.tsx`.

```
# pseudocode — form submit gate
if VITE_CF_TURNSTILE_SITE_KEY set:
    render <Turnstile onToken={t => turnstileToken = t} />
    submit requires turnstileToken   → else red banner
else:
    turnstileToken = "skip-for-now"
```

```
# pseudocode — handler verifies before create
ok := turnstile.Verify(ctx, token)
if !ok → pkg.RespondError(w, 400, "CAPTCHA_FAILED", msg)
```

## Acceptance Criteria

- Given `VITE_CF_TURNSTILE_SITE_KEY` is set, when `/register` renders, then the Turnstile widget is shown and submit is blocked until a valid token exists.
- Given a missing/failed token, when the form is submitted, then the API responds `400 CAPTCHA_FAILED` and an inline red banner is shown.
- Given the site key is absent (local dev), when the form is submitted, then the widget is skipped and registration proceeds with the placeholder token.

## Status

- [x] `Turnstile.tsx` widget component
- [x] Server-side verification wired into `POST /profile` (`pkg/turnstile.go`)
- [x] Skip-when-unconfigured behaviour
- [x] Tests — Turnstile-failure path in `handler_test.go`

---

*Version: 1.0.0*
*Last updated: 3 July 2026*
