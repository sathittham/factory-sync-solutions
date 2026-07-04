import { LocaleProvider } from '@/lib/i18n';
import '@testing-library/jest-dom/vitest';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { ProjectsPage } from './ProjectsPage';

vi.mock('@/api/backoffice', () => ({
  backofficeApi: {
    listProjects: vi.fn(),
    createProject: vi.fn(),
    inviteOwner: vi.fn(),
  },
}));

const { backofficeApi } = await import('@/api/backoffice');
const mockedBackofficeApi = vi.mocked(backofficeApi);

const activeProject = {
  projectID: 'proj-active-1',
  name: 'Acme Manufacturing',
  companyRegId: '1234567890123',
  industryType: 'Automotive',
  companySize: 'medium',
  ownerUID: 'uid-owner-1',
  memberCount: 4,
  isActive: true,
  createdAt: '2026-01-01T00:00:00Z',
  updatedAt: '2026-01-01T00:00:00Z',
};

const inactiveProject = {
  ...activeProject,
  projectID: 'proj-inactive-1',
  name: 'Dormant Co',
  isActive: false,
};

function renderPage() {
  return render(
    <LocaleProvider>
      <MemoryRouter initialEntries={['/projects']}>
        <Routes>
          <Route path="/projects" element={<ProjectsPage />} />
          <Route path="/projects/:projectID" element={<div>Project Detail Page</div>} />
        </Routes>
      </MemoryRouter>
    </LocaleProvider>,
  );
}

describe('ProjectsPage', () => {
  beforeEach(() => {
    localStorage.setItem('fsb-locale', 'en');
    vi.clearAllMocks();
  });

  afterEach(() => {
    cleanup();
  });

  it('renders the list of projects once loaded', async () => {
    mockedBackofficeApi.listProjects.mockResolvedValue([activeProject, inactiveProject]);

    renderPage();

    expect(await screen.findByText('Acme Manufacturing')).toBeInTheDocument();
    expect(screen.getByText('Dormant Co')).toBeInTheDocument();
  });

  it('shows the empty state when there are no projects', async () => {
    mockedBackofficeApi.listProjects.mockResolvedValue([]);

    renderPage();

    expect(await screen.findByText('No data')).toBeInTheDocument();
  });

  it('shows an error message when the fetch fails', async () => {
    mockedBackofficeApi.listProjects.mockRejectedValue(new Error('server error'));

    renderPage();

    await waitFor(() => {
      expect(screen.getByText(/something went wrong/i)).toBeInTheDocument();
    });
  });

  it('filters the list by search text', async () => {
    mockedBackofficeApi.listProjects.mockResolvedValue([activeProject, inactiveProject]);

    renderPage();
    await screen.findByText('Acme Manufacturing');

    fireEvent.change(screen.getByPlaceholderText('Search'), { target: { value: 'Dormant' } });

    expect(screen.queryByText('Acme Manufacturing')).not.toBeInTheDocument();
    expect(screen.getByText('Dormant Co')).toBeInTheDocument();
  });

  it('navigates to the project detail page when a row is clicked', async () => {
    mockedBackofficeApi.listProjects.mockResolvedValue([activeProject]);

    renderPage();
    const row = await screen.findByText('Acme Manufacturing');
    fireEvent.click(row);

    expect(await screen.findByText('Project Detail Page')).toBeInTheDocument();
  });

  it('requires all fields before creating a new company', async () => {
    mockedBackofficeApi.listProjects.mockResolvedValue([]);

    renderPage();
    await screen.findByText('No data');

    fireEvent.click(screen.getByRole('button', { name: /new company/i }));
    fireEvent.click(screen.getByRole('button', { name: /create and invite/i }));

    expect(
      await screen.findByText('Enter the company details and owner email.'),
    ).toBeInTheDocument();
    expect(mockedBackofficeApi.createProject).not.toHaveBeenCalled();
  });

  it('validates the company registration ID format', async () => {
    mockedBackofficeApi.listProjects.mockResolvedValue([]);

    renderPage();
    await screen.findByText('No data');

    fireEvent.click(screen.getByRole('button', { name: /new company/i }));
    fireEvent.change(screen.getByLabelText('Company Name'), { target: { value: 'New Co' } });
    fireEvent.change(screen.getByLabelText('Reg ID'), { target: { value: 'not-a-number' } });
    fireEvent.change(screen.getByLabelText('Industry Type'), { target: { value: 'Textiles' } });
    fireEvent.change(screen.getByLabelText('Owner Email'), {
      target: { value: 'owner@example.com' },
    });
    fireEvent.click(screen.getByRole('button', { name: /create and invite/i }));

    expect(
      await screen.findByText('Company registration ID must be 13 digits.'),
    ).toBeInTheDocument();
  });

  it('creates a company, invites the owner, and navigates to its detail page', async () => {
    mockedBackofficeApi.listProjects.mockResolvedValue([]);
    mockedBackofficeApi.createProject.mockResolvedValue(activeProject);
    mockedBackofficeApi.inviteOwner.mockResolvedValue({
      uid: 'uid-owner-1',
      email: 'owner@example.com',
      projectID: activeProject.projectID,
      projectRole: 'owner',
      expiresAt: '2026-02-01T00:00:00Z',
    });

    renderPage();
    await screen.findByText('No data');

    fireEvent.click(screen.getByRole('button', { name: /new company/i }));
    fireEvent.change(screen.getByLabelText('Company Name'), {
      target: { value: activeProject.name },
    });
    fireEvent.change(screen.getByLabelText('Reg ID'), {
      target: { value: activeProject.companyRegId },
    });
    fireEvent.change(screen.getByLabelText('Industry Type'), {
      target: { value: activeProject.industryType },
    });
    fireEvent.change(screen.getByLabelText('Owner Email'), {
      target: { value: 'owner@example.com' },
    });
    fireEvent.click(screen.getByRole('button', { name: /create and invite/i }));

    await waitFor(() => {
      expect(mockedBackofficeApi.createProject).toHaveBeenCalledWith({
        name: activeProject.name,
        companyRegId: activeProject.companyRegId,
        industryType: activeProject.industryType,
        companySize: 'medium',
      });
    });
    expect(mockedBackofficeApi.inviteOwner).toHaveBeenCalledWith(
      activeProject.projectID,
      'owner@example.com',
    );
    expect(await screen.findByText('Project Detail Page')).toBeInTheDocument();
  });

  it('shows a create error message when the API call fails', async () => {
    mockedBackofficeApi.listProjects.mockResolvedValue([]);
    mockedBackofficeApi.createProject.mockRejectedValue(new Error('boom'));

    renderPage();
    await screen.findByText('No data');

    fireEvent.click(screen.getByRole('button', { name: /new company/i }));
    fireEvent.change(screen.getByLabelText('Company Name'), { target: { value: 'New Co' } });
    fireEvent.change(screen.getByLabelText('Reg ID'), { target: { value: '1234567890123' } });
    fireEvent.change(screen.getByLabelText('Industry Type'), { target: { value: 'Textiles' } });
    fireEvent.change(screen.getByLabelText('Owner Email'), {
      target: { value: 'owner@example.com' },
    });
    fireEvent.click(screen.getByRole('button', { name: /create and invite/i }));

    expect(
      await screen.findByText('Failed to create the company or send the invite. Please try again.'),
    ).toBeInTheDocument();
  });
});
