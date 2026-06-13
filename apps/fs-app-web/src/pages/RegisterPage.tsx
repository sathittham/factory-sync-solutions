import { Turnstile } from '@/components/Turnstile';
import { LoginForm } from '@/components/login-form';
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
import { useTheme } from '@/lib/theme';
import { cn } from '@/lib/utils';
import { useAppDispatch, useAppSelector } from '@/store';
import { type Profile, setProfile } from '@/store/authSlice';
import fsDarkLogo from '@shared/brand/fs-dark.png';
import fsLightLogo from '@shared/brand/fs-light.png';
import { getOfficialWebUrl } from '@shared/lib/officialSite';
import { useForm } from '@tanstack/react-form';
import { ArrowLeft, Building2, Check, ClipboardCheck, FileText, ShieldCheck } from 'lucide-react';
import { type ReactNode, useCallback, useState } from 'react';
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

type RegisterStep = 1 | 2 | 3;

const STEP_KEYS = [
  'register.step.account',
  'register.step.company',
  'register.step.contact',
] as const;

const STEP_ICONS = [ShieldCheck, Building2, ClipboardCheck] as const;

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

function RegisterShell({
  step,
  children,
}: {
  readonly step: RegisterStep;
  readonly children: ReactNode;
}) {
  const { t } = useLocale();
  const { resolvedTheme } = useTheme();
  const logo = resolvedTheme === 'dark' ? fsDarkLogo : fsLightLogo;
  const officialWebUrl = getOfficialWebUrl(import.meta.env.VITE_OFFICIAL_WEB_URL, {
    isDevelopment: import.meta.env.DEV,
  });

  const processSteps = STEP_KEYS.map((key) => ({
    key,
    label: t(key),
    detail: t(`${key}.detail`),
  }));
  const activeStep = processSteps[step - 1];

  return (
    <div className="relative min-h-[calc(100dvh-3.5rem)] overflow-hidden bg-[#edf7fb] px-3 py-6 dark:bg-[#041225] sm:px-4 sm:py-8">
      <div className="pointer-events-none absolute inset-0 select-none" aria-hidden="true">
        <img
          src="/fs-bg.png"
          alt=""
          className="h-full w-full object-cover opacity-10 dark:opacity-30"
        />
        <div className="absolute inset-0 bg-[linear-gradient(120deg,rgba(248,250,252,0.98)_0%,rgba(239,246,255,0.94)_48%,rgba(219,234,254,0.86)_100%)] dark:bg-[linear-gradient(120deg,rgba(4,18,37,0.98)_0%,rgba(6,23,45,0.94)_52%,rgba(8,47,73,0.86)_100%)]" />
        <div className="absolute left-0 top-0 h-full w-[48%] bg-[linear-gradient(90deg,rgba(255,255,255,0.68),rgba(255,255,255,0))] dark:bg-[linear-gradient(90deg,rgba(15,23,42,0.42),rgba(15,23,42,0))]" />
        <div className="absolute inset-0 factory-scanlines opacity-10 dark:opacity-25" />
      </div>

      <div className="relative z-10 mx-auto grid min-h-[calc(100dvh-8.5rem)] w-full max-w-7xl gap-6 lg:grid-cols-[minmax(0,0.95fr)_minmax(440px,540px)] lg:items-center">
        <section className="order-2 flex min-w-0 flex-col gap-8 p-2 sm:p-4 lg:order-1 lg:min-h-[650px] lg:justify-between">
          <div className="flex flex-col gap-9">
            <a href={officialWebUrl} className="flex w-fit items-center gap-3">
              <img
                src={logo}
                alt=""
                aria-hidden="true"
                className="size-10 shrink-0 rounded-md object-contain"
              />
              <span className="text-base font-semibold">{t('nav.appName')}</span>
            </a>

            <div className="max-w-2xl border-l-4 border-primary pl-5">
              <p className="text-sm font-semibold uppercase text-primary">{t('register.kicker')}</p>
              <h1 className="mt-4 text-4xl font-bold leading-tight text-foreground sm:text-5xl">
                {t('register.title')}
              </h1>
              <p className="mt-3 max-w-xl text-base leading-relaxed text-muted-foreground">
                {t('register.subtitle')}
              </p>
            </div>

            <div className="relative grid gap-4">
              <div
                className="absolute bottom-12 left-[1.35rem] top-12 hidden w-px bg-border sm:block"
                aria-hidden="true"
              />
              {processSteps.map((item, index) => {
                const stepNum = (index + 1) as RegisterStep;
                const isDone = step > stepNum;
                const isActive = step === stepNum;
                const Icon = STEP_ICONS[index];

                let indicatorClass = 'border-border bg-background text-muted-foreground';
                if (isDone) {
                  indicatorClass = 'border-primary bg-primary text-primary-foreground';
                } else if (isActive) {
                  indicatorClass =
                    'border-primary bg-primary text-primary-foreground shadow-[0_0_0_6px_rgba(37,99,235,0.12)]';
                }

                let itemClass = 'border-transparent bg-white/48 dark:bg-slate-950/18';
                if (isActive) {
                  itemClass =
                    'border-primary/25 bg-white shadow-[0_18px_45px_rgba(37,99,235,0.12)] dark:bg-slate-950/42';
                } else if (isDone) {
                  itemClass = 'border-primary/15 bg-white/70 dark:bg-slate-950/30';
                }

                return (
                  <div
                    key={item.key}
                    className={cn(
                      'relative flex gap-4 rounded-md border p-4 transition-colors',
                      itemClass,
                    )}
                  >
                    <div
                      className={cn(
                        'relative flex size-11 shrink-0 items-center justify-center rounded-full border-2',
                        indicatorClass,
                      )}
                    >
                      {isDone ? (
                        <Check className="stroke-[3]" aria-hidden="true" />
                      ) : (
                        <Icon aria-hidden="true" />
                      )}
                    </div>
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="font-mono text-xs text-muted-foreground">
                          {String(stepNum).padStart(2, '0')}
                        </span>
                        <h2 className="text-base font-semibold">{item.label}</h2>
                      </div>
                      <p className="mt-1 text-sm leading-relaxed text-muted-foreground">
                        {item.detail}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="grid gap-3 rounded-md border bg-white/65 p-4 shadow-xs backdrop-blur dark:border-cyan-300/10 dark:bg-slate-950/28 sm:grid-cols-3">
            <div>
              <p className="text-xs font-semibold uppercase text-muted-foreground">
                {t('register.metric.time.label')}
              </p>
              <p className="mt-1 text-lg font-bold">{t('register.metric.time.value')}</p>
            </div>
            <div>
              <p className="text-xs font-semibold uppercase text-muted-foreground">
                {t('register.metric.review.label')}
              </p>
              <p className="mt-1 text-lg font-bold">{t('register.metric.review.value')}</p>
            </div>
            <div>
              <p className="text-xs font-semibold uppercase text-muted-foreground">
                {t('register.metric.report.label')}
              </p>
              <p className="mt-1 text-lg font-bold">{t('register.metric.report.value')}</p>
            </div>
          </div>
        </section>

        <Card className="order-1 overflow-hidden rounded-md border bg-background/98 shadow-[0_30px_80px_rgba(15,23,42,0.18)] backdrop-blur dark:border-cyan-300/10 dark:bg-slate-950/92 dark:shadow-[0_30px_80px_rgba(0,0,0,0.5)] lg:order-2">
          <CardContent className="p-0">
            <div className="border-b bg-muted/25 px-5 py-5 sm:px-8">
              <div className="flex items-start justify-between gap-4">
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-primary">
                    {t('register.form.stepPrefix')} {step}/3
                  </p>
                  <h2 className="mt-2 text-2xl font-bold">{activeStep.label}</h2>
                  <p className="mt-1 text-sm leading-relaxed text-muted-foreground">
                    {activeStep.detail}
                  </p>
                </div>
                <div className="flex size-11 shrink-0 items-center justify-center rounded-md bg-primary text-primary-foreground">
                  <FileText aria-hidden="true" />
                </div>
              </div>
              <div className="mt-5 grid grid-cols-3 gap-2" aria-hidden="true">
                {STEP_KEYS.map((key, index) => {
                  const progressStep = (index + 1) as RegisterStep;
                  const isComplete = step >= progressStep;
                  return (
                    <div
                      key={key}
                      className={cn(
                        'h-1.5 rounded-full transition-colors',
                        isComplete ? 'bg-primary' : 'bg-border',
                      )}
                    />
                  );
                })}
              </div>
            </div>
            <div className="p-5 sm:p-8">
              <div className="mb-6 rounded-md border bg-primary/5 p-4 text-sm leading-relaxed text-muted-foreground dark:border-cyan-300/10">
                {t('register.assurance')}
              </div>
              {children}
            </div>
          </CardContent>
        </Card>
      </div>
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
  const { user, isAuthenticated, isRegistered, loading } = useAppSelector((s) => s.auth);

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
  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
      </div>
    );
  }

  if (!isAuthenticated) {
    return (
      <RegisterShell step={1}>
        <LoginForm initialMode="signup" frame="content" signInHref="/" />
      </RegisterShell>
    );
  }

  if (isRegistered) return <Navigate to="/dashboard" replace />;

  function getLookupLabel() {
    if (dbdInfo) return t('register.lookupFound');
    if (isLookingUp) return t('register.lookupLoading');
    return t('register.lookup');
  }

  return (
    <RegisterShell step={(step + 1) as RegisterStep}>
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
                const isInvalid = field.state.meta.isTouched && field.state.meta.errors.length > 0;
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
                <p className="font-medium text-xs mb-0.5">{t('register.regIdTaken.title')}</p>
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
                const isInvalid = field.state.meta.isTouched && field.state.meta.errors.length > 0;
                return (
                  <Field data-invalid={isInvalid}>
                    <FieldLabel htmlFor="companyName">{t('register.companyName')}</FieldLabel>
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
                      <FieldLabel htmlFor="industryType">{t('register.industryType')}</FieldLabel>
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
                      <FieldLabel htmlFor="companySize">{t('register.companySize')}</FieldLabel>
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
                const isInvalid = field.state.meta.isTouched && field.state.meta.errors.length > 0;
                return (
                  <Field data-invalid={isInvalid}>
                    <FieldLabel htmlFor="contactName">{t('register.contactName')}</FieldLabel>
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
                    <FieldLabel htmlFor="contactEmail">{t('register.contactEmail')}</FieldLabel>
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
                      <FieldLabel htmlFor="contactPhone">{t('register.contactPhone')}</FieldLabel>
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
              disabled={contactForm.state.isSubmitting || (!!TURNSTILE_SITE_KEY && !turnstileToken)}
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
    </RegisterShell>
  );
}
