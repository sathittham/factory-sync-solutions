import { useAppSelector } from '@/store';
import { canManageUsers } from '@/store/authSlice';
import { Navigate, Outlet } from '@tanstack/react-router';

export function AdminGuard() {
  const { isAdmin, profile } = useAppSelector((s) => s.auth);

  if (!canManageUsers(profile, isAdmin)) {
    return <Navigate to="/" replace />;
  }

  return <Outlet />;
}
