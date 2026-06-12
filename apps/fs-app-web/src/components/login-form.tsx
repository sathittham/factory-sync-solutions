import { Button } from '@/components/ui/button';
import { Field, FieldError, FieldGroup, FieldLabel } from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import { trackEvent } from '@/lib/analytics';
import { auth, googleProvider } from '@/lib/firebase';
import { useLocale } from '@/lib/i18n';
import { useTheme } from '@/lib/theme';
import { useForm } from '@tanstack/react-form';
import fsDarkLogo from '@shared/brand/fs-dark.png';
import fsLightLogo from '@shared/brand/fs-light.png';
import { mapFirebaseError } from '@shared/lib/firebaseErrors';
import { GoogleSignInButton } from '@shared/ui/GoogleSignInButton';
import { LoginPageLayout } from '@shared/ui/LoginPageLayout';
import { sendPasswordResetEmail, signInWithEmailAndPassword, signInWithPopup } from 'firebase/auth';
import { Eye, EyeOff } from 'lucide-react';
import { useState } from 'react';
import * as z from 'zod';

const OFFICIAL_WEB_URL = import.meta.env.VITE_OFFICIAL_WEB_URL ?? '';

type Mode = 'signin' | 'reset';

export function LoginForm() {
  const { t } = useLocale();
  const { resolvedTheme } = useTheme();
  const logo = resolvedTheme === 'dark' ? fsDarkLogo : fsLightLogo;

  const [mode, setMode] = useState<Mode>('signin');
  const [showPassword, setShowPassword] = useState(false);
  const [isGoogleLoading, setIsGoogleLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const emailSchema = z
    .string()
    .min(1, t('signin.errorEmailRequired'))
    .email(t('signin.errorInvalidEmail'));

  const passwordSchema = z.string().min(1, t('signin.errorPasswordRequired'));

  const form = useForm({
    defaultValues: { email: '', password: '' },
    onSubmit: async ({ value }) => {
      setError(null);
      try {
        if (mode === 'signin') {
          trackEvent('sign_in_click', { method: 'email' });
          await signInWithEmailAndPassword(auth, value.email, value.password);
          trackEvent('sign_in_success', { method: 'email' });
        } else {
          await sendPasswordResetEmail(auth, value.email);
          setSuccessMessage(t('signin.resetEmailSent'));
        }
      } catch (err: unknown) {
        const code = (err as { code?: string }).code ?? '';
        if (mode === 'signin') trackEvent('sign_in_error', { method: 'email' });
        setError(mapFirebaseError(code, t));
      }
    },
  });

  const isAnyLoading = form.state.isSubmitting || isGoogleLoading;

  const switchMode = (next: Mode) => {
    form.reset();
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

  const heading = mode === 'reset' ? t('signin.resetTitle') : t('signin.title');
  const subheading = mode === 'reset' ? t('signin.resetSubtitle') : t('signin.subtitle');
  const idleLabel = mode === 'reset' ? t('signin.sendResetEmail') : t('signin.signInWithEmail');
  const submitLabel = form.state.isSubmitting ? t('signin.loading') : idleLabel;

  return (
    <LoginPageLayout
      logo={logo}
      appName={t('nav.appName')}
      appHref="https://factorysyncsolutions.com"
      backgroundImage="/fs-bg.png"
      imageClassName="object-right"
      footer={<>FactorySync Solutions &middot; @factorysyncsolutions &middot; {__APP_VERSION__}</>}
    >
      <div className="flex flex-col gap-6">
        <div className="flex flex-col items-center gap-2 text-center">
          <h1 className="text-2xl font-bold">{heading}</h1>
          <p className="text-balance text-sm text-muted-foreground">{subheading}</p>
        </div>

        <form
          onSubmit={(e) => {
            e.preventDefault();
            e.stopPropagation();
            form.handleSubmit();
          }}
          className="flex flex-col gap-3"
        >
          <FieldGroup>
            <form.Field
              name="email"
              validators={{ onBlur: emailSchema, onSubmit: emailSchema }}
            >
              {(field) => {
                const isInvalid = field.state.meta.isTouched && field.state.meta.errors.length > 0;
                return (
                  <Field data-invalid={isInvalid}>
                    <FieldLabel htmlFor="auth-email">{t('signin.emailLabel')}</FieldLabel>
                    <Input
                      id="auth-email"
                      type="email"
                      autoComplete="email"
                      placeholder="you@company.com"
                      value={field.state.value}
                      onBlur={field.handleBlur}
                      onChange={(e) => field.handleChange(e.target.value)}
                      aria-invalid={isInvalid}
                      disabled={isAnyLoading}
                    />
                    {isInvalid && <FieldError errors={field.state.meta.errors} />}
                  </Field>
                );
              }}
            </form.Field>

            {mode !== 'reset' && (
              <form.Field
                name="password"
                validators={{ onBlur: passwordSchema, onSubmit: passwordSchema }}
              >
                {(field) => {
                  const isInvalid =
                    field.state.meta.isTouched && field.state.meta.errors.length > 0;
                  return (
                    <Field data-invalid={isInvalid}>
                      <div className="flex items-center justify-between">
                        <FieldLabel htmlFor="auth-password">
                          {t('signin.passwordLabel')}
                        </FieldLabel>
                        <button
                          type="button"
                          className="text-xs text-muted-foreground underline underline-offset-2 hover:text-primary"
                          onClick={() => switchMode('reset')}
                        >
                          {t('signin.forgotPassword')}
                        </button>
                      </div>
                      <div className="relative">
                        <Input
                          id="auth-password"
                          type={showPassword ? 'text' : 'password'}
                          autoComplete="current-password"
                          placeholder="••••••••"
                          value={field.state.value}
                          onBlur={field.handleBlur}
                          onChange={(e) => field.handleChange(e.target.value)}
                          aria-invalid={isInvalid}
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
                          {showPassword ? (
                            <EyeOff className="size-4" />
                          ) : (
                            <Eye className="size-4" />
                          )}
                        </button>
                      </div>
                      {isInvalid && <FieldError errors={field.state.meta.errors} />}
                    </Field>
                  );
                }}
              </form.Field>
            )}
          </FieldGroup>

          {error && <p className="text-center text-sm text-destructive">{error}</p>}
          {successMessage && (
            <p className="text-center text-sm text-green-600 dark:text-green-400">
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
              {t('signin.noAccount')}{' '}
              <a
                href={`${OFFICIAL_WEB_URL}/register`}
                className="font-medium underline underline-offset-4 hover:text-primary"
              >
                {t('signin.signUpLink')}
              </a>
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
