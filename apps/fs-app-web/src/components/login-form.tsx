import { AuthPanel } from '@/components/AuthPanel';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { useLocale } from '@/lib/i18n';
import { useTheme } from '@/lib/theme';
import { cn } from '@/lib/utils';
import fsDarkLogo from '@shared/brand/fs-dark.png';
import fsLightLogo from '@shared/brand/fs-light.png';

interface LoginFormProps extends React.ComponentProps<'div'> {
  onSignIn: () => void;
  isLoading?: boolean;
}

export function LoginForm({ className, onSignIn, isLoading, ...props }: LoginFormProps) {
  const { t } = useLocale();
  const { resolvedTheme } = useTheme();
  const logo = resolvedTheme === 'dark' ? fsDarkLogo : fsLightLogo;

  return (
    <div className={cn('flex flex-col gap-6', className)} {...props}>
      <Card className="overflow-hidden shadow-lg">
        <CardContent className="grid p-0 md:grid-cols-2">
          <div className="p-8 md:p-10">
            <div className="flex flex-col gap-7">
              <div className="flex flex-col items-center text-center gap-3">
                <img src={logo} alt={t('nav.appName')} className="h-10 w-auto" />
                <div className="flex flex-col gap-1">
                  <h1 className="text-2xl font-bold">{t('signin.title')}</h1>
                  <p className="text-base text-muted-foreground text-balance">
                    {t('signin.subtitle')}
                  </p>
                </div>
              </div>

              <Button
                size="lg"
                className="w-full h-12 text-[15px] font-semibold gap-3"
                onClick={onSignIn}
                disabled={isLoading}
                data-testid="signin-google-btn"
              >
                <svg className="w-5 h-5 shrink-0" viewBox="0 0 24 24" aria-hidden="true">
                  <path
                    d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z"
                    fill="#4285F4"
                  />
                  <path
                    d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                    fill="#34A853"
                  />
                  <path
                    d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                    fill="#FBBC05"
                  />
                  <path
                    d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                    fill="#EA4335"
                  />
                </svg>
                {t('landing.signIn')}
              </Button>

              <p className="text-sm text-center text-muted-foreground">{t('signin.free')}</p>
            </div>
          </div>

          <AuthPanel />
        </CardContent>
      </Card>

      <p className="text-center text-xs text-muted-foreground text-balance [&_a]:underline [&_a]:underline-offset-4 hover:[&_a]:text-primary">
        {t('signin.termsPrefix')}{' '}
        <a href="https://factorysyncsolutions.com/terms" target="_blank" rel="noreferrer">
          {t('footer.terms')}
        </a>{' '}
        {t('register.and')}{' '}
        <a href="https://factorysyncsolutions.com/privacy" target="_blank" rel="noreferrer">
          {t('footer.privacy')}
        </a>
      </p>
    </div>
  );
}
