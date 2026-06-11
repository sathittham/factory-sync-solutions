import { api } from '@/lib/api';
import type { Assessment, BackofficeStats, Member, Project, StaffMember, UserProfile } from './types';

export const backofficeApi = {
  // Stats
  getStats: () => api.get<BackofficeStats>('/backoffice/stats'),

  // Projects
  listProjects: (params?: { isActive?: boolean }) => {
    const qs = params?.isActive !== undefined ? `?isActive=${params.isActive}` : '';
    return api.get<Project[]>(`/backoffice/projects${qs}`);
  },
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

  // Users
  listUsers: (limit = 200) => api.get<UserProfile[]>(`/backoffice/users?limit=${limit}`),
  getUser: (uid: string) => api.get<UserProfile>(`/backoffice/users/${uid}`),
  deleteUser: (uid: string) => api.delete(`/backoffice/users/${uid}`),

  // Results
  listResults: (params?: { projectID?: string }) => {
    const qs = params?.projectID ? `?projectID=${params.projectID}` : '';
    return api.get<Assessment[]>(`/backoffice/results${qs}`);
  },
  getResult: (assessmentID: string) =>
    api.get<Assessment>(`/backoffice/results/${assessmentID}`),
  exportCSV: async (): Promise<Response> => {
    const { auth } = await import('@/lib/firebase');
    const token = await auth.currentUser?.getIdToken();
    const res = await fetch('/api/v1/backoffice/export', {
      headers: { Authorization: `Bearer ${token ?? ''}` },
    });
    return res;
  },

  // Staff
  listStaff: () => api.get<StaffMember[]>('/backoffice/staff'),
  setStaffRole: (uid: string, backofficeRole: string) =>
    api.put<StaffMember>(`/backoffice/staff/${uid}`, { backofficeRole }),
  revokeStaffRole: (uid: string) => api.delete(`/backoffice/staff/${uid}`),
};
