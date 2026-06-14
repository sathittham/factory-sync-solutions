import { api, apiUrl } from '@/lib/api';
import type {
  ApiDocsMetadata,
  ApiDocsVersionsResponse,
  Assessment,
  AuditEvent,
  AuditFilters,
  BackofficeStats,
  CreateProjectInput,
  Member,
  OpenApiSpec,
  OwnerInvitation,
  Project,
  StaffMember,
  UserProfile,
} from './types';

export const backofficeApi = {
  // Stats
  getStats: () => api.get<BackofficeStats>('/backoffice/stats'),

  // Projects
  listProjects: (params?: { isActive?: boolean }) => {
    const qs = params?.isActive !== undefined ? `?isActive=${params.isActive}` : '';
    return api.get<Project[]>(`/backoffice/projects${qs}`);
  },
  createProject: (body: CreateProjectInput) => api.post<Project>('/backoffice/projects', body),
  getProject: (projectID: string) => api.get<Project>(`/backoffice/projects/${projectID}`),
  updateProject: (
    projectID: string,
    body: { name?: string; industryType?: string; companySize?: string },
  ) => api.put<Project>(`/backoffice/projects/${projectID}`, body),
  deactivateProject: (projectID: string) =>
    api.post<Project>(`/backoffice/projects/${projectID}/deactivate`, {}),
  reactivateProject: (projectID: string) =>
    api.post<Project>(`/backoffice/projects/${projectID}/reactivate`, {}),
  listMembers: (projectID: string) =>
    api.get<Member[]>(`/backoffice/projects/${projectID}/members`),
  changeMemberRole: (projectID: string, uid: string, projectRole: string) =>
    api.put<{ uid: string; projectRole: string }>(
      `/backoffice/projects/${projectID}/members/${uid}/role`,
      { projectRole },
    ),
  removeMember: (projectID: string, uid: string) =>
    api.delete(`/backoffice/projects/${projectID}/members/${uid}`),
  inviteOwner: (projectID: string, email: string) =>
    api.post<OwnerInvitation>(`/backoffice/projects/${projectID}/invite-owner`, { email }),

  // Users
  listUsers: (limit = 200) => api.get<UserProfile[]>(`/backoffice/users?limit=${limit}`),
  getUser: (uid: string) => api.get<UserProfile>(`/backoffice/users/${uid}`),
  getUserActivity: (uid: string, params?: AuditFilters) =>
    api.get<AuditEvent[]>(`/backoffice/users/${uid}/activity${auditQuery(params)}`),
  setUserRole: (uid: string, role: string) =>
    api.put<{ uid: string; role: string }>(`/backoffice/users/${uid}/role`, { role }),
  deleteUser: (uid: string) => api.delete(`/backoffice/users/${uid}`),

  // Results
  listResults: (params?: { projectID?: string }) => {
    const qs = params?.projectID ? `?projectID=${params.projectID}` : '';
    return api.get<Assessment[]>(`/backoffice/results${qs}`);
  },
  getResult: (assessmentID: string) => api.get<Assessment>(`/backoffice/results/${assessmentID}`),
  exportCSV: async (): Promise<Response> => {
    const { auth } = await import('@/lib/firebase');
    const token = await auth.currentUser?.getIdToken();
    const res = await fetch(apiUrl('/backoffice/export'), {
      headers: { Authorization: `Bearer ${token ?? ''}` },
    });
    return res;
  },

  // Staff
  listStaff: () => api.get<StaffMember[]>('/backoffice/staff'),
  inviteStaff: (body: { email: string; backofficeRole: string }) =>
    api.post<StaffMember>('/backoffice/staff/invitations', body),
  setStaffRole: (uid: string, backofficeRole: string) =>
    api.put<StaffMember>(`/backoffice/staff/${uid}`, { backofficeRole }),
  revokeStaffRole: (uid: string) => api.delete(`/backoffice/staff/${uid}`),

  // Audit
  listAudit: (params?: AuditFilters) =>
    api.get<AuditEvent[]>(`/backoffice/audit${auditQuery(params)}`),

  // API docs
  listApiDocVersions: () => api.get<ApiDocsVersionsResponse>('/backoffice/api-docs/versions'),
  getApiDocsMetadata: (apiVersion: string) =>
    api.get<ApiDocsMetadata>(`/backoffice/api-docs/${apiVersion}/metadata`),
  getApiDocsJson: (apiVersion: string) =>
    api.get<{ spec: OpenApiSpec }>(`/backoffice/api-docs/${apiVersion}/openapi.json`),
  getApiDocsYaml: (apiVersion: string) =>
    api.get<{ yaml: string }>(`/backoffice/api-docs/${apiVersion}/openapi.yaml`),
};

function auditQuery(params?: AuditFilters): string {
  if (!params) return '';
  const qs = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined && value !== '') qs.set(key, String(value));
  }
  const query = qs.toString();
  return query ? `?${query}` : '';
}
