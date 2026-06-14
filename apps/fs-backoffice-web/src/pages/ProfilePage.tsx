import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useLocale } from '@/lib/i18n';
import { useAppSelector } from '@/store';
import { PageHeader, PageLayout } from '@shared/ui/PageLayout';
import { Mail, ShieldCheck, User } from 'lucide-react';

function getInitial(displayName: string, email: string): string {
  const source = displayName || email;
  const parts = source.trim().split(/\s+/).filter(Boolean);
  if (parts.length >= 2) {
    return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
  }
  return source.slice(0, 2).toUpperCase() || '?';
}

function roleBadge(role: string | null, t: (key: string) => string) {
  if (role === 'superadmin') return <Badge>{t('nav.superAdmin')}</Badge>;
  if (role === 'staff') return <Badge variant="secondary">{t('nav.staffRole')}</Badge>;
  return <Badge variant="secondary">{t('common.notAvailable')}</Badge>;
}

interface ProfileFieldProps {
  readonly label: string;
  readonly value?: string | null;
  readonly fallback: string;
}

function ProfileField({ label, value, fallback }: ProfileFieldProps) {
  return (
    <div>
      <p className="text-xs font-medium text-muted-foreground">{label}</p>
      <p className="mt-1 break-words text-sm font-medium">{value || fallback}</p>
    </div>
  );
}

export function ProfilePage() {
  const { t } = useLocale();
  const { user, backofficeRole } = useAppSelector((s) => s.auth);
  const fallback = t('common.notAvailable');

  if (!user) return null;

  const displayName = user.displayName || user.email;
  const initial = getInitial(user.displayName, user.email);

  return (
    <PageLayout className="max-w-3xl">
      <PageHeader title={t('profile.title')} description={t('profile.subtitle')} />

      <div className="flex flex-col gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <User aria-hidden="true" className="size-4 text-primary" />
              {t('profile.accountSection')}
            </CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-5">
            <div className="flex items-center gap-4 rounded-md border bg-muted/30 p-4">
              <Avatar className="size-12">
                <AvatarImage src={user.photoURL ?? undefined} alt={displayName} />
                <AvatarFallback className="text-base font-medium">{initial}</AvatarFallback>
              </Avatar>
              <div className="min-w-0 flex-1">
                <p className="truncate text-base font-semibold">{displayName}</p>
                <p className="truncate text-sm text-muted-foreground">{user.email}</p>
              </div>
              <div className="shrink-0">{roleBadge(backofficeRole, t)}</div>
            </div>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <ProfileField
                label={t('profile.displayName')}
                value={user.displayName}
                fallback={fallback}
              />
              <ProfileField label={t('profile.email')} value={user.email} fallback={fallback} />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <ShieldCheck aria-hidden="true" className="size-4 text-primary" />
              {t('profile.backofficeSection')}
            </CardTitle>
          </CardHeader>
          <CardContent className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <ProfileField
              label={t('profile.backofficeRole')}
              value={backofficeRole ? t(`profile.role.${backofficeRole}`) : ''}
              fallback={fallback}
            />
            <ProfileField label={t('profile.uid')} value={user.uid} fallback={fallback} />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Mail aria-hidden="true" className="size-4 text-primary" />
              {t('profile.contactSection')}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ProfileField label={t('profile.email')} value={user.email} fallback={fallback} />
          </CardContent>
        </Card>
      </div>
    </PageLayout>
  );
}
