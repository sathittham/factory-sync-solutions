import { useLocale } from '@/lib/i18n';
import fsDarkLogo from '@shared/brand/fs-dark.png';

export function AuthPanel() {
  const { t } = useLocale();

  return (
    <div className="relative hidden md:block">
      <img
        src="/fs-bg.png"
        alt=""
        aria-hidden="true"
        className="absolute inset-0 h-full w-full object-cover"
      />
      <div className="absolute inset-0 bg-sky-950/60 dark:bg-[#041225]/80" />
      <div className="relative flex flex-col items-center justify-center h-full p-10 text-white text-center">
        <img
          src={fsDarkLogo}
          alt={t('nav.appName')}
          className="h-10 w-auto mb-6 brightness-0 invert"
        />
        <p className="text-lg font-semibold leading-relaxed">{t('signin.brandingQuote')}</p>
      </div>
    </div>
  );
}
