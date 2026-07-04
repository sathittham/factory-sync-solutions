export interface Project {
  projectID: string;
  name: string;
  companyRegId: string;
  industryType: string;
  companySize: string;
  ownerUID: string;
  memberCount: number;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface CreateProjectInput {
  name: string;
  companyRegId: string;
  industryType: string;
  companySize: string;
}

export interface Member {
  uid: string;
  email: string;
  displayName: string;
  projectRole: string;
  joinMethod: string;
  joinedAt: string;
  isActive: boolean;
}

export interface UserProfile {
  uid: string;
  email: string;
  displayName: string;
  avatarURL?: string;
  photoURL?: string;
  companyName: string;
  companyRegId: string;
  industryType: string;
  companySize: string;
  contactName: string;
  contactEmail: string;
  contactPhone: string;
  role: string;
  emailNotifications: boolean;
  createdAt: string;
}

export interface DimensionScore {
  dimensionID: string;
  dimensionName: string;
  score: number;
}

export interface Assessment {
  id: string;
  uid: string;
  quizId: string;
  scores: DimensionScore[];
  overallScore: number;
  strengths: string[];
  weaknesses: string[];
  diagnosis: string;
  submittedAt: string;
  // enriched fields
  companyName: string;
  industryType: string;
  companySize: string;
  contactName: string;
  contactEmail: string;
  projectID: string;
}

export interface StaffMember {
  uid: string;
  email: string;
  displayName: string;
  photoURL?: string;
  backofficeRole: string;
}

export interface OwnerInvitation {
  uid: string;
  email: string;
  projectID: string;
  projectRole: string;
  expiresAt: string;
}

export interface AuditEvent {
  id: string;
  actorUID: string;
  actorEmail?: string;
  actorName?: string;
  eventType: string;
  resourceType: string;
  resourceID: string;
  targetUID?: string;
  projectID?: string;
  metadata?: Record<string, unknown>;
  createdAt: string;
}

export interface AuditFilters {
  limit?: number;
  before?: string;
  eventType?: string;
  actorUID?: string;
  targetUID?: string;
  projectID?: string;
  resourceType?: string;
}

export interface BackofficeStats {
  totalProjects: number;
  totalUsers: number;
  avgScore: number;
  staffCount: number;
}

export interface ApiDocsVersion {
  apiVersion: string;
  label: string;
  isCurrent: boolean;
}

export interface ApiDocsVersionsResponse {
  versions: ApiDocsVersion[];
}

export interface ApiDocsMetadata {
  environment: string;
  apiVersion: string;
  gitSHA: string;
  generatedAt: string;
  openapiVersion: string;
  jsonKey: string;
  yamlKey: string;
}

export interface OpenApiOperation {
  summary?: string;
  description?: string;
  tags?: string[];
}

export interface OpenApiSpec {
  openapi?: string;
  swagger?: string;
  info?: {
    title?: string;
    version?: string;
  };
  paths?: Record<string, Record<string, OpenApiOperation>>;
}

export type AnalyticsRange = '7d' | '28d' | '90d';

/** Site tab filter: "all" (default), the marketing site, or the app. */
export type AnalyticsSite = 'all' | 'official' | 'app';

export interface AnalyticsOverviewTotals {
  activeUsers: number;
  sessions: number;
  pageViews: number;
  avgEngagementTimeSec: number;
}

export interface AnalyticsOverviewSeriesPoint {
  date: string;
  activeUsers: number;
  sessions: number;
}

export interface AnalyticsOverview {
  range: AnalyticsRange;
  stale: boolean;
  totals: AnalyticsOverviewTotals;
  series: AnalyticsOverviewSeriesPoint[];
}

export interface AnalyticsTopPage {
  path: string;
  views: number;
  avgEngagementTimeSec: number;
}

export interface AnalyticsTopPages {
  range: AnalyticsRange;
  stale: boolean;
  pages: AnalyticsTopPage[];
}

export interface AnalyticsChannel {
  channel: string;
  sessions: number;
  share: number;
}

export interface AnalyticsChannels {
  range: AnalyticsRange;
  stale: boolean;
  channels: AnalyticsChannel[];
}

export interface AnalyticsCountry {
  country: string;
  sessions: number;
}

export interface AnalyticsDevice {
  deviceCategory: string;
  sessions: number;
}

export interface AnalyticsAudience {
  range: AnalyticsRange;
  stale: boolean;
  countries: AnalyticsCountry[];
  devices: AnalyticsDevice[];
}

export interface AnalyticsEngagementCurrent {
  dau: number;
  wau: number;
  mau: number;
  stickiness: number;
}

export interface AnalyticsEngagementPoint {
  date: string;
  dau: number;
  wau: number;
  mau: number;
}

export interface AnalyticsEngagement {
  range: AnalyticsRange;
  stale: boolean;
  current: AnalyticsEngagementCurrent;
  series: AnalyticsEngagementPoint[];
}

export interface AnalyticsSource {
  source: string;
  sessions: number;
  share: number;
}

export interface AnalyticsSources {
  range: AnalyticsRange;
  stale: boolean;
  sources: AnalyticsSource[];
}

export interface AnalyticsMeta {
  propertyID: string;
}
