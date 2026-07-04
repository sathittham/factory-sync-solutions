import { LocaleProvider } from '@/lib/i18n';
import authReducer from '@/store/authSlice';
import { configureStore } from '@reduxjs/toolkit';
import '@testing-library/jest-dom/vitest';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Provider } from 'react-redux';
import { MemoryRouter, Route, Routes } from 'react-router';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { ProjectDetailPage } from './ProjectDetailPage';

vi.mock('@/api/backoffice', () => ({
  backofficeApi: {
    getProject: vi.fn(),
    listMembers: vi.fn(),
    listResults: vi.fn(),
    updateProject: vi.fn(),
    deactivateProject: vi.fn(),
    reactivateProject: vi.fn(),
    changeMemberRole: vi.fn(),
    removeMember: vi.fn(),
    inviteOwner: vi.fn(),
  },
}));

const { backofficeApi } = await import('@/api/backoffice');
const mockedBackofficeApi = vi.mocked(backofficeApi);

const project = {
  projectID: 'proj-1',
  name: 'Acme Manufacturing',
  companyRegId: '1234567890123',
  industryType: 'Automotive',
  companySize: 'medium',
  ownerUID: 'uid-owner-1',
  memberCount: 1,
  isActive: true,
  createdAt: '2026-01-01T00:00:00Z',
  updatedAt: '2026-01-01T00:00:00Z',
};

const member = {
  uid: 'uid-member-1',
  email: 'member@example.com',
  displayName: 'Member One',
  projectRole: 'manager',
  joinMethod: 'invited',
  joinedAt: '2026-01-05T00:00:00Z',
  isActive: true,
};

const assessment = {
  id: 'result-1',
  uid: 'uid-member-1',
  quizId: 'quiz-factory',
  scores: [{ dimensionID: 'd1', dimensionName: 'Safety', score: 4.0 }],
  overallScore: 4.0,
  strengths: ['Good training'],
  weaknesses: ['Aging equipment'],
  diagnosis: 'Advanced',
  submittedAt: '2026-06-01T00:00:00Z',
  companyName: 'Acme Manufacturing',
  industryType: 'Automotive',
  companySize: 'medium',
  contactName: '',
  contactEmail: '',
  projectID: 'proj-1',
};

type AuthState = ReturnType<typeof authReducer>;

const baseState: AuthState = {
  user: null,
  backofficeRole: null,
  isAuthenticated: true,
  isBackofficeUser: true,
  isSuperAdmin: false,
  loading: false,
};

function renderPage(authState: Partial<AuthState> = {}) {
  const store = configureStore({
    reducer: { auth: authReducer },
    preloadedState: { auth: { ...baseState, ...authState } },
  });

  return render(
    <Provider store={store}>
      <LocaleProvider>
        <MemoryRouter initialEntries={['/projects/proj-1']}>
          <Routes>
            <Route path="/projects/:projectID" element={<ProjectDetailPage />} />
          </Routes>
        </MemoryRouter>
      </LocaleProvider>
    </Provider>,
  );
}

function mockHappyFetch() {
  mockedBackofficeApi.getProject.mockResolvedValue(project);
  mockedBackofficeApi.listMembers.mockResolvedValue([member]);
  mockedBackofficeApi.listResults.mockResolvedValue([assessment]);
}

describe('ProjectDetailPage', () => {
  beforeEach(() => {
    localStorage.setItem('fsb-locale', 'en');
    vi.clearAllMocks();
  });

  afterEach(() => {
    cleanup();
  });

  it('loads the project and renders the quiz tab by default', async () => {
    mockHappyFetch();

    renderPage();

    expect(await screen.findByText('Acme Manufacturing')).toBeInTheDocument();
    expect(mockedBackofficeApi.getProject).toHaveBeenCalledWith('proj-1');
    expect(screen.getByText('quiz-factory')).toBeInTheDocument();
    expect(screen.getByText('4.00')).toBeInTheDocument();
  });

  it('shows an error message when the fetch fails', async () => {
    mockedBackofficeApi.getProject.mockRejectedValue(new Error('boom'));
    mockedBackofficeApi.listMembers.mockRejectedValue(new Error('boom'));
    mockedBackofficeApi.listResults.mockRejectedValue(new Error('boom'));

    renderPage();

    await waitFor(() => {
      expect(screen.getByText(/something went wrong/i)).toBeInTheDocument();
    });
  });

  it('expands a quiz result row to show dimension detail', async () => {
    mockHappyFetch();

    renderPage();
    const toggle = await screen.findByRole('button', { name: /quiz-factory/i });
    fireEvent.click(toggle);

    expect(screen.getByText('Safety')).toBeInTheDocument();
    expect(screen.getByText('Good training')).toBeInTheDocument();
  });

  it('does not show the deactivate/reactivate action for a non-superadmin', async () => {
    mockHappyFetch();

    renderPage({ isSuperAdmin: false });
    await screen.findByText('Acme Manufacturing');

    expect(screen.queryByRole('button', { name: /deactivate/i })).not.toBeInTheDocument();
  });

  it('deactivates an active project for a superadmin', async () => {
    mockHappyFetch();
    mockedBackofficeApi.deactivateProject.mockResolvedValue({ ...project, isActive: false });

    renderPage({ isSuperAdmin: true });
    await screen.findByText('Acme Manufacturing');

    fireEvent.click(screen.getByRole('button', { name: /deactivate/i }));

    await waitFor(() => {
      expect(mockedBackofficeApi.deactivateProject).toHaveBeenCalledWith('proj-1');
    });
    expect(await screen.findByRole('button', { name: /reactivate/i })).toBeInTheDocument();
  });

  it('switches to the members tab and changes a member role', async () => {
    mockHappyFetch();
    mockedBackofficeApi.changeMemberRole.mockResolvedValue({
      uid: member.uid,
      projectRole: 'owner',
    });
    const user = userEvent.setup();

    renderPage();
    await screen.findByText('Acme Manufacturing');

    await user.click(screen.getByRole('tab', { name: /members/i }));
    expect(await screen.findByText('Member One')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: /change role/i }));
    fireEvent.click(screen.getByRole('button', { name: /^confirm$/i }));

    await waitFor(() => {
      expect(mockedBackofficeApi.changeMemberRole).toHaveBeenCalledWith(
        'proj-1',
        'uid-member-1',
        'manager',
      );
    });
  });

  it('removes a member from the members tab', async () => {
    mockHappyFetch();
    mockedBackofficeApi.removeMember.mockResolvedValue(undefined);
    const user = userEvent.setup();

    renderPage();
    await screen.findByText('Acme Manufacturing');

    await user.click(screen.getByRole('tab', { name: /members/i }));
    await screen.findByText('Member One');

    fireEvent.click(screen.getByRole('button', { name: /^remove$/i }));
    const removeButtons = await screen.findAllByRole('button', { name: /^remove$/i });
    const lastRemoveButton = removeButtons.at(-1);
    if (!lastRemoveButton) throw new Error('expected a remove button in the confirm dialog');
    fireEvent.click(lastRemoveButton);

    await waitFor(() => {
      expect(mockedBackofficeApi.removeMember).toHaveBeenCalledWith('proj-1', 'uid-member-1');
    });
  });

  it('validates and sends an owner invite from the members tab', async () => {
    mockHappyFetch();
    mockedBackofficeApi.inviteOwner.mockResolvedValue({
      uid: 'uid-new-owner',
      email: 'owner@example.com',
      projectID: 'proj-1',
      projectRole: 'owner',
      expiresAt: '2026-02-01T00:00:00Z',
    });
    const user = userEvent.setup();

    renderPage();
    await screen.findByText('Acme Manufacturing');

    await user.click(screen.getByRole('tab', { name: /members/i }));
    fireEvent.click(await screen.findByRole('button', { name: /invite owner/i }));

    fireEvent.change(screen.getByLabelText('Owner Email'), { target: { value: 'not-an-email' } });
    fireEvent.click(screen.getByRole('button', { name: /send invite/i }));
    expect(await screen.findByText('Invalid owner email address')).toBeInTheDocument();

    fireEvent.change(screen.getByLabelText('Owner Email'), {
      target: { value: 'owner@example.com' },
    });
    fireEvent.click(screen.getByRole('button', { name: /send invite/i }));

    await waitFor(() => {
      expect(mockedBackofficeApi.inviteOwner).toHaveBeenCalledWith('proj-1', 'owner@example.com');
    });
    expect(await screen.findByText('Owner invitation sent')).toBeInTheDocument();
  });

  it('saves settings from the settings tab', async () => {
    mockHappyFetch();
    mockedBackofficeApi.updateProject.mockResolvedValue({ ...project, name: 'Renamed Co' });
    const user = userEvent.setup();

    renderPage();
    await screen.findByText('Acme Manufacturing');

    await user.click(screen.getByRole('tab', { name: /settings/i }));
    fireEvent.change(await screen.findByLabelText('Company Name'), {
      target: { value: 'Renamed Co' },
    });
    fireEvent.click(screen.getByRole('button', { name: /save settings/i }));

    await waitFor(() => {
      expect(mockedBackofficeApi.updateProject).toHaveBeenCalledWith('proj-1', {
        name: 'Renamed Co',
        industryType: project.industryType,
        companySize: project.companySize,
      });
    });
  });
});
