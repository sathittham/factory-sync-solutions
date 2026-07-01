import { Skeleton } from '@/components/ui/skeleton';
import { useAppSelector } from '@/store';
import { Navigate, Outlet } from '@tanstack/react-router';

export function AuthGuard() {
  const { isAuthenticated, loading } = useAppSelector((s) => s.auth);

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Skeleton className="h-12 w-48" />
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/" replace />;
  }

  return <Outlet />;
}
