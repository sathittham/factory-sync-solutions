import { CONSENT_KEY, CookieConsent } from '@/components/CookieConsent';
import type { LegalType } from '@/components/LegalModal';
import { LegalModal } from '@/components/LegalModal';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from '@/components/ui/breadcrumb';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Separator } from '@/components/ui/separator';
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarInset,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarProvider,
  SidebarRail,
  SidebarTrigger,
  useSidebar,
} from '@/components/ui/sidebar';
import { trackEvent, trackPageView } from '@/lib/analytics';
import { auth } from '@/lib/firebase';
import { useLocale } from '@/lib/i18n';
import { type Theme, useTheme } from '@/lib/theme';
import { useAppDispatch, useAppSelector } from '@/store';
import {
  type CompanyOption,
  type Profile,
  canManageCompanySettings,
  canManageUsers,
  setActiveCompany,
} from '@/store/authSlice';
import fsDarkLogo from '@shared/brand/fs-dark.png';
import fsLightLogo from '@shared/brand/fs-light.png';
import { LocaleSwitcher } from '@shared/ui/LocaleSwitcher';
import { ThemeSwitcher } from '@shared/ui/ThemeSwitcher';
import { signOut } from 'firebase/auth';
import {
  BarChart3,
  Building2,
  Check,
  ChevronsUpDown,
  ClipboardList,
  LayoutDashboard,
  LogOut,
  Settings,
  User,
  UsersRound,
} from 'lucide-react';
import { Fragment, type CSSProperties, useEffect, useState } from 'react';
import { Link, Outlet, useLocation, useNavigate } from 'react-router';

/* ─── Types & constants ─── */

function getInitial(name: string): string {
  return (name || 'U').charAt(0).toUpperCase();
}

function readConsentState(): boolean {
  try {
    return !localStorage.getItem(CONSENT_KEY);
  } catch {
    return true;
  }
}

/* ─── Top CTA bar ─── */

const lineIcon = (
  <svg
    width="14"
    height="14"
    viewBox="0 0 24 24"
    fill="currentColor"
    className="shrink-0"
    aria-hidden="true"
    focusable="false"
  >
    <path d="M19.365 9.863c.349 0 .63.285.63.631 0 .345-.281.63-.63.63H17.61v1.125h1.755c.349 0 .63.283.63.63 0 .344-.281.629-.63.629h-2.386c-.345 0-.627-.285-.627-.629V8.108c0-.345.282-.63.63-.63h2.386c.346 0 .627.285.627.63 0 .349-.281.63-.63.63H17.61v1.125h1.755zm-3.855 3.016c0 .27-.174.51-.432.596-.064.021-.133.031-.199.031-.211 0-.391-.09-.51-.25l-2.443-3.317v2.94c0 .344-.279.629-.631.629-.346 0-.626-.285-.626-.629V8.108c0-.27.173-.51.43-.595.06-.023.136-.033.194-.033.195 0 .375.104.495.254l2.462 3.33V8.108c0-.345.282-.63.63-.63.345 0 .63.285.63.63v4.771zm-5.741 0c0 .344-.282.629-.631.629-.345 0-.627-.285-.627-.629V8.108c0-.345.282-.63.63-.63.346 0 .628.285.628.63v4.771zm-2.466.629H4.917c-.345 0-.63-.285-.63-.629V8.108c0-.345.285-.63.63-.63.348 0 .63.285.63.63v4.141h1.756c.348 0 .629.283.629.63 0 .344-.282.629-.629.629M24 10.314C24 4.943 18.615.572 12 .572S0 4.943 0 10.314c0 4.811 4.27 8.842 10.035 9.608.391.082.923.258 1.058.59.12.301.079.766.038 1.08l-.164 1.02c-.045.301-.24 1.186 1.049.645 1.291-.539 6.916-4.078 9.436-6.975C23.176 14.393 24 12.458 24 10.314" />
  </svg>
);

function TopCtaBar({ t }: Readonly<{ t: (key: string) => string }>) {
  return (
    <div className="flex min-h-8 shrink-0 items-center justify-center bg-primary px-4 text-center text-xs text-primary-foreground md:h-8">
      <a
        href="https://lin.ee/rWwdF9q"
        target="_blank"
        rel="noopener noreferrer"
        className="inline-flex items-center gap-1.5 hover:underline"
      >
        {t('topbar.cta')}
        {lineIcon}
      </a>
    </div>
  );
}

/* ─── Footer ─── */

function FooterSection({
  t,
  setLegalModal,
  setCookieOpen,
  setCookieSettings,
}: Readonly<{
  t: (key: string) => string;
  setLegalModal: (v: LegalType) => void;
  setCookieOpen: (v: boolean) => void;
  setCookieSettings: (v: boolean) => void;
}>) {
  const separator = <span className="text-border">|</span>;
  return (
    <footer className="border-t py-4 px-6">
      <div className="flex flex-col sm:flex-row items-center justify-between gap-2 text-xs text-muted-foreground">
        <div className="flex items-center gap-1.5">
          <span className="text-[#06C755]">{lineIcon}</span>
          <a
            href="https://lin.ee/rWwdF9q"
            target="_blank"
            rel="noopener noreferrer"
            className="font-medium text-foreground hover:text-primary transition-colors"
          >
            {t('footer.lineContact')}
          </a>
          <span className="text-border mx-1">·</span>
          <span>{t('nav.appName')}</span>
        </div>
        <div className="flex items-center gap-3 flex-wrap justify-center">
          <button
            type="button"
            onClick={() => setLegalModal('terms')}
            className="hover:text-foreground transition-colors"
          >
            {t('footer.terms')}
          </button>
          {separator}
          <button
            type="button"
            onClick={() => setLegalModal('privacy')}
            className="hover:text-foreground transition-colors"
          >
            {t('footer.privacy')}
          </button>
          {separator}
          <button
            type="button"
            onClick={() => setLegalModal('cookies')}
            className="hover:text-foreground transition-colors"
          >
            {t('footer.cookiePolicy')}
          </button>
          {separator}
          <button
            type="button"
            onClick={() => setLegalModal('marketing')}
            className="hover:text-foreground transition-colors"
          >
            {t('footer.marketing')}
          </button>
          {separator}
          <button
            type="button"
            onClick={() => {
              setCookieOpen(true);
              setCookieSettings(true);
            }}
            className="hover:text-foreground transition-colors"
          >
            {t('footer.cookies')}
          </button>
          {separator}
          <span className="font-mono text-[10px]">{__APP_VERSION__}</span>
        </div>
      </div>
    </footer>
  );
}

/* ─── Logo ─── */

function AppLogo({ resolvedTheme }: { readonly resolvedTheme: 'dark' | 'light' }) {
  const logo = resolvedTheme === 'dark' ? fsDarkLogo : fsLightLogo;
  return (
    <img
      src={logo}
      alt="FactorySync Solutions"
      width={32}
      height={32}
      className="h-8 w-8 object-contain"
    />
  );
}

/* ─── Nav item type ─── */

interface NavItem {
  path: string;
  icon: typeof LayoutDashboard;
  labelKey: string;
}

function getNavItems(): NavItem[] {
  return [
    { path: '/dashboard', icon: LayoutDashboard, labelKey: 'nav.dashboard' },
    { path: '/quiz', icon: ClipboardList, labelKey: 'nav.quiz' },
    { path: '/results', icon: BarChart3, labelKey: 'nav.results' },
  ];
}

function getCompanyOptions(profile: Profile): CompanyOption[] {
  const companies = [
    {
      companyName: profile.companyName,
      companyRegId: profile.companyRegId,
      industryType: profile.industryType,
      companySize: profile.companySize,
    },
    ...(profile.companies ?? []),
  ];
  const seen = new Set<string>();

  return companies.filter((company) => {
    if (!company.companyRegId || seen.has(company.companyRegId)) return false;
    seen.add(company.companyRegId);
    return true;
  });
}

function CompanySwitcher({
  profile,
  t,
  onSwitch,
}: Readonly<{
  profile: Profile;
  t: (key: string) => string;
  onSwitch: (companyRegId: string) => void;
}>) {
  const companies = getCompanyOptions(profile);
  const activeCompanyRegId = profile.activeCompanyRegId || profile.companyRegId;
  const activeCompany =
    companies.find((company) => company.companyRegId === activeCompanyRegId) ?? companies[0];

  if (!activeCompany) return null;

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="h-9 gap-2 px-2 sm:max-w-[14rem] sm:px-3"
          aria-label={t('companySwitcher.label')}
        >
          <Building2 className="size-4 shrink-0" />
          <span className="hidden min-w-0 flex-1 truncate text-left sm:block">
            {activeCompany.companyName}
          </span>
          <ChevronsUpDown className="hidden size-3.5 shrink-0 text-muted-foreground sm:block" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-72">
        <DropdownMenuLabel>{t('companySwitcher.label')}</DropdownMenuLabel>
        <DropdownMenuSeparator />
        {companies.map((company) => {
          const isActive = company.companyRegId === activeCompanyRegId;
          return (
            <DropdownMenuItem
              key={company.companyRegId}
              onSelect={() => {
                if (!isActive) onSwitch(company.companyRegId);
              }}
              className="gap-3"
            >
              <Building2 className="size-4 shrink-0 text-muted-foreground" />
              <div className="grid min-w-0 flex-1 text-left">
                <span className="truncate font-medium">{company.companyName}</span>
                <span className="truncate text-xs text-muted-foreground">
                  {company.companyRegId}
                </span>
              </div>
              {isActive && <Check className="size-4 text-primary" />}
            </DropdownMenuItem>
          );
        })}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

function SidebarUserMenu({
  profile,
  user,
  t,
  handleSignOut,
  onProfileClick,
}: Readonly<{
  profile: { contactName: string; displayName: string; email: string };
  user: { photoURL: string | null } | null;
  t: (key: string) => string;
  handleSignOut: () => void;
  onProfileClick: () => void;
}>) {
  const { isMobile } = useSidebar();
  const displayName = profile.contactName || profile.displayName || profile.email;
  const initial = getInitial(displayName);

  return (
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
                <AvatarFallback className="rounded-lg">{initial}</AvatarFallback>
              </Avatar>
              <div className="grid flex-1 text-left text-sm leading-tight">
                <span className="truncate font-semibold">{displayName}</span>
                <span className="truncate text-xs">{profile.email}</span>
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
                  <AvatarFallback className="rounded-lg">{initial}</AvatarFallback>
                </Avatar>
                <div className="grid flex-1 text-left text-sm leading-tight">
                  <span className="truncate font-semibold">{displayName}</span>
                  <span className="truncate text-xs">{profile.email}</span>
                </div>
              </div>
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuGroup>
              <DropdownMenuItem
                onClick={() => {
                  trackEvent('profile_open', { source: 'sidebar_user_menu' });
                  onProfileClick();
                }}
                data-testid="nav-profile-btn"
              >
                <User />
                {t('nav.profile')}
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
  );
}

/* ─── App Sidebar ─── */

function AppSidebar({
  profile,
  user,
  isAdmin,
  t,
  handleSignOut,
  onProfileClick,
  pathname,
  search,
}: Readonly<{
  profile: Profile;
  user: { photoURL: string | null } | null;
  isAdmin: boolean;
  t: (key: string) => string;
  handleSignOut: () => void;
  onProfileClick: () => void;
  pathname: string;
  search: string;
}>) {
  const { resolvedTheme } = useTheme();
  const navItems = getNavItems();
  const userManagementAllowed = canManageUsers(profile, isAdmin);
  const companySettingsAllowed = canManageCompanySettings(profile, isAdmin);
  const showAdminMenu = isAdmin || userManagementAllowed || companySettingsAllowed;
  const adminTab = new URLSearchParams(search).get('tab');

  return (
    <Sidebar variant="inset" collapsible="icon">
      <SidebarHeader>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton size="lg" asChild>
              <Link to="/dashboard">
                <AppLogo resolvedTheme={resolvedTheme} />
                <span className="text-base font-bold leading-tight">
                  {t('nav.brandName')}
                  <span className="block text-xs font-extrabold text-cyan-500 -mt-0.5">
                    {t('nav.brandUnit')}
                  </span>
                </span>
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
                <SidebarMenuItem key={item.path}>
                  <SidebarMenuButton
                    asChild
                    isActive={pathname === item.path}
                    tooltip={t(item.labelKey)}
                  >
                    <Link to={item.path}>
                      <item.icon />
                      <span>{t(item.labelKey)}</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
        {showAdminMenu && (
          <SidebarGroup>
            <SidebarGroupLabel>{t('nav.adminMenu')}</SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                {isAdmin && (
                  <SidebarMenuItem>
                    <SidebarMenuButton
                      asChild
                      isActive={pathname === '/admin' && adminTab !== 'users'}
                      tooltip={t('nav.admin')}
                    >
                      <Link to="/admin">
                        <Settings />
                        <span>{t('nav.admin')}</span>
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                )}
                {userManagementAllowed && (
                  <SidebarMenuItem>
                    <SidebarMenuButton
                      asChild
                      isActive={pathname === '/admin' && adminTab === 'users'}
                      tooltip={t('nav.manageUsers')}
                    >
                      <Link to="/admin?tab=users">
                        <UsersRound />
                        <span>{t('nav.manageUsers')}</span>
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                )}
                {companySettingsAllowed && (
                  <SidebarMenuItem>
                    <SidebarMenuButton
                      asChild
                      tooltip={t('nav.companySettings')}
                      isActive={pathname === '/company-settings'}
                    >
                      <Link
                        to="/company-settings"
                        onClick={() => trackEvent('nav_company_settings')}
                      >
                        <Building2 />
                        <span>{t('nav.companySettings')}</span>
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                )}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        )}
      </SidebarContent>

      <SidebarFooter>
        <SidebarUserMenu
          profile={profile}
          user={user}
          t={t}
          handleSignOut={handleSignOut}
          onProfileClick={onProfileClick}
        />
      </SidebarFooter>

      <SidebarRail />
    </Sidebar>
  );
}

/* ─── Main Layout ─── */

export function Layout() {
  const { isAuthenticated, isAdmin, profile, user, loading: authLoading } = useAppSelector((s) => s.auth);
  const dispatch = useAppDispatch();
  const navigate = useNavigate();
  const location = useLocation();
  const { locale, setLocale: rawSetLocale, t } = useLocale();
  const { theme, setTheme: rawSetTheme } = useTheme();

  const setLocale = (l: 'th' | 'en') => {
    rawSetLocale(l);
    trackEvent('locale_change', { locale: l });
  };
  const setTheme = (th: Theme) => {
    rawSetTheme(th);
    trackEvent('theme_change', { theme: th });
  };

  const [legalModal, setLegalModal] = useState<LegalType>(null);
  const [cookieOpen, setCookieOpen] = useState(readConsentState);
  const [cookieSettings, setCookieSettings] = useState(false);

  useEffect(() => {
    trackPageView(location.pathname);
  }, [location.pathname]);

  const handleSignOut = async () => {
    await signOut(auth);
    navigate('/');
  };

  const handleCompanySwitch = (companyRegId: string) => {
    dispatch(setActiveCompany(companyRegId));
    trackEvent('company_switch', { source: 'header' });
  };

  const closeCookies = () => {
    setCookieOpen(false);
    setCookieSettings(false);
  };

  const isAuthPage = location.pathname === '/';
  const breadcrumbSegments = (() => {
    const path = location.pathname;
    const adminTab = new URLSearchParams(location.search).get('tab');

    if (path === '/profile') {
      return [{ label: t('nav.main') }, { label: t('profile.title') }];
    }
    if (path === '/company-settings') {
      return [{ label: t('nav.adminMenu') }, { label: t('nav.companySettings') }];
    }
    if (path === '/admin') {
      const showManageUsers = adminTab === 'users' || (!isAdmin && canManageUsers(profile, isAdmin));
      return [
        { label: t('nav.adminMenu') },
        { label: showManageUsers ? t('nav.manageUsers') : t('admin.title') },
      ];
    }
    const navItem = getNavItems().find((item) => item.path === path);
    return [
      { label: t('nav.main') },
      { label: navItem ? t(navItem.labelKey) : t('nav.appName') },
    ];
  })();

  if (isAuthPage) {
    return (
      <div className="min-h-screen bg-background">
        <div className="fixed top-4 right-4 z-50 flex items-center gap-2">
          <LocaleSwitcher locale={locale} setLocale={setLocale} t={t} />
          <ThemeSwitcher theme={theme} setTheme={setTheme} t={t} />
        </div>
        <Outlet />
        <LegalModal open={legalModal} onClose={() => setLegalModal(null)} />
        <CookieConsent
          open={cookieOpen}
          openSettings={cookieSettings}
          onClose={closeCookies}
          onOpenLegal={setLegalModal}
        />
      </div>
    );
  }

  return (
    <div className="flex h-svh flex-col overflow-hidden">
      <TopCtaBar t={t} />
      <SidebarProvider
        className="flex-1 min-h-0 overflow-hidden"
        style={{ '--sidebar-top-offset': '2rem' } as CSSProperties}
      >
        {isAuthenticated && profile && (
          <AppSidebar
            profile={profile}
            user={user}
            isAdmin={isAdmin}
            t={t}
            handleSignOut={handleSignOut}
            onProfileClick={() => navigate('/profile')}
            pathname={location.pathname}
            search={location.search}
          />
        )}

        <SidebarInset className="min-h-0 min-w-0 overflow-auto">
          <header className="flex h-16 shrink-0 items-center gap-2 px-4">
            {authLoading && !profile && (
              <>
                <Skeleton className="h-6 w-6 shrink-0 rounded-md" />
                <Skeleton className="mx-2 h-4 w-px shrink-0" />
                <Skeleton className="h-4 w-36 flex-1" />
              </>
            )}
            {isAuthenticated && profile && (
              <>
                <SidebarTrigger className="-ml-1 shrink-0" />
                <Separator orientation="vertical" className="mr-2 h-4 shrink-0" />
                <Breadcrumb className="flex-1 min-w-0">
                  <BreadcrumbList className="flex-nowrap">
                    {breadcrumbSegments.map((seg, i) => {
                      const isLast = i === breadcrumbSegments.length - 1;
                      return (
                        <Fragment key={seg.label}>
                          {i > 0 && <BreadcrumbSeparator className="hidden md:block" />}
                          <BreadcrumbItem className={isLast ? 'min-w-0' : 'hidden md:block'}>
                            {isLast ? (
                              <BreadcrumbPage className="truncate">{seg.label}</BreadcrumbPage>
                            ) : (
                              <span className="text-muted-foreground text-sm truncate">
                                {seg.label}
                              </span>
                            )}
                          </BreadcrumbItem>
                        </Fragment>
                      );
                    })}
                  </BreadcrumbList>
                </Breadcrumb>
              </>
            )}
            <div className="ml-auto flex shrink-0 items-center gap-1.5">
              {authLoading && !profile && (
                <Skeleton className="h-9 w-9 shrink-0 rounded-md sm:w-36" />
              )}
              {isAuthenticated && profile && (
                <CompanySwitcher profile={profile} t={t} onSwitch={handleCompanySwitch} />
              )}
              <LocaleSwitcher locale={locale} setLocale={setLocale} t={t} />
              <ThemeSwitcher theme={theme} setTheme={setTheme} t={t} />
            </div>
          </header>

          <main className="flex flex-1 flex-col gap-4 p-4 pt-0">
            <Outlet />
          </main>

          <FooterSection
            t={t}
            setLegalModal={setLegalModal}
            setCookieOpen={setCookieOpen}
            setCookieSettings={setCookieSettings}
          />
        </SidebarInset>

        <LegalModal open={legalModal} onClose={() => setLegalModal(null)} />
        <CookieConsent
          open={cookieOpen}
          openSettings={cookieSettings}
          onClose={closeCookies}
          onOpenLegal={setLegalModal}
        />
      </SidebarProvider>
    </div>
  );
}
