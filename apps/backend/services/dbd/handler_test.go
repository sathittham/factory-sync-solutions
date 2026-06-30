package dbd

import (
	"encoding/json"
	"io"
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"

	"github.com/go-chi/chi/v5"
)

func TestGetCompanyProfile_Handler_Success(t *testing.T) {
	body := `{
		"status": {"code": "1000", "description": "Success"},
		"data": [{
			"cd:OrganizationJuristicPerson": {
				"cd:OrganizationJuristicID": "0115560016313",
				"cd:OrganizationJuristicNameTH": "บริษัท ทดสอบ จำกัด",
				"cd:OrganizationJuristicNameEN": "TEST CO., LTD.",
				"cd:OrganizationJuristicType": "บริษัทจำกัด",
				"cd:OrganizationJuristicRegisterDate": "20170713",
				"cd:OrganizationJuristicStatus": "ยังดำเนินกิจการอยู่",
				"cd:OrganizationJuristicRegisterCapital": "1000000",
				"cd:OrganizationJuristicBranchName": "สำนักงานใหญ่"
			}
		}]
	}`

	mock := &MockHTTPClient{
		DoFunc: func(req *http.Request) (*http.Response, error) {
			return &http.Response{
				StatusCode: http.StatusOK,
				Body:       io.NopCloser(strings.NewReader(body)),
			}, nil
		},
	}

	svc := NewService(mock)
	h := NewHandler(svc)

	r := chi.NewRouter()
	r.Route("/dbd", h.Routes)

	req := httptest.NewRequest("GET", "/dbd/0115560016313", nil)
	rec := httptest.NewRecorder()
	r.ServeHTTP(rec, req)

	if rec.Code != http.StatusOK {
		t.Errorf("status = %d, want 200", rec.Code)
	}

	var resp map[string]any
	json.NewDecoder(rec.Body).Decode(&resp)
	if resp["success"] != true {
		t.Error("expected success=true")
	}
	data := resp["data"].(map[string]any)
	if data["juristicId"] != "0115560016313" {
		t.Errorf("juristicId = %v, want 0115560016313", data["juristicId"])
	}
}

func TestGetCompanyProfile_Handler_InvalidRegID(t *testing.T) {
	svc := NewService(&MockHTTPClient{})
	h := NewHandler(svc)

	r := chi.NewRouter()
	r.Route("/dbd", h.Routes)

	tests := []struct {
		name string
		path string
	}{
		{"too short", "/dbd/12345"},
		{"letters", "/dbd/abcdefghijklm"},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			req := httptest.NewRequest("GET", tt.path, nil)
			rec := httptest.NewRecorder()
			r.ServeHTTP(rec, req)

			if rec.Code != http.StatusBadRequest {
				t.Errorf("status = %d, want 400", rec.Code)
			}
		})
	}
}

func TestGetCompanyProfile_Handler_NotFound(t *testing.T) {
	body := `{"status": {"code": "2000", "description": "Not Found"}, "data": []}`

	mock := &MockHTTPClient{
		DoFunc: func(req *http.Request) (*http.Response, error) {
			return &http.Response{
				StatusCode: http.StatusOK,
				Body:       io.NopCloser(strings.NewReader(body)),
			}, nil
		},
	}

	svc := NewService(mock)
	h := NewHandler(svc)

	r := chi.NewRouter()
	r.Route("/dbd", h.Routes)

	req := httptest.NewRequest("GET", "/dbd/0000000000000", nil)
	rec := httptest.NewRecorder()
	r.ServeHTTP(rec, req)

	if rec.Code != http.StatusNotFound {
		t.Errorf("status = %d, want 404", rec.Code)
	}
}
