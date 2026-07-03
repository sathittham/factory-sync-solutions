package analytics

import (
	"context"
	"errors"
	"testing"
	"time"

	analyticsdata "google.golang.org/api/analyticsdata/v1beta"
)

// mockGA4Client lets tests script RunReport responses per call without real credentials.
type mockGA4Client struct {
	calls    int
	respFunc func(callIdx int, req *analyticsdata.RunReportRequest) (*analyticsdata.RunReportResponse, error)
}

func (m *mockGA4Client) RunReport(_ context.Context, req *analyticsdata.RunReportRequest) (*analyticsdata.RunReportResponse, error) {
	idx := m.calls
	m.calls++
	if m.respFunc != nil {
		return m.respFunc(idx, req)
	}
	return nil, errors.New("not implemented")
}

func row(dims []string, metrics []string) *analyticsdata.Row {
	r := &analyticsdata.Row{}
	for _, d := range dims {
		r.DimensionValues = append(r.DimensionValues, &analyticsdata.DimensionValue{Value: d})
	}
	for _, mv := range metrics {
		r.MetricValues = append(r.MetricValues, &analyticsdata.MetricValue{Value: mv})
	}
	return r
}

func TestGetOverview(t *testing.T) {
	tests := []struct {
		name          string
		rangeParam    string
		mock          *mockGA4Client
		wantErr       error
		wantActive    int64
		wantSessions  int64
		wantAvgEngage float64
		wantSeriesLen int
		wantStale     bool
	}{
		{
			name:       "invalid range returns ErrInvalidRange",
			rangeParam: "365d",
			mock:       &mockGA4Client{},
			wantErr:    ErrInvalidRange,
		},
		{
			name:       "success computes avgEngagementTimeSec",
			rangeParam: "28d",
			mock: &mockGA4Client{
				respFunc: func(callIdx int, req *analyticsdata.RunReportRequest) (*analyticsdata.RunReportResponse, error) {
					if callIdx == 0 {
						// totals: activeUsers, sessions, screenPageViews, userEngagementDuration
						return &analyticsdata.RunReportResponse{
							Rows: []*analyticsdata.Row{row(nil, []string{"100", "50", "200", "1000"})},
						}, nil
					}
					// series: date -> activeUsers, sessions
					return &analyticsdata.RunReportResponse{
						Rows: []*analyticsdata.Row{
							row([]string{"20260601"}, []string{"10", "5"}),
							row([]string{"20260602"}, []string{"12", "6"}),
						},
					}, nil
				},
			},
			wantActive:    100,
			wantSessions:  50,
			wantAvgEngage: 20, // 1000 / 50
			wantSeriesLen: 2,
		},
		{
			name:       "sessions zero avoids division by zero",
			rangeParam: "7d",
			mock: &mockGA4Client{
				respFunc: func(callIdx int, req *analyticsdata.RunReportRequest) (*analyticsdata.RunReportResponse, error) {
					if callIdx == 0 {
						return &analyticsdata.RunReportResponse{
							Rows: []*analyticsdata.Row{row(nil, []string{"0", "0", "0", "0"})},
						}, nil
					}
					return &analyticsdata.RunReportResponse{}, nil
				},
			},
			wantActive:    0,
			wantSessions:  0,
			wantAvgEngage: 0,
			wantSeriesLen: 0,
		},
		{
			name:       "upstream failure with no cache returns ErrAnalyticsUnavailable",
			rangeParam: "28d",
			mock: &mockGA4Client{
				respFunc: func(callIdx int, req *analyticsdata.RunReportRequest) (*analyticsdata.RunReportResponse, error) {
					return nil, errors.New("quota exceeded")
				},
			},
			wantErr: ErrAnalyticsUnavailable,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			svc := NewService(tt.mock, time.Minute)
			got, err := svc.GetOverview(context.Background(), tt.rangeParam)
			if tt.wantErr != nil {
				if !errors.Is(err, tt.wantErr) {
					t.Fatalf("error = %v, want %v", err, tt.wantErr)
				}
				return
			}
			if err != nil {
				t.Fatalf("unexpected error: %v", err)
			}
			if got.Totals.ActiveUsers != tt.wantActive {
				t.Errorf("activeUsers = %d, want %d", got.Totals.ActiveUsers, tt.wantActive)
			}
			if got.Totals.Sessions != tt.wantSessions {
				t.Errorf("sessions = %d, want %d", got.Totals.Sessions, tt.wantSessions)
			}
			if got.Totals.AvgEngagementTimeSec != tt.wantAvgEngage {
				t.Errorf("avgEngagementTimeSec = %v, want %v", got.Totals.AvgEngagementTimeSec, tt.wantAvgEngage)
			}
			if len(got.Series) != tt.wantSeriesLen {
				t.Errorf("series len = %d, want %d", len(got.Series), tt.wantSeriesLen)
			}
			if len(got.Series) > 0 && got.Series[0].Date != "2026-06-01" {
				t.Errorf("series[0].Date = %s, want 2026-06-01", got.Series[0].Date)
			}
			if got.Range != tt.rangeParam {
				t.Errorf("range = %s, want %s", got.Range, tt.rangeParam)
			}
			if got.Stale != tt.wantStale {
				t.Errorf("stale = %v, want %v", got.Stale, tt.wantStale)
			}
		})
	}
}

func TestGetOverviewCaching(t *testing.T) {
	mock := &mockGA4Client{
		respFunc: func(callIdx int, req *analyticsdata.RunReportRequest) (*analyticsdata.RunReportResponse, error) {
			if callIdx%2 == 0 {
				return &analyticsdata.RunReportResponse{
					Rows: []*analyticsdata.Row{row(nil, []string{"1", "1", "1", "1"})},
				}, nil
			}
			return &analyticsdata.RunReportResponse{}, nil
		},
	}
	svc := NewService(mock, time.Minute)

	if _, err := svc.GetOverview(context.Background(), "28d"); err != nil {
		t.Fatalf("first call: unexpected error: %v", err)
	}
	callsAfterFirst := mock.calls

	if _, err := svc.GetOverview(context.Background(), "28d"); err != nil {
		t.Fatalf("second call: unexpected error: %v", err)
	}
	if mock.calls != callsAfterFirst {
		t.Errorf("second call within TTL made new GA4 calls: %d -> %d", callsAfterFirst, mock.calls)
	}
}

func TestGetOverviewStaleWhileError(t *testing.T) {
	succeed := true
	mock := &mockGA4Client{
		respFunc: func(callIdx int, req *analyticsdata.RunReportRequest) (*analyticsdata.RunReportResponse, error) {
			if !succeed {
				return nil, errors.New("upstream down")
			}
			if callIdx%2 == 0 {
				return &analyticsdata.RunReportResponse{
					Rows: []*analyticsdata.Row{row(nil, []string{"5", "5", "5", "5"})},
				}, nil
			}
			return &analyticsdata.RunReportResponse{}, nil
		},
	}
	// Use a negative-ish tiny TTL by constructing with a very small duration so the
	// second call is treated as expired and refetches.
	svc := NewService(mock, time.Nanosecond)

	if _, err := svc.GetOverview(context.Background(), "28d"); err != nil {
		t.Fatalf("first call: unexpected error: %v", err)
	}

	succeed = false
	got, err := svc.GetOverview(context.Background(), "28d")
	if err != nil {
		t.Fatalf("expected stale success, got error: %v", err)
	}
	if !got.Stale {
		t.Errorf("stale = false, want true when upstream fails but cache exists")
	}
	if got.Totals.ActiveUsers != 5 {
		t.Errorf("stale activeUsers = %d, want 5 (last good payload)", got.Totals.ActiveUsers)
	}
}

func TestGetTopPages(t *testing.T) {
	mock := &mockGA4Client{
		respFunc: func(callIdx int, req *analyticsdata.RunReportRequest) (*analyticsdata.RunReportResponse, error) {
			return &analyticsdata.RunReportResponse{
				Rows: []*analyticsdata.Row{
					row([]string{"/home"}, []string{"100", "500"}),
					row([]string{"/pricing"}, []string{"0", "0"}),
				},
			}, nil
		},
	}
	svc := NewService(mock, time.Minute)

	got, err := svc.GetTopPages(context.Background(), "28d")
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if len(got.Pages) != 2 {
		t.Fatalf("pages len = %d, want 2", len(got.Pages))
	}
	if got.Pages[0].Path != "/home" || got.Pages[0].Views != 100 {
		t.Errorf("pages[0] = %+v, want path=/home views=100", got.Pages[0])
	}
	if got.Pages[0].AvgEngagementTimeSec != 5 { // 500/100
		t.Errorf("pages[0].avgEngagementTimeSec = %v, want 5", got.Pages[0].AvgEngagementTimeSec)
	}
	if got.Pages[1].AvgEngagementTimeSec != 0 {
		t.Errorf("pages[1].avgEngagementTimeSec = %v, want 0 (zero views guard)", got.Pages[1].AvgEngagementTimeSec)
	}
}

func TestGetTopPagesInvalidRange(t *testing.T) {
	svc := NewService(&mockGA4Client{}, time.Minute)
	_, err := svc.GetTopPages(context.Background(), "bogus")
	if !errors.Is(err, ErrInvalidRange) {
		t.Fatalf("error = %v, want ErrInvalidRange", err)
	}
}

func TestGetChannels(t *testing.T) {
	mock := &mockGA4Client{
		respFunc: func(callIdx int, req *analyticsdata.RunReportRequest) (*analyticsdata.RunReportResponse, error) {
			return &analyticsdata.RunReportResponse{
				Rows: []*analyticsdata.Row{
					row([]string{"Organic Search"}, []string{"75"}),
					row([]string{"Direct"}, []string{"25"}),
				},
			}, nil
		},
	}
	svc := NewService(mock, time.Minute)

	got, err := svc.GetChannels(context.Background(), "28d")
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if len(got.Channels) != 2 {
		t.Fatalf("channels len = %d, want 2", len(got.Channels))
	}
	if got.Channels[0].Share != 0.75 {
		t.Errorf("channels[0].share = %v, want 0.75", got.Channels[0].Share)
	}
	if got.Channels[1].Share != 0.25 {
		t.Errorf("channels[1].share = %v, want 0.25", got.Channels[1].Share)
	}
}

func TestGetChannelsZeroSessions(t *testing.T) {
	mock := &mockGA4Client{
		respFunc: func(callIdx int, req *analyticsdata.RunReportRequest) (*analyticsdata.RunReportResponse, error) {
			return &analyticsdata.RunReportResponse{}, nil
		},
	}
	svc := NewService(mock, time.Minute)

	got, err := svc.GetChannels(context.Background(), "28d")
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if len(got.Channels) != 0 {
		t.Fatalf("channels len = %d, want 0", len(got.Channels))
	}
}

func TestGetAudience(t *testing.T) {
	mock := &mockGA4Client{
		respFunc: func(callIdx int, req *analyticsdata.RunReportRequest) (*analyticsdata.RunReportResponse, error) {
			if callIdx == 0 {
				return &analyticsdata.RunReportResponse{
					Rows: []*analyticsdata.Row{
						row([]string{"Thailand"}, []string{"200"}),
						row([]string{"Singapore"}, []string{"50"}),
					},
				}, nil
			}
			return &analyticsdata.RunReportResponse{
				Rows: []*analyticsdata.Row{
					row([]string{"mobile"}, []string{"150"}),
					row([]string{"desktop"}, []string{"100"}),
				},
			}, nil
		},
	}
	svc := NewService(mock, time.Minute)

	got, err := svc.GetAudience(context.Background(), "28d")
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if len(got.Countries) != 2 || got.Countries[0].Country != "Thailand" {
		t.Errorf("countries = %+v, want Thailand first", got.Countries)
	}
	if len(got.Devices) != 2 || got.Devices[0].DeviceCategory != "mobile" {
		t.Errorf("devices = %+v, want mobile first (sessions desc)", got.Devices)
	}
}

func TestGetAudienceInvalidRange(t *testing.T) {
	svc := NewService(&mockGA4Client{}, time.Minute)
	_, err := svc.GetAudience(context.Background(), "")
	if !errors.Is(err, ErrInvalidRange) {
		t.Fatalf("error = %v, want ErrInvalidRange", err)
	}
}

func TestGetChannelsInvalidRange(t *testing.T) {
	svc := NewService(&mockGA4Client{}, time.Minute)
	_, err := svc.GetChannels(context.Background(), "1d")
	if !errors.Is(err, ErrInvalidRange) {
		t.Fatalf("error = %v, want ErrInvalidRange", err)
	}
}

func TestServiceDisabled(t *testing.T) {
	// NewServiceFromEnv with no env vars set should be disabled and every
	// endpoint should return ErrAnalyticsUnavailable, never crash or reach
	// out to a real GA4 client.
	t.Setenv("GA4_PROPERTY_ID", "")
	t.Setenv("GA4_SA_CREDENTIALS_JSON", "")

	svc := NewServiceFromEnv(context.Background())
	if svc.DisabledReason() == "" {
		t.Fatal("expected DisabledReason to be non-empty when env vars are missing")
	}

	_, err := svc.GetOverview(context.Background(), "28d")
	if !errors.Is(err, ErrAnalyticsUnavailable) {
		t.Fatalf("error = %v, want ErrAnalyticsUnavailable", err)
	}
}
