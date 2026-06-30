package admin

import (
	"context"
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"

	"github.com/go-chi/chi/v5"

	"github.com/sathittham/factory-sync-solutions/apps/backend/middleware"
)

// withAuth injects auth values into the request context via the test helper.
func withAuth(r *http.Request, uid, email, displayName string) *http.Request {
	return middleware.SetTestAuthContext(r, uid, email, displayName)
}

// apiErrorResponse mirrors the error envelope returned by pkg.RespondError.
type apiErrorResponse struct {
	Success bool `json:"success"`
	Error   struct {
		Code    string `json:"code"`
		Message string `json:"message"`
	} `json:"error"`
}

// decodeErrorResponse decodes a pkg.RespondError response body.
func decodeErrorResponse(t *testing.T, rr *httptest.ResponseRecorder) apiErrorResponse {
	t.Helper()
	var resp apiErrorResponse
	if err := json.NewDecoder(rr.Body).Decode(&resp); err != nil {
		t.Fatalf("decode error response: %v — raw body: %s", err, rr.Body.String())
	}
	return resp
}

// chiContext wraps the request with a chi route context containing the given uid param.
func chiContext(r *http.Request, uid string) *http.Request {
	rctx := chi.NewRouteContext()
	rctx.URLParams.Add("uid", uid)
	return r.WithContext(context.WithValue(r.Context(), chi.RouteCtxKey, rctx))
}

// newHandler creates an admin Handler with all deps nil — safe for pure input-validation tests.
func newHandler() *Handler {
	return NewHandler(nil, nil, nil, nil, nil, nil)
}

// ─── CancelInvitation ───────────────────────────────────────────────────────

func TestCancelInvitation_UIDTooLong(t *testing.T) {
	handler := newHandler()
	longUID := strings.Repeat("a", 129)

	req := httptest.NewRequest(http.MethodDelete, "/", nil)
	req = withAuth(req, "admin-uid", "admin@test.com", "Admin")
	req = chiContext(req, longUID)
	rr := httptest.NewRecorder()

	handler.CancelInvitation(rr, req)

	if rr.Code != http.StatusBadRequest {
		t.Fatalf("status = %d, want 400", rr.Code)
	}
	resp := decodeErrorResponse(t, rr)
	if resp.Error.Code != "BAD_REQUEST" {
		t.Errorf("error code = %q, want BAD_REQUEST", resp.Error.Code)
	}
}

func TestCancelInvitation_UIDMissing(t *testing.T) {
	handler := newHandler()

	req := httptest.NewRequest(http.MethodDelete, "/", nil)
	req = withAuth(req, "admin-uid", "admin@test.com", "Admin")
	req = chiContext(req, "") // empty uid
	rr := httptest.NewRecorder()

	handler.CancelInvitation(rr, req)

	if rr.Code != http.StatusBadRequest {
		t.Fatalf("status = %d, want 400", rr.Code)
	}
	resp := decodeErrorResponse(t, rr)
	if resp.Error.Code != "BAD_REQUEST" {
		t.Errorf("error code = %q, want BAD_REQUEST", resp.Error.Code)
	}
}

// TestCancelInvitation_UIDValidation covers the table-driven boundary cases for
// the uid length check.  Both empty and 128-character-boundary variants are
// verified to keep the tests DRY.
func TestCancelInvitation_UIDValidation(t *testing.T) {
	tests := []struct {
		name       string
		uid        string
		wantStatus int
	}{
		{
			name:       "uid exactly 128 chars is valid (boundary — no early return)",
			uid:        strings.Repeat("x", 128),
			wantStatus: http.StatusInternalServerError, // passes validation; nil authClient → 500
		},
		{
			name:       "uid 129 chars triggers 400",
			uid:        strings.Repeat("x", 129),
			wantStatus: http.StatusBadRequest,
		},
		{
			name:       "empty uid triggers 400",
			uid:        "",
			wantStatus: http.StatusBadRequest,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			handler := newHandler()
			req := httptest.NewRequest(http.MethodDelete, "/", nil)
			req = withAuth(req, "admin-uid", "admin@test.com", "Admin")
			req = chiContext(req, tt.uid)
			rr := httptest.NewRecorder()

			// Recover from nil-pointer panic when authClient is nil and uid is valid —
			// the panic itself confirms we passed uid validation (reached authClient call).
			func() {
				defer func() {
					if rec := recover(); rec != nil {
						// nil authClient panicked — means uid validation passed.
						// Write 500 to the recorder so the table assertion works.
						rr.Code = http.StatusInternalServerError
					}
				}()
				handler.CancelInvitation(rr, req)
			}()

			if rr.Code != tt.wantStatus {
				t.Errorf("status = %d, want %d", rr.Code, tt.wantStatus)
			}
		})
	}
}

// ─── ResendInvitation ────────────────────────────────────────────────────────

func TestResendInvitation_UIDTooLong(t *testing.T) {
	handler := newHandler()
	longUID := strings.Repeat("b", 129)

	req := httptest.NewRequest(http.MethodPost, "/", nil)
	req = withAuth(req, "admin-uid", "admin@test.com", "Admin")
	req = chiContext(req, longUID)
	rr := httptest.NewRecorder()

	handler.ResendInvitation(rr, req)

	if rr.Code != http.StatusBadRequest {
		t.Fatalf("status = %d, want 400", rr.Code)
	}
	resp := decodeErrorResponse(t, rr)
	if resp.Error.Code != "BAD_REQUEST" {
		t.Errorf("error code = %q, want BAD_REQUEST", resp.Error.Code)
	}
}

func TestResendInvitation_UIDMissing(t *testing.T) {
	handler := newHandler()

	req := httptest.NewRequest(http.MethodPost, "/", nil)
	req = withAuth(req, "admin-uid", "admin@test.com", "Admin")
	req = chiContext(req, "")
	rr := httptest.NewRecorder()

	handler.ResendInvitation(rr, req)

	if rr.Code != http.StatusBadRequest {
		t.Fatalf("status = %d, want 400", rr.Code)
	}
}

// TestResendInvitation_NilFsClient verifies that a valid uid that passes
// validation triggers a nil-pointer panic when fsClient is nil (no guard in
// ResendInvitation). The panic confirms validation was passed and the handler
// reached the Firestore call.
func TestResendInvitation_NilFsClient_PanicsAfterValidation(t *testing.T) {
	handler := newHandler()

	req := httptest.NewRequest(http.MethodPost, "/", nil)
	req = withAuth(req, "admin-uid", "admin@test.com", "Admin")
	req = chiContext(req, "some-valid-uid")
	rr := httptest.NewRecorder()

	panicked := false
	func() {
		defer func() {
			if rec := recover(); rec != nil {
				panicked = true
			}
		}()
		handler.ResendInvitation(rr, req)
	}()

	if !panicked {
		t.Error("expected nil-pointer panic when fsClient is nil, but handler returned normally")
	}
}

// ─── AcceptInvitation ────────────────────────────────────────────────────────

func TestAcceptInvitation_NoUID(t *testing.T) {
	handler := newHandler()

	req := httptest.NewRequest(http.MethodPost, "/", nil)
	// Intentionally omit withAuth — uid will be "" in context
	rr := httptest.NewRecorder()

	handler.AcceptInvitation(rr, req)

	if rr.Code != http.StatusUnauthorized {
		t.Fatalf("status = %d, want 401", rr.Code)
	}
	resp := decodeErrorResponse(t, rr)
	if resp.Error.Code != "UNAUTHORIZED" {
		t.Errorf("error code = %q, want UNAUTHORIZED", resp.Error.Code)
	}
}

func TestAcceptInvitation_NilFsClient(t *testing.T) {
	handler := newHandler() // fsClient is nil

	req := httptest.NewRequest(http.MethodPost, "/", nil)
	req = withAuth(req, "uid-invited", "invited@test.com", "Invited User")
	rr := httptest.NewRecorder()

	handler.AcceptInvitation(rr, req)

	if rr.Code != http.StatusInternalServerError {
		t.Fatalf("status = %d, want 500", rr.Code)
	}
	resp := decodeErrorResponse(t, rr)
	if resp.Error.Code != "INTERNAL_ERROR" {
		t.Errorf("error code = %q, want INTERNAL_ERROR", resp.Error.Code)
	}
}

// TestAcceptInvitation_NoUIDBeforeFsClientCheck verifies the handler checks uid
// before fsClient, so a missing uid never reaches the nil fsClient guard.
func TestAcceptInvitation_AuthCheckedBeforeFsClient(t *testing.T) {
	handler := newHandler() // both uid ctx and fsClient are absent/nil

	req := httptest.NewRequest(http.MethodPost, "/", nil)
	// No auth context — uid is ""
	rr := httptest.NewRecorder()

	handler.AcceptInvitation(rr, req)

	// Must be 401, not 500 — auth check is first
	if rr.Code != http.StatusUnauthorized {
		t.Fatalf("status = %d, want 401 (auth check must precede fsClient check)", rr.Code)
	}
}

// ─── SetUserRole — input validation ─────────────────────────────────────────

func TestSetUserRole_UIDValidation(t *testing.T) {
	tests := []struct {
		name       string
		uid        string
		body       string
		wantStatus int
	}{
		{
			name:       "uid too long",
			uid:        strings.Repeat("z", 129),
			body:       `{"role":"user"}`,
			wantStatus: http.StatusBadRequest,
		},
		{
			name:       "uid empty",
			uid:        "",
			body:       `{"role":"user"}`,
			wantStatus: http.StatusBadRequest,
		},
		{
			name:       "invalid role",
			uid:        "uid-valid",
			body:       `{"role":"superuser"}`,
			wantStatus: http.StatusBadRequest,
		},
		{
			name:       "invalid JSON body",
			uid:        "uid-valid",
			body:       `not-json`,
			wantStatus: http.StatusBadRequest,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			handler := newHandler()

			req := httptest.NewRequest(http.MethodPut, "/", strings.NewReader(tt.body))
			req.Header.Set("Content-Type", "application/json")
			req = withAuth(req, "admin-uid", "admin@test.com", "Admin")
			req = chiContext(req, tt.uid)
			rr := httptest.NewRecorder()

			// Recover from nil-authClient panic for valid uid+role combos that
			// reach the Firebase SetCustomUserClaims call.
			func() {
				defer func() {
					if rec := recover(); rec != nil {
						rr.Code = http.StatusInternalServerError
					}
				}()
				handler.SetUserRole(rr, req)
			}()

			if rr.Code != tt.wantStatus {
				t.Errorf("status = %d, want %d", rr.Code, tt.wantStatus)
			}
		})
	}
}

// ─── InviteMember — input validation ─────────────────────────────────────────

func TestInviteMember_InputValidation(t *testing.T) {
	tests := []struct {
		name       string
		body       string
		wantStatus int
		wantCode   string
	}{
		{
			name:       "invalid JSON body",
			body:       `{broken`,
			wantStatus: http.StatusBadRequest,
			wantCode:   "BAD_REQUEST",
		},
		{
			name:       "invalid email address",
			body:       `{"email":"not-an-email","role":"user"}`,
			wantStatus: http.StatusBadRequest,
			wantCode:   "VALIDATION_ERROR",
		},
		{
			name:       "invalid role",
			body:       `{"email":"valid@test.com","role":"superuser"}`,
			wantStatus: http.StatusBadRequest,
			wantCode:   "VALIDATION_ERROR",
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			handler := newHandler()

			req := httptest.NewRequest(http.MethodPost, "/", strings.NewReader(tt.body))
			req.Header.Set("Content-Type", "application/json")
			req = withAuth(req, "admin-uid", "admin@test.com", "Admin")
			rr := httptest.NewRecorder()

			handler.InviteMember(rr, req)

			if rr.Code != tt.wantStatus {
				t.Errorf("status = %d, want %d", rr.Code, tt.wantStatus)
			}
			resp := decodeErrorResponse(t, rr)
			if resp.Error.Code != tt.wantCode {
				t.Errorf("error code = %q, want %q", resp.Error.Code, tt.wantCode)
			}
		})
	}
}

// ─── GetAssessment — UUID validation ─────────────────────────────────────────

func TestGetAssessment_InvalidUUID(t *testing.T) {
	tests := []struct {
		name         string
		assessmentID string
		wantStatus   int
	}{
		{
			name:         "non-UUID string",
			assessmentID: "not-a-uuid",
			wantStatus:   http.StatusBadRequest,
		},
		{
			name:         "empty assessment ID",
			assessmentID: "",
			wantStatus:   http.StatusBadRequest,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			handler := newHandler()

			req := httptest.NewRequest(http.MethodGet, "/", nil)
			req = withAuth(req, "admin-uid", "admin@test.com", "Admin")

			rctx := chi.NewRouteContext()
			rctx.URLParams.Add("assessmentId", tt.assessmentID)
			req = req.WithContext(context.WithValue(req.Context(), chi.RouteCtxKey, rctx))

			rr := httptest.NewRecorder()
			handler.GetAssessment(rr, req)

			if rr.Code != tt.wantStatus {
				t.Errorf("status = %d, want %d", rr.Code, tt.wantStatus)
			}
		})
	}
}
