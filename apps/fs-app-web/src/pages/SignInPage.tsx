import { LoginForm } from '@/components/login-form';
import { useAppSelector } from '@/store';
import { useEffect } from 'react';
import { Navigate } from 'react-router';

const OFFICIAL_WEB_URL = import.meta.env.VITE_OFFICIAL_WEB_URL ?? '';

export function SignInPage() {
  const { isAuthenticated, isRegistered, loading } = useAppSelector((s) => s.auth);

  useEffect(() => {
    if (isAuthenticated && !isRegistered) {
      const dest = OFFICIAL_WEB_URL ? `${OFFICIAL_WEB_URL}/register` : '/';
      globalThis.location.replace(dest);
    }
  }, [isAuthenticated, isRegistered]);

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
      </div>
    );
  }

  if (isAuthenticated && isRegistered) return <Navigate to="/results" replace />;
  if (isAuthenticated && !isRegistered) return null;

  return <LoginForm />;
}
