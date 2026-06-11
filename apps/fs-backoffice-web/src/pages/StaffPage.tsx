import { backofficeApi } from '@/api/backoffice';
import type { StaffMember } from '@/api/types';
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
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { useLocale } from '@/lib/i18n';
import { UserPlus } from 'lucide-react';
import { useEffect, useState } from 'react';

type BackofficeRole = 'superadmin' | 'staff';

function roleBadge(role: string) {
  if (role === 'superadmin') return <Badge className="bg-violet-100 text-violet-800 dark:bg-violet-900 dark:text-violet-200">superadmin</Badge>;
  return <Badge className="bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200">staff</Badge>;
}

export function StaffPage() {
  const { t } = useLocale();

  const [staff, setStaff] = useState<StaffMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Change role dialog
  const [changeTarget, setChangeTarget] = useState<StaffMember | null>(null);
  const [newRole, setNewRole] = useState<BackofficeRole>('staff');
  const [saving, setSaving] = useState(false);

  // Revoke access dialog
  const [revokeTarget, setRevokeTarget] = useState<StaffMember | null>(null);
  const [revoking, setRevoking] = useState(false);

  // Add staff dialog
  const [addOpen, setAddOpen] = useState(false);
  const [addUID, setAddUID] = useState('');
  const [addRole, setAddRole] = useState<BackofficeRole>('staff');
  const [adding, setAdding] = useState(false);

  useEffect(() => {
    backofficeApi
      .listStaff()
      .then(setStaff)
      .catch(() => setError(t('common.error')))
      .finally(() => setLoading(false));
  }, [t]);

  function openChangeRole(member: StaffMember) {
    setChangeTarget(member);
    setNewRole(member.backofficeRole as BackofficeRole);
  }

  async function handleChangeRole() {
    if (!changeTarget) return;
    setSaving(true);
    try {
      const updated = await backofficeApi.setStaffRole(changeTarget.uid, newRole);
      setStaff((prev) => prev.map((s) => s.uid === updated.uid ? updated : s));
      setChangeTarget(null);
    } catch {
      setError(t('common.error'));
    } finally {
      setSaving(false);
    }
  }

  async function handleRevoke() {
    if (!revokeTarget) return;
    setRevoking(true);
    try {
      await backofficeApi.revokeStaffRole(revokeTarget.uid);
      setStaff((prev) => prev.filter((s) => s.uid !== revokeTarget.uid));
      setRevokeTarget(null);
    } catch {
      setError(t('common.error'));
    } finally {
      setRevoking(false);
    }
  }

  async function handleAddStaff() {
    if (!addUID.trim()) return;
    setAdding(true);
    try {
      const member = await backofficeApi.setStaffRole(addUID.trim(), addRole);
      setStaff((prev) => {
        const exists = prev.some((s) => s.uid === member.uid);
        return exists ? prev.map((s) => s.uid === member.uid ? member : s) : [...prev, member];
      });
      setAddOpen(false);
      setAddUID('');
      setAddRole('staff');
    } catch {
      setError(t('common.error'));
    } finally {
      setAdding(false);
    }
  }

  function renderBody() {
    if (loading) {
      return ['s1','s2','s3'].map((k) => (
        <tr key={k} className="border-b">
          <td className="px-4 py-3"><Skeleton className="h-4 w-32" /></td>
          <td className="px-4 py-3"><Skeleton className="h-4 w-40" /></td>
          <td className="px-4 py-3"><Skeleton className="h-4 w-20" /></td>
          <td className="px-4 py-3" />
        </tr>
      ));
    }
    if (staff.length === 0) {
      return (
        <tr>
          <td colSpan={4} className="px-4 py-8 text-center text-muted-foreground">
            {t('common.noData')}
          </td>
        </tr>
      );
    }
    return staff.map((s) => (
      <tr key={s.uid} className="border-b">
        <td className="px-4 py-3 font-medium">{s.displayName || '—'}</td>
        <td className="px-4 py-3 text-muted-foreground">{s.email}</td>
        <td className="px-4 py-3">{roleBadge(s.backofficeRole)}</td>
        <td className="px-4 py-3 text-right">
          <div className="flex justify-end gap-2">
            <Button size="sm" variant="outline" onClick={() => openChangeRole(s)}>
              {t('staff.changeRole')}
            </Button>
            <Button size="sm" variant="destructive" onClick={() => setRevokeTarget(s)}>
              {t('common.remove')}
            </Button>
          </div>
        </td>
      </tr>
    ));
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">{t('staff.title')}</h1>
        <Button size="sm" onClick={() => setAddOpen(true)}>
          <UserPlus className="mr-2 h-4 w-4" />
          {t('staff.addStaff')}
        </Button>
      </div>

      {error && <p className="text-sm text-destructive">{error}</p>}

      <Card>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b bg-muted/40">
                  <th className="px-4 py-3 text-left font-medium">{t('staff.name')}</th>
                  <th className="px-4 py-3 text-left font-medium">{t('staff.email')}</th>
                  <th className="px-4 py-3 text-left font-medium">{t('staff.role')}</th>
                  <th className="px-4 py-3 text-right font-medium">{t('common.actions')}</th>
                </tr>
              </thead>
              <tbody>{renderBody()}</tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* Change role dialog */}
      <Dialog open={changeTarget !== null} onOpenChange={(open) => { if (!open) setChangeTarget(null); }}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>{t('staff.changeRole')}</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">{changeTarget?.email}</p>
          <Select value={newRole} onValueChange={(v) => setNewRole(v as BackofficeRole)}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="superadmin">superadmin</SelectItem>
              <SelectItem value="staff">staff</SelectItem>
            </SelectContent>
          </Select>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setChangeTarget(null)} disabled={saving}>
              {t('common.cancel')}
            </Button>
            <Button onClick={handleChangeRole} disabled={saving}>
              {saving ? '…' : t('common.confirm')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Revoke access dialog */}
      <Dialog open={revokeTarget !== null} onOpenChange={(open) => { if (!open) setRevokeTarget(null); }}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>{t('staff.revokeConfirm')}</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">{t('staff.revokeConfirmDesc')}</p>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setRevokeTarget(null)} disabled={revoking}>
              {t('common.cancel')}
            </Button>
            <Button variant="destructive" onClick={handleRevoke} disabled={revoking}>
              {revoking ? '…' : t('common.confirm')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Add staff dialog */}
      <Dialog open={addOpen} onOpenChange={(open) => { if (!open) { setAddOpen(false); setAddUID(''); } }}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>{t('staff.addStaff')}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-1.5">
              <Label>{t('staff.uid')}</Label>
              <Input
                placeholder="Firebase UID"
                value={addUID}
                onChange={(e) => setAddUID(e.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <Label>{t('staff.selectRole')}</Label>
              <Select value={addRole} onValueChange={(v) => setAddRole(v as BackofficeRole)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="superadmin">superadmin</SelectItem>
                  <SelectItem value="staff">staff</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setAddOpen(false)} disabled={adding}>
              {t('common.cancel')}
            </Button>
            <Button onClick={handleAddStaff} disabled={adding || !addUID.trim()}>
              {adding ? '…' : t('common.add')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
