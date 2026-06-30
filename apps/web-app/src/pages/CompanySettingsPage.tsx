import { PageHeader, PageLayout } from '@/components/PageLayout';
import { SelectField } from '@/components/form/select-field';
import { Button } from '@/components/ui/button';
import { Field, FieldError, FieldGroup, FieldLabel } from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Skeleton } from '@/components/ui/skeleton';
import { Switch } from '@/components/ui/switch';
import { trackEvent } from '@/lib/analytics';
import { ApiError, api } from '@/lib/api';
import { useLocale } from '@/lib/i18n';
import { useAppDispatch, useAppSelector } from '@/store';
import { type Profile, setProfile } from '@/store/authSlice';
import { useForm } from '@tanstack/react-form';
import { useEffect, useState } from 'react';
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

function SpinnerIcon() {
  return (
    <svg className="animate-spin h-4 w-4 mr-2" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
      <path
        className="opacity-75"
        fill="currentColor"
        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
      />
    </svg>
  );
}

export function CompanySettingsPage() {
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
      trackEvent('company_settings_save', {
        industry: value.industryType,
        size: value.companySize,
      });
      try {
        const updated = await api.put<Profile>('/profile', value);
        dispatch(setProfile(updated));
        setSuccess(true);
        trackEvent('company_settings_save_success', {
          industry: value.industryType,
          size: value.companySize,
        });
        setTimeout(() => setSuccess(false), 3000);
      } catch (err) {
        const msg = err instanceof ApiError ? err.message : t('companySettings.error');
        setError(msg);
        trackEvent('company_settings_save_error', {
          error: err instanceof ApiError ? err.message : 'unknown',
        });
      }
    },
  });

  useEffect(() => {
    if (profile) {
      form.reset({
        companyName: profile.companyName || '',
        industryType: profile.industryType || '',
        companySize: profile.companySize || '',
        contactName: profile.contactName || '',
        contactEmail: profile.contactEmail || '',
        contactPhone: profile.contactPhone || '',
        emailNotifications: profile.emailNotifications ?? false,
      });
      setError(null);
      setSuccess(false);
    }
  }, [profile, form]);

  if (!profile) {
    return (
      <PageLayout fluid>
        <PageHeader
          title={t('companySettings.title')}
          description={t('companySettings.subtitle')}
        />
        <div className="bg-card border rounded-lg p-6 space-y-6">
          <Skeleton className="h-10 w-full" />
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-10 w-full" />
          </div>
          <Skeleton className="h-10 w-full" />
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-10 w-full" />
          </div>
          <Skeleton className="h-16 w-full rounded-md" />
          <Skeleton className="h-11 w-full" />
        </div>
      </PageLayout>
    );
  }

  return (
    <PageLayout fluid>
      <PageHeader title={t('companySettings.title')} description={t('companySettings.subtitle')} />

      <div className="bg-card border rounded-lg p-6">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            e.stopPropagation();
            form.handleSubmit();
          }}
          className="space-y-6"
        >
          <FieldGroup className="gap-4">
            {profile.companyRegId && (
              <Field>
                <FieldLabel htmlFor="cs-companyRegId" className="text-sm font-medium">
                  {t('profile.regId')}
                </FieldLabel>
                <Input
                  id="cs-companyRegId"
                  value={profile.companyRegId}
                  readOnly
                  disabled
                  className="bg-muted/50 font-mono tracking-wide"
                />
              </Field>
            )}

            <form.Field
              name="companyName"
              validators={{ onBlur: companyNameSchema, onSubmit: companyNameSchema }}
            >
              {(field) => {
                const isInvalid = field.state.meta.isTouched && field.state.meta.errors.length > 0;
                return (
                  <Field data-invalid={isInvalid}>
                    <FieldLabel htmlFor="cs-companyName" className="text-sm font-medium">
                      {t('register.companyName')}
                    </FieldLabel>
                    <Input
                      id="cs-companyName"
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

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <form.Field
                name="industryType"
                validators={{ onBlur: industryTypeSchema, onSubmit: industryTypeSchema }}
              >
                {(field) => {
                  const isInvalid =
                    field.state.meta.isTouched && field.state.meta.errors.length > 0;
                  return (
                    <Field data-invalid={isInvalid}>
                      <FieldLabel htmlFor="cs-industryType" className="text-sm font-medium">
                        {t('register.industryType')}
                      </FieldLabel>
                      <SelectField
                        id="cs-industryType"
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
                      <FieldLabel htmlFor="cs-companySize" className="text-sm font-medium">
                        {t('register.companySize')}
                      </FieldLabel>
                      <SelectField
                        id="cs-companySize"
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
          </FieldGroup>

          <FieldGroup className="gap-4">
            <form.Field
              name="contactName"
              validators={{ onBlur: contactNameSchema, onSubmit: contactNameSchema }}
            >
              {(field) => {
                const isInvalid = field.state.meta.isTouched && field.state.meta.errors.length > 0;
                return (
                  <Field data-invalid={isInvalid}>
                    <FieldLabel htmlFor="cs-contactName" className="text-sm font-medium">
                      {t('register.contactName')}
                    </FieldLabel>
                    <Input
                      id="cs-contactName"
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

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <form.Field
                name="contactEmail"
                validators={{ onBlur: contactEmailSchema, onSubmit: contactEmailSchema }}
              >
                {(field) => {
                  const isInvalid =
                    field.state.meta.isTouched && field.state.meta.errors.length > 0;
                  return (
                    <Field data-invalid={isInvalid}>
                      <FieldLabel htmlFor="cs-contactEmail" className="text-sm font-medium">
                        {t('register.contactEmail')}
                      </FieldLabel>
                      <Input
                        id="cs-contactEmail"
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
                      <FieldLabel htmlFor="cs-contactPhone" className="text-sm font-medium">
                        {t('register.contactPhone')}
                      </FieldLabel>
                      <Input
                        id="cs-contactPhone"
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
          </FieldGroup>

          <div className="flex items-center justify-between gap-4 rounded-md border bg-muted/30 p-4">
            <div className="space-y-0.5">
              <Label htmlFor="cs-emailNotifications" className="text-sm font-medium cursor-pointer">
                {t('profile.emailNotifications')}
              </Label>
              <p className="text-sm text-muted-foreground">{t('profile.emailNotificationsDesc')}</p>
            </div>
            <form.Field name="emailNotifications">
              {(field) => (
                <Switch
                  id="cs-emailNotifications"
                  checked={field.state.value ?? false}
                  onCheckedChange={(val) => field.handleChange(val)}
                />
              )}
            </form.Field>
          </div>

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
                  aria-hidden="true"
                >
                  <path
                    d="M5 13l4 4L19 7"
                    stroke="currentColor"
                    strokeWidth="2.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
                {t('companySettings.saved')}
              </span>
            </div>
          )}

          <form.Subscribe selector={(state) => [state.isSubmitting, state.isDirty] as const}>
            {([isSubmitting, isDirty]) => (
              <Button
                type="submit"
                className="w-full h-11 font-semibold"
                disabled={isSubmitting || !isDirty}
              >
                {isSubmitting ? (
                  <>
                    <SpinnerIcon />
                    {t('companySettings.saving')}
                  </>
                ) : (
                  t('companySettings.save')
                )}
              </Button>
            )}
          </form.Subscribe>
        </form>
      </div>
    </PageLayout>
  );
}
