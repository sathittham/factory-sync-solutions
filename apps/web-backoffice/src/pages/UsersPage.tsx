import { backofficeApi } from '@/api/backoffice';
import type { UserProfile } from '@/api/types';
import { AuditActivityDialog } from '@/components/AuditActivityDialog';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import { formatDateTime } from '@/lib/dayjs';
import { useLocale } from '@/lib/i18n';
import { useAppSelector } from '@/store';
import { PageHeader, PageLayout } from '@shared/ui/PageLayout';
import { Search } from 'lucide-react';
import { useEffect, useState } from 'react';

function roleBadge(role: string, fallback: string) {
  if (role === 'owner' || role === 'admin' || role === 'system_admin') return <Badge>{role}</Badge>;
  return <Badge variant="secondary">{role || fallback}</Badge>;
}

function getAvatarURL(user: UserProfile) {
  return user.photoURL || user.avatarURL || '';
}

function getInitials(user: UserProfile) {
  const source = user.displayName || user.email;
  const parts = source.trim().split(/\s+/).filter(Boolean);
  if (parts.length >= 2) {
    return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
  }
  return source.slice(0, 2).toUpperCase() || '?';
}

function SectionDivider({ label }: { readonly label: string }) {
  return (
    <div className="flex items-center gap-3">
      <span className="h-px flex-1 bg-border" />
      <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
        {label}
      </p>
      <span className="h-px flex-1 bg-border" />
    </div>
  );
}

interface ProfileValueProps {
  readonly label: string;
  readonly value?: string | null;
  readonly fallback: string;
  readonly className?: string;
}

function ProfileValue({ label, value, fallback, className }: ProfileValueProps) {
  return (
    <div className={className}>
      <p className="text-xs font-medium text-muted-foreground">{label}</p>
      <p className="mt-1 break-words text-sm font-medium">{value || fallback}</p>
    </div>
  );
}

interface UserProfileDialogProps {
  readonly user: UserProfile | null;
  readonly locale: string;
  readonly t: (key: string) => string;
  readonly onOpenChange: (open: boolean) => void;
}

function UserProfileDialog({ user, locale, t, onOpenChange }: UserProfileDialogProps) {
  const fallback = t('common.notAvailable');

  return (
    <Dialog open={user !== null} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] max-w-lg overflow-y-auto p-0 gap-0">
        <DialogHeader className="px-6 pt-6 pb-4">
          <DialogTitle>{t('users.profileDetail')}</DialogTitle>
        </DialogHeader>
        {user && (
          <div className="flex flex-col gap-5 px-6 pb-6">
            <section className="flex flex-col gap-4">
              <SectionDivider label={t('users.userSection')} />
              <div className="flex flex-col gap-3 rounded-md border bg-muted/30 p-4">
                <div className="flex items-center gap-3">
                  <Avatar className="size-10">
                    <AvatarImage src={getAvatarURL(user)} alt={user.displayName || user.email} />
                    <AvatarFallback className="text-sm font-medium">
                      {getInitials(user)}
                    </AvatarFallback>
                  </Avatar>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium">{user.displayName || fallback}</p>
                    <p className="truncate text-xs text-muted-foreground">{user.email}</p>
                  </div>
                  <div className="shrink-0">{roleBadge(user.role, t('users.roleUser'))}</div>
                </div>
                <div className="h-px bg-border" />
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                  <ProfileValue
                    label={t('users.accountEmail')}
                    value={user.email}
                    fallback={fallback}
                  />
                  <ProfileValue
                    label={t('users.registered')}
                    value={formatDateTime(user.createdAt, locale, false)}
                    fallback={fallback}
                  />
                </div>
              </div>
            </section>

            <section className="flex flex-col gap-4">
              <SectionDivider label={t('users.contactSection')} />
              <div className="rounded-md border bg-muted/30 p-4">
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                  <ProfileValue
                    className="sm:col-span-2"
                    label={t('users.contactName')}
                    value={user.contactName}
                    fallback={fallback}
                  />
                  <ProfileValue
                    label={t('users.contactEmail')}
                    value={user.contactEmail}
                    fallback={fallback}
                  />
                  <ProfileValue
                    label={t('users.contactPhone')}
                    value={user.contactPhone}
                    fallback={fallback}
                  />
                </div>
              </div>
            </section>

            <section className="flex flex-col gap-4">
              <SectionDivider label={t('users.companySection')} />
              <div className="rounded-md border bg-muted/30 p-4">
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                  <ProfileValue
                    className="sm:col-span-2"
                    label={t('users.company')}
                    value={user.companyName}
                    fallback={fallback}
                  />
                  <ProfileValue
                    label={t('users.regId')}
                    value={user.companyRegId}
                    fallback={fallback}
                  />
                  <ProfileValue
                    label={t('users.industry')}
                    value={user.industryType}
                    fallback={fallback}
                  />
                  <ProfileValue
                    label={t('users.size')}
                    value={user.companySize}
                    fallback={fallback}
                  />
                </div>
              </div>
            </section>

            <section className="flex flex-col gap-4">
              <SectionDivider label={t('users.preferencesSection')} />
              <div className="flex items-center justify-between gap-4 rounded-md border bg-muted/30 p-4">
                <div>
                  <p className="text-sm font-medium">{t('users.emailNotifications')}</p>
                  <p className="text-xs text-muted-foreground">
                    {t('users.emailNotificationsDesc')}
                  </p>
                </div>
                <Badge variant={user.emailNotifications ? 'default' : 'secondary'}>
                  {user.emailNotifications ? t('common.active') : t('common.inactive')}
                </Badge>
              </div>
            </section>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

export function UsersPage() {
  const { t, locale } = useLocale();
  const { isSuperAdmin } = useAppSelector((s) => s.auth);

  const [users, setUsers] = useState<UserProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const [detailUser, setDetailUser] = useState<UserProfile | null>(null);
  const [activityUser, setActivityUser] = useState<UserProfile | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<UserProfile | null>(null);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    backofficeApi
      .listUsers()
      .then(setUsers)
      .catch(() => setError(t('common.error')))
      .finally(() => setLoading(false));
  }, [t]);

  const filtered = users.filter((u) => {
    const q = search.toLowerCase();
    return (
      u.displayName.toLowerCase().includes(q) ||
      u.email.toLowerCase().includes(q) ||
      u.companyName.toLowerCase().includes(q)
    );
  });

  async function handleDelete() {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await backofficeApi.deleteUser(deleteTarget.uid);
      setUsers((prev) => prev.filter((u) => u.uid !== deleteTarget.uid));
      setDeleteTarget(null);
    } catch {
      setError(t('common.error'));
    } finally {
      setDeleting(false);
    }
  }

  return (
    <PageLayout fluid>
      <PageHeader title={t('users.title')} description={t('users.subtitle')} />

      {error && <p className="text-sm text-destructive">{error}</p>}

      <div className="flex flex-col gap-6">
        <div className="relative max-w-sm">
          <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            className="pl-9"
            placeholder={t('common.search')}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>

        <Card>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b bg-muted/40">
                    <th className="px-4 py-3 text-left font-medium">{t('users.name')}</th>
                    <th className="px-4 py-3 text-left font-medium">{t('users.company')}</th>
                    <th className="hidden px-4 py-3 text-left font-medium lg:table-cell">
                      {t('users.registered')}
                    </th>
                    <th className="px-4 py-3 text-right font-medium">{t('common.actions')}</th>
                  </tr>
                </thead>
                <tbody>
                  {(() => {
                    if (loading) {
                      return ['s1', 's2', 's3', 's4', 's5'].map((k) => (
                        <tr key={k} className="border-b">
                          <td className="px-4 py-3">
                            <div className="flex items-center gap-3">
                              <Skeleton className="size-10 rounded-full" />
                              <div className="space-y-1">
                                <Skeleton className="h-4 w-32" />
                                <Skeleton className="h-3 w-40" />
                              </div>
                            </div>
                          </td>
                          <td className="px-4 py-3">
                            <Skeleton className="h-4 w-28" />
                          </td>
                          <td className="hidden px-4 py-3 lg:table-cell">
                            <Skeleton className="h-4 w-24" />
                          </td>
                          <td className="px-4 py-3" />
                        </tr>
                      ));
                    }
                    if (filtered.length === 0) {
                      return (
                        <tr>
                          <td colSpan={4} className="px-4 py-8 text-center text-muted-foreground">
                            {t('common.noData')}
                          </td>
                        </tr>
                      );
                    }
                    return filtered.map((u) => (
                      <tr
                        key={u.uid}
                        className="cursor-pointer border-b hover:bg-muted/30"
                        onClick={() => setDetailUser(u)}
                        onKeyDown={(event) => {
                          if (event.key === 'Enter') setDetailUser(u);
                        }}
                        tabIndex={0}
                      >
                        <td className="px-4 py-3">
                          <div className="flex min-w-48 items-center gap-3">
                            <Avatar className="size-10">
                              <AvatarImage src={getAvatarURL(u)} alt={u.displayName || u.email} />
                              <AvatarFallback className="text-sm font-medium">
                                {getInitials(u)}
                              </AvatarFallback>
                            </Avatar>
                            <div className="min-w-0">
                              <div className="flex items-center gap-2">
                                <span className="font-medium truncate">
                                  {u.displayName || t('common.notAvailable')}
                                </span>
                                {roleBadge(u.role, t('users.roleUser'))}
                              </div>
                              <div className="truncate text-xs text-muted-foreground">
                                {u.email}
                              </div>
                            </div>
                          </div>
                        </td>
                        <td className="px-4 py-3">{u.companyName}</td>
                        <td className="hidden px-4 py-3 text-muted-foreground lg:table-cell">
                          {formatDateTime(u.createdAt, locale, false)}
                        </td>
                        <td className="px-4 py-3 text-right">
                          <div className="flex justify-end gap-2">
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={(event) => {
                                event.stopPropagation();
                                setDetailUser(u);
                              }}
                            >
                              {t('common.view')}
                            </Button>
                            {isSuperAdmin && (
                              <>
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={(event) => {
                                    event.stopPropagation();
                                    setActivityUser(u);
                                  }}
                                >
                                  {t('audit.viewActivity')}
                                </Button>
                                <Button
                                  size="sm"
                                  variant="destructive"
                                  onClick={(event) => {
                                    event.stopPropagation();
                                    setDeleteTarget(u);
                                  }}
                                >
                                  {t('common.delete')}
                                </Button>
                              </>
                            )}
                          </div>
                        </td>
                      </tr>
                    ));
                  })()}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      </div>

      <UserProfileDialog
        user={detailUser}
        locale={locale}
        t={t}
        onOpenChange={(open) => {
          if (!open) setDetailUser(null);
        }}
      />

      <AuditActivityDialog
        open={activityUser !== null}
        uid={activityUser?.uid ?? ''}
        title={t('audit.userActivity')}
        description={activityUser?.email}
        onOpenChange={(open) => {
          if (!open) setActivityUser(null);
        }}
      />

      {/* Delete confirmation dialog */}
      <Dialog
        open={deleteTarget !== null}
        onOpenChange={(open) => {
          if (!open) setDeleteTarget(null);
        }}
      >
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>{t('users.deleteConfirm')}</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">{t('users.deleteConfirmDesc')}</p>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setDeleteTarget(null)} disabled={deleting}>
              {t('common.cancel')}
            </Button>
            <Button variant="destructive" onClick={handleDelete} disabled={deleting}>
              {deleting ? '…' : t('common.delete')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </PageLayout>
  );
}
