import { Button, buttonVariants } from '@/components/ui/button';
import { useLocale } from '@/lib/i18n';
import { useAppSelector } from '@/store';
import { Link, useNavigate } from 'react-router';

export function NotFoundPage() {
  const { t } = useLocale();
  const navigate = useNavigate();
  const { isAuthenticated, isRegistered } = useAppSelector((s) => s.auth);

  const quickLinks =
    isAuthenticated && isRegistered
      ? [
          { to: '/dashboard', label: t('nav.dashboard') },
          { to: '/quiz', label: t('nav.quiz') },
          { to: '/results', label: t('nav.results') },
        ]
      : [{ to: '/', label: t('nav.login') }];

  return (
    <div className="min-h-[calc(100vh-3.5rem)] flex flex-col items-center justify-center p-6">
      <div className="text-center w-full max-w-md">
        {/* 404 number */}
        <div className="relative inline-block mb-8 select-none">
          <span className="text-[8rem] sm:text-[10rem] font-black leading-none text-primary/10 tabular-nums">
            404
          </span>
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="h-16 w-16 rounded-2xl bg-muted flex items-center justify-center shadow-sm">
              <svg
                width="32"
                height="32"
                viewBox="0 0 24 24"
                fill="none"
                className="text-muted-foreground"
                aria-hidden="true"
              >
                <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="1.5" />
                <path
                  d="M12 8v4M12 16h.01"
                  stroke="currentColor"
                  strokeWidth="1.5"
                  strokeLinecap="round"
                />
              </svg>
            </div>
          </div>
        </div>

        <h1 className="text-2xl font-bold mb-3">{t('notFound.title')}</h1>
        <p className="text-muted-foreground mb-8 text-base leading-relaxed">{t('notFound.desc')}</p>

        {/* Primary actions */}
        <div className="flex flex-col sm:flex-row gap-3 justify-center mb-10">
          <Button variant="outline" onClick={() => navigate(-1)}>
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
              <path
                d="M10 12L6 8l4-4"
                stroke="currentColor"
                strokeWidth="1.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
            {t('notFound.goBack')}
          </Button>
          <Link to="/" className={buttonVariants({ className: 'gap-2' })}>
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
              <path
                d="M2 8l6-5 6 5M4 7v6a1 1 0 001 1h6a1 1 0 001-1V7"
                stroke="currentColor"
                strokeWidth="1.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
            {t('notFound.goHome')}
          </Link>
        </div>

        {/* Quick links */}
        <div className="border-t pt-6">
          <p className="text-xs text-muted-foreground uppercase tracking-wide mb-3">
            {t('notFound.quickLinks')}
          </p>
          <div className="flex flex-wrap gap-2 justify-center">
            {quickLinks.map((link) => (
              <Link
                key={link.to}
                to={link.to}
                className={buttonVariants({ variant: 'ghost', size: 'sm' })}
              >
                {link.label}
              </Link>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
