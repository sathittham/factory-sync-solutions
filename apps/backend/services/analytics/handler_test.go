package analytics

import (
	"encoding/json"
	"errors"
	"net/http"
	"net/http/httptest"
	"testing"
	"time"

	"github.com/go-chi/chi/v5"
	analyticsdata "google.golang.org/api/analyticsdata/v1beta"
)

func newTestRouter(svc *Service) *chi.Mux {
	h := NewHandler(svc)
	r := chi.NewRouter()
	r.Route("/analytics", h.Routes)
	return r
}

func TestHandlerGetOverview(t *testing.T) {
	tests := []struct {
		name       string
		path       string
		mock       *mockGA4Client
		wantStatus int
		wantCode   string
	}{
		{
			name: "success default range",
			path: "/analytics/overview",
			mock: &mockGA4Client{
				respFunc: func(callIdx int, req *analyticsdata.RunReportRequest) (*analyticsdata.RunReportResponse, error) {
					if callIdx == 0 {
						return &analyticsdata.RunReportResponse{
							Rows: []*analyticsdata.Row{row(nil, []string{"10", "5", "20", "50"})},
						}, nil
					}
					return &analyticsdata.RunReportResponse{}, nil
				},
			},
			wantStatus: http.StatusOK,
		},
		{
			name:       "invalid range returns 400 VALIDATION_ERROR",
			path:       "/analytics/overview?range=365d",
			mock:       &mockGA4Client{},
			wantStatus: http.StatusBadRequest,
			wantCode:   "VALIDATION_ERROR",
		},
		{
			name: "upstream failure with no cache returns 503 ANALYTICS_UNAVAILABLE",
			path: "/analytics/overview",
			mock: &mockGA4Client{
				respFunc: func(callIdx int, req *analyticsdata.RunReportRequest) (*analyticsdata.RunReportResponse, error) {
					return nil, errors.New("quota exceeded")
				},
			},
			wantStatus: http.StatusServiceUnavailable,
			wantCode:   "ANALYTICS_UNAVAILABLE",
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			svc := NewService(tt.mock, time.Minute)
			router := newTestRouter(svc)

			req := httptest.NewRequest(http.MethodGet, tt.path, nil)
			rec := httptest.NewRecorder()
			router.ServeHTTP(rec, req)

			if rec.Code != tt.wantStatus {
				t.Fatalf("status = %d, want %d (body=%s)", rec.Code, tt.wantStatus, rec.Body.String())
			}

			var resp map[string]any
			if err := json.NewDecoder(rec.Body).Decode(&resp); err != nil {
				t.Fatalf("decode response: %v", err)
			}

			if tt.wantCode != "" {
				if resp["success"] != false {
					t.Errorf("expected success=false")
				}
				errBody, ok := resp["error"].(map[string]any)
				if !ok {
					t.Fatalf("expected error object, got %v", resp["error"])
				}
				if errBody["code"] != tt.wantCode {
					t.Errorf("error code = %v, want %s", errBody["code"], tt.wantCode)
				}
				return
			}

			if resp["success"] != true {
				t.Errorf("expected success=true, got %v", resp["success"])
			}
			data, ok := resp["data"].(map[string]any)
			if !ok {
				t.Fatalf("expected data object, got %v", resp["data"])
			}
			if _, ok := data["stale"]; !ok {
				t.Errorf("expected stale field to be present in response data")
			}
		})
	}
}

func TestHandlerGetTopPages(t *testing.T) {
	mock := &mockGA4Client{
		respFunc: func(callIdx int, req *analyticsdata.RunReportRequest) (*analyticsdata.RunReportResponse, error) {
			return &analyticsdata.RunReportResponse{
				Rows: []*analyticsdata.Row{row([]string{"/home"}, []string{"100", "500"})},
			}, nil
		},
	}
	router := newTestRouter(NewService(mock, time.Minute))

	req := httptest.NewRequest(http.MethodGet, "/analytics/top-pages?range=7d", nil)
	rec := httptest.NewRecorder()
	router.ServeHTTP(rec, req)

	if rec.Code != http.StatusOK {
		t.Fatalf("status = %d, want 200 (body=%s)", rec.Code, rec.Body.String())
	}
}

func TestHandlerGetChannels(t *testing.T) {
	mock := &mockGA4Client{
		respFunc: func(callIdx int, req *analyticsdata.RunReportRequest) (*analyticsdata.RunReportResponse, error) {
			return &analyticsdata.RunReportResponse{
				Rows: []*analyticsdata.Row{row([]string{"Direct"}, []string{"10"})},
			}, nil
		},
	}
	router := newTestRouter(NewService(mock, time.Minute))

	req := httptest.NewRequest(http.MethodGet, "/analytics/channels?range=90d", nil)
	rec := httptest.NewRecorder()
	router.ServeHTTP(rec, req)

	if rec.Code != http.StatusOK {
		t.Fatalf("status = %d, want 200 (body=%s)", rec.Code, rec.Body.String())
	}
}

func TestHandlerGetAudience(t *testing.T) {
	mock := &mockGA4Client{
		respFunc: func(callIdx int, req *analyticsdata.RunReportRequest) (*analyticsdata.RunReportResponse, error) {
			return &analyticsdata.RunReportResponse{}, nil
		},
	}
	router := newTestRouter(NewService(mock, time.Minute))

	req := httptest.NewRequest(http.MethodGet, "/analytics/audience", nil)
	rec := httptest.NewRecorder()
	router.ServeHTTP(rec, req)

	if rec.Code != http.StatusOK {
		t.Fatalf("status = %d, want 200 (body=%s)", rec.Code, rec.Body.String())
	}
}

func TestHandlerInternalError(t *testing.T) {
	// A non-sentinel error (e.g. from an unexpected panic-free path) should map to 500 INTERNAL_ERROR.
	rec := httptest.NewRecorder()
	req := httptest.NewRequest(http.MethodGet, "/analytics/overview", nil)
	handleError(rec, req, errors.New("boom"))

	if rec.Code != http.StatusInternalServerError {
		t.Fatalf("status = %d, want 500", rec.Code)
	}
	var resp map[string]any
	json.NewDecoder(rec.Body).Decode(&resp)
	errBody := resp["error"].(map[string]any)
	if errBody["code"] != "INTERNAL_ERROR" {
		t.Errorf("code = %v, want INTERNAL_ERROR", errBody["code"])
	}
}

func TestNewHandlerAndDisabledService(t *testing.T) {
	// A disabled service (missing env config) must surface ANALYTICS_UNAVAILABLE
	// through the handler rather than panicking.
	svc := &Service{disabledErr: ErrAnalyticsUnavailable, cache: make(map[string]cacheEntry), cacheTTL: time.Minute}
	router := newTestRouter(svc)

	req := httptest.NewRequest(http.MethodGet, "/analytics/overview", nil)
	rec := httptest.NewRecorder()
	router.ServeHTTP(rec, req)

	if rec.Code != http.StatusServiceUnavailable {
		t.Fatalf("status = %d, want 503", rec.Code)
	}
}
