package upload

import (
	"bytes"
	"mime/multipart"
	"net/http"
	"net/http/httptest"
	"testing"

	"github.com/sathittham/factory-sync-solutions/apps/fs-backend/middleware"
)

func authenticatedRequest(method, target string, body *bytes.Buffer, contentType string) *http.Request {
	req := httptest.NewRequest(method, target, body)
	if contentType != "" {
		req.Header.Set("Content-Type", contentType)
	}
	return middleware.SetTestAuthContext(req, "uid-123", "test@example.com", "Test User")
}

func TestUploadAvatar_MissingFile(t *testing.T) {
	handler := NewHandler(&Service{disabledErr: ErrUploadDisabled})
	req := authenticatedRequest(http.MethodPost, "/upload/avatar", bytes.NewBufferString(""), "multipart/form-data")
	rr := httptest.NewRecorder()

	handler.UploadAvatar(rr, req)

	if rr.Code != http.StatusBadRequest {
		t.Fatalf("status = %d, want 400", rr.Code)
	}
}

func TestUploadAvatar_Disabled(t *testing.T) {
	var body bytes.Buffer
	writer := multipart.NewWriter(&body)
	part, err := writer.CreateFormFile("file", "avatar.png")
	if err != nil {
		t.Fatalf("create form file: %v", err)
	}
	if _, err := part.Write([]byte("not a real image")); err != nil {
		t.Fatalf("write form file: %v", err)
	}
	if err := writer.Close(); err != nil {
		t.Fatalf("close writer: %v", err)
	}

	handler := NewHandler(&Service{disabledErr: ErrUploadDisabled})
	req := authenticatedRequest(http.MethodPost, "/upload/avatar", &body, writer.FormDataContentType())
	rr := httptest.NewRecorder()

	handler.UploadAvatar(rr, req)

	if rr.Code != http.StatusServiceUnavailable {
		t.Fatalf("status = %d, want 503", rr.Code)
	}
}

func TestDeleteAvatar_Disabled(t *testing.T) {
	handler := NewHandler(&Service{disabledErr: ErrUploadDisabled})
	req := authenticatedRequest(http.MethodDelete, "/upload/avatar", bytes.NewBufferString(""), "")
	rr := httptest.NewRecorder()

	handler.DeleteAvatar(rr, req)

	if rr.Code != http.StatusServiceUnavailable {
		t.Fatalf("status = %d, want 503", rr.Code)
	}
}
