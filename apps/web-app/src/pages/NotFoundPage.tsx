import { Button, buttonVariants } from '@/components/ui/button';
import { useLocale } from '@/lib/i18n';
import { useAppSelector } from '@/store';
import { Link, useRouter } from '@tanstack/react-router';
import { BarChart3, ChevronLeft, FileText, Home, LayoutDashboard, LogIn } from 'lucide-react';

const MAIN_GEAR_CENTER = { x: 78, y: 92 };
const SMALL_GEAR_CENTER = { x: 148, y: 44 };

function FactoryIllustration() {
  return (
    <svg
      viewBox="0 0 190 165"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className="w-full h-full"
      aria-hidden="true"
    >
      <defs>
        <style>{`
          @media (prefers-reduced-motion: no-preference) {
            .nfp-gear-main {
              transform-origin: ${MAIN_GEAR_CENTER.x}px ${MAIN_GEAR_CENTER.y}px;
              animation: nfpGearSpin 24s linear infinite;
            }
            .nfp-gear-small {
              transform-origin: ${SMALL_GEAR_CENTER.x}px ${SMALL_GEAR_CENTER.y}px;
              animation: nfpGearFloat 3.2s ease-in-out infinite;
            }
          }
          @keyframes nfpGearSpin { to { transform: rotate(360deg); } }
          @keyframes nfpGearFloat {
            0%, 100% { transform: translateY(0px); }
            50% { transform: translateY(-9px); }
          }
        `}</style>
      </defs>

      {/* Main gear — centered at (78, 92) */}
      <g className="nfp-gear-main">
        {/* 8 teeth: outer r=60, body r=46, tooth h=14 */}
        {[0, 1, 2, 3, 4, 5, 6, 7].map((i) => (
          <rect
            key={i}
            x="71.5"
            y="32"
            width="13"
            height="14"
            rx="3"
            fill="currentColor"
            className="text-primary/20"
            transform={`rotate(${i * 45} 78 92)`}
          />
        ))}
        <circle cx="78" cy="92" r="46" fill="currentColor" className="text-primary/10" />
        <circle
          cx="78"
          cy="92"
          r="46"
          stroke="currentColor"
          strokeWidth="2"
          className="text-primary/20"
        />
        <circle cx="78" cy="92" r="14" fill="currentColor" className="text-primary/15" />
        <circle
          cx="78"
          cy="92"
          r="14"
          stroke="currentColor"
          strokeWidth="1.5"
          className="text-primary/25"
        />
        <circle cx="78" cy="92" r="4" fill="currentColor" className="text-primary/40" />
      </g>

      {/* Disconnected small gear — centered at (148, 44), dashed stroke = detached */}
      <g className="nfp-gear-small">
        {/* 6 teeth: outer r=22, body r=16, tooth h=6 */}
        {[0, 1, 2, 3, 4, 5].map((i) => (
          <rect
            key={i}
            x="144"
            y="22"
            width="8"
            height="6"
            rx="2"
            fill="currentColor"
            className="text-muted-foreground/20"
            transform={`rotate(${i * 60} 148 44)`}
          />
        ))}
        <circle cx="148" cy="44" r="16" fill="currentColor" className="text-muted-foreground/10" />
        <circle
          cx="148"
          cy="44"
          r="16"
          stroke="currentColor"
          strokeWidth="1.5"
          strokeDasharray="3.5 2.5"
          className="text-muted-foreground/30"
        />
        <circle cx="148" cy="44" r="5" fill="currentColor" className="text-muted-foreground/15" />
        {/* "?" mark in the small gear hub */}
        <text
          x="148"
          y="49"
          textAnchor="middle"
          fontSize="9"
          fontWeight="700"
          fontFamily="system-ui, sans-serif"
          fill="currentColor"
          className="text-muted-foreground/45"
        >
          ?
        </text>
      </g>

      {/* Disconnection dots between gears */}
      <circle cx="118" cy="68" r="1.5" fill="currentColor" className="text-muted-foreground/15" />
      <circle cx="126" cy="60" r="1" fill="currentColor" className="text-muted-foreground/10" />
      <circle cx="132" cy="53" r="1.5" fill="currentColor" className="text-muted-foreground/15" />
    </svg>
  );
}

export function NotFoundPage() {
  const { t } = useLocale();
  const router = useRouter();
  const { isAuthenticated, isRegistered } = useAppSelector((s) => s.auth);

  const handleGoBack = () => router.history.back();

  const quickLinks =
    isAuthenticated && isRegistered
      ? ([
          {
            to: '/dashboard',
            label: t('nav.dashboard'),
            icon: <LayoutDashboard size={14} aria-hidden="true" />,
          },
          { to: '/quiz', label: t('nav.quiz'), icon: <FileText size={14} aria-hidden="true" /> },
          {
            to: '/results',
            label: t('nav.results'),
            icon: <BarChart3 size={14} aria-hidden="true" />,
          },
        ] as const)
      : ([
          { to: '/', label: t('nav.login'), icon: <LogIn size={14} aria-hidden="true" /> },
        ] as const);

  return (
    <div className="min-h-[calc(100vh-3.5rem)] flex flex-col items-center justify-center p-6">
      <div className="text-center w-full max-w-md animate-fade-up">
        {/* Factory gear illustration */}
        <div className="relative mx-auto mb-4 w-48 h-44 select-none">
          <FactoryIllustration />
        </div>

        {/* 404 badge */}
        <div className="inline-flex items-center px-3 py-1 rounded-full bg-primary/10 border border-primary/20 mb-5">
          <span className="text-sm font-mono font-bold text-primary tracking-[0.2em]">404</span>
        </div>

        <h1 className="text-3xl font-bold mb-3">{t('notFound.title')}</h1>
        <p className="text-muted-foreground mb-8 text-base leading-relaxed text-balance">
          {t('notFound.desc')}
        </p>

        {/* Primary actions */}
        <div className="flex flex-col sm:flex-row gap-3 justify-center mb-10">
          <Button variant="outline" size="lg" onClick={handleGoBack}>
            <ChevronLeft size={16} aria-hidden="true" />
            {t('notFound.goBack')}
          </Button>
          <Link to="/" className={buttonVariants({ size: 'lg', className: 'gap-2' })}>
            <Home size={16} aria-hidden="true" />
            {t('notFound.goHome')}
          </Link>
        </div>

        {/* Quick links */}
        <div className="border-t pt-6">
          <p className="text-xs font-medium text-muted-foreground uppercase tracking-widest mb-4">
            {t('notFound.quickLinks')}
          </p>
          <div className="flex flex-wrap gap-2 justify-center">
            {quickLinks.map((link) => (
              <Link
                key={link.to}
                to={link.to}
                className={buttonVariants({ variant: 'ghost', size: 'sm', className: 'gap-1.5' })}
              >
                {link.icon}
                {link.label}
              </Link>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
