import { backofficeApi } from '@/api/backoffice';
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from '@/components/ui/breadcrumb';
import { Separator } from '@/components/ui/separator';
import { SidebarInset, SidebarProvider, SidebarTrigger } from '@/components/ui/sidebar';
import { useLocale } from '@/lib/i18n';
import { useTheme } from '@/lib/theme';
import { LocaleSwitcher } from '@shared/ui/LocaleSwitcher';
import { ThemeSwitcher } from '@shared/ui/ThemeSwitcher';
import { ShieldCheck } from 'lucide-react';
import { Fragment, useEffect, useMemo, useState } from 'react';
import type { CSSProperties } from 'react';
import { Link, Outlet, useLocation } from 'react-router';
import { AppSidebar } from './Sidebar';

interface BreadcrumbSegment {
  label: string;
  href?: string;
}

interface BreadcrumbDefinition {
  key: string;
  href?: string;
}

const exactBreadcrumbs: Record<string, BreadcrumbDefinition[]> = {
  '/dashboard': [{ key: 'nav.main' }, { key: 'nav.dashboard' }],
  '/profile': [{ key: 'nav.main', href: '/dashboard' }, { key: 'nav.profile' }],
  '/staff': [{ key: 'nav.administrator' }, { key: 'nav.staff' }],
};

const prefixBreadcrumbs: Array<{ prefix: string; segments: BreadcrumbDefinition[] }> = [
  {
    prefix: '/help/api-docs',
    segments: [{ key: 'nav.administrator' }, { key: 'nav.apiDocs' }],
  },
  {
    prefix: '/projects',
    segments: [{ key: 'nav.main', href: '/dashboard' }, { key: 'nav.projects' }],
  },
  { prefix: '/users', segments: [{ key: 'nav.main', href: '/dashboard' }, { key: 'nav.users' }] },
  {
    prefix: '/results',
    segments: [{ key: 'nav.main', href: '/dashboard' }, { key: 'nav.results' }],
  },
];

function labelsFromDefinitions(
  segments: BreadcrumbDefinition[],
  t: (key: string) => string,
): BreadcrumbSegment[] {
  return segments.map(({ key, href }) => ({ label: t(key), href }));
}

function buildBreadcrumbSegments(
  path: string,
  projectID: string,
  projectName: string,
  t: (key: string) => string,
): BreadcrumbSegment[] {
  if (projectID) {
    return [
      { label: t('nav.main'), href: '/dashboard' },
      { label: t('nav.projects'), href: '/projects' },
      { label: projectName || projectID },
    ];
  }

  const exactSegments = exactBreadcrumbs[path];
  if (exactSegments) return labelsFromDefinitions(exactSegments, t);

  const prefixMatch = prefixBreadcrumbs.find(({ prefix }) => path.startsWith(prefix));
  if (prefixMatch) return labelsFromDefinitions(prefixMatch.segments, t);

  return labelsFromDefinitions(
    [{ key: 'nav.main', href: '/dashboard' }, { key: 'nav.appName' }],
    t,
  );
}

function TopBar({ t }: Readonly<{ t: (key: string) => string }>) {
  return (
    <div className="flex min-h-8 shrink-0 items-center justify-center bg-primary px-4 text-center text-xs text-primary-foreground md:h-8">
      <span className="inline-flex items-center gap-1.5">
        <ShieldCheck aria-hidden="true" className="size-3.5 shrink-0" />
        {t('topbar.staffOnly')}
      </span>
    </div>
  );
}

function FooterSection({ t }: Readonly<{ t: (key: string) => string }>) {
  return (
    <footer className="border-t px-6 py-4">
      <div className="flex flex-col items-center justify-between gap-2 text-xs text-muted-foreground sm:flex-row">
        <span>{t('footer.internal')}</span>
        <div className="flex flex-wrap items-center justify-center gap-3">
          <span>{t('nav.appName')}</span>
          <span className="text-border">|</span>
          <span className="font-mono text-[10px]">{__APP_VERSION__}</span>
        </div>
      </div>
    </footer>
  );
}

export function Layout() {
  const { locale, setLocale, t } = useLocale();
  const { theme, setTheme } = useTheme();
  const location = useLocation();
  const [breadcrumbProjectName, setBreadcrumbProjectName] = useState('');

  const projectIDForBreadcrumb = useMemo(() => {
    const match = /^\/projects\/([^/]+)$/.exec(location.pathname);
    return match ? decodeURIComponent(match[1]) : '';
  }, [location.pathname]);

  useEffect(() => {
    if (!projectIDForBreadcrumb) {
      setBreadcrumbProjectName('');
      return;
    }

    let cancelled = false;
    setBreadcrumbProjectName('');
    backofficeApi
      .getProject(projectIDForBreadcrumb)
      .then((project) => {
        if (!cancelled) setBreadcrumbProjectName(project.name);
      })
      .catch(() => {
        if (!cancelled) setBreadcrumbProjectName(projectIDForBreadcrumb);
      });

    return () => {
      cancelled = true;
    };
  }, [projectIDForBreadcrumb]);

  const breadcrumbSegments = useMemo(
    () =>
      buildBreadcrumbSegments(location.pathname, projectIDForBreadcrumb, breadcrumbProjectName, t),
    [breadcrumbProjectName, location.pathname, projectIDForBreadcrumb, t],
  );

  return (
    <div className="flex h-svh flex-col overflow-hidden">
      <TopBar t={t} />
      <SidebarProvider
        className="flex-1 min-h-0 overflow-hidden"
        style={{ '--sidebar-top-offset': '2rem' } as CSSProperties}
      >
        <AppSidebar />

        <SidebarInset className="min-h-0 min-w-0 overflow-auto">
          <header className="flex h-16 shrink-0 items-center gap-2 px-4">
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
                        ) : seg.href ? (
                          <BreadcrumbLink asChild className="text-sm truncate">
                            <Link to={seg.href}>{seg.label}</Link>
                          </BreadcrumbLink>
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
            <div className="ml-auto flex shrink-0 items-center gap-1.5">
              <LocaleSwitcher locale={locale} setLocale={setLocale} t={t} />
              <ThemeSwitcher theme={theme} setTheme={setTheme} t={t} />
            </div>
          </header>

          <main className="flex flex-1 flex-col gap-4 p-4 pt-0">
            <Outlet />
          </main>

          <FooterSection t={t} />
        </SidebarInset>
      </SidebarProvider>
    </div>
  );
}
