# QR Code Generation

## Summary

Planned QR generator for the shortlink service — every shortlink gets an SVG QR code
embedding its short URL, generated at creation time and stored on the Firestore document.
Lives at `apps/backend/services/shortlink/qrcode.go`. **Not started**; contract from
[feature-spec.md § 8](./feature-spec.md#8-qr-code-generation).

## Implementation

- Generated as an SVG string using `github.com/skip2/go-qrcode` or a similar lightweight
  library, at shortlink-creation time (inside `CreateShortlink`).
- Specifications:

| Property | Value |
|----------|-------|
| Size | 200 × 200 px |
| Error correction | Medium (15%) |
| Colours | Black on white |
| Format | SVG (scalable, lightweight) |
| Embedded data | Full short URL — `https://fs.link/{slug}` |

- **Storage:** the SVG string is stored in the `shortlinks/{shortlinkID}.qrCodeSVG` field —
  immutable after creation, returned in every shortlink response.
- **Download:** the frontend offers the SVG as a file download named `qrcode-{slug}.svg`
  (`ShortlinkList` "Download QR" button).

## Usage

```
# pseudocode — inside CreateShortlink
svg, err := generateQRCodeSVG(shortURL, size: 200, ec: medium)
if err → return fmt.Errorf("generate qr code: %w", err)
doc.qrCodeSVG = svg
```

```
# pseudocode — frontend download
onDownloadQR(shortlink):
    blob = new Blob([shortlink.qrCodeSVG], type "image/svg+xml")
    saveAs(blob, "qrcode-" + shortlink.slug + ".svg")
```

## Acceptance Criteria

- Given a shortlink creation, when it succeeds, then the response includes a valid `qrCodeSVG` encoding `https://fs.link/{slug}`.
- Given a generated QR code, when scanned, then the device resolves `/s/:slug` and is redirected to the original URL.
- Given the list UI, when "Download QR" is clicked, then a file named `qrcode-{slug}.svg` downloads.

## Status

All ❌ — see [status.md](./status.md).

- [ ] `qrcode.go` — SVG generation
- [ ] Wired into `CreateShortlink` + stored on the document
- [ ] Frontend download button (`ShortlinkList.tsx`)
- [ ] Tests — "generates valid QR code SVG" case in `service_test.go`

---

*Version: 1.0.0*
*Last updated: 3 July 2026*
