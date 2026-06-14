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
