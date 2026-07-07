import { LocaleProvider } from '@/lib/i18n';
import { ThemeProvider } from '@/lib/theme';
import authReducer from '@/store/authSlice';
import { configureStore } from '@reduxjs/toolkit';
import '@testing-library/jest-dom/vitest';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { Provider } from 'react-redux';
import { MemoryRouter, Route, Routes } from 'react-router';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { SignInPage } from './SignInPage';

const mocks = vi.hoisted(() => ({
  signInWithEmailAndPassword: vi.fn(),
  signInWithPopup: vi.fn(),
  sendPasswordResetEmail: vi.fn(),
}));

vi.mock('firebase/auth', () => ({
  signInWithEmailAndPassword: mocks.signInWithEmailAndPassword,
  signInWithPopup: mocks.signInWithPopup,
  sendPasswordResetEmail: mocks.sendPasswordResetEmail,
}));

vi.mock('@/lib/firebase', () => ({
  auth: {},
  googleProvider: {},
}));

type AuthState = ReturnType<typeof authReducer>;

const baseState: AuthState = {
  user: null,
  backofficeRole: null,
  isAuthenticated: false,
  isBackofficeUser: false,
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
      <ThemeProvider>
        <LocaleProvider>
          <MemoryRouter initialEntries={['/sign-in']}>
            <Routes>
              <Route path="/sign-in" element={<SignInPage />} />
              <Route path="/dashboard" element={<div>Dashboard Page</div>} />
            </Routes>
          </MemoryRouter>
        </LocaleProvider>
      </ThemeProvider>
    </Provider>,
  );
}

describe('SignInPage', () => {
  beforeEach(() => {
    localStorage.setItem('fsb-locale', 'en');
    vi.clearAllMocks();
  });

  afterEach(() => {
    cleanup();
    localStorage.clear();
  });

  it('redirects to the dashboard when already authenticated', () => {
    renderPage({ isAuthenticated: true });

    expect(screen.getByText('Dashboard Page')).toBeInTheDocument();
  });

  it('does not render the form while auth state is loading', () => {
    renderPage({ loading: true });

    expect(screen.queryByLabelText('Email')).not.toBeInTheDocument();
  });

  it('renders the sign-in form', () => {
    renderPage();

    expect(screen.getByRole('heading', { name: 'Sign In' })).toBeInTheDocument();
    expect(screen.getByLabelText('Email')).toBeInTheDocument();
    expect(screen.getByLabelText('Password')).toBeInTheDocument();
  });

  it('signs in with email and password', async () => {
    mocks.signInWithEmailAndPassword.mockResolvedValue({});

    renderPage();

    fireEvent.change(screen.getByLabelText('Email'), {
      target: { value: 'staff@factorysyncsolutions.com' },
    });
    fireEvent.change(screen.getByLabelText('Password'), { target: { value: 'sup3rSecret!' } });
    fireEvent.click(screen.getByRole('button', { name: /^sign in$/i }));

    await waitFor(() => {
      expect(mocks.signInWithEmailAndPassword).toHaveBeenCalledWith(
        {},
        'staff@factorysyncsolutions.com',
        'sup3rSecret!',
      );
    });
  });

  it('shows a mapped error message when sign-in fails', async () => {
    mocks.signInWithEmailAndPassword.mockRejectedValue({ code: 'auth/invalid-credential' });

    renderPage();

    fireEvent.change(screen.getByLabelText('Email'), {
      target: { value: 'staff@factorysyncsolutions.com' },
    });
    fireEvent.change(screen.getByLabelText('Password'), { target: { value: 'wrong' } });
    fireEvent.click(screen.getByRole('button', { name: /^sign in$/i }));

    expect(await screen.findByText('Incorrect email or password')).toBeInTheDocument();
  });

  it('toggles password visibility', () => {
    renderPage();

    const passwordInput = screen.getByLabelText('Password');
    expect(passwordInput).toHaveAttribute('type', 'password');

    fireEvent.click(screen.getByRole('button', { name: /show password/i }));

    expect(passwordInput).toHaveAttribute('type', 'text');
  });

  it('switches to reset mode and sends a reset email', async () => {
    mocks.sendPasswordResetEmail.mockResolvedValue(undefined);

    renderPage();

    fireEvent.click(screen.getByRole('button', { name: /forgot password/i }));
    expect(screen.getByRole('heading', { name: 'Reset Password' })).toBeInTheDocument();

    fireEvent.change(screen.getByLabelText('Email'), {
      target: { value: 'staff@factorysyncsolutions.com' },
    });
    fireEvent.click(screen.getByRole('button', { name: /send reset email/i }));

    await waitFor(() => {
      expect(mocks.sendPasswordResetEmail).toHaveBeenCalledWith(
        {},
        'staff@factorysyncsolutions.com',
      );
    });
    expect(
      await screen.findByText('Reset email sent. Please check your inbox.'),
    ).toBeInTheDocument();
  });

  it('goes back to the sign-in form from reset mode', () => {
    renderPage();

    fireEvent.click(screen.getByRole('button', { name: /forgot password/i }));
    fireEvent.click(screen.getByRole('button', { name: /back to sign in/i }));

    expect(screen.getByRole('heading', { name: 'Sign In' })).toBeInTheDocument();
  });

  it('signs in with Google', async () => {
    mocks.signInWithPopup.mockResolvedValue({});

    renderPage();

    fireEvent.click(screen.getByRole('button', { name: /sign in with google/i }));

    await waitFor(() => {
      expect(mocks.signInWithPopup).toHaveBeenCalledWith({}, {});
    });
    expect(screen.queryByText(/something went wrong/i)).not.toBeInTheDocument();
  });

  it('silently ignores a cancelled Google sign-in popup', async () => {
    mocks.signInWithPopup.mockRejectedValue({ code: 'auth/popup-closed-by-user' });

    renderPage();

    fireEvent.click(screen.getByRole('button', { name: /sign in with google/i }));

    await waitFor(() => {
      expect(mocks.signInWithPopup).toHaveBeenCalledOnce();
    });
    expect(screen.queryByText(/something went wrong/i)).not.toBeInTheDocument();
  });

  it('shows a mapped error when the Google sign-in fails for another reason', async () => {
    mocks.signInWithPopup.mockRejectedValue({ code: 'auth/network-request-failed' });

    renderPage();

    fireEvent.click(screen.getByRole('button', { name: /sign in with google/i }));

    expect(await screen.findByText('Network error. Check your connection.')).toBeInTheDocument();
  });
});
