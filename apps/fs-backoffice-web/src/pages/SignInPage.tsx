import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { auth, googleProvider } from '@/lib/firebase';
import { useLocale } from '@/lib/i18n';
import { useTheme } from '@/lib/theme';
import { useAppSelector } from '@/store';
import fsDarkLogo from '@shared/brand/fs-dark.png';
import fsLightLogo from '@shared/brand/fs-light.png';
import { mapFirebaseError } from '@shared/lib/firebaseErrors';
import { GoogleSignInButton } from '@shared/ui/GoogleSignInButton';
import { LocaleSwitcher } from '@shared/ui/LocaleSwitcher';
import { LoginPageLayout } from '@shared/ui/LoginPageLayout';
import { ThemeSwitcher } from '@shared/ui/ThemeSwitcher';
import { sendPasswordResetEmail, signInWithEmailAndPassword, signInWithPopup } from 'firebase/auth';
import { Eye, EyeOff } from 'lucide-react';
import { useState } from 'react';
import { Navigate } from 'react-router';

const REMEMBER_EMAIL_KEY = 'fsb-remembered-email';
const LAST_SIGNIN_KEY = 'fsb-last-signin';

function loadRememberedEmail(): string {
  try { return localStorage.getItem(REMEMBER_EMAIL_KEY) ?? ''; } catch { return ''; }
}
function loadLastSignIn(): 'email' | 'google' | null {
  try {
    const v = localStorage.getItem(LAST_SIGNIN_KEY);
    return v === 'email' || v === 'google' ? v : null;
  } catch { return null; }
}
function saveLastSignIn(method: 'email' | 'google') {
  try { localStorage.setItem(LAST_SIGNIN_KEY, method); } catch { /* noop */ }
}
function saveRememberedEmail(email: string) {
  try { localStorage.setItem(REMEMBER_EMAIL_KEY, email); } catch { /* noop */ }
}
function clearRememberedEmail() {
  try { localStorage.removeItem(REMEMBER_EMAIL_KEY); } catch { /* noop */ }
}

function isPopupCancelled(code: string): boolean {
  return code === 'auth/popup-closed-by-user' || code === 'auth/cancelled-popup-request';
}

async function sendReset(
  email: string,
  t: (k: string) => string,
  onSuccess: (msg: string) => void,
  onError: (msg: string) => void,
): Promise<void> {
  try {
    await sendPasswordResetEmail(auth, email);
    onSuccess(t('auth.resetEmailSent'));
  } catch (err: unknown) {
    const code = (err as { code?: string }).code ?? '';
    onError(mapFirebaseError(code, t));
  }
}

type Mode = 'signin' | 'reset';

export function SignInPage() {
  const { t, locale, setLocale } = useLocale();
  const { resolvedTheme, theme, setTheme } = useTheme();
  const { isAuthenticated, loading } = useAppSelector((s) => s.auth);

  const [mode, setMode] = useState<Mode>('signin');
  const [email, setEmail] = useState(loadRememberedEmail);
  const [rememberEmail, setRememberEmail] = useState(() => loadRememberedEmail() !== '');
  const [lastSignIn] = useState(loadLastSignIn);
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isEmailLoading, setIsEmailLoading] = useState(false);
  const [isGoogleLoading, setIsGoogleLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const logo = resolvedTheme === 'dark' ? fsDarkLogo : fsLightLogo;
  const isAnyLoading = isEmailLoading || isGoogleLoading;
  const submitLabel = mode === 'reset' ? t('auth.sendResetEmail') : t('auth.signInWithEmail');

  const switchMode = (next: Mode) => {
    setEmail('');
    setPassword('');
    setError(null);
    setSuccessMessage(null);
    setMode(next);
  };

  const handleGoogleSignIn = async () => {
    setIsGoogleLoading(true);
    setError(null);
    try {
      await signInWithPopup(auth, googleProvider);
      saveLastSignIn('google');
    } catch (err: unknown) {
      const code = (err as { code?: string }).code ?? '';
      if (!isPopupCancelled(code)) {
        setError(mapFirebaseError(code, t));
      }
    } finally {
      setIsGoogleLoading(false);
    }
  };

  const handleEmailSignIn = async (e: { preventDefault(): void }) => {
    e.preventDefault();
    setError(null);
    setIsEmailLoading(true);
    try {
      await signInWithEmailAndPassword(auth, email, password);
      saveLastSignIn('email');
      if (rememberEmail) {
        saveRememberedEmail(email);
      } else {
        clearRememberedEmail();
      }
    } catch (err: unknown) {
      const code = (err as { code?: string }).code ?? '';
      setError(mapFirebaseError(code, t));
    } finally {
      setIsEmailLoading(false);
    }
  };

  const handlePasswordReset = async (e: { preventDefault(): void }) => {
    e.preventDefault();
    setError(null);
    setIsEmailLoading(true);
    await sendReset(email, t, setSuccessMessage, setError);
    setIsEmailLoading(false);
  };

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
      </div>
    );
  }

  if (isAuthenticated) {
    return <Navigate to="/dashboard" replace />;
  }

  return (
    <>
      <div className="fixed top-4 right-4 z-50 flex items-center gap-2">
        <LocaleSwitcher locale={locale} setLocale={setLocale} t={t} />
        <ThemeSwitcher theme={theme} setTheme={setTheme} t={t} />
      </div>

      <LoginPageLayout
        logo={logo}
        appName={t('nav.appName')}
        appHref="https://factorysyncsolutions.com"
        backgroundImage="/fs-bg.png"
        imageClassName="object-left"
        footer={<>FactorySync Backoffice &middot; {__APP_VERSION__}</>}
      >
        <div className="flex flex-col gap-6">
          <div className="flex flex-col items-center gap-2 text-center">
            <h1 className="text-2xl font-bold">
              {mode === 'reset' ? t('auth.resetTitle') : t('auth.signIn')}
            </h1>
            <p className="text-balance text-sm text-muted-foreground">
              {mode === 'reset' ? t('auth.resetSubtitle') : t('auth.backofficeOnly')}
            </p>
          </div>

          <form onSubmit={mode === 'reset' ? handlePasswordReset : handleEmailSignIn} className="flex flex-col gap-3">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="bo-email">{t('auth.emailLabel')}</Label>
              <Input
                id="bo-email"
                type="email"
                autoComplete="email"
                placeholder="you@factorysyncsolutions.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                disabled={isAnyLoading}
              />
              {mode === 'signin' && (
                <label className="flex items-center gap-2 cursor-pointer select-none w-fit mt-0.5">
                  <input
                    type="checkbox"
                    className="h-3.5 w-3.5 rounded border-border accent-primary cursor-pointer"
                    checked={rememberEmail}
                    onChange={(e) => setRememberEmail(e.target.checked)}
                    disabled={isAnyLoading}
                  />
                  <span className="text-xs text-muted-foreground">{t('auth.rememberEmail')}</span>
                </label>
              )}
            </div>

            {mode === 'signin' && (
              <div className="flex flex-col gap-1.5">
                <div className="flex items-center justify-between">
                  <Label htmlFor="bo-password">{t('auth.passwordLabel')}</Label>
                  <button
                    type="button"
                    className="text-xs text-muted-foreground underline underline-offset-2 hover:text-primary"
                    onClick={() => switchMode('reset')}
                  >
                    {t('auth.forgotPassword')}
                  </button>
                </div>
                <div className="relative">
                  <Input
                    id="bo-password"
                    type={showPassword ? 'text' : 'password'}
                    autoComplete="current-password"
                    placeholder="••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    disabled={isAnyLoading}
                    className="pr-10"
                  />
                  <button
                    type="button"
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                    onClick={() => setShowPassword((v) => !v)}
                    aria-label={showPassword ? t('auth.hidePassword') : t('auth.showPassword')}
                  >
                    {showPassword ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                  </button>
                </div>
              </div>
            )}

            {error && <p className="text-sm text-destructive text-center">{error}</p>}
            {successMessage && (
              <p className="text-sm text-green-600 dark:text-green-400 text-center">{successMessage}</p>
            )}

            <div className="relative">
              {lastSignIn === 'email' && mode === 'signin' && (
                <span className="absolute -top-2.5 right-2 z-10 inline-flex items-center rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-medium text-primary">
                  {t('auth.lastUsed')}
                </span>
              )}
              <Button type="submit" size="lg" className="w-full" disabled={isAnyLoading}>
                {isEmailLoading ? t('common.loading') : submitLabel}
              </Button>
            </div>
          </form>

          {mode === 'reset' ? (
            <p className="text-center text-sm text-muted-foreground">
              <button
                type="button"
                className="underline underline-offset-4 hover:text-primary"
                onClick={() => switchMode('signin')}
              >
                {t('auth.backToSignIn')}
              </button>
            </p>
          ) : (
            <>
              <div className="relative">
                <div className="absolute inset-0 flex items-center">
                  <span className="w-full border-t" />
                </div>
                <div className="relative flex justify-center text-xs uppercase">
                  <span className="bg-background px-2 text-muted-foreground">{t('auth.or')}</span>
                </div>
              </div>

              <GoogleSignInButton onClick={handleGoogleSignIn} disabled={isAnyLoading}>
                {isGoogleLoading ? t('common.loading') : t('auth.signInWithGoogle')}
              </GoogleSignInButton>
            </>
          )}
        </div>
      </LoginPageLayout>
    </>
  );
}
