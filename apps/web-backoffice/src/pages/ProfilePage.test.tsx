import { LocaleProvider } from '@/lib/i18n';
import authReducer from '@/store/authSlice';
import { configureStore } from '@reduxjs/toolkit';
import '@testing-library/jest-dom/vitest';
import { cleanup, render, screen } from '@testing-library/react';
import { Provider } from 'react-redux';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { ProfilePage } from './ProfilePage';

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

  return render(
    <Provider store={store}>
      <LocaleProvider>
        <ProfilePage />
      </LocaleProvider>
    </Provider>,
  );
}

describe('ProfilePage', () => {
  beforeEach(() => {
    localStorage.setItem('fsb-locale', 'en');
  });

  afterEach(() => {
    cleanup();
  });

  it('renders nothing when there is no authenticated user', () => {
    const { container } = renderPage({ user: null });

    expect(container).toBeEmptyDOMElement();
  });

  it('renders account details and a superadmin badge', () => {
    renderPage({
      user: {
        uid: 'uid-superadmin-1',
        email: 'admin@factorysyncsolutions.com',
        displayName: 'Admin One',
        photoURL: null,
      },
      backofficeRole: 'superadmin',
      isSuperAdmin: true,
      isBackofficeUser: true,
    });

    expect(screen.getAllByText('Admin One').length).toBeGreaterThan(0);
    expect(screen.getAllByText('admin@factorysyncsolutions.com').length).toBeGreaterThan(0);
    expect(screen.getAllByText('Super Admin').length).toBeGreaterThan(0);
    expect(screen.getByText('uid-superadmin-1')).toBeInTheDocument();
  });

  it('renders a staff badge for a staff user', () => {
    renderPage({
      user: {
        uid: 'uid-staff-1',
        email: 'staff@factorysyncsolutions.com',
        displayName: '',
        photoURL: null,
      },
      backofficeRole: 'staff',
      isBackofficeUser: true,
    });

    // Falls back to the email when displayName is empty.
    expect(screen.getAllByText('staff@factorysyncsolutions.com').length).toBeGreaterThan(0);
    expect(screen.getAllByText('Staff').length).toBeGreaterThan(0);
  });

  it('shows "Not provided" fallback when the user has no backoffice role', () => {
    renderPage({
      user: {
        uid: 'uid-none-1',
        email: 'plain@factorysyncsolutions.com',
        displayName: 'Plain User',
        photoURL: null,
      },
      backofficeRole: null,
      isBackofficeUser: false,
    });

    expect(screen.getAllByText('Not provided').length).toBeGreaterThan(0);
  });
});
