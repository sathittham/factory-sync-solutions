import { useAppSelector } from '@/store';
import { Navigate, Outlet } from 'react-router';

export function BackofficeGuard() {
  const { isBackofficeUser } = useAppSelector((s) => s.auth);

  if (!isBackofficeUser) {
    return <Navigate to="/unauthorized" replace />;
  }

  return <Outlet />;
}
