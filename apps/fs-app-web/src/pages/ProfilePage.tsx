import { SelectField } from '@/components/form/select-field';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { ApiError, api } from '@/lib/api';
import { useLocale } from '@/lib/i18n';
import { useAppDispatch, useAppSelector } from '@/store';
import { type Profile, setProfile } from '@/store/authSlice';
import { zodResolver } from '@hookform/resolvers/zod';
import { useState } from 'react';
import { Controller, useForm } from 'react-hook-form';
import { z } from 'zod';

const schema = z.object({
  companyName: z.string().min(1, 'register.companyNameError'),
  industryType: z.string().min(1, 'register.industryTypeError'),
  companySize: z.string().min(1, 'register.companySizeError'),
  contactName: z.string().min(1, 'register.contactNameError'),
  contactEmail: z.string().email('register.contactEmailError'),
  contactPhone: z.string().min(9, 'register.contactPhoneError'),
  emailNotifications: z.boolean().optional(),
});

type FormData = z.infer<typeof schema>;

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

  const {
    register,
    control,
    handleSubmit,
    formState: { errors, isSubmitting, isDirty },
  } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: {
      companyName: profile?.companyName || '',
      industryType: profile?.industryType || '',
      companySize: profile?.companySize || '',
      contactName: profile?.contactName || '',
      contactEmail: profile?.contactEmail || '',
      contactPhone: profile?.contactPhone || '',
      emailNotifications: profile?.emailNotifications ?? false,
    },
  });

  const onSubmit = async (data: FormData) => {
    setError(null);
    setSuccess(false);
    try {
      const updated = await api.put<Profile>('/profile', data);
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
  };

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

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <div className="space-y-1.5">
              <label htmlFor="companyName" className="text-sm font-medium">
                {t('register.companyName')}
              </label>
              <Input id="companyName" {...register('companyName')} />
              {errors.companyName && (
                <p className="text-xs text-destructive">{t(errors.companyName.message || '')}</p>
              )}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <label htmlFor="industryType" className="text-sm font-medium">
                  {t('register.industryType')}
                </label>
                <Controller
                  name="industryType"
                  control={control}
                  render={({ field }) => (
                    <SelectField
                      id="industryType"
                      value={field.value}
                      placeholder={t('register.select')}
                      options={industryKeys.map((key) => ({
                        value: key,
                        label: t(`industry.${key}`),
                      }))}
                      onValueChange={field.onChange}
                      onBlur={field.onBlur}
                      isInvalid={!!errors.industryType}
                    />
                  )}
                />
                {errors.industryType && (
                  <p className="text-xs text-destructive">{t(errors.industryType.message || '')}</p>
                )}
              </div>
              <div className="space-y-1.5">
                <label htmlFor="companySize" className="text-sm font-medium">
                  {t('register.companySize')}
                </label>
                <Controller
                  name="companySize"
                  control={control}
                  render={({ field }) => (
                    <SelectField
                      id="companySize"
                      value={field.value}
                      placeholder={t('register.select')}
                      options={sizeKeys.map((key) => ({
                        value: key,
                        label: t(`size.${key}`),
                      }))}
                      onValueChange={field.onChange}
                      onBlur={field.onBlur}
                      isInvalid={!!errors.companySize}
                    />
                  )}
                />
                {errors.companySize && (
                  <p className="text-xs text-destructive">{t(errors.companySize.message || '')}</p>
                )}
              </div>
            </div>

            <div className="flex items-center gap-3 pt-1">
              <span className="h-px flex-1 bg-border" />
              <p className="text-xs font-medium text-muted-foreground">
                {t('profile.contactSection')}
              </p>
              <span className="h-px flex-1 bg-border" />
            </div>

            <div className="space-y-1.5">
              <label htmlFor="contactName" className="text-sm font-medium">
                {t('register.contactName')}
              </label>
              <Input id="contactName" {...register('contactName')} />
              {errors.contactName && (
                <p className="text-xs text-destructive">{t(errors.contactName.message || '')}</p>
              )}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <label htmlFor="contactEmail" className="text-sm font-medium">
                  {t('register.contactEmail')}
                </label>
                <Input id="contactEmail" type="email" {...register('contactEmail')} />
                {errors.contactEmail && (
                  <p className="text-xs text-destructive">{t(errors.contactEmail.message || '')}</p>
                )}
              </div>
              <div className="space-y-1.5">
                <label htmlFor="contactPhone" className="text-sm font-medium">
                  {t('register.contactPhone')}
                </label>
                <Input id="contactPhone" {...register('contactPhone')} />
                {errors.contactPhone && (
                  <p className="text-xs text-destructive">{t(errors.contactPhone.message || '')}</p>
                )}
              </div>
            </div>

            <div className="flex items-center gap-3 pt-1">
              <span className="h-px flex-1 bg-border" />
              <p className="text-xs font-medium text-muted-foreground">
                {t('profile.preferencesSection')}
              </p>
              <span className="h-px flex-1 bg-border" />
            </div>

            <div className="flex items-center justify-between gap-4 rounded-md border bg-muted/30 p-4">
              <div className="space-y-0.5">
                <Label htmlFor="emailNotifications" className="text-sm font-medium cursor-pointer">
                  {t('profile.emailNotifications')}
                </Label>
                <p className="text-xs text-muted-foreground">
                  {t('profile.emailNotificationsDesc')}
                </p>
              </div>
              <Controller
                name="emailNotifications"
                control={control}
                render={({ field }) => (
                  <Switch
                    id="emailNotifications"
                    checked={field.value ?? false}
                    onCheckedChange={field.onChange}
                  />
                )}
              />
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
              disabled={isSubmitting || !isDirty}
            >
              {isSubmitting ? (
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
