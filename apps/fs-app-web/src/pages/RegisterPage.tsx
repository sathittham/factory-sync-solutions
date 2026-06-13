import { Turnstile } from '@/components/Turnstile';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Field, FieldError, FieldGroup, FieldLabel } from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { ApiError, api } from '@/lib/api';
import { useLocale } from '@/lib/i18n';
import { cn } from '@/lib/utils';
import { useAppDispatch, useAppSelector } from '@/store';
import { type Profile, setProfile } from '@/store/authSlice';
import { useForm } from '@tanstack/react-form';
import { ArrowLeft, Check } from 'lucide-react';
import { useCallback, useState } from 'react';
import { Navigate, useNavigate } from 'react-router';
import * as z from 'zod';

const TURNSTILE_SITE_KEY = import.meta.env.VITE_CF_TURNSTILE_SITE_KEY ?? '';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

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

interface CompanyValues {
  companyRegId: string;
  companyName: string;
  industryType: string;
  companySize: string;
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

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

const STEP_KEYS = ['register.step.company', 'register.step.contact'] as const;

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function estimateCompanySize(registerCapital: string): string {
  const capital = Number(registerCapital);
  if (!capital) return '';
  if (capital < 5_000_000) return 'small';
  if (capital < 200_000_000) return 'medium';
  return 'large';
}

type SetCompanyField = (field: keyof CompanyValues, value: string) => void;

function applyCheckResult(
  result: CheckRegIdResponse,
  setField: SetCompanyField,
  setRegIdTaken: (name: string) => void,
  unknownLabel: string,
) {
  setRegIdTaken(result.companyName ?? unknownLabel);
  if (result.companyName) setField('companyName', result.companyName);
  if (result.industryType) setField('industryType', result.industryType);
  if (result.companySize) setField('companySize', result.companySize);
}

function applyDbdResult(dbd: DbdCompanyProfile, setField: SetCompanyField) {
  if (dbd.nameTh) setField('companyName', dbd.nameTh);
  const size = estimateCompanySize(dbd.registerCapital);
  if (size) setField('companySize', size);
}

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------

function Spinner() {
  return (
    <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
      <path
        className="opacity-75"
        fill="currentColor"
        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
      />
    </svg>
  );
}

function StepIndicator({ step }: { readonly step: 1 | 2 }) {
  const { t } = useLocale();
  return (
    <div className="flex items-start justify-center mb-8">
      {STEP_KEYS.map((key, i) => {
        const stepNum = (i + 1) as 1 | 2;
        const isDone = step > stepNum;
        const isActive = step === stepNum;

        let circleStyle: string;
        if (isDone) {
          circleStyle = 'border-blue-600 bg-blue-600 text-white';
        } else if (isActive) {
          circleStyle =
            'border-blue-600 bg-blue-600 text-white shadow-[0_0_0_4px_rgba(37,99,235,0.15)]';
        } else {
          circleStyle =
            'border-slate-300 bg-white text-slate-400 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-500';
        }

        let labelStyle: string;
        if (isActive) {
          labelStyle = 'text-slate-900 dark:text-white';
        } else if (isDone) {
          labelStyle = 'text-blue-600 dark:text-blue-400';
        } else {
          labelStyle = 'text-slate-400 dark:text-slate-500';
        }

        return (
          <div key={key} className="flex items-start">
            <div className="flex flex-col items-center gap-1.5 w-24 sm:w-28">
              <div
                className={cn(
                  'flex h-8 w-8 shrink-0 items-center justify-center rounded-full border-2 text-sm font-bold transition-all duration-200',
                  circleStyle,
                )}
              >
                {isDone ? <Check className="h-4 w-4 stroke-[3]" /> : stepNum}
              </div>
              <span className={cn('text-center text-[11px] leading-tight font-medium', labelStyle)}>
                {t(key)}
              </span>
            </div>
            {i < STEP_KEYS.length - 1 && (
              <div
                className={cn(
                  'mt-4 h-0.5 w-16 sm:w-24 shrink-0 transition-colors duration-200',
                  isDone ? 'bg-blue-600' : 'bg-slate-200 dark:bg-slate-700',
                )}
              />
            )}
          </div>
        );
      })}
    </div>
  );
}

function DbdInfoCard({ info }: { readonly info: DbdCompanyProfile }) {
  return (
    <div className="rounded-md border bg-muted/30 p-3 text-sm space-y-0.5">
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

// ---------------------------------------------------------------------------
// Main page
// ---------------------------------------------------------------------------

// biome-ignore lint/complexity/noExcessiveCognitiveComplexity: 2-step form with DBD lookup, Turnstile, and multiple form instances
export function RegisterPage() {
  const { t, locale } = useLocale();
  const dispatch = useAppDispatch();
  const navigate = useNavigate();
  const { user, isRegistered } = useAppSelector((s) => s.auth);

  const [step, setStep] = useState<1 | 2>(1);
  const [step1Data, setStep1Data] = useState<CompanyValues | null>(null);
  const [dbdInfo, setDbdInfo] = useState<DbdCompanyProfile | null>(null);
  const [regIdTaken, setRegIdTaken] = useState<string | null>(null);
  const [isLookingUp, setIsLookingUp] = useState(false);
  const [turnstileToken, setTurnstileToken] = useState<string | null>(null);
  const [turnstileError, setTurnstileError] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  // Field-level Zod schemas (depend on t — defined before hooks per React rules)
  const companyRegIdSchema = z.string().regex(/^\d{13}$/, t('register.regIdError'));
  const companyNameSchema = z.string().min(1, t('register.companyNameError'));
  const industryTypeSchema = z.string().min(1, t('register.industryTypeError'));
  const companySizeSchema = z.string().min(1, t('register.companySizeError'));
  const contactNameSchema = z.string().min(1, t('register.contactNameError'));
  const contactPhoneSchema = z.string().min(9, t('register.contactPhoneError'));

  const companyForm = useForm({
    defaultValues: {
      companyRegId: step1Data?.companyRegId ?? '',
      companyName: step1Data?.companyName ?? '',
      industryType: step1Data?.industryType ?? '',
      companySize: step1Data?.companySize ?? '',
    },
    onSubmit: ({ value }) => {
      setStep1Data(value);
      setStep(2);
    },
  });

  const contactForm = useForm({
    defaultValues: {
      contactName: user?.displayName ?? '',
      contactEmail: user?.email ?? '',
      contactPhone: '',
      marketingConsent: false,
    },
    onSubmit: async ({ value }) => {
      setSubmitError(null);
      if (TURNSTILE_SITE_KEY && !turnstileToken) return;
      try {
        const profile = await api.post<Profile>('/profile', {
          ...step1Data,
          contactName: value.contactName,
          contactEmail: value.contactEmail,
          contactPhone: value.contactPhone,
          marketingConsent: value.marketingConsent,
          turnstileToken: turnstileToken ?? '',
        });
        dispatch(setProfile(profile));
        navigate('/dashboard');
      } catch (err) {
        setSubmitError(err instanceof ApiError ? err.message : t('register.error'));
      }
    },
  });

  const handleTurnstileVerify = useCallback((token: string) => {
    setTurnstileToken(token);
    setTurnstileError(false);
  }, []);
  const handleTurnstileExpire = useCallback(() => setTurnstileToken(null), []);
  const handleTurnstileError = useCallback(() => {
    setTurnstileToken(null);
    setTurnstileError(true);
  }, []);

  const handleDbdLookup = useCallback(async () => {
    const regId = companyForm.state.values.companyRegId;
    if (!regId || !/^\d{13}$/.test(regId)) return;

    setIsLookingUp(true);
    setDbdInfo(null);
    setRegIdTaken(null);

    const setField: SetCompanyField = (field, value) => companyForm.setFieldValue(field, value);

    try {
      const [checkResult, dbdResult] = await Promise.allSettled([
        api.get<CheckRegIdResponse>(`/profile/check/${regId}`),
        api.get<DbdCompanyProfile>(`/dbd/${regId}`),
      ]);

      const hasExisting = checkResult.status === 'fulfilled' && checkResult.value.registered;

      if (hasExisting && checkResult.status === 'fulfilled') {
        applyCheckResult(
          checkResult.value,
          setField,
          setRegIdTaken,
          t('register.companyName.unknown'),
        );
      }

      if (dbdResult.status === 'fulfilled') {
        setDbdInfo(dbdResult.value);
        if (!hasExisting) applyDbdResult(dbdResult.value, setField);
      }
    } catch {
      // user fills manually
    } finally {
      setIsLookingUp(false);
    }
  }, [companyForm, t]);

  // All hooks called — now safe to conditionally return
  if (isRegistered) return <Navigate to="/dashboard" replace />;

  function getLookupLabel() {
    if (dbdInfo) return t('register.lookupFound');
    if (isLookingUp) return t('register.lookupLoading');
    return t('register.lookup');
  }

  return (
    <div className="relative flex min-h-[calc(100dvh-3.5rem)] items-start justify-center overflow-hidden bg-sky-50 px-3 py-6 dark:bg-[#041225] sm:items-center sm:px-4 sm:py-8">
      {/* Background */}
      <div className="pointer-events-none absolute inset-0 select-none" aria-hidden="true">
        <img
          src="/fs-bg.png"
          alt=""
          className="h-full w-full object-cover opacity-25 dark:opacity-40"
        />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_120%_110%_at_50%_50%,rgba(248,250,252,0.2)_0%,rgba(240,249,255,0.92)_100%)] dark:bg-[radial-gradient(ellipse_120%_110%_at_50%_50%,rgba(4,18,37,0.15)_0%,rgba(4,18,37,0.88)_100%)]" />
        <div className="absolute inset-0 factory-scanlines opacity-15 dark:opacity-30" />
      </div>

      <div className="relative z-10 w-full max-w-lg">
        <Card className="overflow-hidden shadow-2xl dark:border-cyan-300/10 dark:shadow-[0_25px_60px_rgba(0,0,0,0.5)]">
          <CardContent className="p-0">
            <div className="p-5 sm:p-8 md:p-10">
              {/* Page header */}
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

              <StepIndicator step={step} />

              {/* ── Step 1: Company info ── */}
              {step === 1 && (
                <form
                  onSubmit={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    companyForm.handleSubmit();
                  }}
                  className="space-y-4"
                >
                  <FieldGroup>
                    <companyForm.Field
                      name="companyRegId"
                      validators={{ onBlur: companyRegIdSchema, onSubmit: companyRegIdSchema }}
                    >
                      {(field) => {
                        const isInvalid =
                          field.state.meta.isTouched && field.state.meta.errors.length > 0;
                        return (
                          <Field data-invalid={isInvalid}>
                            <FieldLabel htmlFor="companyRegId">{t('register.regId')}</FieldLabel>
                            <div className="flex gap-2">
                              <Input
                                id="companyRegId"
                                placeholder="0115560016313"
                                className="font-mono tracking-wide"
                                value={field.state.value}
                                onBlur={field.handleBlur}
                                onChange={(e) => {
                                  field.handleChange(e.target.value);
                                  setDbdInfo(null);
                                  setRegIdTaken(null);
                                }}
                                data-testid="reg-company-id-input"
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
                            {isInvalid && <FieldError errors={field.state.meta.errors} />}
                          </Field>
                        );
                      }}
                    </companyForm.Field>

                    {regIdTaken && (
                      <div className="rounded-md border border-blue-200 bg-blue-50 dark:border-blue-800 dark:bg-blue-950/30 p-3 text-sm text-blue-800 dark:text-blue-300">
                        <p className="font-medium text-xs mb-0.5">
                          {t('register.regIdTaken.title')}
                        </p>
                        <p className="text-blue-700 dark:text-blue-400 text-[13px]">
                          &ldquo;{regIdTaken}&rdquo; {t('register.regIdTaken.desc')}
                        </p>
                      </div>
                    )}

                    {dbdInfo && <DbdInfoCard info={dbdInfo} />}

                    <companyForm.Field
                      name="companyName"
                      validators={{ onBlur: companyNameSchema, onSubmit: companyNameSchema }}
                    >
                      {(field) => {
                        const isInvalid =
                          field.state.meta.isTouched && field.state.meta.errors.length > 0;
                        return (
                          <Field data-invalid={isInvalid}>
                            <FieldLabel htmlFor="companyName">
                              {t('register.companyName')}
                            </FieldLabel>
                            <Input
                              id="companyName"
                              value={field.state.value}
                              onBlur={field.handleBlur}
                              onChange={(e) => field.handleChange(e.target.value)}
                            />
                            {isInvalid && <FieldError errors={field.state.meta.errors} />}
                          </Field>
                        );
                      }}
                    </companyForm.Field>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <companyForm.Field
                        name="industryType"
                        validators={{ onBlur: industryTypeSchema, onSubmit: industryTypeSchema }}
                      >
                        {(field) => {
                          const isInvalid =
                            field.state.meta.isTouched && field.state.meta.errors.length > 0;
                          return (
                            <Field data-invalid={isInvalid}>
                              <FieldLabel htmlFor="industryType">
                                {t('register.industryType')}
                              </FieldLabel>
                              <Select
                                value={field.state.value}
                                onValueChange={(v) => {
                                  field.handleChange(v);
                                  field.handleBlur();
                                }}
                              >
                                <SelectTrigger id="industryType">
                                  <SelectValue placeholder={t('register.select')} />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectGroup>
                                    {industryKeys.map((key) => (
                                      <SelectItem key={key} value={key}>
                                        {t(`industry.${key}`)}
                                      </SelectItem>
                                    ))}
                                  </SelectGroup>
                                </SelectContent>
                              </Select>
                              {isInvalid && <FieldError errors={field.state.meta.errors} />}
                            </Field>
                          );
                        }}
                      </companyForm.Field>

                      <companyForm.Field
                        name="companySize"
                        validators={{ onBlur: companySizeSchema, onSubmit: companySizeSchema }}
                      >
                        {(field) => {
                          const isInvalid =
                            field.state.meta.isTouched && field.state.meta.errors.length > 0;
                          return (
                            <Field data-invalid={isInvalid}>
                              <FieldLabel htmlFor="companySize">
                                {t('register.companySize')}
                              </FieldLabel>
                              <Select
                                value={field.state.value}
                                onValueChange={(v) => {
                                  field.handleChange(v);
                                  field.handleBlur();
                                }}
                              >
                                <SelectTrigger id="companySize">
                                  <SelectValue placeholder={t('register.select')} />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectGroup>
                                    {sizeKeys.map((key) => (
                                      <SelectItem key={key} value={key}>
                                        {t(`size.${key}`)}
                                      </SelectItem>
                                    ))}
                                  </SelectGroup>
                                </SelectContent>
                              </Select>
                              {isInvalid && <FieldError errors={field.state.meta.errors} />}
                            </Field>
                          );
                        }}
                      </companyForm.Field>
                    </div>
                  </FieldGroup>

                  <Button type="submit" className="w-full h-11 font-semibold">
                    {t('register.next')} →
                  </Button>
                </form>
              )}

              {/* ── Step 2: Contact info ── */}
              {step === 2 && (
                <form
                  onSubmit={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    contactForm.handleSubmit();
                  }}
                  className="space-y-4"
                >
                  <FieldGroup>
                    <contactForm.Field
                      name="contactName"
                      validators={{ onBlur: contactNameSchema, onSubmit: contactNameSchema }}
                    >
                      {(field) => {
                        const isInvalid =
                          field.state.meta.isTouched && field.state.meta.errors.length > 0;
                        return (
                          <Field data-invalid={isInvalid}>
                            <FieldLabel htmlFor="contactName">
                              {t('register.contactName')}
                            </FieldLabel>
                            <Input
                              id="contactName"
                              value={field.state.value}
                              onBlur={field.handleBlur}
                              onChange={(e) => field.handleChange(e.target.value)}
                            />
                            {isInvalid && <FieldError errors={field.state.meta.errors} />}
                          </Field>
                        );
                      }}
                    </contactForm.Field>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <contactForm.Field name="contactEmail">
                        {(field) => (
                          <Field>
                            <FieldLabel htmlFor="contactEmail">
                              {t('register.contactEmail')}
                            </FieldLabel>
                            <Input
                              id="contactEmail"
                              type="email"
                              readOnly
                              tabIndex={-1}
                              className="bg-muted/40 cursor-not-allowed opacity-60 text-muted-foreground"
                              value={field.state.value}
                            />
                          </Field>
                        )}
                      </contactForm.Field>

                      <contactForm.Field
                        name="contactPhone"
                        validators={{ onBlur: contactPhoneSchema, onSubmit: contactPhoneSchema }}
                      >
                        {(field) => {
                          const isInvalid =
                            field.state.meta.isTouched && field.state.meta.errors.length > 0;
                          return (
                            <Field data-invalid={isInvalid}>
                              <FieldLabel htmlFor="contactPhone">
                                {t('register.contactPhone')}
                              </FieldLabel>
                              <Input
                                id="contactPhone"
                                value={field.state.value}
                                onBlur={field.handleBlur}
                                onChange={(e) => field.handleChange(e.target.value)}
                              />
                              {isInvalid && <FieldError errors={field.state.meta.errors} />}
                            </Field>
                          );
                        }}
                      </contactForm.Field>
                    </div>

                    <contactForm.Field name="marketingConsent">
                      {(field) => (
                        <div className="flex items-start gap-2.5 pt-1">
                          <input
                            type="checkbox"
                            id="marketingConsent"
                            className="mt-1 h-4 w-4 rounded border-gray-300 accent-primary"
                            checked={field.state.value as boolean}
                            onChange={(e) => field.handleChange(e.target.checked)}
                          />
                          <label htmlFor="marketingConsent" className="text-sm leading-relaxed">
                            {t('register.marketingConsent')}
                            <span className="block text-xs text-muted-foreground mt-0.5">
                              {t('register.marketingConsentDetail')}{' '}
                              <a
                                href="https://factorysyncsolutions.com/marketing"
                                target="_blank"
                                rel="noreferrer"
                                className="text-primary hover:underline font-medium"
                              >
                                {t('register.marketingPolicyLink')}
                              </a>
                            </span>
                          </label>
                        </div>
                      )}
                    </contactForm.Field>
                  </FieldGroup>

                  {TURNSTILE_SITE_KEY && (
                    <div className="flex flex-col items-center gap-2">
                      <Turnstile
                        siteKey={TURNSTILE_SITE_KEY}
                        onVerify={handleTurnstileVerify}
                        onExpire={handleTurnstileExpire}
                        onError={handleTurnstileError}
                        language={locale}
                      />
                      {turnstileError && (
                        <p className="text-xs text-muted-foreground text-center">
                          {t('register.captchaUnavailable')}
                        </p>
                      )}
                    </div>
                  )}

                  {submitError && (
                    <div className="p-3 rounded-md bg-destructive/10 text-destructive text-sm text-center">
                      {submitError}
                    </div>
                  )}

                  <div className="flex gap-3">
                    <Button
                      type="button"
                      variant="outline"
                      className="h-11 gap-1.5"
                      onClick={() => {
                        setStep(1);
                        setSubmitError(null);
                      }}
                      disabled={contactForm.state.isSubmitting}
                    >
                      <ArrowLeft className="h-4 w-4" />
                      {t('register.back')}
                    </Button>
                    <Button
                      type="submit"
                      className="flex-1 h-11 font-semibold"
                      disabled={
                        contactForm.state.isSubmitting || (!!TURNSTILE_SITE_KEY && !turnstileToken)
                      }
                      data-testid="registration-submit-btn"
                    >
                      {contactForm.state.isSubmitting ? (
                        <>
                          <Spinner />
                          <span className="ml-2">{t('register.submitting')}</span>
                        </>
                      ) : (
                        t('register.submit')
                      )}
                    </Button>
                  </div>
                </form>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
