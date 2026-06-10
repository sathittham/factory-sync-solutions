import { LoginForm } from '@/components/login-form';
import { trackEvent } from '@/lib/analytics';
import { auth, googleProvider } from '@/lib/firebase';
import { useAppSelector } from '@/store';
import { signInWithRedirect } from 'firebase/auth';
import { Navigate } from 'react-router';

export function SignInPage() {
  const { isAuthenticated, isRegistered, loading } = useAppSelector((s) => s.auth);

  const handleSignIn = () => {
    trackEvent('sign_in_click', { method: 'google' });
    signInWithRedirect(auth, googleProvider);
  };

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
      </div>
    );
  }

  if (isAuthenticated && isRegistered) return <Navigate to="/results" replace />;
  if (isAuthenticated && !isRegistered) return <Navigate to="/register" replace />;

  return (
    <div className="flex min-h-screen items-center justify-center px-4 py-8">
      <div className="w-full max-w-3xl">
        <LoginForm onSignIn={handleSignIn} />
      </div>
    </div>
  );
}
