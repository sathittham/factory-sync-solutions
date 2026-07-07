import { LoginForm } from '@/components/login-form';
import { LocaleProvider } from '@/lib/i18n';
import { ThemeProvider } from '@/lib/theme';
import {
  Outlet,
  RouterProvider,
  createMemoryHistory,
  createRootRoute,
  createRoute,
  createRouter,
} from '@tanstack/react-router';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { ReactNode } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  createUserWithEmailAndPassword: vi.fn(),
  sendPasswordResetEmail: vi.fn(),
  signInWithEmailAndPassword: vi.fn(),
  signInWithPopup: vi.fn(),
  trackEvent: vi.fn(),
}));

vi.mock('@/lib/firebase', () => ({
  auth: {},
  googleProvider: {},
}));

vi.mock('firebase/auth', () => ({
  createUserWithEmailAndPassword: mocks.createUserWithEmailAndPassword,
  sendPasswordResetEmail: mocks.sendPasswordResetEmail,
  signInWithEmailAndPassword: mocks.signInWithEmailAndPassword,
  signInWithPopup: mocks.signInWithPopup,
}));

vi.mock('@/lib/analytics', () => ({
  trackEvent: mocks.trackEvent,
}));

function setupMatchMedia() {
  vi.stubGlobal(
    'matchMedia',
    vi.fn().mockReturnValue({
      matches: false,
      media: '(prefers-color-scheme: dark)',
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
    }),
  );
}

function Providers({ children }: { readonly children: ReactNode }) {
  return (
    <LocaleProvider>
      <ThemeProvider>{children}</ThemeProvider>
    </LocaleProvider>
  );
}

function renderLoginForm(props: Partial<React.ComponentProps<typeof LoginForm>> = {}) {
  return render(
    <Providers>
      <LoginForm frame="content" {...props} />
    </Providers>,
  );
}

describe('LoginForm', () => {
  beforeEach(() => {
    localStorage.clear();
    localStorage.setItem('fss-locale', 'en');
    setupMatchMedia();
    vi.clearAllMocks();
    mocks.createUserWithEmailAndPassword.mockResolvedValue(undefined);
    mocks.sendPasswordResetEmail.mockResolvedValue(undefined);
    mocks.signInWithEmailAndPassword.mockResolvedValue(undefined);
    mocks.signInWithPopup.mockResolvedValue(undefined);
  });

  it('renders the sign-in heading and email/password fields by default', () => {
    renderLoginForm();
    expect(screen.getByRole('heading', { name: 'Welcome back' })).toBeInTheDocument();
    expect(screen.getByLabelText('Email')).toBeInTheDocument();
    expect(screen.getByLabelText('Password')).toBeInTheDocument();
    expect(screen.queryByLabelText('Confirm Password')).not.toBeInTheDocument();
  });

  it('shows a required error when the email field is blurred empty', async () => {
    renderLoginForm();
    const email = screen.getByLabelText('Email');
    fireEvent.focus(email);
    fireEvent.blur(email);
    expect(await screen.findByText('Email is required')).toBeInTheDocument();
  });

  it('shows an invalid-email error for a malformed address', async () => {
    renderLoginForm();
    const email = screen.getByLabelText('Email');
    fireEvent.change(email, { target: { value: 'not-an-email' } });
    fireEvent.blur(email);
    expect(await screen.findByText('Invalid email address')).toBeInTheDocument();
  });

  it('shows a required error when the password field is blurred empty', async () => {
    renderLoginForm();
    const password = screen.getByLabelText('Password');
    fireEvent.focus(password);
    fireEvent.blur(password);
    expect(await screen.findByText('Password is required')).toBeInTheDocument();
  });

  it('submits sign-in credentials to Firebase and tracks the event', async () => {
    renderLoginForm();
    fireEvent.change(screen.getByLabelText('Email'), {
      target: { value: 'factory@example.com' },
    });
    fireEvent.change(screen.getByLabelText('Password'), { target: { value: 'secret123' } });
    fireEvent.click(screen.getByRole('button', { name: 'Sign In' }));

    await waitFor(() => {
      expect(mocks.signInWithEmailAndPassword).toHaveBeenCalledWith(
        {},
        'factory@example.com',
        'secret123',
      );
    });
    expect(mocks.trackEvent).toHaveBeenCalledWith('sign_in_success', { method: 'email' });
  });

  it('shows a mapped error message when Firebase sign-in fails', async () => {
    mocks.signInWithEmailAndPassword.mockRejectedValue({ code: 'auth/wrong-password' });
    renderLoginForm();
    fireEvent.change(screen.getByLabelText('Email'), {
      target: { value: 'factory@example.com' },
    });
    fireEvent.change(screen.getByLabelText('Password'), { target: { value: 'wrong' } });
    fireEvent.click(screen.getByRole('button', { name: 'Sign In' }));

    expect(await screen.findByText('Incorrect email or password')).toBeInTheDocument();
  });

  it('switches to sign-up mode and reveals the confirm-password field', () => {
    renderLoginForm();
    fireEvent.click(screen.getByRole('button', { name: 'Sign up' }));

    expect(screen.getByRole('heading', { name: 'Create an account' })).toBeInTheDocument();
    expect(screen.getByLabelText('Confirm Password')).toBeInTheDocument();
  });

  it('blocks sign-up when password and confirm-password do not match', async () => {
    renderLoginForm({ initialMode: 'signup' });
    fireEvent.change(screen.getByLabelText('Email'), {
      target: { value: 'factory@example.com' },
    });
    fireEvent.change(screen.getByLabelText('Password'), { target: { value: 'secret123' } });
    fireEvent.change(screen.getByLabelText('Confirm Password'), {
      target: { value: 'different' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Create Account' }));

    expect(await screen.findByText('Passwords do not match')).toBeInTheDocument();
    expect(mocks.createUserWithEmailAndPassword).not.toHaveBeenCalled();
  });

  it('creates an account when sign-up passwords match', async () => {
    renderLoginForm({ initialMode: 'signup' });
    fireEvent.change(screen.getByLabelText('Email'), {
      target: { value: 'factory@example.com' },
    });
    fireEvent.change(screen.getByLabelText('Password'), { target: { value: 'secret123' } });
    fireEvent.change(screen.getByLabelText('Confirm Password'), {
      target: { value: 'secret123' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Create Account' }));

    await waitFor(() => {
      expect(mocks.createUserWithEmailAndPassword).toHaveBeenCalledWith(
        {},
        'factory@example.com',
        'secret123',
      );
    });
  });

  it('switches to reset mode via "Forgot password?" and sends a reset email', async () => {
    renderLoginForm();
    fireEvent.click(screen.getByRole('button', { name: 'Forgot password?' }));

    expect(screen.getByRole('heading', { name: 'Reset your password' })).toBeInTheDocument();
    expect(screen.queryByLabelText('Password')).not.toBeInTheDocument();

    fireEvent.change(screen.getByLabelText('Email'), {
      target: { value: 'factory@example.com' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Send Reset Link' }));

    expect(
      await screen.findByText('Password reset email sent. Check your inbox.'),
    ).toBeInTheDocument();
    expect(mocks.sendPasswordResetEmail).toHaveBeenCalledWith({}, 'factory@example.com');
  });

  it('returns to sign-in mode from reset mode', () => {
    renderLoginForm();
    fireEvent.click(screen.getByRole('button', { name: 'Forgot password?' }));
    fireEvent.click(screen.getByRole('button', { name: 'Back to sign in' }));

    expect(screen.getByRole('heading', { name: 'Welcome back' })).toBeInTheDocument();
  });

  it('toggles password visibility', () => {
    renderLoginForm();
    const password = screen.getByLabelText('Password') as HTMLInputElement;
    expect(password.type).toBe('password');

    fireEvent.click(screen.getByRole('button', { name: 'Show password' }));
    expect(password.type).toBe('text');

    fireEvent.click(screen.getByRole('button', { name: 'Hide password' }));
    expect(password.type).toBe('password');
  });

  it('signs in with Google when the Google button is clicked', async () => {
    renderLoginForm();
    fireEvent.click(screen.getByTestId('signin-google-btn'));

    await waitFor(() => {
      expect(mocks.signInWithPopup).toHaveBeenCalledWith({}, {});
    });
    expect(mocks.trackEvent).toHaveBeenCalledWith('sign_in_success', { method: 'google' });
  });

  it('silently ignores a dismissed Google sign-in popup', async () => {
    mocks.signInWithPopup.mockRejectedValue({ code: 'auth/popup-closed-by-user' });
    renderLoginForm();
    fireEvent.click(screen.getByTestId('signin-google-btn'));

    await waitFor(() => expect(mocks.signInWithPopup).toHaveBeenCalledOnce());
    expect(screen.queryByText(/something went wrong/i)).not.toBeInTheDocument();
  });

  it('navigates via a real router Link when signInHref/signUpHref are provided', async () => {
    const user = userEvent.setup();
    const rootRoute = createRootRoute({ component: Outlet });
    const formRoute = createRoute({
      getParentRoute: () => rootRoute,
      path: '/',
      component: () => (
        <Providers>
          <LoginForm frame="content" initialMode="signup" signInHref="/quiz" />
        </Providers>
      ),
    });
    // "/quiz" is reused here purely as a valid path registered in the app's
    // route tree — LinkProps['to'] is typed against the real router config.
    const targetRoute = createRoute({
      getParentRoute: () => rootRoute,
      path: '/quiz',
      component: () => <div>Sign-in Target Page</div>,
    });
    const routeTree = rootRoute.addChildren([formRoute, targetRoute]);
    const router = createRouter({
      routeTree,
      history: createMemoryHistory({ initialEntries: ['/'] }),
    });

    render(<RouterProvider router={router} />);

    await user.click(await screen.findByRole('link', { name: 'Sign in' }));

    expect(await screen.findByText('Sign-in Target Page')).toBeInTheDocument();
  });
});
