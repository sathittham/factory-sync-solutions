import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
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
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarRail,
  useSidebar,
} from '@/components/ui/sidebar';
import { openCmsBlog } from '@/lib/cmsSso';
import { auth } from '@/lib/firebase';
import { useLocale } from '@/lib/i18n';
import { useTheme } from '@/lib/theme';
import { useAppDispatch, useAppSelector } from '@/store';
import { logout } from '@/store/authSlice';
import fsDarkLogo from '@shared/brand/fs-dark.png';
import fsLightLogo from '@shared/brand/fs-light.png';
import { getCmsSsoUrl } from '@shared/lib/cmsSite';
import { signOut } from 'firebase/auth';
import {
  BarChart3,
  Building2,
  ChartLine,
  ChevronsUpDown,
  CircleHelp,
  ExternalLink,
  LayoutDashboard,
  LogOut,
  type LucideIcon,
  Newspaper,
  ScrollText,
  ShieldCheck,
  Upload,
  User,
  Users,
} from 'lucide-react';
import { Link, useLocation } from 'react-router';

interface AppSidebarProps {
  readonly onNavigate?: () => void;
}

interface NavItem {
  readonly icon: LucideIcon;
  readonly labelKey: string;
  readonly to?: string;
  readonly href?: string;
  readonly external?: boolean;
  /** Opens the CMS via SSO handover (new tab) instead of a normal link. */
  readonly sso?: boolean;
}

export function AppSidebar({ onNavigate }: AppSidebarProps) {
  const { t } = useLocale();
  const { resolvedTheme } = useTheme();
  const { isMobile } = useSidebar();
  const dispatch = useAppDispatch();
  const { user, isSuperAdmin } = useAppSelector((s) => s.auth);
  const { pathname } = useLocation();

  const handleSignOut = async () => {
    await signOut(auth);
    dispatch(logout());
  };

  const displayName = user?.displayName || user?.email || '';
  const initial = (displayName || 'U').charAt(0).toUpperCase();
  const logo = resolvedTheme === 'dark' ? fsDarkLogo : fsLightLogo;
  const cmsBlogUrl = getCmsSsoUrl(import.meta.env.VITE_CMS_URL, {
    isDevelopment: import.meta.env.DEV,
  });

  const handleOpenBlog = () => {
    onNavigate?.();
    void openCmsBlog(cmsBlogUrl);
  };

  const renderNavInner = (item: NavItem) => {
    if (item.sso) {
      return (
        <button type="button" onClick={handleOpenBlog}>
          <item.icon />
          <span>{t(item.labelKey)}</span>
          <ExternalLink className="ml-auto size-3.5 opacity-60" />
        </button>
      );
    }
    if (item.external) {
      return (
        <a href={item.href} target="_blank" rel="noopener noreferrer">
          <item.icon />
          <span>{t(item.labelKey)}</span>
          <ExternalLink className="ml-auto size-3.5 opacity-60" />
        </a>
      );
    }
    return (
      <Link to={item.to ?? '#'} onClick={onNavigate}>
        <item.icon />
        <span>{t(item.labelKey)}</span>
      </Link>
    );
  };

  const navItems: NavItem[] = [
    { to: '/dashboard', icon: LayoutDashboard, labelKey: 'nav.dashboard' },
    { to: '/analytics', icon: ChartLine, labelKey: 'nav.analytics' },
    { to: '/projects', icon: Building2, labelKey: 'nav.projects' },
    { to: '/users', icon: Users, labelKey: 'nav.users' },
    { to: '/results', icon: BarChart3, labelKey: 'nav.results' },
    { icon: Newspaper, labelKey: 'nav.blog', sso: true },
  ];

  const administratorNavItems = [
    { to: '/staff', icon: ShieldCheck, labelKey: 'nav.staff' },
    { to: '/audit', icon: ScrollText, labelKey: 'nav.audit' },
    { to: '/help/api-docs', icon: CircleHelp, labelKey: 'nav.apiDocs' },
  ];

  const utilityNavItems: NavItem[] = [
    { to: '/utilities/upload', icon: Upload, labelKey: 'nav.uploadTool' },
  ];

  return (
    <Sidebar variant="inset" collapsible="icon">
      <SidebarHeader>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton size="lg" asChild>
              <Link to="/dashboard" onClick={onNavigate}>
                <img
                  src={logo}
                  alt={t('nav.brandName')}
                  width={32}
                  height={32}
                  className="size-8 object-contain"
                />
                <div className="flex flex-col leading-tight">
                  <span className="text-base font-bold">{t('nav.brandName')}</span>
                  <span className="-mt-0.5 text-xs font-extrabold text-primary">
                    {t('nav.brandUnit')}
                  </span>
                </div>
              </Link>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>

      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>{t('nav.main')}</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {navItems.map((item) => (
                <SidebarMenuItem key={item.to ?? item.labelKey}>
                  <SidebarMenuButton
                    asChild
                    isActive={
                      !item.external &&
                      !item.sso &&
                      (pathname === item.to || pathname.startsWith(`${item.to}/`))
                    }
                    tooltip={t(item.labelKey)}
                  >
                    {renderNavInner(item)}
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        <SidebarGroup>
          <SidebarGroupLabel>{t('nav.utilities')}</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {utilityNavItems.map((item) => (
                <SidebarMenuItem key={item.to}>
                  <SidebarMenuButton
                    asChild
                    isActive={pathname === item.to || pathname.startsWith(`${item.to}/`)}
                    tooltip={t(item.labelKey)}
                  >
                    <Link to={item.to ?? '#'} onClick={onNavigate}>
                      <item.icon />
                      <span>{t(item.labelKey)}</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        {isSuperAdmin && (
          <SidebarGroup>
            <SidebarGroupLabel>{t('nav.administrator')}</SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                {administratorNavItems.map((item) => (
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
        )}
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
                  <Avatar className="size-8 rounded-lg">
                    <AvatarImage src={user?.photoURL ?? undefined} alt={displayName} />
                    <AvatarFallback className="rounded-lg text-xs">{initial}</AvatarFallback>
                  </Avatar>
                  <div className="grid flex-1 text-left text-sm leading-tight">
                    <span className="truncate font-semibold">{displayName}</span>
                    <span className="truncate text-xs">{user?.email}</span>
                  </div>
                  <ChevronsUpDown className="ml-auto size-4" />
                </SidebarMenuButton>
              </DropdownMenuTrigger>
              <DropdownMenuContent
                className="w-[var(--radix-dropdown-menu-trigger-width)] min-w-56 rounded-lg"
                side={isMobile ? 'bottom' : 'right'}
                align="end"
                sideOffset={4}
              >
                <DropdownMenuLabel className="p-0 font-normal">
                  <div className="flex items-center gap-2 px-1 py-1.5 text-left text-sm">
                    <Avatar className="size-8 rounded-lg">
                      <AvatarImage src={user?.photoURL ?? undefined} alt={displayName} />
                      <AvatarFallback className="rounded-lg text-xs">{initial}</AvatarFallback>
                    </Avatar>
                    <div className="grid flex-1 text-left text-sm leading-tight">
                      <span className="truncate font-semibold">{displayName}</span>
                      <span className="truncate text-xs">{user?.email}</span>
                    </div>
                  </div>
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuGroup>
                  <DropdownMenuItem asChild>
                    <Link to="/profile" onClick={onNavigate}>
                      <User />
                      {t('nav.profile')}
                    </Link>
                  </DropdownMenuItem>
                  <DropdownMenuItem disabled>
                    <ShieldCheck />
                    {isSuperAdmin ? t('nav.superAdmin') : t('nav.staffRole')}
                  </DropdownMenuItem>
                </DropdownMenuGroup>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  onClick={handleSignOut}
                  className="text-destructive focus:text-destructive"
                >
                  <LogOut />
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
