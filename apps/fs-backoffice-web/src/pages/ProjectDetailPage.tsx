import { backofficeApi } from '@/api/backoffice';
import type { Assessment, Member, Project } from '@/api/types';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { formatDateTime } from '@/lib/dayjs';
import { useLocale } from '@/lib/i18n';
import { useAppSelector } from '@/store';
import { PageHeader, PageLayout } from '@shared/ui/PageLayout';
import { ChevronDown, ChevronRight, UserPlus } from 'lucide-react';
import { Fragment, useEffect, useState } from 'react';
import { useParams } from 'react-router';

type ProjectRole = 'owner' | 'system_admin' | 'manager' | 'general_user';

const ROLE_BADGE_VARIANT: Record<ProjectRole, 'default' | 'secondary' | 'outline'> = {
  owner: 'default',
  system_admin: 'outline',
  manager: 'secondary',
  general_user: 'secondary',
};

function roleBadgeVariant(role: string): 'default' | 'secondary' | 'outline' {
  return ROLE_BADGE_VARIANT[role as ProjectRole] ?? ROLE_BADGE_VARIANT.general_user;
}

function diagnosisBadge(diagnosis: string) {
  const map: Record<string, 'default' | 'secondary' | 'destructive' | 'outline'> = {
    Beginning: 'destructive',
    Developing: 'secondary',
    Established: 'outline',
    Advanced: 'default',
  };
  return <Badge variant={map[diagnosis] ?? 'secondary'}>{diagnosis}</Badge>;
}

function scoreClassName(score: number): string {
  if (score >= 4) return 'font-semibold text-primary';
  if (score >= 3) return 'font-semibold';
  if (score >= 2) return 'font-semibold text-muted-foreground';
  return 'font-semibold text-destructive';
}

function isValidEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
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
    <Dialog
      open={member !== null}
      onOpenChange={(open) => {
        if (!open) onClose();
      }}
    >
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{t('projects.changeRole')}</DialogTitle>
        </DialogHeader>
        <div className="flex flex-col gap-3 py-2">
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
    <Dialog
      open={member !== null}
      onOpenChange={(open) => {
        if (!open) onClose();
      }}
    >
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

interface ProjectQuizTabProps {
  readonly loading: boolean;
  readonly results: Assessment[];
  readonly expandedResultID: string | null;
  readonly setExpandedResultID: (id: string | null) => void;
  readonly t: (key: string) => string;
  readonly locale: string;
}

interface ProjectQuizResultRowsProps {
  readonly result: Assessment;
  readonly expanded: boolean;
  readonly onToggle: () => void;
  readonly t: (key: string) => string;
  readonly locale: string;
}

function ProjectQuizResultRows({
  result,
  expanded,
  onToggle,
  t,
  locale,
}: ProjectQuizResultRowsProps) {
  return (
    <Fragment>
      <tr className="border-b last:border-0 hover:bg-muted/30">
        <td className="px-4 py-3">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="-ml-2 justify-start px-2"
            onClick={onToggle}
          >
            {expanded ? (
              <ChevronDown data-icon="inline-start" />
            ) : (
              <ChevronRight data-icon="inline-start" />
            )}
            {result.quizId || t('common.notAvailable')}
          </Button>
        </td>
        <td className={`px-4 py-3 ${scoreClassName(result.overallScore)}`}>
          {result.overallScore.toFixed(2)}
        </td>
        <td className="px-4 py-3">{diagnosisBadge(result.diagnosis)}</td>
        <td className="px-4 py-3 text-muted-foreground text-sm">
          {formatDateTime(result.submittedAt, locale, false)}
        </td>
      </tr>
      {expanded && (
        <tr className="bg-muted/20">
          <td colSpan={4} className="px-6 py-4">
            <div className="grid gap-4 sm:grid-cols-2">
              {result.scores?.length > 0 && (
                <div>
                  <p className="mb-2 text-xs font-semibold uppercase text-muted-foreground">
                    {t('results.dimensions')}
                  </p>
                  <div className="flex flex-col gap-1">
                    {result.scores.map((score) => (
                      <div key={score.dimensionID} className="flex justify-between gap-3 text-sm">
                        <span>{score.dimensionName || score.dimensionID}</span>
                        <span className={scoreClassName(score.score)}>
                          {score.score.toFixed(2)}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
              <div className="flex flex-col gap-3">
                {result.strengths?.length > 0 && (
                  <div>
                    <p className="mb-1 text-xs font-semibold uppercase text-muted-foreground">
                      {t('results.strengths')}
                    </p>
                    <ul className="flex list-disc flex-col gap-0.5 pl-4 text-sm">
                      {result.strengths.map((strength) => (
                        <li key={strength}>{strength}</li>
                      ))}
                    </ul>
                  </div>
                )}
                {result.weaknesses?.length > 0 && (
                  <div>
                    <p className="mb-1 text-xs font-semibold uppercase text-muted-foreground">
                      {t('results.weaknesses')}
                    </p>
                    <ul className="flex list-disc flex-col gap-0.5 pl-4 text-sm">
                      {result.weaknesses.map((weakness) => (
                        <li key={weakness}>{weakness}</li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            </div>
          </td>
        </tr>
      )}
    </Fragment>
  );
}

function ProjectQuizTab({
  loading,
  results,
  expandedResultID,
  setExpandedResultID,
  t,
  locale,
}: ProjectQuizTabProps) {
  let tableBody = ['sk-q1', 'sk-q2', 'sk-q3'].map((id) => (
    <tr key={id} className="border-b">
      <td className="px-4 py-3">
        <Skeleton className="h-5 w-28" />
      </td>
      <td className="px-4 py-3">
        <Skeleton className="h-5 w-16" />
      </td>
      <td className="px-4 py-3">
        <Skeleton className="h-5 w-24" />
      </td>
      <td className="px-4 py-3">
        <Skeleton className="h-5 w-28" />
      </td>
    </tr>
  ));

  if (!loading && results.length === 0) {
    tableBody = [
      <tr key="empty-quiz">
        <td colSpan={4} className="px-4 py-8 text-center text-muted-foreground">
          {t('common.noData')}
        </td>
      </tr>,
    ];
  }

  if (!loading && results.length > 0) {
    tableBody = results.map((result) => {
      const expanded = expandedResultID === result.id;
      return (
        <ProjectQuizResultRows
          key={result.id}
          result={result}
          expanded={expanded}
          onToggle={() => setExpandedResultID(expanded ? null : result.id)}
          t={t}
          locale={locale}
        />
      );
    });
  }

  return (
    <TabsContent value="quiz">
      <Card>
        <CardHeader>
          <CardTitle className="text-base">{t('projects.quizTab')}</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b bg-muted/50">
                  <th className="px-4 py-3 text-left font-medium">{t('results.quizId')}</th>
                  <th className="px-4 py-3 text-left font-medium">{t('results.score')}</th>
                  <th className="px-4 py-3 text-left font-medium">{t('results.diagnosis')}</th>
                  <th className="px-4 py-3 text-left font-medium">{t('results.date')}</th>
                </tr>
              </thead>
              <tbody>{tableBody}</tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </TabsContent>
  );
}

export function ProjectDetailPage() {
  const { projectID } = useParams<{ projectID: string }>();
  const { t, locale } = useLocale();
  const isSuperAdmin = useAppSelector((s) => s.auth.isSuperAdmin);

  const [project, setProject] = useState<Project | null>(null);
  const [members, setMembers] = useState<Member[]>([]);
  const [results, setResults] = useState<Assessment[]>([]);
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
  const [inviteOpen, setInviteOpen] = useState(false);
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteError, setInviteError] = useState('');
  const [inviteSuccess, setInviteSuccess] = useState('');
  const [inviting, setInviting] = useState(false);
  const [expandedResultID, setExpandedResultID] = useState<string | null>(null);

  // Deactivate/reactivate
  const [togglingStatus, setTogglingStatus] = useState(false);

  useEffect(() => {
    if (!projectID) return;
    let cancelled = false;

    async function fetchData() {
      setLoading(true);
      setError(null);
      try {
        const [proj, mems, projectResults] = await Promise.all([
          backofficeApi.getProject(projectID as string),
          backofficeApi.listMembers(projectID as string),
          backofficeApi.listResults({ projectID: projectID as string }),
        ]);
        if (!cancelled) {
          setProject(proj);
          setMembers(mems);
          setResults(projectResults);
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
    return () => {
      cancelled = true;
    };
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
      setMembers((prev) => prev.map((m) => (m.uid === uid ? { ...m, projectRole: role } : m)));
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

  const handleInviteOwner = async () => {
    if (!projectID) return;
    const email = inviteEmail.trim();
    if (!email) {
      setInviteError(t('projects.ownerEmailRequired'));
      return;
    }
    if (!isValidEmail(email)) {
      setInviteError(t('projects.ownerEmailInvalid'));
      return;
    }

    setInviting(true);
    setInviteError('');
    setInviteSuccess('');
    try {
      await backofficeApi.inviteOwner(projectID, email);
      setInviteOpen(false);
      setInviteEmail('');
      setInviteSuccess(t('projects.ownerInviteSent'));
    } catch {
      setInviteError(t('projects.ownerInviteError'));
    } finally {
      setInviting(false);
    }
  };

  const pageTitle = loading ? (
    <Skeleton className="h-7 w-48" />
  ) : (
    (project?.name ?? `Project #${projectID}`)
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
          <td className="px-4 py-3">
            <Skeleton className="h-5 w-32" />
          </td>
          <td className="px-4 py-3">
            <Skeleton className="h-5 w-40" />
          </td>
          <td className="px-4 py-3">
            <Skeleton className="h-5 w-20" />
          </td>
          <td className="px-4 py-3">
            <Skeleton className="h-5 w-24" />
          </td>
          <td className="px-4 py-3">
            <Skeleton className="h-8 w-28" />
          </td>
        </tr>
      ))
    : members.map((m) => (
        <tr key={m.uid} className="border-b last:border-0 hover:bg-muted/30">
          <td className="px-4 py-3 font-medium">{m.displayName}</td>
          <td className="px-4 py-3 text-muted-foreground">{m.email}</td>
          <td className="px-4 py-3">
            <Badge variant={roleBadgeVariant(m.projectRole)}>{m.projectRole}</Badge>
          </td>
          <td className="px-4 py-3 text-muted-foreground text-sm">
            {formatDateTime(m.joinedAt, locale, false)}
          </td>
          <td className="px-4 py-3">
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={() => setChangeRoleMember(m)}>
                {t('projects.changeRole')}
              </Button>
              <Button variant="destructive" size="sm" onClick={() => setRemoveMember(m)}>
                {t('common.remove')}
              </Button>
            </div>
          </td>
        </tr>
      ));

  return (
    <PageLayout fluid>
      <PageHeader title={pageTitle} description={project?.companyRegId} actions={toggleButton} />

      {error && <p className="text-sm text-destructive">{error}</p>}
      {inviteSuccess && <p className="text-sm text-primary">{inviteSuccess}</p>}

      <div className="flex flex-col gap-6">
        <Tabs defaultValue="quiz">
          <TabsList>
            <TabsTrigger value="quiz">{t('projects.quizTab')}</TabsTrigger>
            <TabsTrigger value="members">{t('projects.membersTab')}</TabsTrigger>
            <TabsTrigger value="settings">{t('projects.settingsTab')}</TabsTrigger>
          </TabsList>

          <ProjectQuizTab
            loading={loading}
            results={results}
            expandedResultID={expandedResultID}
            setExpandedResultID={setExpandedResultID}
            t={t}
            locale={locale}
          />

          <TabsContent value="members">
            <Card>
              <CardHeader className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <CardTitle className="text-base">{t('projects.membersTab')}</CardTitle>
                <Button size="sm" onClick={() => setInviteOpen(true)} disabled={loading}>
                  <UserPlus data-icon="inline-start" />
                  {t('projects.inviteOwner')}
                </Button>
              </CardHeader>
              <CardContent className="p-0">
                <div className="overflow-x-auto">
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
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="settings">
            <Card>
              <CardHeader>
                <CardTitle className="text-base">{t('projects.settingsTab')}</CardTitle>
              </CardHeader>
              <CardContent className="flex flex-col gap-4">
                {loading ? (
                  <div className="flex flex-col gap-3">
                    <Skeleton className="h-10 w-full" />
                    <Skeleton className="h-10 w-full" />
                    <Skeleton className="h-10 w-full" />
                  </div>
                ) : (
                  <>
                    <div className="flex flex-col gap-1.5">
                      <Label htmlFor="settings-name">{t('projects.companyName')}</Label>
                      <Input
                        id="settings-name"
                        value={settingsName}
                        onChange={(e) => setSettingsName(e.target.value)}
                      />
                    </div>
                    <div className="flex flex-col gap-1.5">
                      <Label htmlFor="settings-industry">{t('projects.industryType')}</Label>
                      <Input
                        id="settings-industry"
                        value={settingsIndustry}
                        onChange={(e) => setSettingsIndustry(e.target.value)}
                      />
                    </div>
                    <div className="flex flex-col gap-1.5">
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
      </div>

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

      <Dialog
        open={inviteOpen}
        onOpenChange={(open) => {
          setInviteOpen(open);
          if (!open) {
            setInviteEmail('');
            setInviteError('');
          }
        }}
      >
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>{t('projects.inviteOwner')}</DialogTitle>
            <DialogDescription>{t('projects.inviteOwnerDesc')}</DialogDescription>
          </DialogHeader>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="project-owner-email">{t('projects.ownerEmail')}</Label>
            <Input
              id="project-owner-email"
              type="email"
              autoComplete="email"
              value={inviteEmail}
              onChange={(e) => {
                setInviteEmail(e.target.value);
                setInviteError('');
              }}
              aria-invalid={Boolean(inviteError)}
              disabled={inviting}
            />
          </div>
          {inviteError && (
            <p role="alert" className="text-sm text-destructive">
              {inviteError}
            </p>
          )}
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setInviteOpen(false)} disabled={inviting}>
              {t('common.cancel')}
            </Button>
            <Button onClick={handleInviteOwner} disabled={inviting || !inviteEmail.trim()}>
              {inviting ? t('common.sending') : t('projects.sendOwnerInvite')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </PageLayout>
  );
}
