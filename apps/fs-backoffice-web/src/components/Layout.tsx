import {
  Breadcrumb,
  BreadcrumbItem,
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
import { Fragment } from 'react';
import type { CSSProperties } from 'react';
import { Outlet, useLocation } from 'react-router';
import { AppSidebar } from './Sidebar';

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

  const breadcrumbSegments = (() => {
    const path = location.pathname;
    if (path === '/dashboard') return [{ label: t('nav.main') }, { label: t('nav.dashboard') }];
    if (path.startsWith('/projects'))
      return [{ label: t('nav.main') }, { label: t('nav.projects') }];
    if (path.startsWith('/users')) return [{ label: t('nav.main') }, { label: t('nav.users') }];
    if (path.startsWith('/results')) return [{ label: t('nav.main') }, { label: t('nav.results') }];
    if (path === '/staff') return [{ label: t('nav.main') }, { label: t('nav.staff') }];
    return [{ label: t('nav.main') }, { label: t('nav.appName') }];
  })();

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
