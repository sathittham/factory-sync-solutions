import { Button } from '@/components/ui/button';
import { Field, FieldError, FieldGroup, FieldLabel } from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import { trackEvent } from '@/lib/analytics';
import { auth, googleProvider } from '@/lib/firebase';
import { useLocale } from '@/lib/i18n';
import { useTheme } from '@/lib/theme';
import fsDarkLogo from '@shared/brand/fs-dark.png';
import fsLightLogo from '@shared/brand/fs-light.png';
import { mapFirebaseError } from '@shared/lib/firebaseErrors';
import { getOfficialWebUrl } from '@shared/lib/officialSite';
import { GoogleSignInButton } from '@shared/ui/GoogleSignInButton';
import { LoginPageLayout } from '@shared/ui/LoginPageLayout';
import { useForm } from '@tanstack/react-form';
import {
  createUserWithEmailAndPassword,
  sendPasswordResetEmail,
  signInWithEmailAndPassword,
  signInWithPopup,
} from 'firebase/auth';
import { Eye, EyeOff } from 'lucide-react';
import type { ReactNode } from 'react';
import { useState } from 'react';
import { Link } from 'react-router';
import * as z from 'zod';

type Mode = 'signin' | 'signup' | 'reset';

interface LoginFormProps {
  initialMode?: Mode;
  topContent?: ReactNode;
  frame?: 'page' | 'content';
  hideHeader?: boolean;
  signInHref?: string;
  signUpHref?: string;
}

function ModeSwitch({
  mode,
  signInHref,
  signUpHref,
  switchMode,
  t,
}: Readonly<{
  mode: Mode;
  signInHref?: string;
  signUpHref?: string;
  switchMode: (next: Mode) => void;
  t: (key: string) => string;
}>) {
  if (mode === 'signup' && signInHref) {
    return (
      <Link to={signInHref} className="font-medium underline underline-offset-4 hover:text-primary">
        {t('signin.signInLink')}
      </Link>
    );
  }

  if (mode === 'signin' && signUpHref) {
    return (
      <Link to={signUpHref} className="font-medium underline underline-offset-4 hover:text-primary">
        {t('signin.signUpLink')}
      </Link>
    );
  }

  return (
    <button
      type="button"
      className="font-medium underline underline-offset-4 hover:text-primary"
      onClick={() => switchMode(mode === 'signup' ? 'signin' : 'signup')}
    >
      {mode === 'signup' ? t('signin.signInLink') : t('signin.signUpLink')}
    </button>
  );
}

export function LoginForm({
  initialMode = 'signin',
  topContent,
  frame = 'page',
  hideHeader = false,
  signInHref,
  signUpHref,
}: Readonly<LoginFormProps>) {
  const { t } = useLocale();
  const { resolvedTheme } = useTheme();
  const logo = resolvedTheme === 'dark' ? fsDarkLogo : fsLightLogo;
  const officialWebUrl = getOfficialWebUrl(import.meta.env.VITE_OFFICIAL_WEB_URL, {
    isDevelopment: import.meta.env.DEV,
  });

  const [mode, setMode] = useState<Mode>(initialMode);
  const [showPassword, setShowPassword] = useState(false);
  const [isGoogleLoading, setIsGoogleLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const emailSchema = z
    .string()
    .min(1, t('signin.errorEmailRequired'))
    .email(t('signin.errorInvalidEmail'));

  const passwordSchema = z.string().min(1, t('signin.errorPasswordRequired'));
  const confirmPasswordSchema = z.string().min(1, t('signin.errorPasswordRequired'));

  const form = useForm({
    defaultValues: { email: '', password: '', confirmPassword: '' },
    onSubmit: async ({ value }) => {
      setError(null);
      try {
        if (mode === 'signup') {
          if (value.password !== value.confirmPassword) {
            setError(t('signin.errorPasswordMismatch'));
            return;
          }
          trackEvent('sign_up_click', { method: 'email' });
          await createUserWithEmailAndPassword(auth, value.email, value.password);
          trackEvent('sign_up_success', { method: 'email' });
          // useAuth detects the new user → RegisterGuard routes to /register automatically
        } else if (mode === 'signin') {
          trackEvent('sign_in_click', { method: 'email' });
          await signInWithEmailAndPassword(auth, value.email, value.password);
          trackEvent('sign_in_success', { method: 'email' });
        } else {
          await sendPasswordResetEmail(auth, value.email);
          setSuccessMessage(t('signin.resetEmailSent'));
        }
      } catch (err: unknown) {
        const code = (err as { code?: string }).code ?? '';
        if (mode === 'signup') trackEvent('sign_up_error', { method: 'email' });
        else if (mode === 'signin') trackEvent('sign_in_error', { method: 'email' });
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

  const modeConfig = {
    signin: {
      heading: t('signin.title'),
      subheading: t('signin.subtitle'),
      idleLabel: t('signin.signInWithEmail'),
    },
    signup: {
      heading: t('signin.createAccountTitle'),
      subheading: t('signin.createAccountSubtitle'),
      idleLabel: t('signin.createAccount'),
    },
    reset: {
      heading: t('signin.resetTitle'),
      subheading: t('signin.resetSubtitle'),
      idleLabel: t('signin.sendResetEmail'),
    },
  };
  const { heading, subheading, idleLabel } = modeConfig[mode];
  const submitLabel = form.state.isSubmitting ? t('signin.loading') : idleLabel;

  const content = (
    <div className="flex flex-col gap-6">
      {topContent}

      {!hideHeader && (
        <div className="flex flex-col items-center gap-2 text-center">
          <h1 className="text-2xl font-bold">{heading}</h1>
          <p className="text-balance text-sm text-muted-foreground">{subheading}</p>
        </div>
      )}

      <form
        onSubmit={(e) => {
          e.preventDefault();
          e.stopPropagation();
          form.handleSubmit();
        }}
        className="flex flex-col gap-3"
      >
        <FieldGroup>
          <form.Field name="email" validators={{ onBlur: emailSchema, onSubmit: emailSchema }}>
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
                const isInvalid = field.state.meta.isTouched && field.state.meta.errors.length > 0;
                return (
                  <Field data-invalid={isInvalid}>
                    <div className="flex items-center justify-between">
                      <FieldLabel htmlFor="auth-password">{t('signin.passwordLabel')}</FieldLabel>
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
                        {showPassword ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                      </button>
                    </div>
                    {isInvalid && <FieldError errors={field.state.meta.errors} />}
                  </Field>
                );
              }}
            </form.Field>
          )}

          {mode === 'signup' && (
            <form.Field
              name="confirmPassword"
              validators={{ onBlur: confirmPasswordSchema, onSubmit: confirmPasswordSchema }}
            >
              {(field) => {
                const isInvalid = field.state.meta.isTouched && field.state.meta.errors.length > 0;
                return (
                  <Field data-invalid={isInvalid}>
                    <FieldLabel htmlFor="auth-confirm">
                      {t('signin.confirmPasswordLabel')}
                    </FieldLabel>
                    <Input
                      id="auth-confirm"
                      type={showPassword ? 'text' : 'password'}
                      autoComplete="new-password"
                      placeholder="••••••••"
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
          )}
        </FieldGroup>

        {error && <p className="text-center text-sm text-destructive">{error}</p>}
        {successMessage && (
          <p className="text-center text-sm text-green-600 dark:text-green-400">{successMessage}</p>
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
            <ModeSwitch
              mode={mode}
              signInHref={signInHref}
              signUpHref={signUpHref}
              switchMode={switchMode}
              t={t}
            />
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
  );

  if (frame === 'content') return content;

  return (
    <LoginPageLayout
      logo={logo}
      appName={t('nav.appName')}
      appHref={officialWebUrl}
      backgroundImage="/fs-bg.png"
      imageClassName="object-right"
      footer={<>FactorySync Solutions &middot; @factorysyncsolutions &middot; {__APP_VERSION__}</>}
    >
      {content}
    </LoginPageLayout>
  );
}
