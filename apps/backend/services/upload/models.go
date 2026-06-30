package upload

const (
	AvatarMaxBytes = 2 * 1024 * 1024
	avatarSize     = 256
)

type AvatarResponse struct {
	AvatarURL     string `json:"avatarURL"`
	ContentType   string `json:"contentType"`
	FileSizeBytes int64  `json:"fileSizeBytes"`
}
