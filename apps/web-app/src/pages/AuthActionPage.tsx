import { Button, buttonVariants } from '@/components/ui/button';
import { Field, FieldError, FieldGroup, FieldLabel } from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import { api } from '@/lib/api';
import { auth } from '@/lib/firebase';
import { useLocale } from '@/lib/i18n';
import { useTheme } from '@/lib/theme';
import fsDarkLogo from '@shared/brand/fs-dark.png';
import fsLightLogo from '@shared/brand/fs-light.png';
import { getOfficialWebUrl } from '@shared/lib/officialSite';
import { LoginPageLayout } from '@shared/ui/LoginPageLayout';
import { useForm } from '@tanstack/react-form';
import { Link, useSearch } from '@tanstack/react-router';
import {
  confirmPasswordReset,
  signInWithEmailAndPassword,
  signOut,
  updateProfile,
  verifyPasswordResetCode,
} from 'firebase/auth';
import { AlertTriangle, CheckCircle2, Eye, EyeOff, Loader2, ShieldCheck } from 'lucide-react';
import type { ReactNode } from 'react';
import { useState } from 'react';
import * as z from 'zod';

export function AuthActionPage() {
  const { t } = useLocale();
  const { resolvedTheme } = useTheme();
  const { mode, oobCode } = useSearch({ strict: false });

  const [done, setDone] = useState(false);
  const [serverError, setServerError] = useState<string | null>(null);
  const [showPassword, setShowPassword] = useState(false);

  const logo = resolvedTheme === 'dark' ? fsDarkLogo : fsLightLogo;
  const officialWebUrl = getOfficialWebUrl(import.meta.env.VITE_OFFICIAL_WEB_URL, {
    isDevelopment: import.meta.env.DEV,
  });

  // Zod schema defined inside component so `t()` is in scope
  const contactNameSchema = z.string().min(2, t('register.contactNameError')).max(100);
  const contactPhoneSchema = z.string().min(9, t('register.contactPhoneError')).max(30);
  const passwordSchema = z.string().min(8, t('auth.setPassword.minLength')); // NOSONAR typescript:S2068

  // Read isSubmitting at component body level — required for TanStack Form v1 re-renders
  const form = useForm({
    defaultValues: { contactName: '', contactPhone: '', password: '', confirmPassword: '' }, // NOSONAR typescript:S2068
    onSubmit: async ({ value }) => {
      setServerError(null);
      try {
        // oobCode is guaranteed non-null here — form only renders when it is present
        const email = await verifyPasswordResetCode(auth, oobCode as string);
        await confirmPasswordReset(auth, oobCode as string, value.password); // NOSONAR typescript:S2068
        const credential = await signInWithEmailAndPassword(auth, email, value.password);
        await updateProfile(credential.user, { displayName: value.contactName });
        await api.post('/invitations/accept', {
          contactName: value.contactName,
          contactPhone: value.contactPhone,
        });
        await signOut(auth);
        setDone(true);
      } catch (err: unknown) {
        const code = (err as { code?: string }).code ?? '';
        if (code === 'auth/expired-action-code') {
          setServerError(t('auth.setPassword.expiredLink'));
        } else if (code === 'auth/invalid-action-code') {
          setServerError(t('auth.setPassword.invalidLink'));
        } else {
          setServerError(t('auth.setPassword.genericError'));
        }
      }
    },
  });

  const isSubmitting = form.state.isSubmitting;

  // Invalid / missing oobCode or unrecognised mode — show error card
  const isInvalidRequest = !oobCode || mode !== 'resetPassword';

  const page = (children: ReactNode) => (
    <LoginPageLayout
      logo={logo}
      appName={t('nav.appName')}
      appHref={officialWebUrl}
      backgroundImage="/fs-bg.png"
      imageClassName="object-right"
      footer={
        <>
          {t('auth.setPassword.footer')} &middot; {__APP_VERSION__}
        </>
      }
    >
      {children}
    </LoginPageLayout>
  );

  if (isInvalidRequest) {
    return page(
      <div className="flex flex-col gap-6 text-center">
        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-md border bg-destructive/10 text-destructive">
          <AlertTriangle className="size-7" aria-hidden="true" />
        </div>
        <div className="space-y-2">
          <p className="text-sm font-semibold uppercase tracking-wide text-destructive">
            {t('auth.setPassword.linkProblem')}
          </p>
          <h1 className="text-2xl font-bold">{t('auth.setPassword.invalidLink')}</h1>
          <p className="text-balance text-sm text-muted-foreground">
            {t('auth.setPassword.invalidHelp')}
          </p>
        </div>
        <Link
          to="/"
          className={buttonVariants({ size: 'lg', variant: 'outline', className: 'w-full' })}
        >
          {t('auth.setPassword.goSignIn')}
        </Link>
      </div>,
    );
  }

  if (done) {
    return page(
      <div className="flex flex-col gap-6 text-center">
        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-md bg-emerald-600 text-white shadow-sm">
          <CheckCircle2 className="size-8" aria-hidden="true" />
        </div>
        <div className="space-y-2">
          <p className="text-sm font-semibold uppercase tracking-wide text-emerald-600 dark:text-emerald-400">
            {t('auth.setPassword.ready')}
          </p>
          <h1 className="text-2xl font-bold">{t('auth.setPassword.successTitle')}</h1>
          <p className="text-balance text-sm text-muted-foreground">
            {t('auth.setPassword.success')}
          </p>
        </div>
        <Link to="/" className={buttonVariants({ size: 'lg', className: 'w-full' })}>
          {t('auth.setPassword.goSignIn')}
        </Link>
      </div>,
    );
  }

  return page(
    <div className="flex flex-col gap-6">
      <div className="flex flex-col items-center gap-3 text-center">
        <div className="flex h-12 w-12 items-center justify-center rounded-md border bg-primary/10 text-primary">
          <ShieldCheck className="size-6" aria-hidden="true" />
        </div>
        <div className="space-y-2">
          <p className="text-sm font-semibold uppercase tracking-wide text-primary">
            {t('auth.setPassword.kicker')}
          </p>
          <h1 className="text-2xl font-bold">{t('auth.setPassword.title')}</h1>
          <p className="text-balance text-sm text-muted-foreground">
            {t('auth.setPassword.subtitle')}
          </p>
        </div>
      </div>

      <form
        onSubmit={(e) => {
          e.preventDefault();
          e.stopPropagation();
          form.handleSubmit();
        }}
        className="flex flex-col gap-4"
      >
        <FieldGroup>
          <form.Field
            name="contactName"
            validators={{ onBlur: contactNameSchema, onSubmit: contactNameSchema }}
          >
            {(field) => {
              const isInvalid = field.state.meta.isTouched && field.state.meta.errors.length > 0;
              return (
                <Field data-invalid={isInvalid}>
                  <FieldLabel htmlFor="auth-action-contact-name">
                    {t('register.contactName')}
                  </FieldLabel>
                  <Input
                    id="auth-action-contact-name"
                    autoComplete="name"
                    value={field.state.value}
                    onBlur={field.handleBlur}
                    onChange={(e) => field.handleChange(e.target.value)}
                    aria-invalid={isInvalid}
                    disabled={isSubmitting}
                  />
                  {isInvalid && <FieldError errors={field.state.meta.errors} />}
                </Field>
              );
            }}
          </form.Field>

          <form.Field
            name="contactPhone"
            validators={{ onBlur: contactPhoneSchema, onSubmit: contactPhoneSchema }}
          >
            {(field) => {
              const isInvalid = field.state.meta.isTouched && field.state.meta.errors.length > 0;
              return (
                <Field data-invalid={isInvalid}>
                  <FieldLabel htmlFor="auth-action-contact-phone">
                    {t('register.contactPhone')}
                  </FieldLabel>
                  <Input
                    id="auth-action-contact-phone"
                    type="tel"
                    autoComplete="tel"
                    value={field.state.value}
                    onBlur={field.handleBlur}
                    onChange={(e) => field.handleChange(e.target.value)}
                    aria-invalid={isInvalid}
                    disabled={isSubmitting}
                  />
                  {isInvalid && <FieldError errors={field.state.meta.errors} />}
                </Field>
              );
            }}
          </form.Field>

          <form.Field
            name="password" // NOSONAR typescript:S2068
            validators={{ onBlur: passwordSchema, onSubmit: passwordSchema }}
          >
            {(field) => {
              const isInvalid = field.state.meta.isTouched && field.state.meta.errors.length > 0;
              return (
                <Field data-invalid={isInvalid}>
                  <FieldLabel htmlFor="auth-action-password">
                    {t('auth.setPassword.passwordLabel')}
                  </FieldLabel>
                  <div className="relative">
                    <Input
                      id="auth-action-password"
                      type={showPassword ? 'text' : 'password'} // NOSONAR typescript:S2068
                      autoComplete="new-password" // NOSONAR typescript:S2068
                      value={field.state.value}
                      onBlur={field.handleBlur}
                      onChange={(e) => field.handleChange(e.target.value)}
                      aria-invalid={isInvalid}
                      disabled={isSubmitting}
                      className="pr-10"
                    />
                    <button
                      type="button"
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                      onClick={() => setShowPassword((value) => !value)}
                      aria-label={
                        showPassword
                          ? t('auth.setPassword.hidePassword')
                          : t('auth.setPassword.showPassword')
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

          <form.Field
            name="confirmPassword" // NOSONAR typescript:S2068
            validators={{
              onBlur: ({ value, fieldApi }) => {
                const pw = fieldApi.form.getFieldValue('password'); // NOSONAR typescript:S2068
                const result = z
                  .string()
                  .refine((v) => v === pw, t('auth.setPassword.passwordMismatch')) // NOSONAR typescript:S2068
                  .safeParse(value);
                return result.success ? undefined : result.error.issues[0]?.message;
              },
              onSubmit: ({ value, fieldApi }) => {
                const pw = fieldApi.form.getFieldValue('password'); // NOSONAR typescript:S2068
                const result = z
                  .string()
                  .refine((v) => v === pw, t('auth.setPassword.passwordMismatch')) // NOSONAR typescript:S2068
                  .safeParse(value);
                return result.success ? undefined : result.error.issues[0]?.message;
              },
            }}
          >
            {(field) => {
              const isInvalid = field.state.meta.isTouched && field.state.meta.errors.length > 0;
              // Custom validators return string | undefined; wrap into { message } shape for FieldError
              const errors = field.state.meta.errors.map((e) =>
                typeof e === 'string' ? { message: e } : e,
              );
              return (
                <Field data-invalid={isInvalid}>
                  <FieldLabel htmlFor="auth-action-confirm">
                    {t('auth.setPassword.confirmLabel')}
                  </FieldLabel>
                  <Input
                    id="auth-action-confirm"
                    type={showPassword ? 'text' : 'password'} // NOSONAR typescript:S2068
                    autoComplete="new-password" // NOSONAR typescript:S2068
                    value={field.state.value}
                    onBlur={field.handleBlur}
                    onChange={(e) => field.handleChange(e.target.value)}
                    aria-invalid={isInvalid}
                    disabled={isSubmitting}
                  />
                  {isInvalid && <FieldError errors={errors} />}
                </Field>
              );
            }}
          </form.Field>
        </FieldGroup>

        {serverError && (
          <p
            role="alert"
            className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive"
          >
            {serverError}
          </p>
        )}

        <Button type="submit" size="lg" className="w-full" disabled={isSubmitting}>
          {isSubmitting ? (
            <>
              <Loader2 className="mr-2 size-4 animate-spin" aria-hidden="true" />
              {t('auth.setPassword.submit')}
            </>
          ) : (
            t('auth.setPassword.submit')
          )}
        </Button>
      </form>

      <p className="text-center text-xs text-balance text-muted-foreground">
        {t('auth.setPassword.securityNote')}
      </p>
    </div>,
  );
}
