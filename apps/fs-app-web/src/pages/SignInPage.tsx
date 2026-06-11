import { LoginForm } from '@/components/login-form';
import { useAppSelector } from '@/store';
import { Navigate } from 'react-router';

export function SignInPage() {
  const { isAuthenticated, isRegistered, loading } = useAppSelector((s) => s.auth);

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
      </div>
    );
  }

  if (isAuthenticated && isRegistered) return <Navigate to="/results" replace />;
  if (isAuthenticated && !isRegistered) return <Navigate to="/register" replace />;

  return <LoginForm />;
}
