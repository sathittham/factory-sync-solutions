import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarRail,
} from '@/components/ui/sidebar';
import { auth } from '@/lib/firebase';
import { useLocale } from '@/lib/i18n';
import { useAppDispatch, useAppSelector } from '@/store';
import { logout } from '@/store/authSlice';
import { signOut } from 'firebase/auth';
import {
  BarChart3,
  Building2,
  ChevronsUpDown,
  LayoutDashboard,
  LogOut,
  ShieldCheck,
  Users,
} from 'lucide-react';
import { Link, useLocation } from 'react-router';

interface AppSidebarProps {
  readonly onNavigate?: () => void;
}

function AppLogo() {
  return (
    <div className="flex aspect-square h-8 w-8 items-center justify-center rounded-lg bg-primary text-primary-foreground">
      <svg width="14" height="14" viewBox="0 0 16 16" fill="none">
        <path
          d="M2 14V6l6-4 6 4v8H2z"
          stroke="currentColor"
          strokeWidth="1.5"
          strokeLinejoin="round"
        />
        <path d="M6 14v-4h4v4" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round" />
      </svg>
    </div>
  );
}

export function AppSidebar({ onNavigate }: AppSidebarProps) {
  const { t } = useLocale();
  const dispatch = useAppDispatch();
  const { user, isSuperAdmin } = useAppSelector((s) => s.auth);
  const { pathname } = useLocation();

  const handleSignOut = async () => {
    await signOut(auth);
    dispatch(logout());
  };

  const displayName = user?.displayName || user?.email || '';
  const initial = (displayName || 'U').charAt(0).toUpperCase();

  const navItems = [
    { to: '/dashboard', icon: LayoutDashboard, labelKey: 'nav.dashboard' },
    { to: '/projects', icon: Building2, labelKey: 'nav.projects' },
    { to: '/users', icon: Users, labelKey: 'nav.users' },
    { to: '/results', icon: BarChart3, labelKey: 'nav.results' },
    ...(isSuperAdmin ? [{ to: '/staff', icon: ShieldCheck, labelKey: 'nav.staff' }] : []),
  ];

  return (
    <Sidebar variant="inset" collapsible="icon">
      <SidebarHeader>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton size="lg" asChild>
              <Link to="/dashboard" onClick={onNavigate}>
                <AppLogo />
                <div className="flex flex-col gap-0.5 leading-none">
                  <span className="font-semibold text-sm">FactorySync</span>
                  <span className="text-xs text-muted-foreground">Backoffice</span>
                </div>
              </Link>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>

      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupContent>
            <SidebarMenu>
              {navItems.map((item) => (
                <SidebarMenuItem key={item.to}>
                  <SidebarMenuButton
                    asChild
                    isActive={pathname === item.to || pathname.startsWith(`${item.to}/`)}
                    tooltip={t(item.labelKey)}
                  >
                    <Link to={item.to} onClick={onNavigate}>
                      <item.icon />
                      <span>{t(item.labelKey)}</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter>
        <SidebarMenu>
          <SidebarMenuItem>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <SidebarMenuButton
                  size="lg"
                  className="data-[state=open]:bg-sidebar-accent data-[state=open]:text-sidebar-accent-foreground"
                >
                  <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/10 text-primary font-bold text-xs shrink-0">
                    {initial}
                  </div>
                  <div className="flex min-w-0 flex-col gap-0.5 leading-none">
                    <span className="truncate font-medium text-sm">{displayName}</span>
                    <span className="truncate text-xs text-muted-foreground">{user?.email}</span>
                  </div>
                  <ChevronsUpDown className="ml-auto h-4 w-4 shrink-0" />
                </SidebarMenuButton>
              </DropdownMenuTrigger>
              <DropdownMenuContent
                side="top"
                align="end"
                className="w-[--radix-dropdown-menu-trigger-width] min-w-56"
              >
                <DropdownMenuLabel className="font-normal">
                  <p className="font-medium text-sm truncate">{displayName}</p>
                  <p className="text-xs text-muted-foreground truncate">{user?.email}</p>
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  onClick={handleSignOut}
                  className="gap-2 text-destructive focus:text-destructive"
                >
                  <LogOut className="h-4 w-4" />
                  {t('nav.signOut')}
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>

      <SidebarRail />
    </Sidebar>
  );
}
