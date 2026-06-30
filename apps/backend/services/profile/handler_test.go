package profile

import (
	"context"
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"

	"cloud.google.com/go/firestore"
	"github.com/go-chi/chi/v5"

	"github.com/sathittham/factory-sync-solutions/apps/backend/middleware"
)

func withAuth(r *http.Request, uid, email, displayName string) *http.Request {
	return middleware.SetTestAuthContext(r, uid, email, displayName)
}

// apiResponse is the standard wrapper returned by pkg.RespondJSON.
type apiResponse struct {
	Success bool            `json:"success"`
	Data    json.RawMessage `json:"data"`
}

func decodeData[T any](t *testing.T, rr *httptest.ResponseRecorder) T {
	t.Helper()
	var resp apiResponse
	if err := json.NewDecoder(rr.Body).Decode(&resp); err != nil {
		t.Fatalf("decode wrapper: %v", err)
	}
	var v T
	if err := json.Unmarshal(resp.Data, &v); err != nil {
		t.Fatalf("decode data: %v", err)
	}
	return v
}

func TestHandler_GetProfile_Success(t *testing.T) {
	mock := &MockRepository{
		GetByUIDFunc: func(_ context.Context, uid string) (*Profile, error) {
			return &Profile{UID: uid, CompanyName: "ABC Factory"}, nil
		},
	}
	svc := NewService(mock, nil)
	handler := NewHandler(svc, nil)

	req := httptest.NewRequest("GET", "/", nil)
	req = withAuth(req, "uid-123", "test@test.com", "Test")
	rr := httptest.NewRecorder()

	handler.GetProfile(rr, req)

	if rr.Code != http.StatusOK {
		t.Fatalf("status = %d, want 200", rr.Code)
	}
	p := decodeData[Profile](t, rr)
	if p.CompanyName != "ABC Factory" {
		t.Errorf("companyName = %s, want ABC Factory", p.CompanyName)
	}
}

func TestHandler_GetProfile_NotFound(t *testing.T) {
	mock := &MockRepository{
		GetByUIDFunc: func(_ context.Context, _ string) (*Profile, error) {
			return nil, nil
		},
	}
	svc := NewService(mock, nil)
	handler := NewHandler(svc, nil)

	req := httptest.NewRequest("GET", "/", nil)
	req = withAuth(req, "uid-123", "", "")
	rr := httptest.NewRecorder()

	handler.GetProfile(rr, req)

	if rr.Code != http.StatusNotFound {
		t.Fatalf("status = %d, want 404", rr.Code)
	}
}

func TestHandler_CreateProfile_Success(t *testing.T) {
	mock := &MockRepository{
		GetByUIDFunc: func(_ context.Context, _ string) (*Profile, error) {
			return nil, nil
		},
		CreateFunc: func(_ context.Context, _ *Profile) error {
			return nil
		},
	}
	svc := NewService(mock, nil)
	handler := NewHandler(svc, nil)

	body := `{
		"companyName":"ABC Factory",
		"companyRegId":"1234567890123",
		"industryType":"manufacturing",
		"companySize":"medium",
		"contactName":"Somchai",
		"contactEmail":"somchai@abc.com",
		"contactPhone":"0812345678",
		"turnstileToken":"test-token"
	}`
	req := httptest.NewRequest("POST", "/", strings.NewReader(body))
	req.Header.Set("Content-Type", "application/json")
	req = withAuth(req, "uid-123", "test@test.com", "Test User")
	rr := httptest.NewRecorder()

	handler.CreateProfile(rr, req)

	if rr.Code != http.StatusCreated {
		t.Fatalf("status = %d, want 201, body: %s", rr.Code, rr.Body.String())
	}
}

func TestHandler_CreateProfile_InvalidBody(t *testing.T) {
	svc := NewService(&MockRepository{}, nil)
	handler := NewHandler(svc, nil)

	req := httptest.NewRequest("POST", "/", strings.NewReader("not json"))
	req.Header.Set("Content-Type", "application/json")
	req = withAuth(req, "uid-123", "", "")
	rr := httptest.NewRecorder()

	handler.CreateProfile(rr, req)

	if rr.Code != http.StatusBadRequest {
		t.Fatalf("status = %d, want 400", rr.Code)
	}
}

func TestHandler_CreateProfile_ValidationError(t *testing.T) {
	svc := NewService(&MockRepository{}, nil)
	handler := NewHandler(svc, nil)

	body := `{"companyName":""}` // missing required fields
	req := httptest.NewRequest("POST", "/", strings.NewReader(body))
	req.Header.Set("Content-Type", "application/json")
	req = withAuth(req, "uid-123", "", "")
	rr := httptest.NewRecorder()

	handler.CreateProfile(rr, req)

	if rr.Code != http.StatusBadRequest {
		t.Fatalf("status = %d, want 400", rr.Code)
	}
}

func TestHandler_CreateProfile_AlreadyRegistered(t *testing.T) {
	mock := &MockRepository{
		GetByUIDFunc: func(_ context.Context, uid string) (*Profile, error) {
			return &Profile{UID: uid}, nil
		},
	}
	svc := NewService(mock, nil)
	handler := NewHandler(svc, nil)

	body := `{
		"companyName":"ABC Factory",
		"companyRegId":"1234567890123",
		"industryType":"manufacturing",
		"companySize":"medium",
		"contactName":"Somchai",
		"contactEmail":"somchai@abc.com",
		"contactPhone":"0812345678",
		"turnstileToken":"test-token"
	}`
	req := httptest.NewRequest("POST", "/", strings.NewReader(body))
	req.Header.Set("Content-Type", "application/json")
	req = withAuth(req, "uid-123", "", "")
	rr := httptest.NewRecorder()

	handler.CreateProfile(rr, req)

	if rr.Code != http.StatusConflict {
		t.Fatalf("status = %d, want 409", rr.Code)
	}
}

func TestHandler_UpdateProfile_Success(t *testing.T) {
	mock := &MockRepository{
		GetByUIDFunc: func(_ context.Context, uid string) (*Profile, error) {
			return &Profile{UID: uid, CompanyName: "Old Name"}, nil
		},
		UpdateFunc: func(_ context.Context, _ string, _ []firestore.Update) error {
			return nil
		},
	}
	svc := NewService(mock, nil)
	handler := NewHandler(svc, nil)

	body := `{"companyName":"New Name"}`
	req := httptest.NewRequest("PUT", "/", strings.NewReader(body))
	req.Header.Set("Content-Type", "application/json")
	req = withAuth(req, "uid-123", "", "")
	rr := httptest.NewRecorder()

	handler.UpdateProfile(rr, req)

	if rr.Code != http.StatusOK {
		t.Fatalf("status = %d, want 200, body: %s", rr.Code, rr.Body.String())
	}
}

func TestHandler_UpdateProfile_NotFound(t *testing.T) {
	mock := &MockRepository{
		GetByUIDFunc: func(_ context.Context, _ string) (*Profile, error) {
			return nil, nil
		},
	}
	svc := NewService(mock, nil)
	handler := NewHandler(svc, nil)

	body := `{"companyName":"New Name"}`
	req := httptest.NewRequest("PUT", "/", strings.NewReader(body))
	req.Header.Set("Content-Type", "application/json")
	req = withAuth(req, "uid-123", "", "")
	rr := httptest.NewRecorder()

	handler.UpdateProfile(rr, req)

	if rr.Code != http.StatusNotFound {
		t.Fatalf("status = %d, want 404", rr.Code)
	}
}

func TestHandler_Routes(t *testing.T) {
	mock := &MockRepository{
		GetByUIDFunc: func(_ context.Context, uid string) (*Profile, error) {
			return &Profile{UID: uid, CompanyName: "Test"}, nil
		},
	}
	svc := NewService(mock, nil)
	handler := NewHandler(svc, nil)

	r := chi.NewRouter()
	r.Use(func(next http.Handler) http.Handler {
		return http.HandlerFunc(func(w http.ResponseWriter, req *http.Request) {
			req = middleware.SetTestAuthContext(req, "uid-123", "", "")
			next.ServeHTTP(w, req)
		})
	})
	r.Route("/profile", handler.Routes)

	req := httptest.NewRequest("GET", "/profile", nil)
	rr := httptest.NewRecorder()
	r.ServeHTTP(rr, req)

	if rr.Code != http.StatusOK {
		t.Fatalf("status = %d, want 200", rr.Code)
	}
}
