import { backofficeApi } from '@/api/backoffice';
import type { StaffMember } from '@/api/types';
import { AuditActivityDialog } from '@/components/AuditActivityDialog';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { ApiError } from '@/lib/api';
import { useLocale } from '@/lib/i18n';
import { PageHeader, PageLayout } from '@shared/ui/PageLayout';
import { Check, ShieldCheck, UserPlus } from 'lucide-react';
import { useEffect, useState } from 'react';

type BackofficeRole = 'superadmin' | 'staff';
type PermissionMatrixRole = BackofficeRole;

const permissionMatrixColumns: PermissionMatrixRole[] = ['staff', 'superadmin'];

const permissionColumnLabelKeys: Record<PermissionMatrixRole, string> = {
  staff: 'backofficePermissions.roleStaff',
  superadmin: 'backofficePermissions.roleSuperAdmin',
};

const permissionMatrix = [
  { featureKey: 'backofficePermissions.dashboard', staff: true, superadmin: true },
  { featureKey: 'backofficePermissions.projects', staff: true, superadmin: true },
  { featureKey: 'backofficePermissions.projectSettings', staff: true, superadmin: true },
  { featureKey: 'backofficePermissions.projectLifecycle', staff: false, superadmin: true },
  { featureKey: 'backofficePermissions.projectMembers', staff: true, superadmin: true },
  { featureKey: 'backofficePermissions.users', staff: true, superadmin: true },
  { featureKey: 'backofficePermissions.deleteUsers', staff: false, superadmin: true },
  { featureKey: 'backofficePermissions.resultsExport', staff: true, superadmin: true },
  { featureKey: 'backofficePermissions.staffManagement', staff: false, superadmin: true },
  { featureKey: 'backofficePermissions.apiDocs', staff: false, superadmin: true },
] as const;

function roleBadge(role: string) {
  if (role === 'superadmin') return <Badge>superadmin</Badge>;
  return <Badge variant="secondary">staff</Badge>;
}

function getInitials(member: StaffMember) {
  const source = member.displayName || member.email;
  const parts = source.trim().split(/\s+/).filter(Boolean);
  if (parts.length >= 2) {
    return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
  }
  return source.slice(0, 2).toUpperCase();
}

function PermissionIndicator({ granted }: Readonly<{ granted: boolean }>) {
  if (granted) {
    return (
      <span className="mx-auto inline-flex size-5 items-center justify-center rounded-full bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300">
        <Check aria-hidden="true" className="size-3" />
      </span>
    );
  }

  return <span className="mx-auto block h-1 w-4 rounded-full bg-muted-foreground/25" />;
}

function PermissionMatrixDialog({
  open,
  onClose,
  t,
}: Readonly<{ open: boolean; onClose: () => void; t: (key: string) => string }>) {
  return (
    <Dialog
      open={open}
      onOpenChange={(nextOpen) => {
        if (!nextOpen) onClose();
      }}
    >
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <ShieldCheck aria-hidden="true" className="size-5 text-primary" />
            {t('backofficePermissions.title')}
          </DialogTitle>
          <DialogDescription>{t('backofficePermissions.description')}</DialogDescription>
        </DialogHeader>

        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b bg-muted/40">
                <th className="w-[52%] px-4 py-3 text-left font-medium text-muted-foreground">
                  {t('backofficePermissions.feature')}
                </th>
                {permissionMatrixColumns.map((column) => (
                  <th
                    key={column}
                    className="px-4 py-3 text-center font-medium text-muted-foreground"
                  >
                    {t(permissionColumnLabelKeys[column])}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {permissionMatrix.map((row) => (
                <tr key={row.featureKey} className="border-b last:border-0 hover:bg-muted/30">
                  <td className="px-4 py-3">{t(row.featureKey)}</td>
                  {permissionMatrixColumns.map((column) => (
                    <td
                      key={column}
                      className="px-4 py-3 text-center data-[role=superadmin]:bg-primary/5"
                      data-role={column}
                    >
                      <PermissionIndicator granted={row[column]} />
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function isValidEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

export function StaffPage() {
  const { t } = useLocale();

  const [staff, setStaff] = useState<StaffMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const [activityTarget, setActivityTarget] = useState<StaffMember | null>(null);

  // Change role dialog
  const [changeTarget, setChangeTarget] = useState<StaffMember | null>(null);
  const [newRole, setNewRole] = useState<BackofficeRole>('staff');
  const [saving, setSaving] = useState(false);

  // Revoke access dialog
  const [revokeTarget, setRevokeTarget] = useState<StaffMember | null>(null);
  const [revoking, setRevoking] = useState(false);

  // Add staff dialog
  const [addOpen, setAddOpen] = useState(false);
  const [addEmail, setAddEmail] = useState('');
  const [addRole, setAddRole] = useState<BackofficeRole>('staff');
  const [addError, setAddError] = useState('');
  const [adding, setAdding] = useState(false);
  const [permissionsOpen, setPermissionsOpen] = useState(false);

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
      setStaff((prev) => prev.map((s) => (s.uid === updated.uid ? updated : s)));
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
    const email = addEmail.trim();
    if (!email) {
      setAddError(t('staff.inviteEmailRequired'));
      return;
    }
    if (!isValidEmail(email)) {
      setAddError(t('staff.inviteEmailInvalid'));
      return;
    }

    setAdding(true);
    setAddError('');
    setSuccessMessage('');
    try {
      const member = await backofficeApi.inviteStaff({ email, backofficeRole: addRole });
      setStaff((prev) => {
        const exists = prev.some((s) => s.uid === member.uid);
        return exists ? prev.map((s) => (s.uid === member.uid ? member : s)) : [...prev, member];
      });
      setAddOpen(false);
      setAddEmail('');
      setAddRole('staff');
      setSuccessMessage(t('staff.inviteSent'));
    } catch (err: unknown) {
      if (err instanceof ApiError && err.status === 403) {
        setAddError(t('staff.inviteForbidden'));
      } else {
        setAddError(t('staff.inviteError'));
      }
    } finally {
      setAdding(false);
    }
  }

  function renderBody() {
    if (loading) {
      return ['s1', 's2', 's3'].map((k) => (
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
          <td className="px-4 py-3" />
        </tr>
      ));
    }
    if (staff.length === 0) {
      return (
        <tr>
          <td colSpan={2} className="px-4 py-8 text-center text-muted-foreground">
            {t('common.noData')}
          </td>
        </tr>
      );
    }
    return staff.map((s) => (
      <tr key={s.uid} className="border-b">
        <td className="px-4 py-3">
          <div className="flex items-center gap-3">
            <Avatar className="size-10">
              <AvatarImage src={s.photoURL} alt={s.displayName || s.email} />
              <AvatarFallback className="text-sm font-medium">{getInitials(s)}</AvatarFallback>
            </Avatar>
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <span className="font-medium truncate">{s.displayName || '—'}</span>
                {roleBadge(s.backofficeRole)}
              </div>
              <div className="truncate text-xs text-muted-foreground">{s.email}</div>
            </div>
          </div>
        </td>
        <td className="px-4 py-3 text-right">
          <div className="flex justify-end gap-2">
            <Button size="sm" variant="outline" onClick={() => setActivityTarget(s)}>
              {t('audit.viewActivity')}
            </Button>
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
    <PageLayout className="max-w-6xl">
      <PageHeader
        title={t('staff.title')}
        actions={
          <div className="flex flex-wrap justify-end gap-2">
            <Button size="sm" variant="outline" onClick={() => setPermissionsOpen(true)}>
              <ShieldCheck data-icon="inline-start" />
              {t('backofficePermissions.title')}
            </Button>
            <Button size="sm" onClick={() => setAddOpen(true)}>
              <UserPlus data-icon="inline-start" />
              {t('staff.addStaff')}
            </Button>
          </div>
        }
      />

      {error && <p className="text-sm text-destructive">{error}</p>}
      {successMessage && <p className="text-sm text-primary">{successMessage}</p>}

      <div className="flex flex-col gap-6">
        <Card>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b bg-muted/40">
                    <th className="px-4 py-3 text-left font-medium">{t('staff.name')}</th>
                    <th className="px-4 py-3 text-right font-medium">{t('common.actions')}</th>
                  </tr>
                </thead>
                <tbody>{renderBody()}</tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Change role dialog */}
      <Dialog
        open={changeTarget !== null}
        onOpenChange={(open) => {
          if (!open) setChangeTarget(null);
        }}
      >
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
      <Dialog
        open={revokeTarget !== null}
        onOpenChange={(open) => {
          if (!open) setRevokeTarget(null);
        }}
      >
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
      <Dialog
        open={addOpen}
        onOpenChange={(open) => {
          if (!open) {
            setAddOpen(false);
            setAddEmail('');
            setAddError('');
          }
        }}
      >
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>{t('staff.addStaff')}</DialogTitle>
            <DialogDescription>{t('staff.inviteStaffDesc')}</DialogDescription>
          </DialogHeader>
          <div className="flex flex-col gap-4">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="staff-invite-email">{t('staff.email')}</Label>
              <Input
                id="staff-invite-email"
                type="email"
                autoComplete="email"
                placeholder={t('staff.inviteEmailPlaceholder')}
                value={addEmail}
                onChange={(e) => {
                  setAddEmail(e.target.value);
                  setAddError('');
                }}
                aria-invalid={Boolean(addError)}
                disabled={adding}
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label>{t('staff.selectRole')}</Label>
              <Select value={addRole} onValueChange={(v) => setAddRole(v as BackofficeRole)}>
                <SelectTrigger disabled={adding}>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="superadmin">superadmin</SelectItem>
                  <SelectItem value="staff">staff</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          {addError && (
            <p role="alert" className="text-sm text-destructive">
              {addError}
            </p>
          )}
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setAddOpen(false)} disabled={adding}>
              {t('common.cancel')}
            </Button>
            <Button onClick={handleAddStaff} disabled={adding || !addEmail.trim()}>
              {adding ? t('staff.inviteSending') : t('staff.inviteSend')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <PermissionMatrixDialog
        open={permissionsOpen}
        onClose={() => setPermissionsOpen(false)}
        t={t}
      />
      <AuditActivityDialog
        open={activityTarget !== null}
        uid={activityTarget?.uid ?? ''}
        title={t('audit.staffActivity')}
        description={activityTarget?.email}
        onOpenChange={(open) => {
          if (!open) setActivityTarget(null);
        }}
      />
    </PageLayout>
  );
}
