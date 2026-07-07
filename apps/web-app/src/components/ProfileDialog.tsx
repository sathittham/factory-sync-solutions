import { SelectField } from '@/components/form/select-field';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Field, FieldError, FieldGroup, FieldLabel } from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { trackEvent } from '@/lib/analytics';
import { ApiError } from '@/lib/api';
import { auth, googleProvider } from '@/lib/firebase';
import { useLocale } from '@/lib/i18n';
import { useUpdateProfileMutation } from '@/lib/queries';
import { useAppDispatch, useAppSelector } from '@/store';
import { setUser } from '@/store/authSlice';
import { useForm } from '@tanstack/react-form';
import {
  EmailAuthProvider,
  linkWithCredential,
  linkWithPopup,
  reauthenticateWithCredential,
  unlink,
  updatePassword,
} from 'firebase/auth';
import { Eye, EyeOff } from 'lucide-react';
import { useCallback, useEffect, useState } from 'react';
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

function mapPasswordError(code: string, t: (key: string) => string): string {
  if (code === 'auth/wrong-password' || code === 'auth/invalid-credential') {
    return t('profile.errorWrongPassword');
  }
  if (code === 'auth/requires-recent-login') {
    return t('profile.errorRecentLogin');
  }
  if (code === 'auth/weak-password') {
    return t('signin.errorWeakPassword');
  }
  return t('profile.error');
}

function mapLinkError(code: string, t: (key: string) => string): string {
  if (code === 'auth/credential-already-in-use' || code === 'auth/email-already-in-use') {
    return t('profile.errorCredentialInUse');
  }
  if (code === 'auth/weak-password') {
    return t('signin.errorWeakPassword');
  }
  return t('profile.error');
}

function getProviderLabel(pid: string, t: (key: string) => string): string {
  return pid === 'google.com' ? t('profile.googleProvider') : t('profile.emailPasswordProvider');
}

interface PasswordToggleProps {
  readonly show: boolean;
  readonly onToggle: () => void;
  readonly labelShow: string;
  readonly labelHide: string;
}

function PasswordToggle({ show, onToggle, labelShow, labelHide }: PasswordToggleProps) {
  return (
    <button
      type="button"
      className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
      onClick={onToggle}
      aria-label={show ? labelHide : labelShow}
    >
      {show ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
    </button>
  );
}

function SectionDivider({ label }: { readonly label: string }) {
  return (
    <div className="flex items-center gap-3 mb-4">
      <span className="h-px flex-1 bg-border" />
      <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
        {label}
      </p>
      <span className="h-px flex-1 bg-border" />
    </div>
  );
}

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

// ── ChangePasswordSection ────────────────────────────────────────────────────

function ChangePasswordSection() {
  const { t } = useLocale();
  const [showCurrent, setShowCurrent] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [passwordError, setPasswordError] = useState<string | null>(null);
  const [passwordChanged, setPasswordChanged] = useState(false);

  const form = useForm({
    defaultValues: { currentPassword: '', newPassword: '', confirmNewPassword: '' },
    onSubmit: async ({ value }) => {
      setPasswordError(null);
      setPasswordChanged(false);

      const currentUser = auth.currentUser;
      if (!currentUser?.email) return;

      try {
        const credential = EmailAuthProvider.credential(currentUser.email, value.currentPassword);
        await reauthenticateWithCredential(currentUser, credential);
        await updatePassword(currentUser, value.newPassword);
        setPasswordChanged(true);
        form.reset();
      } catch (err: unknown) {
        setPasswordError(mapPasswordError((err as { code?: string }).code ?? '', t));
      }
    },
  });

  const showLabel = t('signin.showPassword');
  const hideLabel = t('signin.hidePassword');

  return (
    <div className="px-6 pb-6">
      <SectionDivider label={t('profile.securitySection')} />
      <form
        onSubmit={(e) => {
          e.preventDefault();
          e.stopPropagation();
          form.handleSubmit();
        }}
        className="space-y-3"
      >
        <form.Field
          name="currentPassword"
          validators={{
            onBlur: ({ value }) => (value ? undefined : t('signin.errorPasswordRequired')),
            onSubmit: ({ value }) => (value ? undefined : t('signin.errorPasswordRequired')),
          }}
        >
          {(field) => {
            const isInvalid = field.state.meta.isTouched && field.state.meta.errors.length > 0;
            return (
              <div className="space-y-1.5">
                <Label htmlFor="cp-current" className="text-sm font-medium">
                  {t('profile.currentPassword')}
                </Label>
                <div className="relative">
                  <Input
                    id="cp-current"
                    type={showCurrent ? 'text' : 'password'}
                    value={field.state.value}
                    onBlur={field.handleBlur}
                    onChange={(e) => field.handleChange(e.target.value)}
                    disabled={form.state.isSubmitting}
                    className="pr-10"
                    autoComplete="current-password"
                  />
                  <PasswordToggle
                    show={showCurrent}
                    onToggle={() => setShowCurrent((v) => !v)}
                    labelShow={showLabel}
                    labelHide={hideLabel}
                  />
                </div>
                {isInvalid && (
                  <p className="text-sm text-destructive">{field.state.meta.errors[0] as string}</p>
                )}
              </div>
            );
          }}
        </form.Field>

        <form.Field
          name="newPassword"
          validators={{
            onBlur: ({ value }) => (value ? undefined : t('signin.errorPasswordRequired')),
            onSubmit: ({ value }) => (value ? undefined : t('signin.errorPasswordRequired')),
          }}
        >
          {(field) => {
            const isInvalid = field.state.meta.isTouched && field.state.meta.errors.length > 0;
            return (
              <div className="space-y-1.5">
                <Label htmlFor="cp-new" className="text-sm font-medium">
                  {t('profile.newPassword')}
                </Label>
                <div className="relative">
                  <Input
                    id="cp-new"
                    type={showNew ? 'text' : 'password'}
                    value={field.state.value}
                    onBlur={field.handleBlur}
                    onChange={(e) => field.handleChange(e.target.value)}
                    disabled={form.state.isSubmitting}
                    className="pr-10"
                    autoComplete="new-password"
                  />
                  <PasswordToggle
                    show={showNew}
                    onToggle={() => setShowNew((v) => !v)}
                    labelShow={showLabel}
                    labelHide={hideLabel}
                  />
                </div>
                {isInvalid && (
                  <p className="text-sm text-destructive">{field.state.meta.errors[0] as string}</p>
                )}
              </div>
            );
          }}
        </form.Field>

        <form.Field
          name="confirmNewPassword"
          validators={{
            onBlur: ({ value }) => {
              if (!value) return t('signin.errorPasswordRequired');
              if (value !== form.getFieldValue('newPassword'))
                return t('signin.errorPasswordMismatch');
              return undefined;
            },
            onSubmit: ({ value }) => {
              if (!value) return t('signin.errorPasswordRequired');
              if (value !== form.getFieldValue('newPassword'))
                return t('signin.errorPasswordMismatch');
              return undefined;
            },
          }}
        >
          {(field) => {
            const isInvalid = field.state.meta.isTouched && field.state.meta.errors.length > 0;
            return (
              <div className="space-y-1.5">
                <Label htmlFor="cp-confirm" className="text-sm font-medium">
                  {t('profile.confirmNewPassword')}
                </Label>
                <div className="relative">
                  <Input
                    id="cp-confirm"
                    type={showConfirm ? 'text' : 'password'}
                    value={field.state.value}
                    onBlur={field.handleBlur}
                    onChange={(e) => field.handleChange(e.target.value)}
                    disabled={form.state.isSubmitting}
                    className="pr-10"
                    autoComplete="new-password"
                  />
                  <PasswordToggle
                    show={showConfirm}
                    onToggle={() => setShowConfirm((v) => !v)}
                    labelShow={showLabel}
                    labelHide={hideLabel}
                  />
                </div>
                {isInvalid && (
                  <p className="text-sm text-destructive">{field.state.meta.errors[0] as string}</p>
                )}
              </div>
            );
          }}
        </form.Field>

        {passwordError && <p className="text-sm text-destructive">{passwordError}</p>}
        {passwordChanged && (
          <p className="text-sm text-emerald-600 dark:text-emerald-400">
            {t('profile.passwordChanged')}
          </p>
        )}

        <Button
          type="submit"
          className="w-full h-11 font-semibold"
          disabled={form.state.isSubmitting}
        >
          {form.state.isSubmitting ? t('profile.passwordChanging') : t('profile.changePassword')}
        </Button>
      </form>
    </div>
  );
}

// ── LinkEmailForm ────────────────────────────────────────────────────────────

interface LinkEmailFormProps {
  readonly isLinking: boolean;
  readonly onSuccess: () => void;
  readonly onError: (msg: string) => void;
  readonly onRefresh: () => void;
}

function LinkEmailForm({ isLinking, onSuccess, onError, onRefresh }: LinkEmailFormProps) {
  const { t } = useLocale();
  const [showLinkPassword, setShowLinkPassword] = useState(false);

  const showLabel = t('signin.showPassword');
  const hideLabel = t('signin.hidePassword');

  const linkForm = useForm({
    defaultValues: { password: '', confirmPassword: '' },
    onSubmit: async ({ value }) => {
      const currentUser = auth.currentUser;
      if (!currentUser) return;
      try {
        await linkWithCredential(
          currentUser,
          EmailAuthProvider.credential(currentUser.email ?? '', value.password),
        );
        onRefresh();
        onSuccess();
        linkForm.reset();
      } catch (err: unknown) {
        onError(mapLinkError((err as { code?: string }).code ?? '', t));
      }
    },
  });

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        e.stopPropagation();
        linkForm.handleSubmit();
      }}
      className="pl-6 space-y-2 border-l-2 border-border"
    >
      <div className="space-y-1">
        <Label htmlFor="link-email" className="text-sm">
          {t('profile.linkEmailLabel')}
        </Label>
        <Input
          id="link-email"
          type="email"
          value={auth.currentUser?.email ?? ''}
          readOnly
          className="bg-muted/50"
        />
      </div>

      <linkForm.Field
        name="password"
        validators={{
          onBlur: ({ value }) => (value ? undefined : t('signin.errorPasswordRequired')),
          onSubmit: ({ value }) => (value ? undefined : t('signin.errorPasswordRequired')),
        }}
      >
        {(field) => {
          const isInvalid = field.state.meta.isTouched && field.state.meta.errors.length > 0;
          return (
            <div className="space-y-1">
              <Label htmlFor="link-password" className="text-sm">
                {t('profile.linkPasswordLabel')}
              </Label>
              <div className="relative">
                <Input
                  id="link-password"
                  type={showLinkPassword ? 'text' : 'password'}
                  value={field.state.value}
                  onBlur={field.handleBlur}
                  onChange={(e) => field.handleChange(e.target.value)}
                  disabled={isLinking}
                  className="pr-10"
                />
                <PasswordToggle
                  show={showLinkPassword}
                  onToggle={() => setShowLinkPassword((v) => !v)}
                  labelShow={showLabel}
                  labelHide={hideLabel}
                />
              </div>
              {isInvalid && (
                <p className="text-xs text-destructive">{field.state.meta.errors[0] as string}</p>
              )}
            </div>
          );
        }}
      </linkForm.Field>

      <linkForm.Field
        name="confirmPassword"
        validators={{
          onBlur: ({ value }) => {
            if (!value) return t('signin.errorPasswordRequired');
            if (value !== linkForm.getFieldValue('password'))
              return t('signin.errorPasswordMismatch');
            return undefined;
          },
          onSubmit: ({ value }) => {
            if (!value) return t('signin.errorPasswordRequired');
            if (value !== linkForm.getFieldValue('password'))
              return t('signin.errorPasswordMismatch');
            return undefined;
          },
        }}
      >
        {(field) => {
          const isInvalid = field.state.meta.isTouched && field.state.meta.errors.length > 0;
          return (
            <div className="space-y-1">
              <Label htmlFor="link-confirm" className="text-sm">
                {t('profile.linkConfirmPasswordLabel')}
              </Label>
              <Input
                id="link-confirm"
                type={showLinkPassword ? 'text' : 'password'}
                value={field.state.value}
                onBlur={field.handleBlur}
                onChange={(e) => field.handleChange(e.target.value)}
                disabled={isLinking}
              />
              {isInvalid && (
                <p className="text-xs text-destructive">{field.state.meta.errors[0] as string}</p>
              )}
            </div>
          );
        }}
      </linkForm.Field>

      <Button type="submit" size="sm" disabled={linkForm.state.isSubmitting || isLinking}>
        {linkForm.state.isSubmitting || isLinking ? t('profile.linking') : t('profile.linkSubmit')}
      </Button>
    </form>
  );
}

// ── LinkingSection ───────────────────────────────────────────────────────────

interface LinkingSectionProps {
  readonly providers: string[];
  readonly onRefresh: () => void;
}

function LinkingSection({ providers, onRefresh }: LinkingSectionProps) {
  const dispatch = useAppDispatch();
  const { t } = useLocale();
  const [linkError, setLinkError] = useState<string | null>(null);
  const [linkSuccess, setLinkSuccess] = useState<string | null>(null);
  const [isLinking, setIsLinking] = useState(false);
  const [showEmailLinkForm, setShowEmailLinkForm] = useState(false);

  const isGoogleLinked = providers.includes('google.com');
  const isPasswordLinked = providers.includes('password');
  const canUnlink = providers.length > 1;

  const handleLinkGoogle = async () => {
    setLinkError(null);
    setLinkSuccess(null);
    const currentUser = auth.currentUser;
    if (!currentUser) return;
    setIsLinking(true);
    try {
      const result = await linkWithPopup(currentUser, googleProvider);
      onRefresh();
      dispatch(
        setUser({
          uid: currentUser.uid,
          email: currentUser.email ?? '',
          displayName: result.user.displayName ?? currentUser.displayName ?? '',
          photoURL: result.user.photoURL ?? currentUser.photoURL ?? null,
        }),
      );
      setLinkSuccess(t('profile.linkSuccess'));
    } catch (err: unknown) {
      const code = (err as { code?: string }).code ?? '';
      const isDismissed =
        code === 'auth/popup-closed-by-user' || code === 'auth/cancelled-popup-request';
      if (!isDismissed) setLinkError(mapLinkError(code, t));
    } finally {
      setIsLinking(false);
    }
  };

  const handleUnlinkProvider = async (providerId: string) => {
    setLinkError(null);
    setLinkSuccess(null);
    const currentUser = auth.currentUser;
    if (!currentUser) return;
    setIsLinking(true);
    try {
      await unlink(currentUser, providerId);
      onRefresh();
      setLinkSuccess(t('profile.unlinkSuccess'));
    } catch {
      setLinkError(t('profile.error'));
    } finally {
      setIsLinking(false);
    }
  };

  const handleLinkEmailSuccess = () => {
    setLinkSuccess(t('profile.linkSuccess'));
    setShowEmailLinkForm(false);
  };

  const linkedBadge = (
    <Badge variant="secondary" className="text-xs">
      {t('profile.linked')}
    </Badge>
  );

  const googleAction = isGoogleLinked ? (
    <Button
      type="button"
      variant="outline"
      size="sm"
      disabled={isLinking || !canUnlink}
      title={canUnlink ? undefined : t('profile.cannotUnlinkLast')}
      onClick={() => handleUnlinkProvider('google.com')}
    >
      {t('profile.unlinkGoogle')}
    </Button>
  ) : (
    <Button
      type="button"
      variant="outline"
      size="sm"
      disabled={isLinking}
      onClick={handleLinkGoogle}
    >
      {isLinking ? t('profile.linking') : t('profile.linkGoogle')}
    </Button>
  );

  const emailAction = isPasswordLinked ? (
    <Button
      type="button"
      variant="outline"
      size="sm"
      disabled={isLinking || !canUnlink}
      title={canUnlink ? undefined : t('profile.cannotUnlinkLast')}
      onClick={() => handleUnlinkProvider('password')}
    >
      {t('profile.unlinkEmailPassword')}
    </Button>
  ) : (
    <Button
      type="button"
      variant="outline"
      size="sm"
      disabled={isLinking}
      onClick={() => {
        setShowEmailLinkForm((v) => !v);
        setLinkError(null);
      }}
    >
      {t('profile.linkEmailPassword')}
    </Button>
  );

  return (
    <div className="mb-5">
      <SectionDivider label={t('profile.linkingSection')} />
      <div className="rounded-md border bg-muted/30 p-4 space-y-3">
        {/* Google row */}
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <svg className="size-4 shrink-0" viewBox="0 0 24 24" aria-hidden="true">
              <path
                d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z"
                fill="#4285F4"
              />
              <path
                d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                fill="#34A853"
              />
              <path
                d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                fill="#FBBC05"
              />
              <path
                d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                fill="#EA4335"
              />
            </svg>
            <span className="text-sm font-medium">{t('profile.googleProvider')}</span>
            {isGoogleLinked && linkedBadge}
          </div>
          <div className="flex items-center gap-2 shrink-0">{googleAction}</div>
        </div>

        {/* Email/Password row */}
        <div className="space-y-3">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <svg
                className="size-4 shrink-0 text-muted-foreground"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                aria-hidden="true"
              >
                <rect x="2" y="4" width="20" height="16" rx="2" />
                <path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7" />
              </svg>
              <span className="text-sm font-medium">{t('profile.emailPasswordProvider')}</span>
              {isPasswordLinked && linkedBadge}
            </div>
            <div className="flex items-center gap-2 shrink-0">{emailAction}</div>
          </div>

          {showEmailLinkForm && !isPasswordLinked && (
            <LinkEmailForm
              isLinking={isLinking}
              onSuccess={handleLinkEmailSuccess}
              onError={setLinkError}
              onRefresh={onRefresh}
            />
          )}
        </div>

        {linkError && <p className="text-sm text-destructive">{linkError}</p>}
        {linkSuccess && (
          <p className="text-sm text-emerald-600 dark:text-emerald-400">{linkSuccess}</p>
        )}
      </div>
    </div>
  );
}

// ── ProfileDialog ────────────────────────────────────────────────────────────

interface ProfileDialogProps {
  readonly open: boolean;
  readonly onOpenChange: (open: boolean) => void;
}

export function ProfileDialog({ open, onOpenChange }: ProfileDialogProps) {
  const updateProfile = useUpdateProfileMutation();
  const { profile, user } = useAppSelector((s) => s.auth);
  const { t } = useLocale();
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [providers, setProviders] = useState<string[]>([]);

  const refreshProviders = useCallback(() => {
    setProviders(auth.currentUser?.providerData.map((p) => p.providerId) ?? []);
  }, []);

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
      trackEvent('profile_save', { industry: value.industryType, size: value.companySize });
      try {
        await updateProfile.mutateAsync(value);
        setSuccess(true);
        trackEvent('profile_save_success', {
          industry: value.industryType,
          size: value.companySize,
        });
        setTimeout(() => setSuccess(false), 3000);
      } catch (err) {
        const msg = err instanceof ApiError ? err.message : t('profile.error');
        setError(msg);
        trackEvent('profile_save_error', {
          error: err instanceof ApiError ? err.message : 'unknown',
        });
      }
    },
  });

  useEffect(() => {
    if (open && profile) {
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
      refreshProviders();
    }
  }, [open, profile, form, refreshProviders]);

  const isPasswordLinked = providers.includes('password');

  const providerBadges = providers.map((pid) => (
    <span
      key={pid}
      className="text-[10px] text-muted-foreground bg-muted px-2 py-0.5 rounded-full shrink-0"
    >
      {getProviderLabel(pid, t)}
    </span>
  ));

  const userInitial = (user?.displayName || user?.email || 'U').charAt(0);

  const userAvatar = user?.photoURL ? (
    <img
      src={user.photoURL}
      alt=""
      referrerPolicy="no-referrer"
      className="h-10 w-10 rounded-full object-cover shrink-0"
    />
  ) : (
    <div className="h-10 w-10 rounded-full bg-primary/10 text-primary flex items-center justify-center text-sm font-bold uppercase shrink-0">
      {userInitial}
    </div>
  );

  const companyNameSchema = z.string().min(1, t('register.companyNameError'));
  const industryTypeSchema = z.string().min(1, t('register.industryTypeError'));
  const companySizeSchema = z.string().min(1, t('register.companySizeError'));
  const contactNameSchema = z.string().min(1, t('register.contactNameError'));
  const contactEmailSchema = z
    .string()
    .min(1, t('register.contactEmailError'))
    .email(t('register.contactEmailError'));
  const contactPhoneSchema = z.string().min(9, t('register.contactPhoneError'));

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className="max-w-lg max-h-[90vh] overflow-y-auto p-0 gap-0"
        data-testid="profile-dialog"
      >
        <DialogHeader className="px-6 pt-6 pb-4">
          <DialogTitle>{t('profile.title')}</DialogTitle>
          <DialogDescription>{t('profile.subtitle')}</DialogDescription>
        </DialogHeader>

        <form
          onSubmit={(e) => {
            e.preventDefault();
            e.stopPropagation();
            form.handleSubmit();
          }}
          className="px-6 pb-6"
          data-testid="profile-form"
        >
          {/* Section 1: User Account */}
          <div className="mb-5">
            <SectionDivider label={t('profile.userSection')} />
            <div className="rounded-md border bg-muted/30 p-4 space-y-3">
              <div className="flex items-center gap-3">
                {userAvatar}
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium truncate">{user?.displayName}</p>
                  <p className="text-xs text-muted-foreground truncate">{profile?.email}</p>
                </div>
                <div className="flex flex-wrap gap-1 shrink-0">{providerBadges}</div>
              </div>
              {profile?.companyRegId && (
                <>
                  <div className="h-px bg-border" />
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-medium text-muted-foreground">
                      {t('profile.regId')}
                    </span>
                    <span className="text-sm font-mono text-foreground/70 tracking-wide">
                      {profile.companyRegId}
                    </span>
                  </div>
                </>
              )}
            </div>
          </div>

          {/* Section 2: Sign-in Methods */}
          <LinkingSection providers={providers} onRefresh={refreshProviders} />

          {/* Section 3: Contact Person */}
          <div className="mb-5">
            <SectionDivider label={t('profile.contactSection')} />
            <FieldGroup className="gap-3">
              <form.Field
                name="contactName"
                validators={{ onBlur: contactNameSchema, onSubmit: contactNameSchema }}
              >
                {(field) => {
                  const isInvalid =
                    field.state.meta.isTouched && field.state.meta.errors.length > 0;
                  return (
                    <Field data-invalid={isInvalid}>
                      <FieldLabel htmlFor="pd-contactName" className="text-sm font-medium">
                        {t('register.contactName')}
                      </FieldLabel>
                      <Input
                        id="pd-contactName"
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
                        <FieldLabel htmlFor="pd-contactEmail" className="text-sm font-medium">
                          {t('register.contactEmail')}
                        </FieldLabel>
                        <Input
                          id="pd-contactEmail"
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
                        <FieldLabel htmlFor="pd-contactPhone" className="text-sm font-medium">
                          {t('register.contactPhone')}
                        </FieldLabel>
                        <Input
                          id="pd-contactPhone"
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
          </div>

          {/* Section 4: Company Profile */}
          <div className="mb-5">
            <SectionDivider label={t('profile.companySection')} />
            <FieldGroup className="gap-3">
              <form.Field
                name="companyName"
                validators={{ onBlur: companyNameSchema, onSubmit: companyNameSchema }}
              >
                {(field) => {
                  const isInvalid =
                    field.state.meta.isTouched && field.state.meta.errors.length > 0;
                  return (
                    <Field data-invalid={isInvalid}>
                      <FieldLabel htmlFor="pd-companyName" className="text-sm font-medium">
                        {t('register.companyName')}
                      </FieldLabel>
                      <Input
                        id="pd-companyName"
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
                        <FieldLabel htmlFor="pd-industryType" className="text-sm font-medium">
                          {t('register.industryType')}
                        </FieldLabel>
                        <SelectField
                          id="pd-industryType"
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
                        <FieldLabel htmlFor="pd-companySize" className="text-sm font-medium">
                          {t('register.companySize')}
                        </FieldLabel>
                        <SelectField
                          id="pd-companySize"
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
          </div>

          {/* Section 5: Preferences */}
          <div className="mb-5">
            <SectionDivider label={t('profile.preferencesSection')} />
            <div className="flex items-center justify-between gap-4 rounded-md border bg-muted/30 p-4">
              <div className="space-y-0.5">
                <Label
                  htmlFor="pd-emailNotifications"
                  className="text-sm font-medium cursor-pointer"
                >
                  {t('profile.emailNotifications')}
                </Label>
                <p className="text-xs text-muted-foreground">
                  {t('profile.emailNotificationsDesc')}
                </p>
              </div>
              <form.Field name="emailNotifications">
                {(field) => (
                  <Switch
                    id="pd-emailNotifications"
                    checked={field.state.value ?? false}
                    onCheckedChange={(val) => field.handleChange(val)}
                  />
                )}
              </form.Field>
            </div>
          </div>

          {/* Feedback messages */}
          {error && (
            <div className="p-3 rounded-md bg-destructive/10 text-destructive text-sm text-center animate-scale-in mb-4">
              {error}
            </div>
          )}

          {success && (
            <div className="p-3 rounded-md bg-emerald-50 text-emerald-700 border border-emerald-200 text-sm text-center animate-scale-in mb-4">
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
                {t('profile.saved')}
              </span>
            </div>
          )}

          <form.Subscribe selector={(state) => [state.isSubmitting, state.isDirty] as const}>
            {([isSubmitting, isDirty]) => (
              <Button
                type="submit"
                className="w-full h-11 font-semibold"
                disabled={isSubmitting || !isDirty}
                data-testid="profile-submit-btn"
              >
                {isSubmitting ? (
                  <>
                    <SpinnerIcon />
                    {t('profile.saving')}
                  </>
                ) : (
                  t('profile.save')
                )}
              </Button>
            )}
          </form.Subscribe>
        </form>

        {/* Change Password — outside main form, only for email/password accounts */}
        {isPasswordLinked && <ChangePasswordSection />}
      </DialogContent>
    </Dialog>
  );
}
