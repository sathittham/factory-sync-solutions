import { api, apiUrl } from '@/lib/api';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { backofficeApi } from './backoffice';
import type { AuditFilters } from './types';

vi.mock('@/lib/api', () => ({
  api: {
    get: vi.fn(),
    post: vi.fn(),
    put: vi.fn(),
    delete: vi.fn(),
    postForm: vi.fn(),
  },
  apiUrl: vi.fn((path: string) => `/api/v1${path}`),
}));

const mockAuth = vi.hoisted(() => {
  const state: {
    currentUser: { uid: string; getIdToken: () => Promise<string | undefined> } | null;
  } = {
    currentUser: null,
  };
  return state;
});

vi.mock('@/lib/firebase', () => ({ auth: mockAuth }));

describe('backofficeApi', () => {
  let fetchMock: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    vi.clearAllMocks();
    mockAuth.currentUser = null;
    fetchMock = vi.fn().mockResolvedValue({ ok: true, status: 200 });
    vi.stubGlobal('fetch', fetchMock);
  });

  it('getStats calls GET /backoffice/stats', () => {
    backofficeApi.getStats();
    expect(api.get).toHaveBeenCalledWith('/backoffice/stats');
  });

  it('uploadFile calls postForm with the given FormData', () => {
    const formData = new FormData();
    formData.append('file', new Blob(['x']), 'x.png');

    backofficeApi.uploadFile(formData);

    expect(api.postForm).toHaveBeenCalledWith('/backoffice/upload/file', formData);
  });

  describe('listProjects', () => {
    it('omits the query string when no params are given', () => {
      backofficeApi.listProjects();
      expect(api.get).toHaveBeenCalledWith('/backoffice/projects');
    });

    it('omits the query string when isActive is undefined', () => {
      backofficeApi.listProjects({});
      expect(api.get).toHaveBeenCalledWith('/backoffice/projects');
    });

    it('appends isActive=true when set', () => {
      backofficeApi.listProjects({ isActive: true });
      expect(api.get).toHaveBeenCalledWith('/backoffice/projects?isActive=true');
    });

    it('appends isActive=false when explicitly false', () => {
      backofficeApi.listProjects({ isActive: false });
      expect(api.get).toHaveBeenCalledWith('/backoffice/projects?isActive=false');
    });
  });

  it('createProject calls POST /backoffice/projects with the body', () => {
    const body = {
      name: 'Factory A',
      companyRegId: '1234567890123',
      industryType: 'manufacturing',
      companySize: 'medium',
    };

    backofficeApi.createProject(body);

    expect(api.post).toHaveBeenCalledWith('/backoffice/projects', body);
  });

  it('getProject calls GET /backoffice/projects/:projectID', () => {
    backofficeApi.getProject('project-1');
    expect(api.get).toHaveBeenCalledWith('/backoffice/projects/project-1');
  });

  it('updateProject calls PUT /backoffice/projects/:projectID with the body', () => {
    const body = { name: 'Renamed', industryType: 'logistics', companySize: 'large' };

    backofficeApi.updateProject('project-1', body);

    expect(api.put).toHaveBeenCalledWith('/backoffice/projects/project-1', body);
  });

  it('deactivateProject calls POST .../deactivate with an empty body', () => {
    backofficeApi.deactivateProject('project-1');
    expect(api.post).toHaveBeenCalledWith('/backoffice/projects/project-1/deactivate', {});
  });

  it('reactivateProject calls POST .../reactivate with an empty body', () => {
    backofficeApi.reactivateProject('project-1');
    expect(api.post).toHaveBeenCalledWith('/backoffice/projects/project-1/reactivate', {});
  });

  it('listMembers calls GET /backoffice/projects/:projectID/members', () => {
    backofficeApi.listMembers('project-1');
    expect(api.get).toHaveBeenCalledWith('/backoffice/projects/project-1/members');
  });

  it('changeMemberRole calls PUT .../members/:uid/role with the new role', () => {
    backofficeApi.changeMemberRole('project-1', 'uid-member-1', 'admin');

    expect(api.put).toHaveBeenCalledWith(
      '/backoffice/projects/project-1/members/uid-member-1/role',
      {
        projectRole: 'admin',
      },
    );
  });

  it('removeMember calls DELETE .../members/:uid', () => {
    backofficeApi.removeMember('project-1', 'uid-member-1');
    expect(api.delete).toHaveBeenCalledWith('/backoffice/projects/project-1/members/uid-member-1');
  });

  it('inviteOwner calls POST .../invite-owner with the email', () => {
    backofficeApi.inviteOwner('project-1', 'owner@example.com');

    expect(api.post).toHaveBeenCalledWith('/backoffice/projects/project-1/invite-owner', {
      email: 'owner@example.com',
    });
  });

  describe('listUsers', () => {
    it('defaults limit to 200', () => {
      backofficeApi.listUsers();
      expect(api.get).toHaveBeenCalledWith('/backoffice/users?limit=200');
    });

    it('uses the given limit', () => {
      backofficeApi.listUsers(50);
      expect(api.get).toHaveBeenCalledWith('/backoffice/users?limit=50');
    });
  });

  it('getUser calls GET /backoffice/users/:uid', () => {
    backofficeApi.getUser('uid-factory-1');
    expect(api.get).toHaveBeenCalledWith('/backoffice/users/uid-factory-1');
  });

  describe('getUserActivity', () => {
    it('omits the query string when no params are given', () => {
      backofficeApi.getUserActivity('uid-factory-1');
      expect(api.get).toHaveBeenCalledWith('/backoffice/users/uid-factory-1/activity');
    });

    it('omits the query string when every filter value is undefined or empty', () => {
      const params: AuditFilters = { limit: undefined, eventType: '' };
      backofficeApi.getUserActivity('uid-factory-1', params);
      expect(api.get).toHaveBeenCalledWith('/backoffice/users/uid-factory-1/activity');
    });

    it('builds a query string from the given filters', () => {
      const params: AuditFilters = { limit: 25, eventType: 'login' };
      backofficeApi.getUserActivity('uid-factory-1', params);
      expect(api.get).toHaveBeenCalledWith(
        '/backoffice/users/uid-factory-1/activity?limit=25&eventType=login',
      );
    });
  });

  it('setUserRole calls PUT /backoffice/users/:uid/role with the new role', () => {
    backofficeApi.setUserRole('uid-factory-1', 'admin');

    expect(api.put).toHaveBeenCalledWith('/backoffice/users/uid-factory-1/role', { role: 'admin' });
  });

  it('deleteUser calls DELETE /backoffice/users/:uid', () => {
    backofficeApi.deleteUser('uid-factory-1');
    expect(api.delete).toHaveBeenCalledWith('/backoffice/users/uid-factory-1');
  });

  describe('listResults', () => {
    it('omits the query string when no params are given', () => {
      backofficeApi.listResults();
      expect(api.get).toHaveBeenCalledWith('/backoffice/results');
    });

    it('omits the query string when projectID is not set', () => {
      backofficeApi.listResults({});
      expect(api.get).toHaveBeenCalledWith('/backoffice/results');
    });

    it('appends projectID when given', () => {
      backofficeApi.listResults({ projectID: 'project-1' });
      expect(api.get).toHaveBeenCalledWith('/backoffice/results?projectID=project-1');
    });
  });

  it('getResult calls GET /backoffice/results/:assessmentID', () => {
    backofficeApi.getResult('assessment-1');
    expect(api.get).toHaveBeenCalledWith('/backoffice/results/assessment-1');
  });

  describe('exportCSV', () => {
    it('fetches with a Bearer token when a user is signed in', async () => {
      mockAuth.currentUser = {
        uid: 'uid-staff-1',
        getIdToken: vi.fn().mockResolvedValue('mock-id-token'),
      };

      const res = await backofficeApi.exportCSV();

      expect(apiUrl).toHaveBeenCalledWith('/backoffice/export');
      expect(fetchMock).toHaveBeenCalledWith('/api/v1/backoffice/export', {
        headers: { Authorization: 'Bearer mock-id-token' },
      });
      expect(res).toEqual({ ok: true, status: 200 });
    });

    it('fetches with an empty Bearer token when no user is signed in', async () => {
      mockAuth.currentUser = null;

      await backofficeApi.exportCSV();

      expect(fetchMock).toHaveBeenCalledWith('/api/v1/backoffice/export', {
        headers: { Authorization: 'Bearer ' },
      });
    });
  });

  it('listStaff calls GET /backoffice/staff', () => {
    backofficeApi.listStaff();
    expect(api.get).toHaveBeenCalledWith('/backoffice/staff');
  });

  it('inviteStaff calls POST /backoffice/staff/invitations with the body', () => {
    const body = { email: 'staff@example.com', backofficeRole: 'editor' };

    backofficeApi.inviteStaff(body);

    expect(api.post).toHaveBeenCalledWith('/backoffice/staff/invitations', body);
  });

  it('setStaffRole calls PUT /backoffice/staff/:uid with the new role', () => {
    backofficeApi.setStaffRole('uid-staff-1', 'editor');

    expect(api.put).toHaveBeenCalledWith('/backoffice/staff/uid-staff-1', {
      backofficeRole: 'editor',
    });
  });

  it('revokeStaffRole calls DELETE /backoffice/staff/:uid', () => {
    backofficeApi.revokeStaffRole('uid-staff-1');
    expect(api.delete).toHaveBeenCalledWith('/backoffice/staff/uid-staff-1');
  });

  describe('listAudit', () => {
    it('omits the query string when no params are given', () => {
      backofficeApi.listAudit();
      expect(api.get).toHaveBeenCalledWith('/backoffice/audit');
    });

    it('builds a query string from the given filters', () => {
      const params: AuditFilters = { actorUID: 'uid-staff-1', resourceType: 'project' };
      backofficeApi.listAudit(params);
      expect(api.get).toHaveBeenCalledWith(
        '/backoffice/audit?actorUID=uid-staff-1&resourceType=project',
      );
    });
  });

  it('listApiDocVersions calls GET /backoffice/api-docs/versions', () => {
    backofficeApi.listApiDocVersions();
    expect(api.get).toHaveBeenCalledWith('/backoffice/api-docs/versions');
  });

  it('getApiDocsMetadata calls GET /backoffice/api-docs/:apiVersion/metadata', () => {
    backofficeApi.getApiDocsMetadata('v1');
    expect(api.get).toHaveBeenCalledWith('/backoffice/api-docs/v1/metadata');
  });

  it('getApiDocsJson calls GET /backoffice/api-docs/:apiVersion/openapi.json', () => {
    backofficeApi.getApiDocsJson('v1');
    expect(api.get).toHaveBeenCalledWith('/backoffice/api-docs/v1/openapi.json');
  });

  it('getApiDocsYaml calls GET /backoffice/api-docs/:apiVersion/openapi.yaml', () => {
    backofficeApi.getApiDocsYaml('v1');
    expect(api.get).toHaveBeenCalledWith('/backoffice/api-docs/v1/openapi.yaml');
  });

  describe('analytics', () => {
    it('getAnalyticsOverview defaults site to all', () => {
      backofficeApi.getAnalyticsOverview('7d');
      expect(api.get).toHaveBeenCalledWith('/backoffice/analytics/overview?range=7d&site=all');
    });

    it('getAnalyticsOverview uses the given site', () => {
      backofficeApi.getAnalyticsOverview('28d', 'official');
      expect(api.get).toHaveBeenCalledWith(
        '/backoffice/analytics/overview?range=28d&site=official',
      );
    });

    it('getAnalyticsTopPages builds range and site query params', () => {
      backofficeApi.getAnalyticsTopPages('90d', 'app');
      expect(api.get).toHaveBeenCalledWith('/backoffice/analytics/top-pages?range=90d&site=app');
    });

    it('getAnalyticsChannels builds range and site query params', () => {
      backofficeApi.getAnalyticsChannels('7d');
      expect(api.get).toHaveBeenCalledWith('/backoffice/analytics/channels?range=7d&site=all');
    });

    it('getAnalyticsAudience builds range and site query params', () => {
      backofficeApi.getAnalyticsAudience('7d');
      expect(api.get).toHaveBeenCalledWith('/backoffice/analytics/audience?range=7d&site=all');
    });

    it('getAnalyticsEngagement builds range and site query params', () => {
      backofficeApi.getAnalyticsEngagement('7d');
      expect(api.get).toHaveBeenCalledWith('/backoffice/analytics/engagement?range=7d&site=all');
    });

    it('getAnalyticsSources builds range and site query params', () => {
      backofficeApi.getAnalyticsSources('7d');
      expect(api.get).toHaveBeenCalledWith('/backoffice/analytics/sources?range=7d&site=all');
    });

    it('getAnalyticsMeta calls GET /backoffice/analytics/meta', () => {
      backofficeApi.getAnalyticsMeta();
      expect(api.get).toHaveBeenCalledWith('/backoffice/analytics/meta');
    });
  });
});
