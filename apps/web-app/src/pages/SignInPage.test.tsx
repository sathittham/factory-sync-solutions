import authReducer, { setLoading, setUser } from '@/store/authSlice';
import quizReducer from '@/store/quizSlice';
import { configureStore } from '@reduxjs/toolkit';
import { render, screen } from '@testing-library/react';
import { Provider } from 'react-redux';
import { describe, expect, it, vi } from 'vitest';

vi.mock('@tanstack/react-router', () => ({
  Navigate: ({ to }: { to: string }) => <div data-testid="navigate" data-to={to} />,
}));

vi.mock('@/components/login-form', () => ({
  LoginForm: ({ signUpHref }: { signUpHref?: string }) => (
    <div data-testid="login-form" data-signup-href={signUpHref} />
  ),
}));

import { SignInPage } from './SignInPage';

function makeStore() {
  return configureStore({ reducer: { auth: authReducer, quiz: quizReducer } });
}

function renderPage(store = makeStore()) {
  return render(
    <Provider store={store}>
      <SignInPage />
    </Provider>,
  );
}

describe('SignInPage', () => {
  it('shows a loading spinner while auth state is resolving', () => {
    const { container } = renderPage();

    expect(container.querySelector('.animate-spin')).toBeInTheDocument();
    expect(screen.queryByTestId('login-form')).not.toBeInTheDocument();
  });

  it('redirects to /dashboard when already authenticated', () => {
    const store = makeStore();
    store.dispatch(setLoading(false));
    store.dispatch(setUser({ uid: 'uid-1', email: 'a@b.com', displayName: 'A', photoURL: null }));
    renderPage(store);

    const nav = screen.getByTestId('navigate');
    expect(nav).toHaveAttribute('data-to', '/dashboard');
  });

  it('renders the login form (with a signup href) when unauthenticated', () => {
    const store = makeStore();
    store.dispatch(setLoading(false));
    renderPage(store);

    expect(screen.getByTestId('login-form')).toHaveAttribute('data-signup-href', '/register');
  });
});
