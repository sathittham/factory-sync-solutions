import { LocaleProvider } from '@/lib/i18n';
import authReducer from '@/store/authSlice';
import { configureStore } from '@reduxjs/toolkit';
import '@testing-library/jest-dom/vitest';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { Provider } from 'react-redux';
import { MemoryRouter, Route, Routes } from 'react-router';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { UnauthorizedPage } from './UnauthorizedPage';

const mocks = vi.hoisted(() => ({
  signOut: vi.fn(),
}));

vi.mock('firebase/auth', () => ({
  signOut: mocks.signOut,
}));

vi.mock('@/lib/firebase', () => ({
  auth: {},
}));

type AuthState = ReturnType<typeof authReducer>;

const baseState: AuthState = {
  user: null,
  backofficeRole: null,
  isAuthenticated: true,
  isBackofficeUser: false,
  isSuperAdmin: false,
  loading: false,
};

function renderPage(authState: Partial<AuthState>) {
  const store = configureStore({
    reducer: { auth: authReducer },
    preloadedState: { auth: { ...baseState, ...authState } },
  });

  render(
    <Provider store={store}>
      <LocaleProvider>
        <MemoryRouter initialEntries={['/unauthorized']}>
          <Routes>
            <Route path="/unauthorized" element={<UnauthorizedPage />} />
            <Route path="/dashboard" element={<div>Dashboard Page</div>} />
            <Route path="/sign-in" element={<div>Sign In Page</div>} />
          </Routes>
        </MemoryRouter>
      </LocaleProvider>
    </Provider>,
  );

  return store;
}

describe('UnauthorizedPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.setItem('fsb-locale', 'en');
  });

  afterEach(() => {
    cleanup();
  });

  it('redirects to the dashboard when the user already has backoffice access', () => {
    renderPage({ isBackofficeUser: true });

    expect(screen.getByText('Dashboard Page')).toBeInTheDocument();
  });

  it('renders the unauthorized message and account details', () => {
    renderPage({
      user: { uid: 'uid-1', email: 'nope@example.com', displayName: 'No Access', photoURL: null },
    });

    expect(screen.getByText('Unauthorized')).toBeInTheDocument();
    expect(screen.getByText('No Access')).toBeInTheDocument();
    expect(screen.getByText('nope@example.com')).toBeInTheDocument();
  });

  it('renders without the account card when there is no user', () => {
    renderPage({ user: null });

    expect(screen.getByText('Unauthorized')).toBeInTheDocument();
    expect(screen.queryByText('nope@example.com')).not.toBeInTheDocument();
  });

  it('signs out, clears the auth state, and navigates to sign-in', async () => {
    mocks.signOut.mockResolvedValue(undefined);
    const store = renderPage({
      user: { uid: 'uid-1', email: 'nope@example.com', displayName: 'No Access', photoURL: null },
    });

    fireEvent.click(screen.getByRole('button', { name: /sign out/i }));

    await waitFor(() => {
      expect(screen.getByText('Sign In Page')).toBeInTheDocument();
    });
    expect(mocks.signOut).toHaveBeenCalledOnce();
    expect(store.getState().auth.isAuthenticated).toBe(false);
  });
});
