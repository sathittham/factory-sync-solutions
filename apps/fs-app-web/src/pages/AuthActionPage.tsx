import { buttonVariants } from '@/components/ui/button';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Field, FieldError, FieldGroup, FieldLabel } from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import { auth } from '@/lib/firebase';
import { useLocale } from '@/lib/i18n';
import { useForm } from '@tanstack/react-form';
import { confirmPasswordReset, signOut } from 'firebase/auth';
import { Loader2 } from 'lucide-react';
import { useState } from 'react';
import { Link, useSearchParams } from 'react-router';
import * as z from 'zod';

export function AuthActionPage() {
  const { t } = useLocale();
  const [searchParams] = useSearchParams();

  const mode = searchParams.get('mode');
  const oobCode = searchParams.get('oobCode');

  const [done, setDone] = useState(false);
  const [serverError, setServerError] = useState<string | null>(null);

  // Zod schema defined inside component so `t()` is in scope
  const passwordSchema = z.string().min(8, t('auth.setPassword.minLength')); // NOSONAR typescript:S2068

  // Read isSubmitting at component body level — required for TanStack Form v1 re-renders
  const form = useForm({
    defaultValues: { password: '', confirmPassword: '' }, // NOSONAR typescript:S2068
    onSubmit: async ({ value }) => {
      setServerError(null);
      try {
        // oobCode is guaranteed non-null here — form only renders when it is present
        await confirmPasswordReset(auth, oobCode as string, value.password); // NOSONAR typescript:S2068
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

  if (isInvalidRequest) {
    return (
      <div className="mx-auto mt-16 max-w-md px-4">
        <Card>
          <CardHeader>
            <h1 className="text-xl font-bold">{t('auth.setPassword.invalidLink')}</h1>
          </CardHeader>
          <CardContent>
            <Link to="/" className={buttonVariants({ variant: 'outline', className: 'w-full' })}>
              {t('auth.setPassword.goSignIn')}
            </Link>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (done) {
    return (
      <div className="mx-auto mt-16 max-w-md px-4">
        <Card>
          <CardHeader>
            <h1 className="text-xl font-bold">{t('auth.setPassword.title')}</h1>
          </CardHeader>
          <CardContent className="flex flex-col gap-4">
            <p className="text-base text-muted-foreground">{t('auth.setPassword.success')}</p>
            <Link to="/" className={buttonVariants({ className: 'w-full' })}>
              {t('auth.setPassword.goSignIn')}
            </Link>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="mx-auto mt-16 max-w-md px-4">
      <Card>
        <CardHeader className="flex flex-col gap-1">
          <h1 className="text-2xl font-bold">{t('auth.setPassword.title')}</h1>
          <p className="text-base text-muted-foreground">{t('auth.setPassword.subtitle')}</p>
        </CardHeader>
        <CardContent>
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
                name="password" // NOSONAR typescript:S2068
                validators={{ onBlur: passwordSchema, onSubmit: passwordSchema }}
              >
                {(field) => {
                  const isInvalid =
                    field.state.meta.isTouched && field.state.meta.errors.length > 0;
                  return (
                    <Field data-invalid={isInvalid}>
                      <FieldLabel htmlFor="auth-action-password">
                        {t('auth.setPassword.passwordLabel')}
                      </FieldLabel>
                      <Input
                        id="auth-action-password"
                        type="password" // NOSONAR typescript:S2068
                        autoComplete="new-password" // NOSONAR typescript:S2068
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
                  const isInvalid =
                    field.state.meta.isTouched && field.state.meta.errors.length > 0;
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
                        type="password" // NOSONAR typescript:S2068
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
              <p role="alert" className="text-sm text-destructive">
                {serverError}
              </p>
            )}

            <Button type="submit" className="w-full" disabled={isSubmitting}>
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
        </CardContent>
      </Card>
    </div>
  );
}
