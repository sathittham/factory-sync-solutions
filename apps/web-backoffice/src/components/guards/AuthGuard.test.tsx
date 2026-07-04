import authReducer from '@/store/authSlice';
import { configureStore } from '@reduxjs/toolkit';
import { render, screen } from '@testing-library/react';
import { Provider } from 'react-redux';
import { MemoryRouter, Route, Routes } from 'react-router';
import { describe, expect, it } from 'vitest';
import { AuthGuard } from './AuthGuard';

type AuthState = ReturnType<typeof authReducer>;

const baseState: AuthState = {
  user: null,
  backofficeRole: null,
  isAuthenticated: false,
  isBackofficeUser: false,
  isSuperAdmin: false,
  loading: true,
};

function renderAuthGuard(authState: Partial<AuthState>) {
  const store = configureStore({
    reducer: { auth: authReducer },
    preloadedState: { auth: { ...baseState, ...authState } },
  });

  return render(
    <Provider store={store}>
      <MemoryRouter initialEntries={['/dashboard']}>
        <Routes>
          <Route element={<AuthGuard />}>
            <Route path="/dashboard" element={<div>Protected Content</div>} />
          </Route>
          <Route path="/sign-in" element={<div>Sign In Page</div>} />
        </Routes>
      </MemoryRouter>
    </Provider>,
  );
}

describe('AuthGuard', () => {
  it('renders a loading skeleton while auth state is resolving', () => {
    const { container } = renderAuthGuard({ loading: true });

    expect(container.querySelector('.animate-pulse')).toBeInTheDocument();
    expect(screen.queryByText('Protected Content')).not.toBeInTheDocument();
    expect(screen.queryByText('Sign In Page')).not.toBeInTheDocument();
  });

  it('redirects to /sign-in when the user is not authenticated', () => {
    renderAuthGuard({ loading: false, isAuthenticated: false });

    expect(screen.getByText('Sign In Page')).toBeInTheDocument();
    expect(screen.queryByText('Protected Content')).not.toBeInTheDocument();
  });

  it('renders the outlet when the user is authenticated', () => {
    renderAuthGuard({ loading: false, isAuthenticated: true });

    expect(screen.getByText('Protected Content')).toBeInTheDocument();
    expect(screen.queryByText('Sign In Page')).not.toBeInTheDocument();
  });
});
