import { useAppSelector } from '@/store';
import { canManageCompanySettings } from '@/store/authSlice';
import { Navigate, Outlet } from '@tanstack/react-router';

export function CompanySettingsGuard() {
  const { isAdmin, profile } = useAppSelector((s) => s.auth);

  if (!canManageCompanySettings(profile, isAdmin)) {
    return <Navigate to="/" replace />;
  }

  return <Outlet />;
}
