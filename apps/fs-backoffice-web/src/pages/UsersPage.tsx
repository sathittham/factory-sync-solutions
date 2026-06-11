import { backofficeApi } from '@/api/backoffice';
import type { UserProfile } from '@/api/types';
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
import { Search } from 'lucide-react';
import { useEffect, useState } from 'react';

function roleBadge(role: string) {
  if (role === 'admin') return <Badge className="bg-violet-100 text-violet-800 dark:bg-violet-900 dark:text-violet-200">admin</Badge>;
  return <Badge variant="secondary">user</Badge>;
}

export function UsersPage() {
  const { t, locale } = useLocale();
  const { isSuperAdmin } = useAppSelector((s) => s.auth);

  const [users, setUsers] = useState<UserProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const [detailUser, setDetailUser] = useState<UserProfile | null>(null);
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
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">{t('users.title')}</h1>

      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          className="pl-9"
          placeholder={t('common.search')}
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      {error && <p className="text-sm text-destructive">{error}</p>}

      <Card>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b bg-muted/40">
                  <th className="px-4 py-3 text-left font-medium">{t('users.name')}</th>
                  <th className="hidden px-4 py-3 text-left font-medium md:table-cell">{t('users.email')}</th>
                  <th className="px-4 py-3 text-left font-medium">{t('users.company')}</th>
                  <th className="px-4 py-3 text-left font-medium">{t('users.role')}</th>
                  <th className="hidden px-4 py-3 text-left font-medium lg:table-cell">{t('users.registered')}</th>
                  <th className="px-4 py-3 text-right font-medium">{t('common.actions')}</th>
                </tr>
              </thead>
              <tbody>
                {(() => {
                  if (loading) {
                    return ['s1','s2','s3','s4','s5'].map((k) => (
                      <tr key={k} className="border-b">
                        <td className="px-4 py-3"><Skeleton className="h-4 w-32" /></td>
                        <td className="hidden px-4 py-3 md:table-cell"><Skeleton className="h-4 w-40" /></td>
                        <td className="px-4 py-3"><Skeleton className="h-4 w-28" /></td>
                        <td className="px-4 py-3"><Skeleton className="h-4 w-16" /></td>
                        <td className="hidden px-4 py-3 lg:table-cell"><Skeleton className="h-4 w-24" /></td>
                        <td className="px-4 py-3" />
                      </tr>
                    ));
                  }
                  if (filtered.length === 0) {
                    return (
                      <tr>
                        <td colSpan={6} className="px-4 py-8 text-center text-muted-foreground">
                          {t('common.noData')}
                        </td>
                      </tr>
                    );
                  }
                  return filtered.map((u) => (
                    <tr key={u.uid} className="border-b hover:bg-muted/30">
                      <td className="px-4 py-3 font-medium">{u.displayName || '—'}</td>
                      <td className="hidden px-4 py-3 text-muted-foreground md:table-cell">{u.email}</td>
                      <td className="px-4 py-3">{u.companyName}</td>
                      <td className="px-4 py-3">{roleBadge(u.role)}</td>
                      <td className="hidden px-4 py-3 text-muted-foreground lg:table-cell">
                        {formatDateTime(u.createdAt, locale, false)}
                      </td>
                      <td className="px-4 py-3 text-right">
                        <div className="flex justify-end gap-2">
                          <Button size="sm" variant="outline" onClick={() => setDetailUser(u)}>
                            {t('common.view')}
                          </Button>
                          {isSuperAdmin && (
                            <Button size="sm" variant="destructive" onClick={() => setDeleteTarget(u)}>
                              {t('common.delete')}
                            </Button>
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

      {/* User detail dialog */}
      <Dialog open={detailUser !== null} onOpenChange={(open) => { if (!open) setDetailUser(null); }}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{t('users.profileDetail')}</DialogTitle>
          </DialogHeader>
          {detailUser && (
            <div className="grid grid-cols-2 gap-x-6 gap-y-3 text-sm">
              {([
                ['users.name', detailUser.displayName],
                ['users.email', detailUser.email],
                ['users.company', detailUser.companyName],
                ['users.regId', detailUser.companyRegId],
                ['users.industry', detailUser.industryType],
                ['users.size', detailUser.companySize],
                ['users.contactName', detailUser.contactName],
                ['users.contactEmail', detailUser.contactEmail],
                ['users.contactPhone', detailUser.contactPhone],
                ['users.role', detailUser.role],
              ] as [string, string][]).map(([key, val]) => (
                <div key={key}>
                  <p className="text-xs text-muted-foreground">{t(key)}</p>
                  <p className="font-medium">{val || '—'}</p>
                </div>
              ))}
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Delete confirmation dialog */}
      <Dialog open={deleteTarget !== null} onOpenChange={(open) => { if (!open) setDeleteTarget(null); }}>
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
    </div>
  );
}
