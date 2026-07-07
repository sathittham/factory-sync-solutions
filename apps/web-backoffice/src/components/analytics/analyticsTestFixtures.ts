import type {
  AnalyticsAudience,
  AnalyticsChannels,
  AnalyticsEngagement,
  AnalyticsMeta,
  AnalyticsOverview,
  AnalyticsSources,
  AnalyticsTopPages,
} from '@/api/types';

export const overviewFixture: AnalyticsOverview = {
  range: '28d',
  stale: false,
  totals: {
    activeUsers: 1843,
    sessions: 2571,
    pageViews: 8420,
    avgEngagementTimeSec: 74.3,
  },
  series: [
    { date: '2026-06-06', activeUsers: 61, sessions: 88 },
    { date: '2026-06-07', activeUsers: 55, sessions: 79 },
  ],
};

export const emptyOverviewFixture: AnalyticsOverview = {
  range: '28d',
  stale: false,
  totals: { activeUsers: 0, sessions: 0, pageViews: 0, avgEngagementTimeSec: 0 },
  series: [],
};

export const zeroSessionsOverviewFixture: AnalyticsOverview = {
  range: '28d',
  stale: false,
  totals: { activeUsers: 0, sessions: 0, pageViews: 0, avgEngagementTimeSec: 0 },
  series: [
    { date: '2026-06-06', activeUsers: 0, sessions: 0 },
    { date: '2026-06-07', activeUsers: 0, sessions: 0 },
  ],
};

export const topPagesFixture: AnalyticsTopPages = {
  range: '28d',
  stale: false,
  pages: [
    { path: '/', views: 500, avgEngagementTimeSec: 42 },
    {
      path: '/en/quiz/factory-health-check/results/very-long-slug-for-truncation-testing',
      views: 120,
      avgEngagementTimeSec: 12,
    },
  ],
};

export const emptyTopPagesFixture: AnalyticsTopPages = {
  range: '28d',
  stale: false,
  pages: [],
};

export const channelsFixture: AnalyticsChannels = {
  range: '28d',
  stale: false,
  channels: [
    { channel: 'Organic Search', sessions: 1200, share: 0.6 },
    { channel: 'Direct', sessions: 800, share: 0.4 },
  ],
};

export const emptyChannelsFixture: AnalyticsChannels = {
  range: '28d',
  stale: false,
  channels: [],
};

export const audienceFixture: AnalyticsAudience = {
  range: '28d',
  stale: false,
  countries: [
    { country: 'Thailand', sessions: 900 },
    { country: 'Singapore', sessions: 300 },
  ],
  devices: [
    { deviceCategory: 'desktop', sessions: 600 },
    { deviceCategory: 'mobile', sessions: 300 },
    { deviceCategory: 'smarttv', sessions: 10 },
  ],
};

export const emptyAudienceFixture: AnalyticsAudience = {
  range: '28d',
  stale: false,
  countries: [],
  devices: [],
};

export const engagementFixture: AnalyticsEngagement = {
  range: '28d',
  stale: false,
  current: { dau: 12, wau: 45, mau: 130, stickiness: 0.092 },
  series: [
    { date: '2026-06-06', dau: 10, wau: 40, mau: 120 },
    { date: '2026-06-07', dau: 12, wau: 45, mau: 130 },
  ],
};

export const emptyEngagementFixture: AnalyticsEngagement = {
  range: '28d',
  stale: false,
  current: { dau: 0, wau: 0, mau: 0, stickiness: 0 },
  series: [],
};

export const zeroActivityEngagementFixture: AnalyticsEngagement = {
  range: '28d',
  stale: false,
  current: { dau: 0, wau: 0, mau: 0, stickiness: 0 },
  series: [
    { date: '2026-06-06', dau: 0, wau: 0, mau: 0 },
    { date: '2026-06-07', dau: 0, wau: 0, mau: 0 },
  ],
};

export const sourcesFixture: AnalyticsSources = {
  range: '28d',
  stale: false,
  sources: [
    { source: 'google / organic', sessions: 1200, share: 0.6 },
    { source: '(direct) / (none)', sessions: 800, share: 0.4 },
  ],
};

export const emptySourcesFixture: AnalyticsSources = {
  range: '28d',
  stale: false,
  sources: [],
};

export const metaFixture: AnalyticsMeta = {
  propertyID: '540943523',
};
