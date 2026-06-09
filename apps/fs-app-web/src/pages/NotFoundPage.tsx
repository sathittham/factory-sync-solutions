import { buttonVariants } from '@/components/ui/button';
import { useLocale } from '@/lib/i18n';
import { Link } from 'react-router';

export function NotFoundPage() {
  const { t } = useLocale();

  return (
    <div className="min-h-[calc(100vh-3.5rem)] flex flex-col items-center justify-center p-4">
      <div className="text-center animate-fade-up">
        <div className="relative inline-block mb-6">
          <span className="text-7xl sm:text-[8rem] lg:text-[10rem] font-bold leading-none text-primary/4 select-none">
            404
          </span>
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="h-14 w-14 rounded-lg bg-muted flex items-center justify-center">
              <svg
                width="28"
                height="28"
                viewBox="0 0 24 24"
                fill="none"
                className="text-muted-foreground"
              >
                <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="1.5" />
                <path
                  d="M8 15s1.5 2 4 2 4-2 4-2M9 9h.01M15 9h.01"
                  stroke="currentColor"
                  strokeWidth="1.5"
                  strokeLinecap="round"
                />
              </svg>
            </div>
          </div>
        </div>
        <h1 className="text-2xl font-bold mb-2">{t('notFound.title')}</h1>
        <p className="text-muted-foreground mb-8 max-w-sm mx-auto text-sm">
          {t('notFound.desc') || t('notFound.title')}
        </p>
        <Link to="/" className={buttonVariants({ size: 'lg', className: 'gap-2' })}>
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
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
    </div>
  );
}
