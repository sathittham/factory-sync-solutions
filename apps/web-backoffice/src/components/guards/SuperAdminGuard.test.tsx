import authReducer from '@/store/authSlice';
import { configureStore } from '@reduxjs/toolkit';
import { render, screen } from '@testing-library/react';
import { Provider } from 'react-redux';
import { MemoryRouter, Route, Routes } from 'react-router';
import { describe, expect, it } from 'vitest';
import { SuperAdminGuard } from './SuperAdminGuard';

type AuthState = ReturnType<typeof authReducer>;

const baseState: AuthState = {
  user: null,
  backofficeRole: 'staff',
  isAuthenticated: true,
  isBackofficeUser: true,
  isSuperAdmin: false,
  loading: false,
};

function renderSuperAdminGuard(authState: Partial<AuthState>) {
  const store = configureStore({
    reducer: { auth: authReducer },
    preloadedState: { auth: { ...baseState, ...authState } },
  });

  return render(
    <Provider store={store}>
      <MemoryRouter initialEntries={['/staff']}>
        <Routes>
          <Route element={<SuperAdminGuard />}>
            <Route path="/staff" element={<div>Protected Content</div>} />
          </Route>
          <Route path="/unauthorized" element={<div>Unauthorized Page</div>} />
        </Routes>
      </MemoryRouter>
    </Provider>,
  );
}

describe('SuperAdminGuard', () => {
  it('redirects to /unauthorized for a staff (non-superadmin) user', () => {
    renderSuperAdminGuard({ isSuperAdmin: false });

    expect(screen.getByText('Unauthorized Page')).toBeInTheDocument();
    expect(screen.queryByText('Protected Content')).not.toBeInTheDocument();
  });

  it('renders the outlet for a superadmin user', () => {
    renderSuperAdminGuard({ isSuperAdmin: true, backofficeRole: 'superadmin' });

    expect(screen.getByText('Protected Content')).toBeInTheDocument();
    expect(screen.queryByText('Unauthorized Page')).not.toBeInTheDocument();
  });
});
