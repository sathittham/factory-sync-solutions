import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Field, FieldError, FieldGroup, FieldLabel } from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { Switch } from '@/components/ui/switch';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ApiError, api } from '@/lib/api';
import { auth, googleProvider } from '@/lib/firebase';
import { useLocale } from '@/lib/i18n';
import { useAppDispatch, useAppSelector } from '@/store';
import { type Profile, setProfile, setUser } from '@/store/authSlice';
import { useForm } from '@tanstack/react-form';
import {
  EmailAuthProvider,
  linkWithCredential,
  linkWithPopup,
  reauthenticateWithCredential,
  unlink,
  updatePassword,
} from 'firebase/auth';
import { Camera, Eye, EyeOff, X } from 'lucide-react';
import { useCallback, useEffect, useRef, useState } from 'react';
import * as z from 'zod';


function mapPasswordError(code: string, t: (key: string) => string): string {
  if (code === 'auth/wrong-password' || code === 'auth/invalid-credential') {
    return t('profile.errorWrongPassword');
  }
  if (code === 'auth/requires-recent-login') return t('profile.errorRecentLogin');
  if (code === 'auth/weak-password') return t('signin.errorWeakPassword');
  return t('profile.error');
}

function mapLinkError(code: string, t: (key: string) => string): string {
  if (code === 'auth/credential-already-in-use' || code === 'auth/email-already-in-use') {
    return t('profile.errorCredentialInUse');
  }
  if (code === 'auth/weak-password') return t('signin.errorWeakPassword');
  return t('profile.error');
}

// ── Shared helpers ────────────────────────────────────────────────────────────

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

function SectionHeading({ label }: { readonly label: string }) {
  return (
    <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-4">
      {label}
    </p>
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

// ── AvatarUpload ──────────────────────────────────────────────────────────────

const AVATAR_MAX_BYTES = 2 * 1024 * 1024;

interface AvatarUploadResponse {
  avatarURL: string;
  contentType: string;
  fileSizeBytes: number;
}

function AvatarUpload({
  src,
  initial,
  displayName,
}: {
  readonly src: string;
  readonly initial: string;
  readonly displayName: string;
}) {
  const { t } = useLocale();
  const dispatch = useAppDispatch();
  const { profile } = useAppSelector((s) => s.auth);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const hasCustomAvatar = Boolean(profile?.avatarURL);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (inputRef.current) inputRef.current.value = '';
    if (!file || !profile) return;

    if (!file.type.startsWith('image/')) {
      setUploadError(t('profile.avatarTypeError'));
      return;
    }
    if (file.size > AVATAR_MAX_BYTES) {
      setUploadError(t('profile.avatarSizeError'));
      return;
    }

    setUploadError(null);
    setUploading(true);
    try {
      const formData = new FormData();
      formData.append('file', file);
      const uploaded = await api.postForm<AvatarUploadResponse>('/upload/avatar', formData);
      dispatch(setProfile({ ...profile, avatarURL: uploaded.avatarURL }));
    } catch {
      setUploadError(t('profile.avatarError'));
    } finally {
      setUploading(false);
    }
  };

  const handleDelete = async () => {
    if (!profile) return;
    setUploadError(null);
    setUploading(true);
    try {
      await api.delete<void>('/upload/avatar');
      dispatch(setProfile({ ...profile, avatarURL: '' }));
    } catch {
      setUploadError(t('profile.avatarError'));
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="flex flex-col items-center gap-1">
      <div className="relative group">
        <Avatar className="size-16">
          <AvatarImage src={src} alt={displayName} referrerPolicy="no-referrer" className="object-cover" />
          <AvatarFallback className="text-lg font-semibold bg-primary/10 text-primary">
            {initial}
          </AvatarFallback>
        </Avatar>

        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          disabled={uploading}
          className="absolute inset-0 rounded-full bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center cursor-pointer disabled:cursor-not-allowed"
          aria-label={t('profile.avatarUpload')}
        >
          {uploading
            ? <svg className="animate-spin size-4 text-white" viewBox="0 0 24 24" fill="none" aria-hidden="true"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" /><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" /></svg>
            : <Camera className="size-4 text-white" />}
        </button>

        {hasCustomAvatar && !uploading && (
          <button
            type="button"
            onClick={handleDelete}
            className="absolute -top-1 -right-1 size-5 rounded-full bg-destructive text-destructive-foreground flex items-center justify-center hover:bg-destructive/80 transition-colors"
            aria-label={t('profile.avatarDelete')}
          >
            <X className="size-3" />
          </button>
        )}

        <input
          ref={inputRef}
          type="file"
          accept="image/jpeg,image/png,image/webp,image/gif"
          className="sr-only"
          onChange={handleFileChange}
        />
      </div>

      {uploadError && (
        <p className="text-xs text-destructive text-center max-w-[8rem]">{uploadError}</p>
      )}
    </div>
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

  const showLabel = t('signin.showPassword');
  const hideLabel = t('signin.hidePassword');

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

  return (
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
        {form.state.isSubmitting ? (
          <>
            <SpinnerIcon />
            {t('profile.passwordChanging')}
          </>
        ) : (
          t('profile.changePassword')
        )}
      </Button>
    </form>
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
      className="pl-6 space-y-2 border-l-2 border-border mt-2"
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

// ── SignInMethodsCard ────────────────────────────────────────────────────────

interface SignInMethodsCardProps {
  readonly providers: string[];
  readonly onRefresh: () => void;
}

function SignInMethodsCard({ providers, onRefresh }: SignInMethodsCardProps) {
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
    <div className="bg-card rounded-xl border p-5">
      <SectionHeading label={t('profile.linkingSection')} />
      <div className="space-y-3">
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
          <div className="shrink-0">{googleAction}</div>
        </div>

        {/* Email/Password row */}
        <div className="space-y-2">
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
            <div className="shrink-0">{emailAction}</div>
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

// ── Shared submit feedback ────────────────────────────────────────────────────

function SubmitFeedback({
  error,
  success,
  successMsg,
}: {
  readonly error: string | null;
  readonly success: boolean;
  readonly successMsg: string;
}) {
  return (
    <>
      {error && (
        <div className="p-3 rounded-lg bg-destructive/10 text-destructive text-sm text-center animate-scale-in">
          {error}
        </div>
      )}
      {success && (
        <div className="p-3 rounded-lg bg-emerald-50 text-emerald-700 border border-emerald-200 text-sm text-center animate-scale-in dark:bg-emerald-950/30 dark:text-emerald-400 dark:border-emerald-900">
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
            {successMsg}
          </span>
        </div>
      )}
    </>
  );
}

// ── ProfileTab — contact person only ─────────────────────────────────────────

function ProfileTab() {
  const dispatch = useAppDispatch();
  const { profile } = useAppSelector((s) => s.auth);
  const { t } = useLocale();
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const contactNameSchema = z.string().min(1, t('register.contactNameError'));
  const contactEmailSchema = z
    .string()
    .min(1, t('register.contactEmailError'))
    .email(t('register.contactEmailError'));
  const contactPhoneSchema = z.string().min(9, t('register.contactPhoneError'));

  const form = useForm({
    defaultValues: {
      contactName: profile?.contactName || '',
      contactEmail: profile?.contactEmail || '',
      contactPhone: profile?.contactPhone || '',
    },
    onSubmit: async ({ value }) => {
      setError(null);
      setSuccess(false);
      try {
        const updated = await api.put<Profile>('/profile', {
          companyName: profile?.companyName || '',
          industryType: profile?.industryType || '',
          companySize: profile?.companySize || '',
          emailNotifications: profile?.emailNotifications ?? false,
          ...value,
        });
        dispatch(setProfile(updated));
        setSuccess(true);
        setTimeout(() => setSuccess(false), 3000);
      } catch (err) {
        setError(err instanceof ApiError ? err.message : t('profile.error'));
      }
    },
  });

  return (
    <div className="bg-card rounded-xl border p-6">
      <form
        onSubmit={(e) => {
          e.preventDefault();
          e.stopPropagation();
          form.handleSubmit();
        }}
        className="space-y-6"
        data-testid="profile-form"
      >
        {/* Contact Person */}
        <div>
          <SectionHeading label={t('profile.contactSection')} />
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
                    <FieldLabel htmlFor="pp-contactName">{t('register.contactName')}</FieldLabel>
                    <Input
                      id="pp-contactName"
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
                      <FieldLabel htmlFor="pp-contactEmail">
                        {t('register.contactEmail')}
                      </FieldLabel>
                      <Input
                        id="pp-contactEmail"
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
                      <FieldLabel htmlFor="pp-contactPhone">
                        {t('register.contactPhone')}
                      </FieldLabel>
                      <Input
                        id="pp-contactPhone"
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

        <SubmitFeedback error={error} success={success} successMsg={t('profile.saved')} />

        <Button
          type="submit"
          className="w-full h-11 font-semibold"
          disabled={form.state.isSubmitting || !form.state.isDirty}
          data-testid="profile-submit-btn"
        >
          {form.state.isSubmitting ? (
            <>
              <SpinnerIcon />
              {t('profile.saving')}
            </>
          ) : (
            t('profile.save')
          )}
        </Button>
      </form>
    </div>
  );
}

// ── NotificationsTab ──────────────────────────────────────────────────────────

function NotificationsTab() {
  const dispatch = useAppDispatch();
  const { profile } = useAppSelector((s) => s.auth);
  const { t } = useLocale();
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const form = useForm({
    defaultValues: { emailNotifications: profile?.emailNotifications ?? false },
    onSubmit: async ({ value }) => {
      setError(null);
      setSuccess(false);
      try {
        const updated = await api.put<Profile>('/profile', {
          companyName: profile?.companyName || '',
          industryType: profile?.industryType || '',
          companySize: profile?.companySize || '',
          contactName: profile?.contactName || '',
          contactEmail: profile?.contactEmail || '',
          contactPhone: profile?.contactPhone || '',
          ...value,
        });
        dispatch(setProfile(updated));
        setSuccess(true);
        setTimeout(() => setSuccess(false), 3000);
      } catch (err) {
        setError(err instanceof ApiError ? err.message : t('profile.error'));
      }
    },
  });

  return (
    <div className="bg-card rounded-xl border p-6">
      <form
        onSubmit={(e) => {
          e.preventDefault();
          e.stopPropagation();
          form.handleSubmit();
        }}
        className="space-y-6"
      >
        <div>
          <SectionHeading label={t('profile.preferencesSection')} />
          <form.Field name="emailNotifications">
            {(field) => (
              <div className="flex items-center justify-between gap-4 rounded-lg border bg-muted/30 p-4">
                <div className="space-y-0.5">
                  <Label
                    htmlFor="notif-emailNotifications"
                    className="text-sm font-medium cursor-pointer"
                  >
                    {t('profile.emailNotifications')}
                  </Label>
                  <p className="text-xs text-muted-foreground">
                    {t('profile.emailNotificationsDesc')}
                  </p>
                </div>
                <Switch
                  id="notif-emailNotifications"
                  checked={field.state.value ?? false}
                  onCheckedChange={(val) => field.handleChange(val)}
                />
              </div>
            )}
          </form.Field>
        </div>

        <SubmitFeedback error={error} success={success} successMsg={t('profile.saved')} />

        <Button
          type="submit"
          className="w-full h-11 font-semibold"
          disabled={form.state.isSubmitting || !form.state.isDirty}
        >
          {form.state.isSubmitting ? (
            <>
              <SpinnerIcon />
              {t('profile.saving')}
            </>
          ) : (
            t('profile.save')
          )}
        </Button>
      </form>
    </div>
  );
}

// ── ActivityTab ───────────────────────────────────────────────────────────────

interface ActivityEvent {
  id: string;
  eventType: string;
  createdAt: string;
  metadata?: Record<string, unknown>;
}

const EVENT_ICONS: Record<string, string> = {
  'user.login': '🔐',
  'user.registered': '✅',
  'user.profile_updated': '✏️',
  'user.role_changed': '🔄',
  'assessment.submitted': '📋',
};

function parseUserAgent(ua: string): string {
  let browser = 'Unknown';
  if (ua.includes('Edg')) browser = 'Edge';
  else if (ua.includes('OPR') || ua.includes('Opera')) browser = 'Opera';
  else if (ua.includes('Chrome')) browser = 'Chrome';
  else if (ua.includes('Firefox')) browser = 'Firefox';
  else if (ua.includes('Safari')) browser = 'Safari';

  let os = '';
  if (ua.includes('iPhone')) os = 'iPhone';
  else if (ua.includes('iPad')) os = 'iPad';
  else if (ua.includes('Android')) os = 'Android';
  else if (ua.includes('Windows')) os = 'Windows';
  else if (ua.includes('Mac OS X')) os = 'macOS';
  else if (ua.includes('Linux')) os = 'Linux';

  return os ? `${browser} · ${os}` : browser;
}

function ActivityTab() {
  const { t } = useLocale();
  const [events, setEvents] = useState<ActivityEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [fetchError, setFetchError] = useState(false);

  useEffect(() => {
    let cancelled = false;
    api
      .get<ActivityEvent[]>('/profile/activity')
      .then((data) => {
        if (!cancelled) setEvents(data);
      })
      .catch(() => {
        if (!cancelled) setFetchError(true);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const formatLabel = (eventType: string) => {
    const key = `profile.activity.${eventType.replace('.', '_')}`;
    const label = t(key);
    return label === key ? eventType : label;
  };

  return (
    <div className="bg-card rounded-xl border divide-y">
      {loading && (
        <div className="p-6 space-y-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="flex items-center gap-3 animate-pulse">
              <div className="size-8 rounded-full bg-muted shrink-0" />
              <div className="flex-1 space-y-1.5">
                <div className="h-3.5 bg-muted rounded w-40" />
                <div className="h-3 bg-muted rounded w-24" />
              </div>
            </div>
          ))}
        </div>
      )}

      {!loading && (fetchError || events.length === 0) && (
        <div className="p-10 text-center text-muted-foreground text-sm">
          {t('profile.activityEmpty')}
        </div>
      )}

      {!loading &&
        !fetchError &&
        events.map((ev) => {
          const icon = EVENT_ICONS[ev.eventType] ?? '📄';
          const ua = ev.eventType === 'user.login' && typeof ev.metadata?.userAgent === 'string'
            ? parseUserAgent(ev.metadata.userAgent)
            : null;
          return (
            <div key={ev.id} className="flex items-center gap-3 px-5 py-4">
              <span className="text-lg shrink-0" aria-hidden="true">
                {icon}
              </span>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium">{formatLabel(ev.eventType)}</p>
                {ua && <p className="text-xs text-muted-foreground">{ua}</p>}
                <p className="text-xs text-muted-foreground">
                  {new Date(ev.createdAt).toLocaleString()}
                </p>
              </div>
            </div>
          );
        })}
    </div>
  );
}

// ── SecurityTab ───────────────────────────────────────────────────────────────

interface SecurityTabProps {
  readonly providers: string[];
  readonly onRefreshProviders: () => void;
}

function SecurityTab({ providers, onRefreshProviders }: SecurityTabProps) {
  const { t } = useLocale();
  const isPasswordLinked = providers.includes('password');

  return (
    <div className="space-y-4">
      <SignInMethodsCard providers={providers} onRefresh={onRefreshProviders} />

      {isPasswordLinked && (
        <div className="bg-card rounded-xl border p-5">
          <SectionHeading label={t('profile.securitySection')} />
          <ChangePasswordSection />
        </div>
      )}
    </div>
  );
}

// ── ProfilePage ───────────────────────────────────────────────────────────────

export function ProfilePage() {
  const { profile, user } = useAppSelector((s) => s.auth);
  const { t } = useLocale();
  const [providers, setProviders] = useState<string[]>([]);

  const refreshProviders = useCallback(() => {
    setProviders(auth.currentUser?.providerData.map((p) => p.providerId) ?? []);
  }, []);

  useEffect(() => {
    refreshProviders();
  }, [refreshProviders]);

  const displayName = user?.displayName || profile?.contactName || user?.email || '';
  const initial = displayName.charAt(0).toUpperCase();

  const providerBadges = providers.map((pid) => (
    <span
      key={pid}
      className="text-[10px] text-muted-foreground bg-muted px-2 py-0.5 rounded-full"
    >
      {pid === 'google.com' ? t('profile.googleProvider') : t('profile.emailPasswordProvider')}
    </span>
  ));

  return (
    <div className="min-h-[calc(100vh-3.5rem)] p-4 sm:p-6 lg:p-8">
      <div className="w-full max-w-2xl mx-auto space-y-6">
        {/* Page header */}
        <div>
          <h1 className="text-2xl font-bold tracking-tight">{t('profile.title')}</h1>
          <p className="text-sm text-muted-foreground mt-1">{t('profile.subtitle')}</p>
        </div>

        {/* Account info card — read-only */}
        <div className="bg-card rounded-xl border p-5">
          <SectionHeading label={t('profile.userSection')} />
          <div className="flex items-center gap-4">
            <AvatarUpload
              src={profile?.avatarURL || user?.photoURL || ''}
              initial={initial}
              displayName={displayName}
            />
            <div className="min-w-0 flex-1 space-y-1">
              <p className="font-semibold truncate">{displayName}</p>
              <p className="text-sm text-muted-foreground truncate">{user?.email}</p>
              <div className="flex flex-wrap gap-1">{providerBadges}</div>
            </div>
          </div>

          {profile?.companyRegId && (
            <>
              <Separator className="my-4" />
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

        {/* Tabs */}
        <Tabs defaultValue="profile">
          <TabsList className="grid grid-cols-4 w-full sm:w-auto sm:inline-flex">
            <TabsTrigger value="profile">{t('profile.tabProfile')}</TabsTrigger>
            <TabsTrigger value="notifications">{t('profile.tabNotifications')}</TabsTrigger>
            <TabsTrigger value="activity">{t('profile.tabActivity')}</TabsTrigger>
            <TabsTrigger value="security">{t('profile.tabSecurity')}</TabsTrigger>
          </TabsList>

          <TabsContent value="profile" className="mt-4">
            <ProfileTab />
          </TabsContent>

          <TabsContent value="notifications" className="mt-4">
            <NotificationsTab />
          </TabsContent>

          <TabsContent value="activity" className="mt-4">
            <ActivityTab />
          </TabsContent>

          <TabsContent value="security" className="mt-4">
            <SecurityTab providers={providers} onRefreshProviders={refreshProviders} />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
