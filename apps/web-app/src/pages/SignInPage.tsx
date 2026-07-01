import { LoginForm } from '@/components/login-form';
import { useAppSelector } from '@/store';
import { Navigate } from '@tanstack/react-router';

export function SignInPage() {
  const { isAuthenticated, loading } = useAppSelector((s) => s.auth);

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
      </div>
    );
  }

  // Authenticated users go to dashboard; RegisterGuard handles the no-profile case
  if (isAuthenticated) return <Navigate to="/dashboard" replace />;

  return <LoginForm signUpHref="/register" />;
}
