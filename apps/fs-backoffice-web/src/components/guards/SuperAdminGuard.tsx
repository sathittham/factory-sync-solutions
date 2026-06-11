import { useAppSelector } from '@/store';
import { Navigate, Outlet } from 'react-router';

export function SuperAdminGuard() {
  const { isSuperAdmin } = useAppSelector((s) => s.auth);

  if (!isSuperAdmin) {
    return <Navigate to="/unauthorized" replace />;
  }

  return <Outlet />;
}
