package dbd

import (
	"context"
	"errors"
	"io"
	"net/http"
	"strings"
	"testing"
)

type MockHTTPClient struct {
	DoFunc func(req *http.Request) (*http.Response, error)
}

func (m *MockHTTPClient) Do(req *http.Request) (*http.Response, error) {
	if m.DoFunc != nil {
		return m.DoFunc(req)
	}
	return nil, errors.New("not implemented")
}

func TestGetCompanyProfile_Success(t *testing.T) {
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
				"cd:OrganizationJuristicObjective": {
					"td:JuristicObjective": {
						"td:JuristicObjectiveCode": "58202",
						"td:JuristicObjectiveTextTH": "การจัดทำซอฟต์แวร์สำเร็จรูป",
						"td:JuristicObjectiveTextEN": "Software publishing"
					}
				},
				"cd:OrganizationJuristicRegisterCapital": "1000000",
				"cd:OrganizationJuristicBranchName": "สำนักงานใหญ่",
				"cd:OrganizationJuristicAddress": {
					"cr:AddressType": {
						"cd:Address": "123 ถนนสุขุมวิท",
						"cd:CitySubDivision": {
							"cr:CitySubDivisionTextTH": "คลองเตย"
						},
						"cd:City": {
							"cr:CityTextTH": "เขตคลองเตย"
						},
						"cd:CountrySubDivision": {
							"cr:CountrySubDivisionCode": "TH-10",
							"cr:CountrySubDivisionTextTH": "กรุงเทพมหานคร"
						}
					}
				}
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
	profile, err := svc.GetCompanyProfile(context.Background(), "0115560016313")
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if profile.JuristicID != "0115560016313" {
		t.Errorf("juristicId = %s, want 0115560016313", profile.JuristicID)
	}
	if profile.NameEN != "TEST CO., LTD." {
		t.Errorf("nameEn = %s, want TEST CO., LTD.", profile.NameEN)
	}
	if profile.Province != "กรุงเทพมหานคร" {
		t.Errorf("province = %s, want กรุงเทพมหานคร", profile.Province)
	}
	if profile.ObjectiveCode != "58202" {
		t.Errorf("objectiveCode = %s, want 58202", profile.ObjectiveCode)
	}
}

func TestGetCompanyProfile_InvalidRegID(t *testing.T) {
	svc := NewService(&MockHTTPClient{})

	tests := []struct {
		name  string
		regID string
	}{
		{"too short", "12345"},
		{"too long", "12345678901234"},
		{"empty", ""},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			_, err := svc.GetCompanyProfile(context.Background(), tt.regID)
			if !errors.Is(err, ErrInvalidRegID) {
				t.Fatalf("error = %v, want ErrInvalidRegID", err)
			}
		})
	}
}

func TestGetCompanyProfile_NotFound(t *testing.T) {
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
	_, err := svc.GetCompanyProfile(context.Background(), "0000000000000")
	if !errors.Is(err, ErrCompanyNotFound) {
		t.Fatalf("error = %v, want ErrCompanyNotFound", err)
	}
}

func TestGetCompanyProfile_DBDUnavailable(t *testing.T) {
	mock := &MockHTTPClient{
		DoFunc: func(req *http.Request) (*http.Response, error) {
			return &http.Response{
				StatusCode: http.StatusServiceUnavailable,
				Body:       io.NopCloser(strings.NewReader("")),
			}, nil
		},
	}

	svc := NewService(mock)
	_, err := svc.GetCompanyProfile(context.Background(), "0115560016313")
	if !errors.Is(err, ErrDBDUnavailable) {
		t.Fatalf("error = %v, want ErrDBDUnavailable", err)
	}
}

func TestGetCompanyProfile_NetworkError(t *testing.T) {
	mock := &MockHTTPClient{
		DoFunc: func(req *http.Request) (*http.Response, error) {
			return nil, errors.New("connection refused")
		},
	}

	svc := NewService(mock)
	_, err := svc.GetCompanyProfile(context.Background(), "0115560016313")
	if !errors.Is(err, ErrDBDUnavailable) {
		t.Fatalf("error = %v, want ErrDBDUnavailable", err)
	}
}
