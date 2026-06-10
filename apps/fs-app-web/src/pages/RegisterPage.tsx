import { AuthPanel } from '@/components/AuthPanel';
import { LegalModal, type LegalType } from '@/components/LegalModal';
import { Turnstile } from '@/components/Turnstile';
import { SelectField } from '@/components/form/select-field';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { trackEvent } from '@/lib/analytics';
import { ApiError, api } from '@/lib/api';
import { useLocale } from '@/lib/i18n';
import { useAppDispatch, useAppSelector } from '@/store';
import { type Profile, setProfile } from '@/store/authSlice';
import { zodResolver } from '@hookform/resolvers/zod';
import { useCallback, useState } from 'react';
import { Controller, type FieldErrors, type UseFormRegister, useForm } from 'react-hook-form';
import { useNavigate } from 'react-router';
import { z } from 'zod';

const TURNSTILE_SITE_KEY = import.meta.env.VITE_CF_TURNSTILE_SITE_KEY || '';

const schema = z.object({
  companyName: z.string().min(1, 'register.companyNameError'),
  companyRegId: z.string().regex(/^\d{13}$/, 'register.regIdError'),
  industryType: z.string().min(1, 'register.industryTypeError'),
  companySize: z.string().min(1, 'register.companySizeError'),
  contactName: z.string().min(1, 'register.contactNameError'),
  contactEmail: z.string().email('register.contactEmailError'),
  contactPhone: z.string().min(9, 'register.contactPhoneError'),
  acceptTerms: z.literal(true, { errorMap: () => ({ message: 'register.acceptTermsError' }) }),
  marketingConsent: z.boolean().optional(),
});

type FormData = z.infer<typeof schema>;

interface DbdCompanyProfile {
  nameTh: string;
  nameEn: string;
  type: string;
  registerCapital: string;
  objectiveTextTh: string;
  objectiveTextEn: string;
  address: string;
  subDistrict: string;
  district: string;
  province: string;
}

interface CheckRegIdResponse {
  registered: boolean;
  companyName?: string;
  industryType?: string;
  companySize?: string;
}

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

function estimateCompanySize(registerCapital: string): string {
  const capital = Number(registerCapital);
  if (!capital) return '';
  if (capital < 5_000_000) return 'small';
  if (capital < 200_000_000) return 'medium';
  return 'large';
}

const Spinner = () => (
  <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24" fill="none">
    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
    <path
      className="opacity-75"
      fill="currentColor"
      d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
    />
  </svg>
);

function DbdInfoCard({ info }: { readonly info: DbdCompanyProfile }) {
  return (
    <div className="rounded-md border bg-muted/30 p-3 text-sm space-y-0.5 animate-scale-in">
      <p className="font-medium">{info.nameTh}</p>
      {info.nameEn && <p className="text-muted-foreground text-xs">{info.nameEn}</p>}
      <p className="text-muted-foreground text-xs">
        {info.type} &middot; {info.objectiveTextTh || info.objectiveTextEn}
      </p>
      {info.address && (
        <p className="text-muted-foreground text-xs">
          {info.address} {info.subDistrict} {info.district} {info.province}
        </p>
      )}
    </div>
  );
}

function ContactFields({
  formRegister,
  errors,
  t,
}: {
  readonly formRegister: UseFormRegister<FormData>;
  readonly errors: FieldErrors<FormData>;
  readonly t: (key: string) => string;
}) {
  return (
    <>
      <div className="flex items-center gap-3 pt-1">
        <span className="h-px flex-1 bg-border" />
        <p className="text-xs font-medium text-muted-foreground">{t('profile.contactSection')}</p>
        <span className="h-px flex-1 bg-border" />
      </div>
      <div className="space-y-1.5">
        <label htmlFor="contactName" className="text-sm font-medium">
          {t('register.contactName')}
        </label>
        <Input id="contactName" {...formRegister('contactName')} />
        {errors.contactName && (
          <p className="text-xs text-destructive">{t(errors.contactName.message || '')}</p>
        )}
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div className="space-y-1.5">
          <label htmlFor="contactEmail" className="text-sm font-medium">
            {t('register.contactEmail')}
          </label>
          <Input
            id="contactEmail"
            type="email"
            disabled
            className="bg-muted/40 cursor-not-allowed text-muted-foreground"
            {...formRegister('contactEmail')}
          />
          {errors.contactEmail && (
            <p className="text-xs text-destructive">{t(errors.contactEmail.message || '')}</p>
          )}
        </div>
        <div className="space-y-1.5">
          <label htmlFor="contactPhone" className="text-sm font-medium">
            {t('register.contactPhone')}
          </label>
          <Input id="contactPhone" {...formRegister('contactPhone')} />
          {errors.contactPhone && (
            <p className="text-xs text-destructive">{t(errors.contactPhone.message || '')}</p>
          )}
        </div>
      </div>
    </>
  );
}

async function checkExistingProfile(regId: string): Promise<CheckRegIdResponse | null> {
  try {
    return await api.get<CheckRegIdResponse>(`/profile/check/${regId}`);
  } catch {
    return null;
  }
}

export function RegisterPage() {
  const dispatch = useAppDispatch();
  const navigate = useNavigate();
  const { isRegistered, hasCompletedQuiz, user } = useAppSelector((s) => s.auth);
  const { locale, t } = useLocale();
  const [error, setError] = useState<string | null>(null);
  const [isLookingUp, setIsLookingUp] = useState(false);
  const [dbdInfo, setDbdInfo] = useState<DbdCompanyProfile | null>(null);
  const [regIdTaken, setRegIdTaken] = useState<string | null>(null);
  const [turnstileToken, setTurnstileToken] = useState<string | null>(null);
  const [legalModal, setLegalModal] = useState<LegalType>(null);

  const handleTurnstileVerify = useCallback((token: string) => {
    setTurnstileToken(token);
  }, []);

  const handleTurnstileExpire = useCallback(() => {
    setTurnstileToken(null);
  }, []);

  const {
    register: formRegister,
    control,
    handleSubmit,
    setValue,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: {
      companyName: '',
      companyRegId: '',
      industryType: '',
      companySize: '',
      contactName: user?.displayName || '',
      contactEmail: user?.email || '',
      contactPhone: '',
      marketingConsent: false,
    },
  });

  if (isRegistered && hasCompletedQuiz) {
    navigate('/results', { replace: true });
    return null;
  }
  if (isRegistered) {
    navigate('/quiz', { replace: true });
    return null;
  }

  function getLookupLabel() {
    if (dbdInfo) return t('register.lookupFound');
    if (isLookingUp) return t('register.lookupLoading');
    return t('register.lookup');
  }

  const prefillFromExisting = (check: CheckRegIdResponse) => {
    setRegIdTaken(check.companyName || 'Another company');
    if (check.companyName) setValue('companyName', check.companyName);
    if (check.industryType) setValue('industryType', check.industryType);
    if (check.companySize) setValue('companySize', check.companySize);
  };

  const prefillFromDbd = (company: DbdCompanyProfile) => {
    if (company.nameTh) setValue('companyName', company.nameTh);
    const size = estimateCompanySize(company.registerCapital);
    if (size) setValue('companySize', size);
  };

  const handleDbdLookup = async () => {
    const regId = watch('companyRegId');
    if (!regId || !/^\d{13}$/.test(regId)) return;

    setIsLookingUp(true);
    setDbdInfo(null);
    setRegIdTaken(null);
    try {
      const check = await checkExistingProfile(regId);
      const hasExisting = check?.registered === true;
      if (hasExisting) prefillFromExisting(check);

      const company = await api.get<DbdCompanyProfile>(`/dbd/${regId}`);
      if (company) {
        setDbdInfo(company);
        if (!hasExisting) prefillFromDbd(company);
      }
    } catch {
      // user fills manually
    } finally {
      setIsLookingUp(false);
    }
  };

  const onSubmit = async (data: FormData) => {
    setError(null);
    trackEvent('registration_submit', { industry: data.industryType, size: data.companySize });
    try {
      if (TURNSTILE_SITE_KEY && !turnstileToken) {
        setError(t('register.captchaRequired'));
        return;
      }
      const { acceptTerms: _, ...payload } = data;
      const profile = await api.post<Profile>('/profile', {
        ...payload,
        marketingConsent: !!data.marketingConsent,
        turnstileToken: turnstileToken || 'skip-for-now',
      });
      dispatch(setProfile(profile));
      trackEvent('registration_success', { industry: data.industryType, size: data.companySize });
      navigate('/quiz');
    } catch (err) {
      trackEvent('registration_error', {
        error: err instanceof ApiError ? err.message : 'unknown',
      });
      setError(err instanceof ApiError ? err.message : t('register.error'));
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center px-4 py-8">
      <div className="w-full max-w-3xl" data-testid="registration-form">
        <Card className="overflow-hidden shadow-lg">
          <CardContent className="grid p-0 md:grid-cols-2">
            <div className="p-8 md:p-10 overflow-y-auto">
              {/* Header */}
              <div className="flex flex-col items-center text-center gap-2 mb-6">
                <div className="h-12 w-12 rounded-xl bg-primary/10 flex items-center justify-center">
                  <svg
                    width="22"
                    height="22"
                    viewBox="0 0 24 24"
                    fill="none"
                    className="text-primary"
                    aria-hidden="true"
                  >
                    <path
                      d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0H5m14 0h2M5 21H3m4-10h2m4 0h2m-8 4h2m4 0h2"
                      stroke="currentColor"
                      strokeWidth="1.5"
                      strokeLinecap="round"
                    />
                  </svg>
                </div>
                <div>
                  <h1 className="text-2xl font-bold">{t('register.title')}</h1>
                  <p className="text-base text-muted-foreground mt-0.5">{t('register.subtitle')}</p>
                </div>
              </div>

              <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
                {/* Registration ID with lookup */}
                <div className="space-y-1.5">
                  <label htmlFor="companyRegId" className="text-sm font-medium">
                    {t('register.regId')}
                  </label>
                  <div className="flex gap-2">
                    <Input
                      id="companyRegId"
                      placeholder="0115560016313"
                      className="font-mono tracking-wide"
                      data-testid="reg-company-id-input"
                      {...formRegister('companyRegId', {
                        onChange: () => {
                          setDbdInfo(null);
                          setRegIdTaken(null);
                        },
                      })}
                    />
                    <Button
                      type="button"
                      variant="outline"
                      onClick={handleDbdLookup}
                      disabled={isLookingUp || !!dbdInfo}
                      className="shrink-0 min-w-[80px]"
                      data-testid="reg-dbd-lookup-btn"
                    >
                      {isLookingUp ? <Spinner /> : getLookupLabel()}
                    </Button>
                  </div>
                  {errors.companyRegId && (
                    <p className="text-xs text-destructive">
                      {t(errors.companyRegId.message || '')}
                    </p>
                  )}
                </div>

                {regIdTaken && (
                  <div className="rounded-md border border-blue-200 bg-blue-50 p-3 text-sm text-blue-800 animate-scale-in">
                    <p className="font-medium text-xs mb-0.5">{t('register.regIdTaken.title')}</p>
                    <p className="text-blue-700 text-[13px]">
                      &ldquo;{regIdTaken}&rdquo; {t('register.regIdTaken.desc')}
                    </p>
                  </div>
                )}

                {dbdInfo && <DbdInfoCard info={dbdInfo} />}

                {/* Company name */}
                <div className="space-y-1.5">
                  <label htmlFor="companyName" className="text-sm font-medium">
                    {t('register.companyName')}
                  </label>
                  <Input id="companyName" {...formRegister('companyName')} />
                  {errors.companyName && (
                    <p className="text-xs text-destructive">
                      {t(errors.companyName.message || '')}
                    </p>
                  )}
                </div>

                {/* Industry + Size */}
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
                      <p className="text-xs text-destructive">
                        {t(errors.industryType.message || '')}
                      </p>
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
                      <p className="text-xs text-destructive">
                        {t(errors.companySize.message || '')}
                      </p>
                    )}
                  </div>
                </div>

                <ContactFields formRegister={formRegister} errors={errors} t={t} />

                {/* Consent checkboxes */}
                <div className="space-y-3 pt-1">
                  <div className="flex items-start gap-2.5">
                    <input
                      type="checkbox"
                      id="acceptTerms"
                      className="mt-1 h-4 w-4 rounded border-gray-300 accent-primary"
                      {...formRegister('acceptTerms')}
                    />
                    <label htmlFor="acceptTerms" className="text-sm leading-relaxed">
                      {t('register.acceptTerms')}{' '}
                      <button
                        type="button"
                        onClick={() => setLegalModal('terms')}
                        className="text-primary hover:underline font-medium"
                      >
                        {t('register.termsLink')}
                      </button>{' '}
                      {t('register.and')}{' '}
                      <button
                        type="button"
                        onClick={() => setLegalModal('privacy')}
                        className="text-primary hover:underline font-medium"
                      >
                        {t('register.privacyLink')}
                      </button>
                    </label>
                  </div>
                  {errors.acceptTerms && (
                    <p className="text-xs text-destructive ml-6">
                      {t(errors.acceptTerms.message || '')}
                    </p>
                  )}

                  <div className="flex items-start gap-2.5">
                    <input
                      type="checkbox"
                      id="marketingConsent"
                      className="mt-1 h-4 w-4 rounded border-gray-300 accent-primary"
                      {...formRegister('marketingConsent')}
                    />
                    <label htmlFor="marketingConsent" className="text-sm leading-relaxed">
                      {t('register.marketingConsent')}
                      <span className="block text-xs text-muted-foreground mt-0.5">
                        {t('register.marketingConsentDetail')}{' '}
                        <button
                          type="button"
                          onClick={() => setLegalModal('marketing')}
                          className="text-primary hover:underline font-medium"
                        >
                          {t('register.marketingPolicyLink')}
                        </button>
                      </span>
                    </label>
                  </div>
                </div>

                {TURNSTILE_SITE_KEY && (
                  <div className="flex justify-center">
                    <Turnstile
                      siteKey={TURNSTILE_SITE_KEY}
                      onVerify={handleTurnstileVerify}
                      onExpire={handleTurnstileExpire}
                      language={locale}
                    />
                  </div>
                )}

                {error && (
                  <div className="p-3 rounded-md bg-destructive/10 text-destructive text-sm text-center animate-scale-in">
                    {error}
                  </div>
                )}

                <Button
                  type="submit"
                  className="w-full h-11 font-semibold"
                  disabled={isSubmitting}
                  data-testid="registration-submit-btn"
                >
                  {isSubmitting ? (
                    <>
                      <Spinner />
                      <span className="ml-2">{t('register.submitting')}</span>
                    </>
                  ) : (
                    t('register.submit')
                  )}
                </Button>
              </form>
            </div>
            <AuthPanel />
          </CardContent>
        </Card>
      </div>
      <LegalModal open={legalModal} onClose={() => setLegalModal(null)} />
    </div>
  );
}
