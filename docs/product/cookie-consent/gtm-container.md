# GTM Container Configuration

## Summary

The one-time Google Tag Manager setup (done in the GTM UI, not in code) that the
[consent-mode.md](./consent-mode.md) bootstrap points at. GTM was chosen over wiring GA4
directly with `gtag.js` so marketing can add ad/remarketing tags later without a redeploy —
GA4 runs **as a tag inside the container**.

## Implementation

One-time steps (from [feature-spec.md §7](./feature-spec.md#7-gtm-container-configuration-one-time-in-the-gtm-ui)):

1. Create a Web container; the `GTM-XXXXXXX` ID becomes `PUBLIC_GTM_ID` / `VITE_GTM_ID`.
2. Enable **Consent Mode** (Container Settings → "Enable consent overview").
3. Add the **GA4 Configuration tag** (GA4 Measurement ID), firing on Initialization —
   **no additional consent checks**.
4. Google Ads / Floodlight tags added later follow the same rule (built-in checks).
5. **Third-party marketing tags** (Meta Pixel, LinkedIn Insight, …) have no built-in
   Consent Mode support → these **do** get additional consent checks (`ad_storage`,
   `ad_user_data`, `ad_personalization`) and need a consent-grant `dataLayer` event as a
   firing trigger if they must fire on the consenting page itself.
6. The built-in Consent Initialization trigger fires first — the `default` call already ran
   in the head before GTM loaded, so GTM reads the correct state.
7. Publish, then verify with GTM Preview / Tag Assistant.

### Why no additional consent checks on Google tags (non-obvious)

GA4 has built-in Consent Mode support (advanced mode): while `analytics_storage` is
`denied` it sends only cookieless pings and writes no cookies; on `consent('update')` to
`granted` it dispatches the granted hit immediately on the current page. An additional
consent check would block the tag entirely — and a blocked tag is **not** retroactively
fired on grant, so the first page's `page_view` would be lost until the next navigation.
Additional checks are reserved for third-party tags only.

## Configuration

| Setting | Value |
|---------|-------|
| Container type | Web |
| Container ID → env | `PUBLIC_GTM_ID` (web-official) · `VITE_GTM_ID` (web-app) — production only, never committed |
| GA4 tag | Configuration tag, Initialization trigger, no extra consent checks |
| Consent overview | Enabled |

## Acceptance Criteria

- Given consent is denied, when browsing, then GA4 pings carry `gcs=G100` and no `_ga*` cookie is set (verify in GTM Preview / Tag Assistant).
- Given Accept All, when the update fires, then the hit carries `gcs=G111` and the `_ga` cookie appears.
- Given a third-party marketing tag is added later, when configured, then it carries additional consent checks on the `ad_*` signals and a consent-grant `dataLayer` trigger.

## Status

- [ ] Web container created; ID provisioned to production env vars
- [ ] Consent overview enabled
- [ ] GA4 Configuration tag added (Initialization trigger, no additional checks)
- [ ] Published and verified (`gcs=G100` denied / `gcs=G111` granted)

---

*Version: 1.0.0*
*Last updated: 4 July 2026*
