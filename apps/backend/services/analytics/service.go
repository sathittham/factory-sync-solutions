package analytics

import (
	"context"
	"errors"
	"fmt"
	"os"
	"sort"
	"strconv"
	"strings"
	"sync"
	"time"

	"cloud.google.com/go/auth/credentials"
	analyticsdata "google.golang.org/api/analyticsdata/v1beta"
	"google.golang.org/api/option"
)

var (
	// ErrAnalyticsUnavailable is returned when GA4 cannot be reached and no
	// cached payload exists to serve instead (or the service was never
	// configured with credentials).
	ErrAnalyticsUnavailable = errors.New("analytics unavailable")
	// ErrAnalyticsUpstream wraps a failure from the GA4 Data API itself.
	ErrAnalyticsUpstream = errors.New("analytics upstream error")
	// ErrInvalidRange is returned when the requested range is not one of the allowlisted values.
	ErrInvalidRange = errors.New("invalid range")
	// ErrInvalidSite is returned when the requested site is not one of the allowlisted values.
	ErrInvalidSite = errors.New("invalid site")
)

const defaultCacheTTL = 15 * time.Minute

// validRanges allowlists the supported `range` query values and maps them to
// the number of inclusive days requested from GA4.
var validRanges = map[string]int{
	"7d":  7,
	"28d": 28,
	"90d": 90,
}

const defaultRange = "28d"

// Site tabs: "all" applies no filter; the other values restrict every report
// to the GA4 hostName values of that surface. Both surfaces stream into the
// same GA4 property, so the split is a hostName dimension filter.
const (
	siteAll      = "all"
	siteOfficial = "official"
	siteApp      = "app"
)

const defaultSite = siteAll

// defaultSiteHosts can be overridden per environment with GA4_HOSTS_OFFICIAL /
// GA4_HOSTS_APP (comma-separated hostnames) without a code change.
var defaultSiteHosts = map[string][]string{
	siteOfficial: {"factorysyncsolutions.com", "www.factorysyncsolutions.com"},
	siteApp:      {"app.factorysyncsolutions.com"},
}

func siteHostsFromEnv() map[string][]string {
	hosts := map[string][]string{
		siteOfficial: defaultSiteHosts[siteOfficial],
		siteApp:      defaultSiteHosts[siteApp],
	}
	for site, envKey := range map[string]string{
		siteOfficial: "GA4_HOSTS_OFFICIAL",
		siteApp:      "GA4_HOSTS_APP",
	} {
		raw := strings.TrimSpace(os.Getenv(envKey))
		if raw == "" {
			continue
		}
		var parsed []string
		for _, h := range strings.Split(raw, ",") {
			if h = strings.TrimSpace(h); h != "" {
				parsed = append(parsed, h)
			}
		}
		if len(parsed) > 0 {
			hosts[site] = parsed
		}
	}
	return hosts
}

const topPagesLimit = 10
const topChannelsLimit = 10
const topCountriesLimit = 10
const topSourcesLimit = 10

// GA4Client wraps the GA4 Data API's runReport call so tests can mock it
// without real service-account credentials. The property is bound at
// construction time — callers never pass a property ID per-request.
type GA4Client interface {
	RunReport(ctx context.Context, req *analyticsdata.RunReportRequest) (*analyticsdata.RunReportResponse, error)
}

// ga4Client is the production GA4Client backed by the real GA4 Data API SDK.
type ga4Client struct {
	svc        *analyticsdata.Service
	propertyID string
}

func (c *ga4Client) RunReport(ctx context.Context, req *analyticsdata.RunReportRequest) (*analyticsdata.RunReportResponse, error) {
	property := "properties/" + c.propertyID
	resp, err := analyticsdata.NewPropertiesService(c.svc).RunReport(property, req).Context(ctx).Do()
	if err != nil {
		return nil, fmt.Errorf("ga4 runReport: %w", err)
	}
	return resp, nil
}

type cacheEntry struct {
	payload   any
	expiresAt time.Time
}

// Service proxies the GA4 Data API v1beta with an in-memory TTL cache.
type Service struct {
	client      GA4Client
	cacheTTL    time.Duration
	disabledErr error
	// propertyID is the configured GA4 property ID, exposed via GetMeta so the
	// frontend can deep-link to the Google Analytics console. It is not used
	// for the runReport calls themselves — those are bound inside ga4Client.
	propertyID string
	// siteHosts maps the "official"/"app" site tabs to hostName allowlists.
	siteHosts map[string][]string

	mu    sync.RWMutex
	cache map[string]cacheEntry
}

// NewService constructs a Service with an injected GA4Client — used by tests
// to mock RunReport without real credentials.
func NewService(client GA4Client, cacheTTL time.Duration) *Service {
	if cacheTTL <= 0 {
		cacheTTL = defaultCacheTTL
	}
	return &Service{
		client:    client,
		cacheTTL:  cacheTTL,
		siteHosts: siteHostsFromEnv(),
		cache:     make(map[string]cacheEntry),
	}
}

// resolveSite validates the site query param, defaulting empty to "all".
func resolveSite(site string) (string, error) {
	switch site {
	case "":
		return defaultSite, nil
	case siteAll, siteOfficial, siteApp:
		return site, nil
	default:
		return "", ErrInvalidSite
	}
}

// hostFilter returns the GA4 dimension filter for a site tab, or nil for
// "all" (no filtering).
func (s *Service) hostFilter(site string) *analyticsdata.FilterExpression {
	hosts := s.siteHosts[site]
	if len(hosts) == 0 {
		return nil
	}
	return &analyticsdata.FilterExpression{
		Filter: &analyticsdata.Filter{
			FieldName:    "hostName",
			InListFilter: &analyticsdata.InListFilter{Values: hosts, CaseSensitive: false},
		},
	}
}

// NewServiceFromEnv builds the production Service from GA4_PROPERTY_ID and
// GA4_SA_CREDENTIALS_JSON. If either is missing, the service starts in a
// disabled state (mirrors upload.NewServiceFromEnv) — every method returns
// ErrAnalyticsUnavailable instead of crashing the process at startup.
func NewServiceFromEnv(ctx context.Context) *Service {
	propertyID := strings.TrimSpace(os.Getenv("GA4_PROPERTY_ID"))
	credsJSON := strings.TrimSpace(os.Getenv("GA4_SA_CREDENTIALS_JSON"))

	cacheTTL := defaultCacheTTL
	if raw := strings.TrimSpace(os.Getenv("GA4_CACHE_TTL")); raw != "" {
		if d, err := time.ParseDuration(raw); err == nil && d > 0 {
			cacheTTL = d
		}
	}

	missing := make([]string, 0, 2)
	if propertyID == "" {
		missing = append(missing, "GA4_PROPERTY_ID")
	}
	if credsJSON == "" {
		missing = append(missing, "GA4_SA_CREDENTIALS_JSON")
	}
	if len(missing) > 0 {
		return &Service{
			disabledErr: fmt.Errorf("%w: missing %s", ErrAnalyticsUnavailable, strings.Join(missing, ", ")),
			cacheTTL:    cacheTTL,
			cache:       make(map[string]cacheEntry),
		}
	}

	creds, err := credentials.DetectDefault(&credentials.DetectOptions{
		CredentialsJSON: []byte(credsJSON),
		Scopes:          []string{analyticsdata.AnalyticsReadonlyScope},
	})
	if err != nil {
		return &Service{
			disabledErr: fmt.Errorf("%w: parse ga4 credentials: %v", ErrAnalyticsUnavailable, err),
			cacheTTL:    cacheTTL,
			cache:       make(map[string]cacheEntry),
		}
	}

	svc, err := analyticsdata.NewService(ctx, option.WithAuthCredentials(creds))
	if err != nil {
		return &Service{
			disabledErr: fmt.Errorf("%w: init ga4 client: %v", ErrAnalyticsUnavailable, err),
			cacheTTL:    cacheTTL,
			cache:       make(map[string]cacheEntry),
		}
	}

	service := NewService(&ga4Client{svc: svc, propertyID: propertyID}, cacheTTL)
	service.propertyID = propertyID
	return service
}

// DisabledReason returns a human-readable reason the service is disabled, or
// "" if it is configured.
func (s *Service) DisabledReason() string {
	if s == nil || s.disabledErr == nil {
		return ""
	}
	return s.disabledErr.Error()
}

func (s *Service) getFresh(key string) (any, bool) {
	s.mu.RLock()
	defer s.mu.RUnlock()
	entry, ok := s.cache[key]
	if !ok || time.Now().After(entry.expiresAt) {
		return nil, false
	}
	return entry.payload, true
}

func (s *Service) getStale(key string) (any, bool) {
	s.mu.RLock()
	defer s.mu.RUnlock()
	entry, ok := s.cache[key]
	if !ok {
		return nil, false
	}
	return entry.payload, true
}

func (s *Service) setCache(key string, payload any) {
	s.mu.Lock()
	defer s.mu.Unlock()
	s.cache[key] = cacheEntry{payload: payload, expiresAt: time.Now().Add(s.cacheTTL)}
}

// fetchWithCache serves `key` from the fresh cache if present, otherwise
// calls fetch. On fetch failure it falls back to a stale cached payload
// (stale=true) if one exists; only when there is truly no cache does it
// return ErrAnalyticsUnavailable.
func fetchWithCache[T any](s *Service, ctx context.Context, key string, fetch func(ctx context.Context) (T, error)) (T, bool, error) {
	var zero T

	if s.disabledErr != nil {
		return zero, false, s.disabledErr
	}

	if cached, ok := s.getFresh(key); ok {
		return cached.(T), false, nil
	}

	fresh, err := fetch(ctx)
	if err == nil {
		s.setCache(key, fresh)
		return fresh, false, nil
	}

	if cached, ok := s.getStale(key); ok {
		return cached.(T), true, nil
	}

	return zero, false, fmt.Errorf("%s: %w: %w", key, ErrAnalyticsUnavailable, err)
}

// GetOverview returns traffic totals and a daily time series for the range.
func (s *Service) GetOverview(ctx context.Context, rangeParam, siteParam string) (*OverviewResponse, error) {
	days, ok := validRanges[rangeParam]
	if !ok {
		return nil, ErrInvalidRange
	}
	site, err := resolveSite(siteParam)
	if err != nil {
		return nil, err
	}

	key := "overview:" + rangeParam + ":" + site
	payload, stale, err := fetchWithCache(s, ctx, key, func(ctx context.Context) (OverviewResponse, error) {
		return s.fetchOverview(ctx, rangeParam, days, site)
	})
	if err != nil {
		return nil, fmt.Errorf("get overview: %w", err)
	}
	payload.Stale = stale
	return &payload, nil
}

// GetTopPages returns the top 10 page paths by views for the range.
func (s *Service) GetTopPages(ctx context.Context, rangeParam, siteParam string) (*TopPagesResponse, error) {
	days, ok := validRanges[rangeParam]
	if !ok {
		return nil, ErrInvalidRange
	}
	site, err := resolveSite(siteParam)
	if err != nil {
		return nil, err
	}

	key := "top-pages:" + rangeParam + ":" + site
	payload, stale, err := fetchWithCache(s, ctx, key, func(ctx context.Context) (TopPagesResponse, error) {
		return s.fetchTopPages(ctx, rangeParam, days, site)
	})
	if err != nil {
		return nil, fmt.Errorf("get top pages: %w", err)
	}
	payload.Stale = stale
	return &payload, nil
}

// GetChannels returns sessions grouped by GA4 default channel group.
func (s *Service) GetChannels(ctx context.Context, rangeParam, siteParam string) (*ChannelsResponse, error) {
	days, ok := validRanges[rangeParam]
	if !ok {
		return nil, ErrInvalidRange
	}
	site, err := resolveSite(siteParam)
	if err != nil {
		return nil, err
	}

	key := "channels:" + rangeParam + ":" + site
	payload, stale, err := fetchWithCache(s, ctx, key, func(ctx context.Context) (ChannelsResponse, error) {
		return s.fetchChannels(ctx, rangeParam, days, site)
	})
	if err != nil {
		return nil, fmt.Errorf("get channels: %w", err)
	}
	payload.Stale = stale
	return &payload, nil
}

// GetSources returns sessions grouped by session source / medium (top 10).
func (s *Service) GetSources(ctx context.Context, rangeParam, siteParam string) (*SourcesResponse, error) {
	days, ok := validRanges[rangeParam]
	if !ok {
		return nil, ErrInvalidRange
	}
	site, err := resolveSite(siteParam)
	if err != nil {
		return nil, err
	}

	key := "sources:" + rangeParam + ":" + site
	payload, stale, err := fetchWithCache(s, ctx, key, func(ctx context.Context) (SourcesResponse, error) {
		return s.fetchSources(ctx, rangeParam, days, site)
	})
	if err != nil {
		return nil, fmt.Errorf("get sources: %w", err)
	}
	payload.Stale = stale
	return &payload, nil
}

// GetMeta returns the configured GA4 property ID for deep-linking to the
// Google Analytics console. It does not call the GA4 API and is not cached.
func (s *Service) GetMeta() (*MetaResponse, error) {
	if s.disabledErr != nil {
		return nil, s.disabledErr
	}
	return &MetaResponse{PropertyID: s.propertyID}, nil
}

// GetAudience returns sessions by top-10 country and by device category.
func (s *Service) GetAudience(ctx context.Context, rangeParam, siteParam string) (*AudienceResponse, error) {
	days, ok := validRanges[rangeParam]
	if !ok {
		return nil, ErrInvalidRange
	}
	site, err := resolveSite(siteParam)
	if err != nil {
		return nil, err
	}

	key := "audience:" + rangeParam + ":" + site
	payload, stale, err := fetchWithCache(s, ctx, key, func(ctx context.Context) (AudienceResponse, error) {
		return s.fetchAudience(ctx, rangeParam, days, site)
	})
	if err != nil {
		return nil, fmt.Errorf("get audience: %w", err)
	}
	payload.Stale = stale
	return &payload, nil
}

// GetEngagement returns rolling DAU/WAU/MAU and stickiness for the range.
func (s *Service) GetEngagement(ctx context.Context, rangeParam, siteParam string) (*EngagementResponse, error) {
	days, ok := validRanges[rangeParam]
	if !ok {
		return nil, ErrInvalidRange
	}
	site, err := resolveSite(siteParam)
	if err != nil {
		return nil, err
	}

	key := "engagement:" + rangeParam + ":" + site
	payload, stale, err := fetchWithCache(s, ctx, key, func(ctx context.Context) (EngagementResponse, error) {
		return s.fetchEngagement(ctx, rangeParam, days, site)
	})
	if err != nil {
		return nil, fmt.Errorf("get engagement: %w", err)
	}
	payload.Stale = stale
	return &payload, nil
}

func dateRangeFor(days int) *analyticsdata.DateRange {
	end := time.Now().UTC()
	start := end.AddDate(0, 0, -(days - 1))
	return &analyticsdata.DateRange{
		StartDate: start.Format("2006-01-02"),
		EndDate:   end.Format("2006-01-02"),
	}
}

func rowMetricInt(row *analyticsdata.Row, idx int) int64 {
	if row == nil || idx >= len(row.MetricValues) {
		return 0
	}
	v, _ := strconv.ParseInt(row.MetricValues[idx].Value, 10, 64)
	return v
}

func rowMetricFloat(row *analyticsdata.Row, idx int) float64 {
	if row == nil || idx >= len(row.MetricValues) {
		return 0
	}
	v, _ := strconv.ParseFloat(row.MetricValues[idx].Value, 64)
	return v
}

func rowDimension(row *analyticsdata.Row, idx int) string {
	if row == nil || idx >= len(row.DimensionValues) {
		return ""
	}
	return row.DimensionValues[idx].Value
}

// formatGA4Date converts GA4's YYYYMMDD date dimension value to YYYY-MM-DD.
func formatGA4Date(raw string) string {
	if len(raw) != 8 {
		return raw
	}
	return raw[0:4] + "-" + raw[4:6] + "-" + raw[6:8]
}

func (s *Service) runReport(ctx context.Context, req *analyticsdata.RunReportRequest) (*analyticsdata.RunReportResponse, error) {
	resp, err := s.client.RunReport(ctx, req)
	if err != nil {
		return nil, fmt.Errorf("%w: %v", ErrAnalyticsUpstream, err)
	}
	return resp, nil
}

func (s *Service) fetchOverview(ctx context.Context, rangeParam string, days int, site string) (OverviewResponse, error) {
	dr := dateRangeFor(days)

	totalsResp, err := s.runReport(ctx, &analyticsdata.RunReportRequest{
		DateRanges:      []*analyticsdata.DateRange{dr},
		DimensionFilter: s.hostFilter(site),
		Metrics: []*analyticsdata.Metric{
			{Name: "activeUsers"},
			{Name: "sessions"},
			{Name: "screenPageViews"},
			{Name: "userEngagementDuration"},
		},
	})
	if err != nil {
		return OverviewResponse{}, fmt.Errorf("overview totals: %w", err)
	}

	var totals OverviewTotals
	if len(totalsResp.Rows) > 0 {
		row := totalsResp.Rows[0]
		totals.ActiveUsers = rowMetricInt(row, 0)
		totals.Sessions = rowMetricInt(row, 1)
		totals.PageViews = rowMetricInt(row, 2)
		engagementDuration := rowMetricFloat(row, 3)
		if totals.Sessions > 0 {
			totals.AvgEngagementTimeSec = engagementDuration / float64(totals.Sessions)
		}
	}

	seriesResp, err := s.runReport(ctx, &analyticsdata.RunReportRequest{
		DateRanges:      []*analyticsdata.DateRange{dr},
		DimensionFilter: s.hostFilter(site),
		Dimensions:      []*analyticsdata.Dimension{{Name: "date"}},
		Metrics: []*analyticsdata.Metric{
			{Name: "activeUsers"},
			{Name: "sessions"},
		},
		OrderBys: []*analyticsdata.OrderBy{
			{Dimension: &analyticsdata.DimensionOrderBy{DimensionName: "date"}},
		},
	})
	if err != nil {
		return OverviewResponse{}, fmt.Errorf("overview series: %w", err)
	}

	series := make([]DailyPoint, 0, len(seriesResp.Rows))
	for _, row := range seriesResp.Rows {
		series = append(series, DailyPoint{
			Date:        formatGA4Date(rowDimension(row, 0)),
			ActiveUsers: rowMetricInt(row, 0),
			Sessions:    rowMetricInt(row, 1),
		})
	}

	return OverviewResponse{
		Range:  rangeParam,
		Site:   site,
		Totals: totals,
		Series: series,
	}, nil
}

func (s *Service) fetchTopPages(ctx context.Context, rangeParam string, days int, site string) (TopPagesResponse, error) {
	dr := dateRangeFor(days)

	resp, err := s.runReport(ctx, &analyticsdata.RunReportRequest{
		DateRanges:      []*analyticsdata.DateRange{dr},
		DimensionFilter: s.hostFilter(site),
		Dimensions:      []*analyticsdata.Dimension{{Name: "pagePath"}},
		Metrics: []*analyticsdata.Metric{
			{Name: "screenPageViews"},
			{Name: "userEngagementDuration"},
		},
		OrderBys: []*analyticsdata.OrderBy{
			{Desc: true, Metric: &analyticsdata.MetricOrderBy{MetricName: "screenPageViews"}},
		},
		Limit: topPagesLimit,
	})
	if err != nil {
		return TopPagesResponse{}, fmt.Errorf("top pages: %w", err)
	}

	pages := make([]TopPage, 0, len(resp.Rows))
	for _, row := range resp.Rows {
		views := rowMetricInt(row, 0)
		engagementDuration := rowMetricFloat(row, 1)
		var avgEngagement float64
		if views > 0 {
			avgEngagement = engagementDuration / float64(views)
		}
		pages = append(pages, TopPage{
			Path:                 rowDimension(row, 0),
			Views:                views,
			AvgEngagementTimeSec: avgEngagement,
		})
	}

	return TopPagesResponse{
		Range: rangeParam,
		Site:  site,
		Pages: pages,
	}, nil
}

func (s *Service) fetchChannels(ctx context.Context, rangeParam string, days int, site string) (ChannelsResponse, error) {
	dr := dateRangeFor(days)

	resp, err := s.runReport(ctx, &analyticsdata.RunReportRequest{
		DateRanges:      []*analyticsdata.DateRange{dr},
		DimensionFilter: s.hostFilter(site),
		Dimensions:      []*analyticsdata.Dimension{{Name: "sessionDefaultChannelGroup"}},
		Metrics:         []*analyticsdata.Metric{{Name: "sessions"}},
		OrderBys: []*analyticsdata.OrderBy{
			{Desc: true, Metric: &analyticsdata.MetricOrderBy{MetricName: "sessions"}},
		},
		Limit: topChannelsLimit,
	})
	if err != nil {
		return ChannelsResponse{}, fmt.Errorf("channels: %w", err)
	}

	var totalSessions int64
	channels := make([]Channel, 0, len(resp.Rows))
	for _, row := range resp.Rows {
		sessions := rowMetricInt(row, 0)
		totalSessions += sessions
		channels = append(channels, Channel{
			Channel:  rowDimension(row, 0),
			Sessions: sessions,
		})
	}
	for i := range channels {
		if totalSessions > 0 {
			channels[i].Share = float64(channels[i].Sessions) / float64(totalSessions)
		}
	}

	return ChannelsResponse{
		Range:    rangeParam,
		Site:     site,
		Channels: channels,
	}, nil
}

func (s *Service) fetchSources(ctx context.Context, rangeParam string, days int, site string) (SourcesResponse, error) {
	dr := dateRangeFor(days)

	resp, err := s.runReport(ctx, &analyticsdata.RunReportRequest{
		DateRanges:      []*analyticsdata.DateRange{dr},
		DimensionFilter: s.hostFilter(site),
		Dimensions:      []*analyticsdata.Dimension{{Name: "sessionSourceMedium"}},
		Metrics:         []*analyticsdata.Metric{{Name: "sessions"}},
		OrderBys: []*analyticsdata.OrderBy{
			{Desc: true, Metric: &analyticsdata.MetricOrderBy{MetricName: "sessions"}},
		},
		Limit: topSourcesLimit,
	})
	if err != nil {
		return SourcesResponse{}, fmt.Errorf("sources: %w", err)
	}

	var totalSessions int64
	sources := make([]Source, 0, len(resp.Rows))
	for _, row := range resp.Rows {
		sessions := rowMetricInt(row, 0)
		totalSessions += sessions
		sources = append(sources, Source{
			Source:   rowDimension(row, 0),
			Sessions: sessions,
		})
	}
	for i := range sources {
		if totalSessions > 0 {
			sources[i].Share = float64(sources[i].Sessions) / float64(totalSessions)
		}
	}

	return SourcesResponse{
		Range:   rangeParam,
		Site:    site,
		Sources: sources,
	}, nil
}

func (s *Service) fetchAudience(ctx context.Context, rangeParam string, days int, site string) (AudienceResponse, error) {
	dr := dateRangeFor(days)

	countryResp, err := s.runReport(ctx, &analyticsdata.RunReportRequest{
		DateRanges:      []*analyticsdata.DateRange{dr},
		DimensionFilter: s.hostFilter(site),
		Dimensions:      []*analyticsdata.Dimension{{Name: "country"}},
		Metrics:         []*analyticsdata.Metric{{Name: "sessions"}},
		OrderBys: []*analyticsdata.OrderBy{
			{Desc: true, Metric: &analyticsdata.MetricOrderBy{MetricName: "sessions"}},
		},
		Limit: topCountriesLimit,
	})
	if err != nil {
		return AudienceResponse{}, fmt.Errorf("audience countries: %w", err)
	}

	countries := make([]CountrySessions, 0, len(countryResp.Rows))
	for _, row := range countryResp.Rows {
		countries = append(countries, CountrySessions{
			Country:  rowDimension(row, 0),
			Sessions: rowMetricInt(row, 0),
		})
	}

	deviceResp, err := s.runReport(ctx, &analyticsdata.RunReportRequest{
		DateRanges:      []*analyticsdata.DateRange{dr},
		DimensionFilter: s.hostFilter(site),
		Dimensions:      []*analyticsdata.Dimension{{Name: "deviceCategory"}},
		Metrics:         []*analyticsdata.Metric{{Name: "sessions"}},
		OrderBys: []*analyticsdata.OrderBy{
			{Desc: true, Metric: &analyticsdata.MetricOrderBy{MetricName: "sessions"}},
		},
	})
	if err != nil {
		return AudienceResponse{}, fmt.Errorf("audience devices: %w", err)
	}

	devices := make([]DeviceSessions, 0, len(deviceResp.Rows))
	for _, row := range deviceResp.Rows {
		devices = append(devices, DeviceSessions{
			DeviceCategory: rowDimension(row, 0),
			Sessions:       rowMetricInt(row, 0),
		})
	}
	sort.Slice(devices, func(i, j int) bool { return devices[i].Sessions > devices[j].Sessions })

	return AudienceResponse{
		Range:     rangeParam,
		Site:      site,
		Countries: countries,
		Devices:   devices,
	}, nil
}

func (s *Service) fetchEngagement(ctx context.Context, rangeParam string, days int, site string) (EngagementResponse, error) {
	dr := dateRangeFor(days)

	resp, err := s.runReport(ctx, &analyticsdata.RunReportRequest{
		DateRanges:      []*analyticsdata.DateRange{dr},
		DimensionFilter: s.hostFilter(site),
		Dimensions:      []*analyticsdata.Dimension{{Name: "date"}},
		Metrics: []*analyticsdata.Metric{
			{Name: "active1DayUsers"},
			{Name: "active7DayUsers"},
			{Name: "active28DayUsers"},
		},
		OrderBys: []*analyticsdata.OrderBy{
			{Dimension: &analyticsdata.DimensionOrderBy{DimensionName: "date"}},
		},
	})
	if err != nil {
		return EngagementResponse{}, fmt.Errorf("engagement series: %w", err)
	}

	series := make([]EngagementPoint, 0, len(resp.Rows))
	for _, row := range resp.Rows {
		series = append(series, EngagementPoint{
			Date: formatGA4Date(rowDimension(row, 0)),
			DAU:  rowMetricInt(row, 0),
			WAU:  rowMetricInt(row, 1),
			MAU:  rowMetricInt(row, 2),
		})
	}

	var current EngagementCurrent
	if len(series) > 0 {
		last := series[len(series)-1]
		current.DAU = last.DAU
		current.WAU = last.WAU
		current.MAU = last.MAU
		if current.MAU > 0 {
			current.Stickiness = float64(current.DAU) / float64(current.MAU)
		}
	}

	return EngagementResponse{
		Range:   rangeParam,
		Site:    site,
		Current: current,
		Series:  series,
	}, nil
}
