import authReducer from '@/store/authSlice';
import { configureStore } from '@reduxjs/toolkit';
import { render, screen } from '@testing-library/react';
import { Provider } from 'react-redux';
import { MemoryRouter, Route, Routes } from 'react-router';
import { describe, expect, it } from 'vitest';
import { BackofficeGuard } from './BackofficeGuard';

type AuthState = ReturnType<typeof authReducer>;

const baseState: AuthState = {
  user: null,
  backofficeRole: null,
  isAuthenticated: true,
  isBackofficeUser: false,
  isSuperAdmin: false,
  loading: false,
};

function renderBackofficeGuard(authState: Partial<AuthState>) {
  const store = configureStore({
    reducer: { auth: authReducer },
    preloadedState: { auth: { ...baseState, ...authState } },
  });

  return render(
    <Provider store={store}>
      <MemoryRouter initialEntries={['/dashboard']}>
        <Routes>
          <Route element={<BackofficeGuard />}>
            <Route path="/dashboard" element={<div>Protected Content</div>} />
          </Route>
          <Route path="/unauthorized" element={<div>Unauthorized Page</div>} />
        </Routes>
      </MemoryRouter>
    </Provider>,
  );
}

describe('BackofficeGuard', () => {
  it('redirects to /unauthorized when the user has no backoffice role', () => {
    renderBackofficeGuard({ isBackofficeUser: false });

    expect(screen.getByText('Unauthorized Page')).toBeInTheDocument();
    expect(screen.queryByText('Protected Content')).not.toBeInTheDocument();
  });

  it('renders the outlet for a staff backoffice user', () => {
    renderBackofficeGuard({ isBackofficeUser: true, backofficeRole: 'staff' });

    expect(screen.getByText('Protected Content')).toBeInTheDocument();
    expect(screen.queryByText('Unauthorized Page')).not.toBeInTheDocument();
  });

  it('renders the outlet for a superadmin backoffice user', () => {
    renderBackofficeGuard({
      isBackofficeUser: true,
      isSuperAdmin: true,
      backofficeRole: 'superadmin',
    });

    expect(screen.getByText('Protected Content')).toBeInTheDocument();
  });
});
