import { SelectField } from '@/components/form/select-field';
import { Button } from '@/components/ui/button';
import { Field, FieldError, FieldGroup, FieldLabel } from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { ApiError, api } from '@/lib/api';
import { useLocale } from '@/lib/i18n';
import { useAppDispatch, useAppSelector } from '@/store';
import { type Profile, setProfile } from '@/store/authSlice';
import { useForm } from '@tanstack/react-form';
import { useState } from 'react';
import * as z from 'zod';

const industryKeys = [
  'manufacturing',
  'food',
  'automotive',
  'electronics',
  'textile',
  'chemical',
  'construction',
  'agriculture',
  'logistics',
  'energy',
  'pharma',
  'plastics',
  'printing',
  'metal',
  'wood',
  'other',
] as const;

const sizeKeys = ['small', 'medium', 'large'] as const;

export function ProfilePage() {
  const dispatch = useAppDispatch();
  const { profile } = useAppSelector((s) => s.auth);
  const { t } = useLocale();
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const companyNameSchema = z.string().min(1, t('register.companyNameError'));
  const industryTypeSchema = z.string().min(1, t('register.industryTypeError'));
  const companySizeSchema = z.string().min(1, t('register.companySizeError'));
  const contactNameSchema = z.string().min(1, t('register.contactNameError'));
  const contactEmailSchema = z
    .string()
    .min(1, t('register.contactEmailError'))
    .email(t('register.contactEmailError'));
  const contactPhoneSchema = z.string().min(9, t('register.contactPhoneError'));

  const form = useForm({
    defaultValues: {
      companyName: profile?.companyName || '',
      industryType: profile?.industryType || '',
      companySize: profile?.companySize || '',
      contactName: profile?.contactName || '',
      contactEmail: profile?.contactEmail || '',
      contactPhone: profile?.contactPhone || '',
      emailNotifications: profile?.emailNotifications ?? false,
    },
    onSubmit: async ({ value }) => {
      setError(null);
      setSuccess(false);
      try {
        const updated = await api.put<Profile>('/profile', value);
        dispatch(setProfile(updated));
        setSuccess(true);
        setTimeout(() => setSuccess(false), 3000);
      } catch (err) {
        if (err instanceof ApiError) {
          setError(err.message);
        } else {
          setError(t('profile.error'));
        }
      }
    },
  });

  return (
    <div className="min-h-[calc(100vh-3.5rem)] flex items-center justify-center p-4 sm:p-6">
      <div className="w-full max-w-lg animate-fade-up">
        <div className="bg-card rounded-lg border p-6 sm:p-8">
          <div className="flex items-start gap-3 mb-6">
            <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" className="text-primary">
                <circle cx="12" cy="8" r="4" stroke="currentColor" strokeWidth="1.5" />
                <path
                  d="M5 20c0-3.5 3-6 7-6s7 2.5 7 6"
                  stroke="currentColor"
                  strokeWidth="1.5"
                  strokeLinecap="round"
                />
              </svg>
            </div>
            <div>
              <h1 className="text-xl font-bold">{t('profile.title')}</h1>
              <p className="text-sm text-muted-foreground mt-0.5">{t('profile.subtitle')}</p>
            </div>
          </div>

          <div className="rounded-md border bg-muted/30 p-4 mb-6 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-muted-foreground">
                {t('profile.email')}
              </span>
              <span className="text-sm font-mono text-foreground/70">{profile?.email}</span>
            </div>
            <div className="h-px bg-border" />
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-muted-foreground">
                {t('profile.regId')}
              </span>
              <span className="text-sm font-mono text-foreground/70 tracking-wide">
                {profile?.companyRegId}
              </span>
            </div>
          </div>

          <form
            onSubmit={(e) => {
              e.preventDefault();
              e.stopPropagation();
              form.handleSubmit();
            }}
            className="space-y-4"
          >
            <FieldGroup className="gap-4">
              <form.Field
                name="companyName"
                validators={{ onBlur: companyNameSchema, onSubmit: companyNameSchema }}
              >
                {(field) => {
                  const isInvalid =
                    field.state.meta.isTouched && field.state.meta.errors.length > 0;
                  return (
                    <Field data-invalid={isInvalid}>
                      <FieldLabel htmlFor={field.name}>{t('register.companyName')}</FieldLabel>
                      <Input
                        id={field.name}
                        value={field.state.value}
                        onBlur={field.handleBlur}
                        onChange={(e) => field.handleChange(e.target.value)}
                        aria-invalid={isInvalid}
                      />
                      {isInvalid && <FieldError errors={field.state.meta.errors} />}
                    </Field>
                  );
                }}
              </form.Field>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <form.Field
                  name="industryType"
                  validators={{ onBlur: industryTypeSchema, onSubmit: industryTypeSchema }}
                >
                  {(field) => {
                    const isInvalid =
                      field.state.meta.isTouched && field.state.meta.errors.length > 0;
                    return (
                      <Field data-invalid={isInvalid}>
                        <FieldLabel htmlFor={field.name}>{t('register.industryType')}</FieldLabel>
                        <SelectField
                          id={field.name}
                          value={field.state.value}
                          placeholder={t('register.select')}
                          options={industryKeys.map((key) => ({
                            value: key,
                            label: t(`industry.${key}`),
                          }))}
                          onValueChange={(val) => field.handleChange(val)}
                          onBlur={field.handleBlur}
                          isInvalid={isInvalid}
                        />
                        {isInvalid && <FieldError errors={field.state.meta.errors} />}
                      </Field>
                    );
                  }}
                </form.Field>

                <form.Field
                  name="companySize"
                  validators={{ onBlur: companySizeSchema, onSubmit: companySizeSchema }}
                >
                  {(field) => {
                    const isInvalid =
                      field.state.meta.isTouched && field.state.meta.errors.length > 0;
                    return (
                      <Field data-invalid={isInvalid}>
                        <FieldLabel htmlFor={field.name}>{t('register.companySize')}</FieldLabel>
                        <SelectField
                          id={field.name}
                          value={field.state.value}
                          placeholder={t('register.select')}
                          options={sizeKeys.map((key) => ({
                            value: key,
                            label: t(`size.${key}`),
                          }))}
                          onValueChange={(val) => field.handleChange(val)}
                          onBlur={field.handleBlur}
                          isInvalid={isInvalid}
                        />
                        {isInvalid && <FieldError errors={field.state.meta.errors} />}
                      </Field>
                    );
                  }}
                </form.Field>
              </div>

              <div className="flex items-center gap-3 pt-1">
                <span className="h-px flex-1 bg-border" />
                <p className="text-xs font-medium text-muted-foreground">
                  {t('profile.contactSection')}
                </p>
                <span className="h-px flex-1 bg-border" />
              </div>

              <form.Field
                name="contactName"
                validators={{ onBlur: contactNameSchema, onSubmit: contactNameSchema }}
              >
                {(field) => {
                  const isInvalid =
                    field.state.meta.isTouched && field.state.meta.errors.length > 0;
                  return (
                    <Field data-invalid={isInvalid}>
                      <FieldLabel htmlFor={field.name}>{t('register.contactName')}</FieldLabel>
                      <Input
                        id={field.name}
                        value={field.state.value}
                        onBlur={field.handleBlur}
                        onChange={(e) => field.handleChange(e.target.value)}
                        aria-invalid={isInvalid}
                      />
                      {isInvalid && <FieldError errors={field.state.meta.errors} />}
                    </Field>
                  );
                }}
              </form.Field>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <form.Field
                  name="contactEmail"
                  validators={{ onBlur: contactEmailSchema, onSubmit: contactEmailSchema }}
                >
                  {(field) => {
                    const isInvalid =
                      field.state.meta.isTouched && field.state.meta.errors.length > 0;
                    return (
                      <Field data-invalid={isInvalid}>
                        <FieldLabel htmlFor={field.name}>{t('register.contactEmail')}</FieldLabel>
                        <Input
                          id={field.name}
                          type="email"
                          value={field.state.value}
                          onBlur={field.handleBlur}
                          onChange={(e) => field.handleChange(e.target.value)}
                          aria-invalid={isInvalid}
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
                    const isInvalid =
                      field.state.meta.isTouched && field.state.meta.errors.length > 0;
                    return (
                      <Field data-invalid={isInvalid}>
                        <FieldLabel htmlFor={field.name}>{t('register.contactPhone')}</FieldLabel>
                        <Input
                          id={field.name}
                          value={field.state.value}
                          onBlur={field.handleBlur}
                          onChange={(e) => field.handleChange(e.target.value)}
                          aria-invalid={isInvalid}
                        />
                        {isInvalid && <FieldError errors={field.state.meta.errors} />}
                      </Field>
                    );
                  }}
                </form.Field>
              </div>

              <div className="flex items-center gap-3 pt-1">
                <span className="h-px flex-1 bg-border" />
                <p className="text-xs font-medium text-muted-foreground">
                  {t('profile.preferencesSection')}
                </p>
                <span className="h-px flex-1 bg-border" />
              </div>

              <form.Field name="emailNotifications">
                {(field) => (
                  <div className="flex items-center justify-between gap-4 rounded-md border bg-muted/30 p-4">
                    <div className="space-y-0.5">
                      <Label htmlFor={field.name} className="text-sm font-medium cursor-pointer">
                        {t('profile.emailNotifications')}
                      </Label>
                      <p className="text-xs text-muted-foreground">
                        {t('profile.emailNotificationsDesc')}
                      </p>
                    </div>
                    <Switch
                      id={field.name}
                      checked={field.state.value}
                      onCheckedChange={(val) => field.handleChange(val)}
                    />
                  </div>
                )}
              </form.Field>
            </FieldGroup>

            {error && (
              <div className="p-3 rounded-md bg-destructive/10 text-destructive text-sm text-center animate-scale-in">
                {error}
              </div>
            )}

            {success && (
              <div className="p-3 rounded-md bg-emerald-50 text-emerald-700 border border-emerald-200 text-sm text-center animate-scale-in">
                <span className="inline-flex items-center gap-1.5">
                  <svg
                    width="14"
                    height="14"
                    viewBox="0 0 24 24"
                    fill="none"
                    className="text-emerald-500"
                  >
                    <path
                      d="M5 13l4 4L19 7"
                      stroke="currentColor"
                      strokeWidth="2.5"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                  {t('profile.saved')}
                </span>
              </div>
            )}

            <Button
              type="submit"
              className="w-full h-11 font-semibold"
              disabled={form.state.isSubmitting || !form.state.isDirty}
            >
              {form.state.isSubmitting ? (
                <>
                  <svg className="animate-spin h-4 w-4 mr-2" viewBox="0 0 24 24" fill="none">
                    <circle
                      className="opacity-25"
                      cx="12"
                      cy="12"
                      r="10"
                      stroke="currentColor"
                      strokeWidth="4"
                    />
                    <path
                      className="opacity-75"
                      fill="currentColor"
                      d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
                    />
                  </svg>
                  {t('profile.saving')}
                </>
              ) : (
                t('profile.save')
              )}
            </Button>
          </form>
        </div>
      </div>
    </div>
  );
}
