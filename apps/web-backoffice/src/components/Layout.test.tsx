import { backofficeApi } from '@/api/backoffice';
import type { Project } from '@/api/types';
import { LocaleProvider } from '@/lib/i18n';
import { ThemeProvider } from '@/lib/theme';
import authReducer from '@/store/authSlice';
import { configureStore } from '@reduxjs/toolkit';
import { cleanup, render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Provider } from 'react-redux';
import { MemoryRouter, Route, Routes } from 'react-router';
import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { Layout } from './Layout';

const mocks = vi.hoisted(() => ({
  signOut: vi.fn(),
  openCmsBlog: vi.fn(),
}));

vi.mock('firebase/auth', () => ({
  signOut: mocks.signOut,
}));

vi.mock('@/lib/firebase', () => ({
  auth: { name: 'mock-auth' },
}));

vi.mock('@/lib/cmsSso', () => ({
  openCmsBlog: mocks.openCmsBlog,
}));

vi.mock('@/api/backoffice', () => ({
  backofficeApi: {
    getProject: vi.fn(),
  },
}));

const mockedApi = vi.mocked(backofficeApi);

type AuthState = ReturnType<typeof authReducer>;

const baseState: AuthState = {
  user: {
    uid: 'uid-staff-1',
    email: 'staff@factorysyncsolutions.com',
    displayName: 'Staff One',
    photoURL: null,
  },
  backofficeRole: 'staff',
  isAuthenticated: true,
  isBackofficeUser: true,
  isSuperAdmin: false,
  loading: false,
};

function getBreadcrumbNav() {
  return screen.getByRole('navigation', { name: 'breadcrumb' });
}

function renderLayout(pathname: string, authState: Partial<AuthState> = {}) {
  const store = configureStore({
    reducer: { auth: authReducer },
    preloadedState: { auth: { ...baseState, ...authState } },
  });

  return render(
    <Provider store={store}>
      <LocaleProvider>
        <ThemeProvider>
          <MemoryRouter initialEntries={[pathname]}>
            <Routes>
              <Route element={<Layout />}>
                <Route path="/dashboard" element={<div>Dashboard Content</div>} />
                <Route path="/analytics" element={<div>Analytics Content</div>} />
                <Route path="/staff" element={<div>Staff Content</div>} />
                <Route path="/help/api-docs" element={<div>Docs Content</div>} />
                <Route path="/projects/:projectID" element={<div>Project Detail Content</div>} />
              </Route>
            </Routes>
          </MemoryRouter>
        </ThemeProvider>
      </LocaleProvider>
    </Provider>,
  );
}

describe('Layout', () => {
  beforeAll(() => {
    globalThis.HTMLElement.prototype.hasPointerCapture = vi.fn().mockReturnValue(false);
    globalThis.HTMLElement.prototype.releasePointerCapture = vi.fn();
    globalThis.HTMLElement.prototype.scrollIntoView = vi.fn();
  });

  beforeEach(() => {
    localStorage.setItem('fsb-locale', 'en');
    vi.clearAllMocks();
    mocks.signOut.mockResolvedValue(undefined);
    mocks.openCmsBlog.mockResolvedValue(undefined);
  });

  afterEach(() => {
    cleanup();
  });

  it('renders the matched child route inside the outlet', () => {
    renderLayout('/dashboard');

    expect(screen.getByText('Dashboard Content')).toBeInTheDocument();
  });

  it('renders the staff-only topbar banner and internal footer', () => {
    renderLayout('/dashboard');

    expect(screen.getByText('Internal management area for FactorySync staff')).toBeInTheDocument();
    expect(
      screen.getByText('Backoffice system for Factory Health Check operations'),
    ).toBeInTheDocument();
    expect(screen.getByText('test')).toBeInTheDocument();
  });

  it('builds the exact breadcrumb for the dashboard route', () => {
    renderLayout('/dashboard');

    const nav = getBreadcrumbNav();
    expect(within(nav).getByText('Main')).toBeInTheDocument();
    expect(within(nav).getByText('Dashboard')).toBeInTheDocument();
  });

  it('builds the prefix breadcrumb for a nested administrator route', () => {
    renderLayout('/help/api-docs', { isSuperAdmin: true, backofficeRole: 'superadmin' });

    const nav = getBreadcrumbNav();
    expect(within(nav).getByText('Administrator')).toBeInTheDocument();
    expect(within(nav).getByText('API Docs')).toBeInTheDocument();
  });

  it('falls back to the app name breadcrumb for an unmapped route', () => {
    renderLayout('/analytics');

    const nav = getBreadcrumbNav();
    expect(within(nav).getByText('Main')).toBeInTheDocument();
    expect(within(nav).getByText('FactorySync Backoffice')).toBeInTheDocument();
    expect(screen.getByText('Analytics Content')).toBeInTheDocument();
  });

  it('resolves the project name for the breadcrumb of a project detail route', async () => {
    const project: Project = {
      projectID: 'proj-1',
      name: 'Acme Manufacturing',
      companyRegId: '1234567890123',
      industryType: 'manufacturing',
      companySize: 'medium',
      ownerUID: 'uid-owner-1',
      memberCount: 3,
      isActive: true,
      createdAt: '2026-01-01T00:00:00Z',
      updatedAt: '2026-01-01T00:00:00Z',
    };
    mockedApi.getProject.mockResolvedValue(project);

    renderLayout('/projects/proj-1');

    const nav = getBreadcrumbNav();
    expect(await within(nav).findByText('Acme Manufacturing')).toBeInTheDocument();
    expect(within(nav).getByText('Projects')).toBeInTheDocument();
    expect(mockedApi.getProject).toHaveBeenCalledWith('proj-1');
  });

  it('falls back to the raw project id when the project lookup fails', async () => {
    mockedApi.getProject.mockRejectedValue(new Error('not found'));

    renderLayout('/projects/proj-404');

    expect(await screen.findByText('proj-404')).toBeInTheDocument();
  });

  it('re-renders breadcrumb labels when the locale is switched', async () => {
    renderLayout('/dashboard');

    const nav = getBreadcrumbNav();
    expect(within(nav).getByText('Dashboard')).toBeInTheDocument();

    const user = userEvent.setup();
    await user.click(screen.getByRole('button', { name: 'Language' }));
    await user.click(screen.getByRole('menuitem', { name: /TH/ }));

    await waitFor(() => expect(within(nav).getByText('แดชบอร์ด')).toBeInTheDocument());
  });
});
