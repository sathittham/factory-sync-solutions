import { useAppSelector } from '@/store';
import { Navigate, Outlet } from 'react-router';

export function AdminGuard() {
  const { isAdmin } = useAppSelector((s) => s.auth);

  if (!isAdmin) {
    return <Navigate to="/" replace />;
  }

  return <Outlet />;
}
