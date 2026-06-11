import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { trackEvent } from '@/lib/analytics';
import { auth, googleProvider } from '@/lib/firebase';
import { useLocale } from '@/lib/i18n';
import { useTheme } from '@/lib/theme';
import { mapFirebaseError } from '@shared/lib/firebaseErrors';
import fsDarkLogo from '@shared/brand/fs-dark.png';
import fsLightLogo from '@shared/brand/fs-light.png';
import { LoginPageLayout } from '@shared/ui/LoginPageLayout';
import { GoogleSignInButton } from '@shared/ui/GoogleSignInButton';
import {
  createUserWithEmailAndPassword,
  sendPasswordResetEmail,
  signInWithEmailAndPassword,
  signInWithPopup,
} from 'firebase/auth';
import { Eye, EyeOff } from 'lucide-react';
import { useState } from 'react';

type Mode = 'signin' | 'signup' | 'reset';

export function LoginForm() {
  const { t } = useLocale();
  const { resolvedTheme } = useTheme();
  const logo = resolvedTheme === 'dark' ? fsDarkLogo : fsLightLogo;

  const [mode, setMode] = useState<Mode>('signin');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isEmailLoading, setIsEmailLoading] = useState(false);
  const [isGoogleLoading, setIsGoogleLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const isAnyLoading = isEmailLoading || isGoogleLoading;

  const switchMode = (next: Mode) => {
    setEmail('');
    setPassword('');
    setConfirmPassword('');
    setError(null);
    setSuccessMessage(null);
    setMode(next);
  };

  const handleGoogleSignIn = async () => {
    setIsGoogleLoading(true);
    setError(null);
    try {
      trackEvent('sign_in_click', { method: 'google' });
      await signInWithPopup(auth, googleProvider);
      trackEvent('sign_in_success', { method: 'google' });
    } catch (err: unknown) {
      const code = (err as { code?: string }).code ?? '';
      if (code !== 'auth/popup-closed-by-user' && code !== 'auth/cancelled-popup-request') {
        trackEvent('sign_in_error', { method: 'google' });
        setError(mapFirebaseError(code, t));
      }
    } finally {
      setIsGoogleLoading(false);
    }
  };

  const handleEmailSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsEmailLoading(true);
    try {
      trackEvent('sign_in_click', { method: 'email' });
      await signInWithEmailAndPassword(auth, email, password);
      trackEvent('sign_in_success', { method: 'email' });
    } catch (err: unknown) {
      const code = (err as { code?: string }).code ?? '';
      trackEvent('sign_in_error', { method: 'email' });
      setError(mapFirebaseError(code, t));
    } finally {
      setIsEmailLoading(false);
    }
  };

  const handleEmailSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (password !== confirmPassword) {
      setError(t('signin.errorPasswordMismatch'));
      return;
    }
    setIsEmailLoading(true);
    try {
      trackEvent('sign_in_click', { method: 'email_signup' });
      await createUserWithEmailAndPassword(auth, email, password);
      trackEvent('sign_in_success', { method: 'email_signup' });
    } catch (err: unknown) {
      const code = (err as { code?: string }).code ?? '';
      trackEvent('sign_in_error', { method: 'email_signup' });
      setError(mapFirebaseError(code, t));
    } finally {
      setIsEmailLoading(false);
    }
  };

  const handlePasswordReset = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsEmailLoading(true);
    try {
      await sendPasswordResetEmail(auth, email);
      setSuccessMessage(t('signin.resetEmailSent'));
    } catch (err: unknown) {
      const code = (err as { code?: string }).code ?? '';
      setError(mapFirebaseError(code, t));
    } finally {
      setIsEmailLoading(false);
    }
  };

  const submitHandler =
    mode === 'signin'
      ? handleEmailSignIn
      : mode === 'signup'
        ? handleEmailSignUp
        : handlePasswordReset;

  const heading =
    mode === 'signup'
      ? t('signin.createAccountTitle')
      : mode === 'reset'
        ? t('signin.resetTitle')
        : t('signin.title');

  const subheading =
    mode === 'signup'
      ? t('signin.createAccountSubtitle')
      : mode === 'reset'
        ? t('signin.resetSubtitle')
        : t('signin.subtitle');

  const submitLabel = isEmailLoading
    ? t('signin.loading')
    : mode === 'signup'
      ? t('signin.createAccount')
      : mode === 'reset'
        ? t('signin.sendResetEmail')
        : t('signin.signInWithEmail');

  return (
    <LoginPageLayout
      logo={logo}
      appName={t('nav.appName')}
      appHref="https://factorysyncsolutions.com"
      backgroundImage="/fs-bg.png"
      imageClassName="object-right"
      footer={
        <>
          FactorySync Solutions &middot; @factorysyncsolutions &middot; {__APP_VERSION__}
        </>
      }
    >
      <div className="flex flex-col gap-6">
        <div className="flex flex-col items-center gap-2 text-center">
          <h1 className="text-2xl font-bold">{heading}</h1>
          <p className="text-balance text-sm text-muted-foreground">{subheading}</p>
        </div>

        <form onSubmit={submitHandler} className="flex flex-col gap-3">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="auth-email">{t('signin.emailLabel')}</Label>
            <Input
              id="auth-email"
              type="email"
              autoComplete="email"
              placeholder="you@company.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              disabled={isAnyLoading}
            />
          </div>

          {mode !== 'reset' && (
            <div className="flex flex-col gap-1.5">
              <div className="flex items-center justify-between">
                <Label htmlFor="auth-password">{t('signin.passwordLabel')}</Label>
                {mode === 'signin' && (
                  <button
                    type="button"
                    className="text-xs text-muted-foreground underline underline-offset-2 hover:text-primary"
                    onClick={() => switchMode('reset')}
                  >
                    {t('signin.forgotPassword')}
                  </button>
                )}
              </div>
              <div className="relative">
                <Input
                  id="auth-password"
                  type={showPassword ? 'text' : 'password'}
                  autoComplete={mode === 'signup' ? 'new-password' : 'current-password'}
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
                  aria-label={
                    showPassword ? t('signin.hidePassword') : t('signin.showPassword')
                  }
                >
                  {showPassword ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                </button>
              </div>
            </div>
          )}

          {mode === 'signup' && (
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="auth-confirm">{t('signin.confirmPasswordLabel')}</Label>
              <Input
                id="auth-confirm"
                type={showPassword ? 'text' : 'password'}
                autoComplete="new-password"
                placeholder="••••••••"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                required
                disabled={isAnyLoading}
              />
            </div>
          )}

          {error && <p className="text-sm text-destructive text-center">{error}</p>}
          {successMessage && (
            <p className="text-sm text-green-600 dark:text-green-400 text-center">
              {successMessage}
            </p>
          )}

          <Button type="submit" size="lg" className="w-full" disabled={isAnyLoading}>
            {submitLabel}
          </Button>
        </form>

        {mode === 'reset' ? (
          <p className="text-center text-sm text-muted-foreground">
            <button
              type="button"
              className="underline underline-offset-4 hover:text-primary"
              onClick={() => switchMode('signin')}
            >
              {t('signin.backToSignIn')}
            </button>
          </p>
        ) : (
          <>
            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <span className="w-full border-t" />
              </div>
              <div className="relative flex justify-center text-xs uppercase">
                <span className="bg-background px-2 text-muted-foreground">
                  {t('signin.orContinueWith')}
                </span>
              </div>
            </div>

            <GoogleSignInButton
              onClick={handleGoogleSignIn}
              disabled={isAnyLoading}
              data-testid="signin-google-btn"
            >
              {t('signin.signInWithGoogle')}
            </GoogleSignInButton>

            <p className="text-center text-sm text-muted-foreground">
              {mode === 'signup' ? t('signin.haveAccount') : t('signin.noAccount')}{' '}
              <button
                type="button"
                className="font-medium underline underline-offset-4 hover:text-primary"
                onClick={() => switchMode(mode === 'signup' ? 'signin' : 'signup')}
              >
                {mode === 'signup' ? t('signin.signInLink') : t('signin.signUpLink')}
              </button>
            </p>
          </>
        )}

        <p className="text-center text-xs text-balance text-muted-foreground [&_a]:underline [&_a]:underline-offset-4 hover:[&_a]:text-primary">
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
    </LoginPageLayout>
  );
}
