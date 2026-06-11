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

export interface BackofficeStats {
  totalProjects: number;
  totalUsers: number;
  avgScore: number;
  staffCount: number;
}
