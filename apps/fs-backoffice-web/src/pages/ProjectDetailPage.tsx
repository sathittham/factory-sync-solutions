import { backofficeApi } from '@/api/backoffice';
import type { Member, Project } from '@/api/types';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Dialog,
  DialogContent,
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { formatDateTime } from '@/lib/dayjs';
import { useLocale } from '@/lib/i18n';
import { useAppSelector } from '@/store';
import { useState, useEffect } from 'react';
import { useParams } from 'react-router';

type ProjectRole = 'owner' | 'system_admin' | 'manager' | 'general_user';

const ROLE_BADGE_CLASS: Record<ProjectRole, string> = {
  owner: 'bg-violet-100 text-violet-800 border-violet-200',
  system_admin: 'bg-blue-100 text-blue-800 border-blue-200',
  manager: 'bg-amber-100 text-amber-800 border-amber-200',
  general_user: 'bg-gray-100 text-gray-700 border-gray-200',
};

function roleBadgeClass(role: string): string {
  return ROLE_BADGE_CLASS[role as ProjectRole] ?? ROLE_BADGE_CLASS.general_user;
}

interface ChangeRoleDialogProps {
  member: Member | null;
  onClose: () => void;
  onConfirm: (uid: string, role: string) => Promise<void>;
}

function ChangeRoleDialog({ member, onClose, onConfirm }: ChangeRoleDialogProps) {
  const { t } = useLocale();
  const [role, setRole] = useState<string>(member?.projectRole ?? 'general_user');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (member) setRole(member.projectRole);
  }, [member]);

  const handleConfirm = async () => {
    if (!member) return;
    setSaving(true);
    await onConfirm(member.uid, role);
    setSaving(false);
  };

  return (
    <Dialog open={member !== null} onOpenChange={(open) => { if (!open) onClose(); }}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{t('projects.changeRole')}</DialogTitle>
        </DialogHeader>
        <div className="space-y-3 py-2">
          <p className="text-sm text-muted-foreground">{member?.displayName}</p>
          <Select value={role} onValueChange={setRole}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="owner">owner</SelectItem>
              <SelectItem value="system_admin">system_admin</SelectItem>
              <SelectItem value="manager">manager</SelectItem>
              <SelectItem value="general_user">general_user</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={saving}>
            {t('common.cancel')}
          </Button>
          <Button onClick={handleConfirm} disabled={saving}>
            {t('common.confirm')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

interface RemoveMemberDialogProps {
  member: Member | null;
  onClose: () => void;
  onConfirm: (uid: string) => Promise<void>;
}

function RemoveMemberDialog({ member, onClose, onConfirm }: RemoveMemberDialogProps) {
  const { t } = useLocale();
  const [removing, setRemoving] = useState(false);

  const handleConfirm = async () => {
    if (!member) return;
    setRemoving(true);
    await onConfirm(member.uid);
    setRemoving(false);
  };

  return (
    <Dialog open={member !== null} onOpenChange={(open) => { if (!open) onClose(); }}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{t('projects.removeConfirm')}</DialogTitle>
        </DialogHeader>
        <p className="text-sm text-muted-foreground">{t('projects.removeConfirmDesc')}</p>
        <p className="text-sm font-medium">{member?.displayName}</p>
        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={removing}>
            {t('common.cancel')}
          </Button>
          <Button variant="destructive" onClick={handleConfirm} disabled={removing}>
            {t('common.remove')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export function ProjectDetailPage() {
  const { projectID } = useParams<{ projectID: string }>();
  const { t, locale } = useLocale();
  const isSuperAdmin = useAppSelector((s) => s.auth.isSuperAdmin);

  const [project, setProject] = useState<Project | null>(null);
  const [members, setMembers] = useState<Member[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Settings form state
  const [settingsName, setSettingsName] = useState('');
  const [settingsIndustry, setSettingsIndustry] = useState('');
  const [settingsSize, setSettingsSize] = useState('');
  const [savingSettings, setSavingSettings] = useState(false);

  // Dialog state
  const [changeRoleMember, setChangeRoleMember] = useState<Member | null>(null);
  const [removeMember, setRemoveMember] = useState<Member | null>(null);

  // Deactivate/reactivate
  const [togglingStatus, setTogglingStatus] = useState(false);

  useEffect(() => {
    if (!projectID) return;
    let cancelled = false;

    async function fetchData() {
      setLoading(true);
      setError(null);
      try {
        const [proj, mems] = await Promise.all([
          backofficeApi.getProject(projectID as string),
          backofficeApi.listMembers(projectID as string),
        ]);
        if (!cancelled) {
          setProject(proj);
          setMembers(mems);
          setSettingsName(proj.name);
          setSettingsIndustry(proj.industryType);
          setSettingsSize(proj.companySize);
        }
      } catch {
        if (!cancelled) setError(t('common.error'));
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    fetchData();
    return () => { cancelled = true; };
  }, [projectID, t]);

  const handleSaveSettings = async () => {
    if (!projectID) return;
    setSavingSettings(true);
    try {
      const updated = await backofficeApi.updateProject(projectID, {
        name: settingsName,
        industryType: settingsIndustry,
        companySize: settingsSize,
      });
      setProject(updated);
    } catch {
      setError(t('common.error'));
    } finally {
      setSavingSettings(false);
    }
  };

  const handleToggleStatus = async () => {
    if (!projectID || !project) return;
    setTogglingStatus(true);
    try {
      const updated = project.isActive
        ? await backofficeApi.deactivateProject(projectID)
        : await backofficeApi.reactivateProject(projectID);
      setProject(updated);
    } catch {
      setError(t('common.error'));
    } finally {
      setTogglingStatus(false);
    }
  };

  const handleChangeRoleConfirm = async (uid: string, role: string) => {
    if (!projectID) return;
    try {
      await backofficeApi.changeMemberRole(projectID, uid, role);
      setMembers((prev) =>
        prev.map((m) => (m.uid === uid ? { ...m, projectRole: role } : m)),
      );
    } catch {
      setError(t('common.error'));
    } finally {
      setChangeRoleMember(null);
    }
  };

  const handleRemoveMemberConfirm = async (uid: string) => {
    if (!projectID) return;
    try {
      await backofficeApi.removeMember(projectID, uid);
      setMembers((prev) => prev.filter((m) => m.uid !== uid));
    } catch {
      setError(t('common.error'));
    } finally {
      setRemoveMember(null);
    }
  };

  const pageTitle = loading ? (
    <Skeleton className="h-7 w-48" />
  ) : (
    <h1 className="text-2xl font-bold">{project?.name ?? `Project #${projectID}`}</h1>
  );

  const toggleButton = isSuperAdmin && project && (
    <Button
      variant={project.isActive ? 'destructive' : 'default'}
      size="sm"
      onClick={handleToggleStatus}
      disabled={togglingStatus}
      className={project.isActive ? '' : 'bg-emerald-600 hover:bg-emerald-700'}
    >
      {project.isActive ? t('projects.deactivate') : t('projects.reactivate')}
    </Button>
  );

  const memberRows = loading
    ? ['sk-m1', 'sk-m2', 'sk-m3'].map((id) => (
        <tr key={id} className="border-b">
          <td className="px-4 py-3"><Skeleton className="h-5 w-32" /></td>
          <td className="px-4 py-3"><Skeleton className="h-5 w-40" /></td>
          <td className="px-4 py-3"><Skeleton className="h-5 w-20" /></td>
          <td className="px-4 py-3"><Skeleton className="h-5 w-24" /></td>
          <td className="px-4 py-3"><Skeleton className="h-8 w-28" /></td>
        </tr>
      ))
    : members.map((m) => (
        <tr key={m.uid} className="border-b last:border-0 hover:bg-muted/30">
          <td className="px-4 py-3 font-medium">{m.displayName}</td>
          <td className="px-4 py-3 text-muted-foreground">{m.email}</td>
          <td className="px-4 py-3">
            <span
              className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold ${roleBadgeClass(m.projectRole)}`}
            >
              {m.projectRole}
            </span>
          </td>
          <td className="px-4 py-3 text-muted-foreground text-sm">
            {formatDateTime(m.joinedAt, locale, false)}
          </td>
          <td className="px-4 py-3">
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setChangeRoleMember(m)}
              >
                {t('projects.changeRole')}
              </Button>
              <Button
                variant="destructive"
                size="sm"
                onClick={() => setRemoveMember(m)}
              >
                {t('common.remove')}
              </Button>
            </div>
          </td>
        </tr>
      ));

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          {pageTitle}
          <p className="text-sm text-muted-foreground">{t('projects.title')}</p>
        </div>
        {toggleButton}
      </div>

      {error && <p className="text-sm text-destructive">{error}</p>}

      <Tabs defaultValue="members">
        <TabsList>
          <TabsTrigger value="members">{t('projects.membersTab')}</TabsTrigger>
          <TabsTrigger value="settings">{t('projects.settingsTab')}</TabsTrigger>
        </TabsList>

        <TabsContent value="members">
          <Card>
            <CardContent className="p-0">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b bg-muted/50">
                    <th className="px-4 py-3 text-left font-medium">{t('projects.name')}</th>
                    <th className="px-4 py-3 text-left font-medium">{t('projects.email')}</th>
                    <th className="px-4 py-3 text-left font-medium">{t('projects.role')}</th>
                    <th className="px-4 py-3 text-left font-medium">{t('projects.joined')}</th>
                    <th className="px-4 py-3 text-left font-medium">{t('common.actions')}</th>
                  </tr>
                </thead>
                <tbody>{memberRows}</tbody>
              </table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="settings">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">{t('projects.settingsTab')}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {loading ? (
                <div className="space-y-3">
                  <Skeleton className="h-10 w-full" />
                  <Skeleton className="h-10 w-full" />
                  <Skeleton className="h-10 w-full" />
                </div>
              ) : (
                <>
                  <div className="space-y-1.5">
                    <Label htmlFor="settings-name">{t('projects.companyName')}</Label>
                    <Input
                      id="settings-name"
                      value={settingsName}
                      onChange={(e) => setSettingsName(e.target.value)}
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="settings-industry">{t('projects.industryType')}</Label>
                    <Input
                      id="settings-industry"
                      value={settingsIndustry}
                      onChange={(e) => setSettingsIndustry(e.target.value)}
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label>{t('projects.companySize')}</Label>
                    <Select value={settingsSize} onValueChange={setSettingsSize}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="small">{t('projects.small')}</SelectItem>
                        <SelectItem value="medium">{t('projects.medium')}</SelectItem>
                        <SelectItem value="large">{t('projects.large')}</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <Button onClick={handleSaveSettings} disabled={savingSettings}>
                    {t('projects.saveSettings')}
                  </Button>
                </>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      <ChangeRoleDialog
        member={changeRoleMember}
        onClose={() => setChangeRoleMember(null)}
        onConfirm={handleChangeRoleConfirm}
      />
      <RemoveMemberDialog
        member={removeMember}
        onClose={() => setRemoveMember(null)}
        onConfirm={handleRemoveMemberConfirm}
      />
    </div>
  );
}
