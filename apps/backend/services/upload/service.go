package upload

import (
	"bytes"
	"context"
	"errors"
	"fmt"
	"image"
	_ "image/gif"
	_ "image/jpeg"
	_ "image/png"
	"net/url"
	"os"
	"strings"
	"time"

	"cloud.google.com/go/firestore"
	"github.com/chai2010/webp"
	"github.com/gabriel-vasile/mimetype"
	"golang.org/x/image/draw"
	"google.golang.org/grpc/codes"
	"google.golang.org/grpc/status"
)

const (
	avatarKey          = "avatars/%s/profile.webp"
	avatarContentType  = "image/webp"
	avatarCacheControl = "public, max-age=3600"
)

var (
	ErrUploadDisabled  = errors.New("upload service is not configured")
	ErrFileTooLarge    = errors.New("file exceeds maximum size")
	ErrInvalidFileType = errors.New("unsupported file type")
	ErrInvalidImage    = errors.New("invalid image")
	ErrProfileNotFound = errors.New("profile not found")
)

type Service struct {
	store         ObjectStore
	firestore     *firestore.Client
	publicBucket  string
	publicBaseURL string
	disabledErr   error
}

func NewService(store ObjectStore, firestoreClient *firestore.Client, publicBucket, publicBaseURL string) *Service {
	return &Service{
		store:         store,
		firestore:     firestoreClient,
		publicBucket:  publicBucket,
		publicBaseURL: strings.TrimRight(publicBaseURL, "/"),
	}
}

func NewServiceFromEnv(firestoreClient *firestore.Client) *Service {
	accountID := strings.TrimSpace(os.Getenv("R2_ACCOUNT_ID"))
	accessKeyID := strings.TrimSpace(os.Getenv("R2_ACCESS_KEY_ID"))
	accessKeySecret := strings.TrimSpace(os.Getenv("R2_ACCESS_KEY_SECRET"))
	publicBucket := strings.TrimSpace(os.Getenv("R2_PUBLIC_BUCKET"))
	if publicBucket == "" {
		publicBucket = strings.TrimSpace(os.Getenv("R2_BUCKET"))
	}
	publicBaseURL := strings.TrimSpace(os.Getenv("R2_PUBLIC_BASE_URL"))

	missing := make([]string, 0)
	for name, value := range map[string]string{
		"R2_ACCOUNT_ID":        accountID,
		"R2_ACCESS_KEY_ID":     accessKeyID,
		"R2_ACCESS_KEY_SECRET": accessKeySecret,
		"R2_PUBLIC_BUCKET":     publicBucket,
		"R2_PUBLIC_BASE_URL":   publicBaseURL,
	} {
		if value == "" {
			missing = append(missing, name)
		}
	}
	if len(missing) > 0 {
		return &Service{disabledErr: fmt.Errorf("%w: missing %s", ErrUploadDisabled, strings.Join(missing, ", "))}
	}

	store, err := NewR2Store(accountID, accessKeyID, accessKeySecret)
	if err != nil {
		return &Service{disabledErr: fmt.Errorf("%w: %v", ErrUploadDisabled, err)}
	}
	return NewService(store, firestoreClient, publicBucket, publicBaseURL)
}

func (s *Service) DisabledReason() string {
	if s == nil || s.disabledErr == nil {
		return ""
	}
	return s.disabledErr.Error()
}

func (s *Service) UploadAvatar(ctx context.Context, uid string, data []byte) (*AvatarResponse, error) {
	if err := s.ensureConfigured(); err != nil {
		return nil, err
	}
	if len(data) > AvatarMaxBytes {
		return nil, ErrFileTooLarge
	}

	contentType := mimetype.Detect(data).String()
	if !isAllowedAvatarType(contentType) {
		return nil, ErrInvalidFileType
	}

	img, err := decodeImage(data, contentType)
	if err != nil {
		return nil, fmt.Errorf("decode avatar: %w", ErrInvalidImage)
	}

	encoded, err := encodeAvatarWebP(img)
	if err != nil {
		return nil, fmt.Errorf("encode avatar: %w", err)
	}

	key := fmt.Sprintf(avatarKey, uid)
	if err := s.store.PutObject(ctx, s.publicBucket, key, encoded, avatarContentType, avatarCacheControl); err != nil {
		return nil, fmt.Errorf("upload avatar to r2: %w", err)
	}

	avatarURL := s.publicBaseURL + "/" + url.PathEscape("avatars") + "/" + url.PathEscape(uid) + "/" + url.PathEscape("profile.webp")
	if err := s.updateAvatarURL(ctx, uid, avatarURL); err != nil {
		return nil, err
	}

	return &AvatarResponse{
		AvatarURL:     avatarURL,
		ContentType:   avatarContentType,
		FileSizeBytes: int64(len(encoded)),
	}, nil
}

func (s *Service) DeleteAvatar(ctx context.Context, uid string) error {
	if err := s.ensureConfigured(); err != nil {
		return err
	}

	key := fmt.Sprintf(avatarKey, uid)
	if err := s.store.DeleteObject(ctx, s.publicBucket, key); err != nil {
		return fmt.Errorf("delete avatar from r2: %w", err)
	}
	if err := s.updateAvatarURL(ctx, uid, ""); err != nil {
		return err
	}
	return nil
}

func (s *Service) ensureConfigured() error {
	if s == nil {
		return ErrUploadDisabled
	}
	if s.disabledErr != nil {
		return s.disabledErr
	}
	if s.store == nil || s.firestore == nil || s.publicBucket == "" || s.publicBaseURL == "" {
		return ErrUploadDisabled
	}
	return nil
}

func (s *Service) updateAvatarURL(ctx context.Context, uid, avatarURL string) error {
	_, err := s.firestore.Collection("users").Doc(uid).Update(ctx, []firestore.Update{
		{Path: "avatarURL", Value: avatarURL},
		{Path: "updatedAt", Value: time.Now().UTC().Format(time.RFC3339)},
	})
	if err != nil {
		if status.Code(err) == codes.NotFound {
			return ErrProfileNotFound
		}
		return fmt.Errorf("update profile avatar url: %w", err)
	}
	return nil
}

func isAllowedAvatarType(contentType string) bool {
	switch contentType {
	case "image/jpeg", "image/png", "image/webp", "image/gif":
		return true
	default:
		return false
	}
}

func decodeImage(data []byte, contentType string) (image.Image, error) {
	if contentType == "image/webp" {
		img, err := webp.Decode(bytes.NewReader(data))
		if err != nil {
			return nil, fmt.Errorf("decode webp: %w", err)
		}
		return img, nil
	}

	img, _, err := image.Decode(bytes.NewReader(data))
	if err != nil {
		return nil, fmt.Errorf("decode image: %w", err)
	}
	return img, nil
}

func encodeAvatarWebP(src image.Image) ([]byte, error) {
	crop := centerCrop(src.Bounds())
	dst := image.NewRGBA(image.Rect(0, 0, avatarSize, avatarSize))
	draw.CatmullRom.Scale(dst, dst.Bounds(), src, crop, draw.Over, nil)

	var out bytes.Buffer
	if err := webp.Encode(&out, dst, &webp.Options{Quality: 85}); err != nil {
		return nil, fmt.Errorf("encode webp: %w", err)
	}
	return out.Bytes(), nil
}

func centerCrop(bounds image.Rectangle) image.Rectangle {
	width := bounds.Dx()
	height := bounds.Dy()
	size := width
	if height < size {
		size = height
	}
	x0 := bounds.Min.X + (width-size)/2
	y0 := bounds.Min.Y + (height-size)/2
	return image.Rect(x0, y0, x0+size, y0+size)
}
