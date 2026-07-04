import { SidebarProvider } from '@/components/ui/sidebar';
import { LocaleProvider } from '@/lib/i18n';
import { ThemeProvider } from '@/lib/theme';
import authReducer from '@/store/authSlice';
import { configureStore } from '@reduxjs/toolkit';
import { cleanup, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Provider } from 'react-redux';
import { MemoryRouter } from 'react-router';
import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { AppSidebar } from './Sidebar';

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

function renderSidebar(pathname: string, authState: Partial<AuthState> = {}) {
  const store = configureStore({
    reducer: { auth: authReducer },
    preloadedState: { auth: { ...baseState, ...authState } },
  });

  render(
    <Provider store={store}>
      <LocaleProvider>
        <ThemeProvider>
          <MemoryRouter initialEntries={[pathname]}>
            <SidebarProvider>
              <AppSidebar />
            </SidebarProvider>
          </MemoryRouter>
        </ThemeProvider>
      </LocaleProvider>
    </Provider>,
  );

  return { store };
}

describe('AppSidebar', () => {
  beforeAll(() => {
    // jsdom does not implement pointer capture, which Radix's dropdown menu
    // relies on when opening via userEvent clicks.
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

  it('renders every main navigation link', () => {
    renderSidebar('/dashboard');

    expect(screen.getByRole('link', { name: 'Dashboard' })).toHaveAttribute('href', '/dashboard');
    expect(screen.getByRole('link', { name: 'Analytics' })).toHaveAttribute('href', '/analytics');
    expect(screen.getByRole('link', { name: 'Projects' })).toHaveAttribute('href', '/projects');
    expect(screen.getByRole('link', { name: 'Users' })).toHaveAttribute('href', '/users');
    expect(screen.getByRole('link', { name: 'Results' })).toHaveAttribute('href', '/results');
    expect(screen.getByRole('button', { name: /Blog/ })).toBeInTheDocument();
  });

  it('renders the utilities section', () => {
    renderSidebar('/dashboard');

    expect(screen.getByRole('link', { name: 'Upload File' })).toHaveAttribute(
      'href',
      '/utilities/upload',
    );
  });

  it('hides the administrator section for a plain staff user', () => {
    renderSidebar('/dashboard', { isSuperAdmin: false });

    expect(screen.queryByText('Staff Management')).not.toBeInTheDocument();
    expect(screen.queryByText('Audit Log')).not.toBeInTheDocument();
    expect(screen.queryByText('API Docs')).not.toBeInTheDocument();
  });

  it('shows the administrator section for a superadmin user', () => {
    renderSidebar('/dashboard', { isSuperAdmin: true, backofficeRole: 'superadmin' });

    expect(screen.getByRole('link', { name: 'Staff Management' })).toHaveAttribute(
      'href',
      '/staff',
    );
    expect(screen.getByRole('link', { name: 'Audit Log' })).toHaveAttribute('href', '/audit');
    expect(screen.getByRole('link', { name: 'API Docs' })).toHaveAttribute(
      'href',
      '/help/api-docs',
    );
  });

  it('marks the nav item matching the current route as active', () => {
    renderSidebar('/projects');

    expect(screen.getByRole('link', { name: 'Projects' })).toHaveAttribute('data-active', 'true');
    expect(screen.getByRole('link', { name: 'Dashboard' })).toHaveAttribute('data-active', 'false');
  });

  it('keeps a nested route active via prefix match', () => {
    renderSidebar('/projects/proj-1');

    expect(screen.getByRole('link', { name: 'Projects' })).toHaveAttribute('data-active', 'true');
  });

  it('shows the signed-in user name and email in the footer trigger', () => {
    renderSidebar('/dashboard');

    expect(screen.getByRole('button', { name: /Staff One/ })).toBeInTheDocument();
  });

  it('signs the user out and dispatches logout when Sign Out is clicked', async () => {
    const { store } = renderSidebar('/dashboard');

    const user = userEvent.setup();
    await user.click(screen.getByRole('button', { name: /Staff One/ }));
    await user.click(await screen.findByRole('menuitem', { name: /Sign Out/ }));

    await waitFor(() => expect(mocks.signOut).toHaveBeenCalledWith({ name: 'mock-auth' }));
    await waitFor(() => expect(store.getState().auth.isAuthenticated).toBe(false));
  });

  it('opens the CMS blog via SSO handover when Blog is clicked', async () => {
    renderSidebar('/dashboard');

    const user = userEvent.setup();
    await user.click(screen.getByRole('button', { name: /Blog/ }));

    await waitFor(() => expect(mocks.openCmsBlog).toHaveBeenCalledTimes(1));
    expect(mocks.openCmsBlog).toHaveBeenCalledWith(expect.stringContaining('/sso/handover'));
  });
});
