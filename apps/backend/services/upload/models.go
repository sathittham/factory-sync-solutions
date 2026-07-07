package upload

const (
	AvatarMaxBytes = 2 * 1024 * 1024
	avatarSize     = 256

	// GeneralFileMaxBytes is the largest size allowed across all general
	// upload categories (currently PDF) — used to bound the request body
	// before the per-category limit is known.
	GeneralFileMaxBytes = 50 * 1024 * 1024
)

type AvatarResponse struct {
	AvatarURL     string `json:"avatarURL"`
	ContentType   string `json:"contentType"`
	FileSizeBytes int64  `json:"fileSizeBytes"`
}

// FileResponse is returned by the general-purpose backoffice upload utility.
type FileResponse struct {
	FileURL          string `json:"fileURL"`
	OriginalFilename string `json:"originalFilename"`
	ContentType      string `json:"contentType"`
	FileSizeBytes    int64  `json:"fileSizeBytes"`
}

// generalUploadMaxBytes caps each allowed MIME type at its category max —
// mirrors the allowlist in docs/product/upload/feature-spec.md § MIME Type
// Allowlist (general image / PDF / spreadsheet rows only; avatar has its own
// tighter limit above).
var generalUploadMaxBytes = map[string]int64{
	"image/jpeg":               10 * 1024 * 1024,
	"image/png":                10 * 1024 * 1024,
	"image/webp":               10 * 1024 * 1024,
	"image/gif":                10 * 1024 * 1024,
	"application/pdf":          50 * 1024 * 1024,
	"application/vnd.ms-excel": 25 * 1024 * 1024,
	"application/vnd.openxmlformats-officedocument.spreadsheetml.sheet": 25 * 1024 * 1024,
}

// generalUploadExtensions maps an allowed content type to the extension used
// for the server-generated storage filename.
var generalUploadExtensions = map[string]string{
	"image/jpeg":               ".jpg",
	"image/png":                ".png",
	"image/webp":               ".webp",
	"image/gif":                ".gif",
	"application/pdf":          ".pdf",
	"application/vnd.ms-excel": ".xls",
	"application/vnd.openxmlformats-officedocument.spreadsheetml.sheet": ".xlsx",
}
