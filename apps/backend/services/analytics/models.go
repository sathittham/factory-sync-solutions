package analytics

// OverviewTotals holds the aggregate traffic totals for a date range.
type OverviewTotals struct {
	ActiveUsers          int64   `json:"activeUsers"`
	Sessions             int64   `json:"sessions"`
	PageViews            int64   `json:"pageViews"`
	AvgEngagementTimeSec float64 `json:"avgEngagementTimeSec"`
}

// DailyPoint is one day's worth of traffic in the overview time series.
type DailyPoint struct {
	Date        string `json:"date"`
	ActiveUsers int64  `json:"activeUsers"`
	Sessions    int64  `json:"sessions"`
}

// OverviewResponse is the payload for GET /backoffice/analytics/overview.
type OverviewResponse struct {
	Range  string         `json:"range"`
	Stale  bool           `json:"stale"`
	Totals OverviewTotals `json:"totals"`
	Series []DailyPoint   `json:"series"`
}

// TopPage is a single page-path row in the top-pages report.
type TopPage struct {
	Path                 string  `json:"path"`
	Views                int64   `json:"views"`
	AvgEngagementTimeSec float64 `json:"avgEngagementTimeSec"`
}

// TopPagesResponse is the payload for GET /backoffice/analytics/top-pages.
type TopPagesResponse struct {
	Range string    `json:"range"`
	Stale bool      `json:"stale"`
	Pages []TopPage `json:"pages"`
}

// Channel is a single acquisition-channel row with its share of total sessions.
type Channel struct {
	Channel  string  `json:"channel"`
	Sessions int64   `json:"sessions"`
	Share    float64 `json:"share"`
}

// ChannelsResponse is the payload for GET /backoffice/analytics/channels.
type ChannelsResponse struct {
	Range    string    `json:"range"`
	Stale    bool      `json:"stale"`
	Channels []Channel `json:"channels"`
}

// CountrySessions is a single country row in the audience report.
type CountrySessions struct {
	Country  string `json:"country"`
	Sessions int64  `json:"sessions"`
}

// DeviceSessions is a single device-category row in the audience report.
type DeviceSessions struct {
	DeviceCategory string `json:"deviceCategory"`
	Sessions       int64  `json:"sessions"`
}

// AudienceResponse is the payload for GET /backoffice/analytics/audience.
type AudienceResponse struct {
	Range     string            `json:"range"`
	Stale     bool              `json:"stale"`
	Countries []CountrySessions `json:"countries"`
	Devices   []DeviceSessions  `json:"devices"`
}
