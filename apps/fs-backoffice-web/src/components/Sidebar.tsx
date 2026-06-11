import { Button } from '@/components/ui/button';
import { auth } from '@/lib/firebase';
import { useLocale } from '@/lib/i18n';
import { cn } from '@/lib/utils';
import { useAppSelector } from '@/store';
import { useAppDispatch } from '@/store';
import { logout } from '@/store/authSlice';
import { signOut } from 'firebase/auth';
import { BarChart3, Building2, LayoutDashboard, LogOut, ShieldCheck, Users } from 'lucide-react';
import { NavLink } from 'react-router';

interface NavItemProps {
  readonly to: string;
  readonly icon: React.ReactNode;
  readonly label: string;
  readonly onClick?: () => void;
}

function NavItem({ to, icon, label, onClick }: NavItemProps) {
  return (
    <NavLink
      to={to}
      onClick={onClick}
      className={({ isActive }) =>
        cn(
          'flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors',
          isActive
            ? 'bg-primary text-primary-foreground'
            : 'text-muted-foreground hover:bg-accent hover:text-accent-foreground',
        )
      }
    >
      {icon}
      {label}
    </NavLink>
  );
}

interface SidebarProps {
  readonly onNavigate?: () => void;
}

export function Sidebar({ onNavigate }: SidebarProps) {
  const { t } = useLocale();
  const dispatch = useAppDispatch();
  const { user, isSuperAdmin } = useAppSelector((s) => s.auth);

  const handleSignOut = async () => {
    await signOut(auth);
    dispatch(logout());
  };

  return (
    <div className="flex h-full flex-col gap-2 p-4">
      <div className="mb-4 px-3 py-2">
        <span className="text-base font-bold">{t('nav.appName')}</span>
      </div>

      <nav className="flex flex-1 flex-col gap-1">
        <NavItem
          to="/dashboard"
          icon={<LayoutDashboard className="h-4 w-4" />}
          label={t('nav.dashboard')}
          onClick={onNavigate}
        />
        <NavItem
          to="/projects"
          icon={<Building2 className="h-4 w-4" />}
          label={t('nav.projects')}
          onClick={onNavigate}
        />
        <NavItem
          to="/users"
          icon={<Users className="h-4 w-4" />}
          label={t('nav.users')}
          onClick={onNavigate}
        />
        <NavItem
          to="/results"
          icon={<BarChart3 className="h-4 w-4" />}
          label={t('nav.results')}
          onClick={onNavigate}
        />
        {isSuperAdmin && (
          <NavItem
            to="/staff"
            icon={<ShieldCheck className="h-4 w-4" />}
            label={t('nav.staff')}
            onClick={onNavigate}
          />
        )}
      </nav>

      <div className="border-t pt-4">
        <div className="mb-2 px-3">
          <p className="text-sm font-medium truncate">{user?.displayName || user?.email}</p>
          <p className="text-xs text-muted-foreground truncate">{user?.email}</p>
        </div>
        <Button
          variant="ghost"
          size="sm"
          className="w-full justify-start gap-2"
          onClick={handleSignOut}
        >
          <LogOut className="h-4 w-4" />
          {t('nav.signOut')}
        </Button>
      </div>
    </div>
  );
}
