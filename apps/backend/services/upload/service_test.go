package upload

import (
	"context"
	"errors"
	"strings"
	"testing"
)

type fakePut struct {
	bucket, key, contentType, cacheControl string
	body                                   []byte
}

type fakeStore struct {
	putErr error
	puts   []fakePut
}

func (f *fakeStore) PutObject(_ context.Context, bucket, key string, body []byte, contentType, cacheControl string) error {
	if f.putErr != nil {
		return f.putErr
	}
	f.puts = append(f.puts, fakePut{bucket: bucket, key: key, body: body, contentType: contentType, cacheControl: cacheControl})
	return nil
}

func (f *fakeStore) DeleteObject(_ context.Context, _, _ string) error {
	return nil
}

func pngBytes(extra int) []byte {
	return append([]byte{0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a}, make([]byte, extra)...)
}

func TestUploadFile_ValidatesAndUploads(t *testing.T) {
	store := &fakeStore{}
	svc := NewService(store, nil, "public-bucket", "https://cdn.example.com")

	png := pngBytes(100)
	resp, err := svc.UploadFile(context.Background(), "../weird/name.png", png)
	if err != nil {
		t.Fatalf("UploadFile() error = %v", err)
	}
	if resp.ContentType != "image/png" {
		t.Errorf("ContentType = %s, want image/png", resp.ContentType)
	}
	if resp.OriginalFilename != "name.png" {
		t.Errorf("OriginalFilename = %s, want name.png (path stripped)", resp.OriginalFilename)
	}
	if resp.FileSizeBytes != int64(len(png)) {
		t.Errorf("FileSizeBytes = %d, want %d", resp.FileSizeBytes, len(png))
	}
	if !strings.HasPrefix(resp.FileURL, "https://cdn.example.com/uploads/") {
		t.Errorf("FileURL = %s, want prefix https://cdn.example.com/uploads/", resp.FileURL)
	}
	if len(store.puts) != 1 {
		t.Fatalf("PutObject calls = %d, want 1", len(store.puts))
	}
	if store.puts[0].bucket != "public-bucket" {
		t.Errorf("bucket = %s, want public-bucket", store.puts[0].bucket)
	}
	if store.puts[0].contentType != "image/png" {
		t.Errorf("contentType = %s, want image/png", store.puts[0].contentType)
	}
}

func TestUploadFile_RejectsUnsupportedType(t *testing.T) {
	store := &fakeStore{}
	svc := NewService(store, nil, "public-bucket", "https://cdn.example.com")

	_, err := svc.UploadFile(context.Background(), "notes.txt", []byte("plain text, not an allowed type"))
	if !errors.Is(err, ErrInvalidFileType) {
		t.Fatalf("error = %v, want ErrInvalidFileType", err)
	}
	if len(store.puts) != 0 {
		t.Errorf("PutObject calls = %d, want 0", len(store.puts))
	}
}

func TestUploadFile_RejectsOversizeForCategory(t *testing.T) {
	store := &fakeStore{}
	svc := NewService(store, nil, "public-bucket", "https://cdn.example.com")

	// General images cap at 10MB even though PDFs (the largest category) cap at 50MB.
	big := pngBytes(11 * 1024 * 1024)
	_, err := svc.UploadFile(context.Background(), "big.png", big)
	if !errors.Is(err, ErrFileTooLarge) {
		t.Fatalf("error = %v, want ErrFileTooLarge", err)
	}
	if len(store.puts) != 0 {
		t.Errorf("PutObject calls = %d, want 0", len(store.puts))
	}
}

func TestUploadFile_Disabled(t *testing.T) {
	svc := &Service{disabledErr: ErrUploadDisabled}
	_, err := svc.UploadFile(context.Background(), "a.png", pngBytes(10))
	if !errors.Is(err, ErrUploadDisabled) {
		t.Fatalf("error = %v, want ErrUploadDisabled", err)
	}
}

func TestUploadFile_PutObjectError(t *testing.T) {
	store := &fakeStore{putErr: errors.New("r2 down")}
	svc := NewService(store, nil, "public-bucket", "https://cdn.example.com")

	_, err := svc.UploadFile(context.Background(), "a.png", pngBytes(10))
	if err == nil {
		t.Fatal("expected error, got nil")
	}
}

func TestSanitizeFilename(t *testing.T) {
	tests := []struct {
		name string
		in   string
		want string
	}{
		{"strips directory traversal", "../../etc/passwd", "passwd"},
		{"strips control characters", "a\x00b\x1fc.png", "abc.png"},
		{"empty becomes file", "", "file"},
		{"dot becomes file", ".", "file"},
		{"root slash becomes file", "/", "file"},
		{"normal name unchanged", "report.pdf", "report.pdf"},
	}
	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			if got := sanitizeFilename(tt.in); got != tt.want {
				t.Errorf("sanitizeFilename(%q) = %q, want %q", tt.in, got, tt.want)
			}
		})
	}
}

func TestSanitizeFilename_CapsLength(t *testing.T) {
	long := strings.Repeat("a", 300)
	got := sanitizeFilename(long)
	if len(got) != maxOriginalFilenameBytes {
		t.Errorf("len(sanitizeFilename(long)) = %d, want %d", len(got), maxOriginalFilenameBytes)
	}
}
