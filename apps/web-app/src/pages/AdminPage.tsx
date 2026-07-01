import { PageHeader, PageLayout } from '@/components/PageLayout';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { DataTable } from '@/components/ui/data-table';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Field, FieldError, FieldGroup, FieldLabel } from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import { Skeleton } from '@/components/ui/skeleton';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { trackEvent } from '@/lib/analytics';
import { api, apiUrl } from '@/lib/api';
import { formatDateTime } from '@/lib/dayjs';
import { auth } from '@/lib/firebase';
import { useLocale } from '@/lib/i18n';
import { useAppSelector } from '@/store';
import { canManageUsers } from '@/store/authSlice';
import { useForm } from '@tanstack/react-form';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useLocation } from '@tanstack/react-router';
import type { ColumnDef } from '@tanstack/react-table';
import { Loader2, Pencil, RotateCcw, Search, ShieldCheck, UserPlus, Users, X } from 'lucide-react';
import { useCallback, useEffect, useMemo, useState } from 'react';
import * as z from 'zod';

interface DimensionScore {
  dimensionId: string;
  dimensionName: string;
  score: number;
  maxScore: number;
}

interface AdminAssessment {
  id: string;
  uid: string;
  quizId?: string;
  companyName?: string;
  industryType?: string;
  companySize?: string;
  contactName?: string;
  contactEmail?: string;
  overallScore: number;
  diagnosis: string;
  submittedAt: string;
  scores?: DimensionScore[];
  strengths?: string[];
  weaknesses?: string[];
}

interface AdminUser {
  uid: string;
  email: string;
  displayName: string;
  photoURL?: string;
  companyName: string;
  companyRegId: string;
  industryType: string;
  companySize: string;
  contactName: string;
  contactEmail: string;
  contactPhone: string;
  role: string;
  isPending?: boolean;
  invitedAt?: string;
  createdAt: string;
  updatedAt: string;
}

const diagnosisColors: Record<string, string> = {
  Beginning:
    'bg-red-50 dark:bg-red-950/30 text-red-700 dark:text-red-400 border-red-200 dark:border-red-800',
  Developing:
    'bg-amber-50 dark:bg-amber-950/30 text-amber-700 dark:text-amber-400 border-amber-200 dark:border-amber-800',
  Established:
    'bg-blue-50 dark:bg-blue-950/30 text-blue-700 dark:text-blue-400 border-blue-200 dark:border-blue-800',
  Advanced:
    'bg-emerald-50 dark:bg-emerald-950/30 text-emerald-700 dark:text-emerald-400 border-emerald-200 dark:border-emerald-800',
};

const diagnosisDots: Record<string, string> = {
  Beginning: 'bg-red-500',
  Developing: 'bg-amber-500',
  Established: 'bg-blue-500',
  Advanced: 'bg-emerald-500',
};

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

function getScoreColor(score: number): string {
  if (score >= 4) return 'hsl(152 60% 38%)';
  if (score >= 3) return 'hsl(220 65% 48%)';
  if (score >= 2) return 'hsl(38 92% 50%)';
  return 'hsl(0 72% 51%)';
}

// --- Quiz Tab (Assessment list) ---

function QuizTab({
  onExport,
  exportError,
}: Readonly<{ onExport: () => Promise<void>; exportError: string | null }>) {
  const [industryFilter, setIndustryFilter] = useState('');
  const [sizeFilter, setSizeFilter] = useState('');
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const { t, locale } = useLocale();

  // Server state via TanStack Query — list is keyed by the active filters,
  // so each filter combination is cached and refetched independently.
  const { data: assessments = [], isPending: loading } = useQuery({
    queryKey: ['admin-assessments', industryFilter, sizeFilter],
    queryFn: () => {
      const params = new URLSearchParams();
      if (industryFilter) params.set('industryType', industryFilter);
      if (sizeFilter) params.set('companySize', sizeFilter);
      const query = params.toString();
      const path = query ? `/admin/assessments?${query}` : '/admin/assessments';
      return api.get<AdminAssessment[]>(path);
    },
  });

  const selectedRow = assessments.find((a) => a.id === selectedId) ?? null;
  const hasInlineScores = !!(selectedRow?.scores && selectedRow.scores.length > 0);

  // Per-row detail is fetched only when the selected row lacks inline scores;
  // Query caches each assessment's detail by id.
  const { data: fetchedDetail, isFetching: detailFetching } = useQuery({
    queryKey: ['admin-assessment', selectedId],
    queryFn: () => api.get<AdminAssessment>(`/admin/assessments/${selectedId}`),
    enabled: !!selectedId && !hasInlineScores,
  });

  const detailData = hasInlineScores ? selectedRow : (fetchedDetail ?? selectedRow);
  const detailLoading = !!selectedId && !hasInlineScores && detailFetching;

  const handleSelectAssessment = (a: AdminAssessment) => {
    setSelectedId((prev) => (prev === a.id ? null : a.id));
  };

  const totalSubmissions = assessments.length;
  const avgScore =
    totalSubmissions > 0
      ? assessments.reduce((sum, a) => sum + a.overallScore, 0) / totalSubmissions
      : 0;
  const diagnosisCounts = assessments.reduce(
    (acc, a) => {
      acc[a.diagnosis] = (acc[a.diagnosis] || 0) + 1;
      return acc;
    },
    {} as Record<string, number>,
  );

  const renderDetailContent = () => {
    if (detailLoading) {
      return (
        <div className="space-y-3">
          <Skeleton className="h-6 w-48" />
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {['det-a', 'det-b', 'det-c', 'det-d'].map((id) => (
              <Skeleton key={id} className="h-16 rounded-md" />
            ))}
          </div>
        </div>
      );
    }
    if (detailData) {
      return (
        <div className="space-y-4">
          <div className="flex flex-wrap gap-x-4 gap-y-2 text-sm">
            {detailData.companyName && (
              <div>
                <span className="text-xs text-muted-foreground">{t('admin.company')}</span>
                <p className="font-medium">{detailData.companyName}</p>
              </div>
            )}
            {detailData.industryType && (
              <div>
                <span className="text-xs text-muted-foreground">{t('admin.industry')}</span>
                <p className="font-medium">{t(`industry.${detailData.industryType}`)}</p>
              </div>
            )}
            {detailData.companySize && (
              <div>
                <span className="text-xs text-muted-foreground">{t('admin.companySize')}</span>
                <p className="font-medium">{t(`size.${detailData.companySize}`)}</p>
              </div>
            )}
            {detailData.contactName && (
              <div>
                <span className="text-xs text-muted-foreground">{t('admin.contactName')}</span>
                <p className="font-medium">{detailData.contactName}</p>
              </div>
            )}
            {detailData.contactEmail && (
              <div>
                <span className="text-xs text-muted-foreground">{t('admin.contactEmail')}</span>
                <p className="font-medium font-mono text-xs">{detailData.contactEmail}</p>
              </div>
            )}
          </div>

          {detailData.scores && detailData.scores.length > 0 && (
            <div>
              <p className="text-xs font-medium text-muted-foreground mb-2">
                {t('result.dimensionScores')}
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {detailData.scores.map((s) => (
                  <div
                    key={s.dimensionId}
                    className="flex items-center gap-2 bg-card rounded-md border p-2.5"
                  >
                    <div className="flex-1 min-w-0">
                      <div className="flex justify-between items-baseline mb-1">
                        <span className="text-xs font-medium truncate mr-2">{s.dimensionName}</span>
                        <span
                          className="text-xs font-mono font-semibold tabular-nums"
                          style={{ color: getScoreColor(s.score) }}
                        >
                          {s.score.toFixed(2)}
                        </span>
                      </div>
                      <div className="h-1 bg-muted rounded-full overflow-hidden">
                        <div
                          className="h-full rounded-full"
                          style={{
                            width: `${(s.score / 5) * 100}%`,
                            background: getScoreColor(s.score),
                          }}
                        />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {detailData.strengths && detailData.strengths.length > 0 && (
              <div className="bg-emerald-50/50 rounded-md border border-emerald-200 p-3">
                <p className="text-xs font-medium text-emerald-700 mb-2">{t('result.strengths')}</p>
                <ul className="space-y-1">
                  {detailData.strengths.map((s) => (
                    <li key={s} className="text-xs text-emerald-800 flex items-start gap-1.5">
                      <span className="text-emerald-500 mt-px">+</span>
                      {s}
                    </li>
                  ))}
                </ul>
              </div>
            )}
            {detailData.weaknesses && detailData.weaknesses.length > 0 && (
              <div className="bg-red-50/50 rounded-md border border-red-200 p-3">
                <p className="text-xs font-medium text-red-700 mb-2">{t('result.weaknesses')}</p>
                <ul className="space-y-1">
                  {detailData.weaknesses.map((w) => (
                    <li key={w} className="text-xs text-red-800 flex items-start gap-1.5">
                      <span className="text-red-400 mt-px">!</span>
                      {w}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        </div>
      );
    }
    return <p className="text-sm text-muted-foreground">{t('admin.noDetail')}</p>;
  };

  const columns = useMemo<ColumnDef<AdminAssessment, unknown>[]>(
    () => [
      {
        id: 'id',
        header: () => t('admin.id'),
        enableSorting: false,
        cell: ({ row }) => `${row.original.id.slice(0, 8)}...`,
        meta: {
          headerClassName: 'hidden sm:table-cell',
          cellClassName: 'font-mono text-xs text-muted-foreground hidden sm:table-cell',
        },
      },
      {
        id: 'companyName',
        accessorFn: (a) => a.companyName ?? '',
        header: () => t('admin.company'),
        cell: ({ row }) => (
          <>
            <div className="text-sm font-medium">{row.original.companyName || '--'}</div>
            <div className="text-[11px] text-muted-foreground sm:hidden mt-0.5">
              {formatDateTime(row.original.submittedAt, locale)}
            </div>
          </>
        ),
      },
      {
        id: 'quizId',
        header: () => t('admin.tabQuiz'),
        enableSorting: false,
        cell: ({ row }) => (
          <Badge className="text-[10px] border bg-muted text-muted-foreground border-border">
            {row.original.quizId || 'shindan'}
          </Badge>
        ),
        meta: { headerClassName: 'hidden sm:table-cell', cellClassName: 'hidden sm:table-cell' },
      },
      {
        id: 'overallScore',
        accessorKey: 'overallScore',
        header: () => t('admin.score'),
        cell: ({ row }) => (
          <div className="flex items-center gap-2">
            <span className="font-semibold font-mono tabular-nums text-sm">
              {row.original.overallScore.toFixed(2)}
            </span>
            <div className="hidden sm:block w-16 h-1.5 bg-muted rounded-full overflow-hidden">
              <div
                className="h-full bg-primary rounded-full"
                style={{ width: `${(row.original.overallScore / 5) * 100}%` }}
              />
            </div>
          </div>
        ),
      },
      {
        id: 'diagnosis',
        accessorKey: 'diagnosis',
        header: () => t('admin.diagnosis'),
        enableSorting: false,
        cell: ({ row }) => (
          <Badge className={`text-[10px] border ${diagnosisColors[row.original.diagnosis] || ''}`}>
            <span
              className={`h-1.5 w-1.5 rounded-full mr-1.5 ${diagnosisDots[row.original.diagnosis] || 'bg-muted-foreground'}`}
            />
            {t(`diagnosis.${row.original.diagnosis}`)}
          </Badge>
        ),
      },
      {
        id: 'submittedAt',
        accessorKey: 'submittedAt',
        header: () => t('admin.date'),
        cell: ({ row }) => formatDateTime(row.original.submittedAt, locale),
        meta: {
          headerClassName: 'hidden sm:table-cell',
          cellClassName: 'text-muted-foreground font-mono text-xs hidden sm:table-cell',
        },
      },
    ],
    [t, locale],
  );

  return (
    <>
      {exportError && (
        <div className="mb-4 p-3 rounded-md text-sm bg-red-50 text-red-800 border border-red-200 animate-scale-in">
          {exportError}
        </div>
      )}

      {/* Stat cards */}
      {loading ? (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3 mb-5">
          {['stat-a', 'stat-b', 'stat-c'].map((id) => (
            <Skeleton key={id} className="h-24 rounded-lg" />
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3 mb-5">
          <div className="bg-card rounded-lg border p-5 animate-fade-up">
            <p className="text-xs font-medium text-muted-foreground mb-2">
              {t('admin.totalSubmissions')}
            </p>
            <p className="text-3xl font-bold font-mono tabular-nums">{totalSubmissions}</p>
          </div>

          <div className="bg-card rounded-lg border p-5 animate-fade-up delay-1">
            <p className="text-xs font-medium text-muted-foreground mb-2">{t('admin.avgScore')}</p>
            <p className="text-3xl font-bold font-mono tabular-nums">{avgScore.toFixed(2)}</p>
            <p className="text-xs text-muted-foreground font-mono mt-1">/5.00</p>
          </div>

          <div className="bg-card rounded-lg border p-5 animate-fade-up delay-2">
            <p className="text-xs font-medium text-muted-foreground mb-2">
              {t('admin.distribution')}
            </p>
            <div className="flex flex-wrap gap-1.5">
              {Object.entries(diagnosisCounts).map(([diag, count]) => (
                <span
                  key={diag}
                  className={`inline-flex items-center gap-1.5 text-[11px] font-medium px-2 py-1 rounded-md border ${diagnosisColors[diag] || ''}`}
                >
                  <span
                    className={`h-1.5 w-1.5 rounded-full ${diagnosisDots[diag] || 'bg-muted-foreground'}`}
                  />
                  {t(`diagnosis.${diag}`)}: {count}
                </span>
              ))}
              {Object.keys(diagnosisCounts).length === 0 && (
                <span className="text-xs text-muted-foreground">--</span>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Filters */}
      <div className="bg-card rounded-lg border p-4 mb-5 animate-fade-up delay-3">
        <div className="flex flex-wrap gap-4 items-end">
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-muted-foreground">
              {t('admin.industry')}
            </label>
            <Select
              value={industryFilter || '__all__'}
              onValueChange={(v: string) => setIndustryFilter(v === '__all__' ? '' : v)}
            >
              <SelectTrigger className="w-[200px]" data-testid="admin-filter-industry">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="__all__">{t('admin.allIndustries')}</SelectItem>
                {industryKeys.map((key) => (
                  <SelectItem key={key} value={key}>
                    {t(`industry.${key}`)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-muted-foreground">
              {t('admin.companySize')}
            </label>
            <Select
              value={sizeFilter || '__all__'}
              onValueChange={(v: string) => setSizeFilter(v === '__all__' ? '' : v)}
            >
              <SelectTrigger className="w-[180px]" data-testid="admin-filter-size">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="__all__">{t('admin.allSizes')}</SelectItem>
                <SelectItem value="small">{t('size.small')}</SelectItem>
                <SelectItem value="medium">{t('size.medium')}</SelectItem>
                <SelectItem value="large">{t('size.large')}</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <Button
            variant="outline"
            onClick={onExport}
            data-testid="admin-export-csv-btn-mobile"
            className="gap-2 sm:hidden"
          >
            <svg width="15" height="15" viewBox="0 0 16 16" fill="none">
              <path
                d="M2 10v3a1 1 0 001 1h10a1 1 0 001-1v-3M8 2v8m0 0l-3-3m3 3l3-3"
                stroke="currentColor"
                strokeWidth="1.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
            {t('admin.exportCsv')}
          </Button>
        </div>
      </div>

      {/* Table */}
      {loading ? (
        <div className="bg-card rounded-lg border overflow-hidden">
          <div className="p-4 space-y-3">
            <Skeleton className="h-10 w-full rounded-md" />
            {['sk-1', 'sk-2', 'sk-3', 'sk-4', 'sk-5'].map((id) => (
              <Skeleton key={id} className="h-14 w-full rounded-md" />
            ))}
          </div>
        </div>
      ) : (
        <div className="animate-fade-up delay-4">
          <DataTable
            data-testid="admin-assessment-table"
            columns={columns}
            data={assessments}
            getRowId={(a) => a.id}
            searchColumnId="companyName"
            searchPlaceholder={t('admin.searchCompany')}
            onRowClick={handleSelectAssessment}
            isRowExpanded={(a) => selectedId === a.id}
            rowClassName={(_row, expanded) => (expanded ? 'bg-primary/5' : 'hover:bg-muted/30')}
            renderExpandedRow={() => (
              <div
                className="border-t bg-muted/10 p-5 animate-fade-up"
                style={{ animationDelay: '0s' }}
              >
                {renderDetailContent()}
              </div>
            )}
            emptyState={
              <div className="flex flex-col items-center gap-2">
                <div className="h-12 w-12 rounded-lg bg-muted flex items-center justify-center">
                  <svg
                    width="24"
                    height="24"
                    viewBox="0 0 24 24"
                    fill="none"
                    className="text-muted-foreground"
                    aria-hidden="true"
                  >
                    <path
                      d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"
                      stroke="currentColor"
                      strokeWidth="1.5"
                      strokeLinecap="round"
                    />
                  </svg>
                </div>
                <p className="text-muted-foreground text-sm">{t('admin.noAssessments')}</p>
              </div>
            }
          />
        </div>
      )}
    </>
  );
}

// --- Permissions Matrix Dialog ---

const featureMatrix = [
  {
    featureKey: 'permissions.takeAssessment',
    user: true,
    manager: true,
    system_admin: true,
    owner: true,
  },
  {
    featureKey: 'permissions.viewOwnResults',
    user: true,
    manager: true,
    system_admin: true,
    owner: true,
  },
  {
    featureKey: 'permissions.viewCompanyResults',
    user: false,
    manager: true,
    system_admin: true,
    owner: true,
  },
  {
    featureKey: 'permissions.manageUsers',
    user: false,
    manager: false,
    system_admin: true,
    owner: true,
  },
  {
    featureKey: 'permissions.inviteMembers',
    user: false,
    manager: false,
    system_admin: true,
    owner: true,
  },
  {
    featureKey: 'permissions.editRoles',
    user: false,
    manager: false,
    system_admin: false,
    owner: true,
  },
  {
    featureKey: 'permissions.viewAllAssessments',
    user: false,
    manager: false,
    system_admin: false,
    owner: true,
  },
] as const;

const matrixColumns = ['user', 'manager', 'system_admin', 'owner'] as const;
type MatrixRole = (typeof matrixColumns)[number];

const columnLabelKeys: Record<MatrixRole, string> = {
  user: 'admin.roleUser',
  manager: 'admin.roleManager',
  system_admin: 'admin.roleSystemAdmin',
  owner: 'admin.roleOwner',
};

function PermissionsDialog({
  open,
  onClose,
  t,
}: Readonly<{ open: boolean; onClose: () => void; t: (key: string) => string }>) {
  return (
    <Dialog
      open={open}
      onOpenChange={(o) => {
        if (!o) onClose();
      }}
    >
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <ShieldCheck className="h-5 w-5 text-primary" />
            {t('permissions.title')}
          </DialogTitle>
          <DialogDescription>{t('permissions.desc')}</DialogDescription>
        </DialogHeader>
        <div className="overflow-x-auto">
          {/* Static permissions reference grid — not a data table (no fetch/sort/filter). */}
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b bg-muted/30">
                <th className="text-left py-2.5 px-4 text-xs font-medium text-muted-foreground w-[40%]">
                  {t('permissions.feature')}
                </th>
                {matrixColumns.map((col) => (
                  <th
                    key={col}
                    className={`text-center py-2.5 px-3 text-xs font-medium ${
                      col === 'owner'
                        ? 'text-amber-600 dark:text-amber-400'
                        : 'text-muted-foreground'
                    }`}
                  >
                    {t(columnLabelKeys[col])}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {featureMatrix.map((row) => (
                <tr key={row.featureKey} className="border-b last:border-0 hover:bg-muted/20">
                  <td className="py-2.5 px-4 text-sm">{t(row.featureKey)}</td>
                  {matrixColumns.map((col) => {
                    const granted = row[col];
                    return (
                      <td
                        key={col}
                        className={`py-2.5 px-3 text-center ${col === 'owner' ? 'bg-amber-50/50 dark:bg-amber-950/10' : ''}`}
                      >
                        {granted ? (
                          <span className="inline-flex items-center justify-center h-5 w-5 rounded-full bg-emerald-100 dark:bg-emerald-900/40 text-emerald-600 dark:text-emerald-400 mx-auto">
                            <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
                              <path
                                d="M2 5l2 2 4-4"
                                stroke="currentColor"
                                strokeWidth="1.5"
                                strokeLinecap="round"
                                strokeLinejoin="round"
                              />
                            </svg>
                          </span>
                        ) : (
                          <span className="inline-block h-1 w-4 rounded-full bg-muted mx-auto" />
                        )}
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </DialogContent>
    </Dialog>
  );
}

// --- Invite Member Dialog ---

function InviteMemberDialog({
  open,
  onClose,
  onSuccess,
  t,
}: Readonly<{
  open: boolean;
  onClose: () => void;
  onSuccess: () => void;
  t: (key: string) => string;
}>) {
  const [serverError, setServerError] = useState<string | null>(null);

  const form = useForm({
    defaultValues: { email: '', role: 'user' },
    onSubmit: async ({ value }) => {
      setServerError(null);
      try {
        await api.post('/manage/invitations', { email: value.email, role: value.role });
        form.reset();
        onSuccess();
      } catch (err: unknown) {
        const apiErr = err as { status?: number; message?: string };
        if (apiErr.status === 409) {
          setServerError(t('admin.inviteAlreadyExists'));
        } else if (apiErr.status === 403) {
          setServerError(t('admin.inviteForbidden'));
        } else if (apiErr.status === 400 && apiErr.message) {
          setServerError(apiErr.message);
        } else {
          setServerError(t('admin.inviteError'));
        }
      }
    },
  });

  const isSubmitting = form.state.isSubmitting;

  const emailSchema = z
    .string()
    .min(1, t('admin.inviteEmailRequired'))
    .email(t('admin.inviteEmailInvalid'));

  const handleOpenChange = (o: boolean) => {
    if (!o) {
      form.reset();
      setServerError(null);
      onClose();
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle>{t('admin.inviteMemberTitle')}</DialogTitle>
          <DialogDescription>{t('admin.inviteMemberDesc')}</DialogDescription>
        </DialogHeader>
        <form
          onSubmit={(e) => {
            e.preventDefault();
            e.stopPropagation();
            form.handleSubmit();
          }}
        >
          <FieldGroup className="space-y-4 py-2">
            <form.Field name="email" validators={{ onBlur: emailSchema, onSubmit: emailSchema }}>
              {(field) => {
                const isInvalid = field.state.meta.isTouched && field.state.meta.errors.length > 0;
                return (
                  <Field data-invalid={isInvalid}>
                    <FieldLabel htmlFor={field.name}>{t('admin.inviteEmail')}</FieldLabel>
                    <Input
                      id={field.name}
                      type="email"
                      placeholder={t('admin.inviteEmailPlaceholder')}
                      value={field.state.value}
                      onBlur={field.handleBlur}
                      onChange={(e) => field.handleChange(e.target.value)}
                      aria-invalid={isInvalid}
                      disabled={isSubmitting}
                    />
                    {isInvalid && <FieldError errors={field.state.meta.errors} />}
                  </Field>
                );
              }}
            </form.Field>

            <form.Field name="role">
              {(field) => (
                <Field>
                  <FieldLabel>{t('admin.inviteRole')}</FieldLabel>
                  <Select
                    value={field.state.value}
                    onValueChange={field.handleChange}
                    disabled={isSubmitting}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {allRoles.map((r) => (
                        <SelectItem key={r} value={r}>
                          {getRoleLabel(r, t)}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </Field>
              )}
            </form.Field>

            {serverError && <p className="text-sm text-destructive">{serverError}</p>}
          </FieldGroup>

          <DialogFooter className="mt-4 gap-2 sm:gap-0">
            <Button
              type="button"
              variant="outline"
              onClick={() => handleOpenChange(false)}
              disabled={isSubmitting}
            >
              {t('admin.cancel')}
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {isSubmitting ? t('admin.inviteSending') : t('admin.inviteSend')}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

// --- Users Tab (Person management) ---

function UserDetailDialog({
  user,
  open,
  onClose,
  onEditRole,
  t,
  locale,
}: {
  readonly user: AdminUser | null;
  readonly open: boolean;
  readonly onClose: () => void;
  readonly onEditRole: (user: AdminUser) => void;
  readonly t: (key: string) => string;
  readonly locale: string;
}) {
  if (!user) return null;

  const displayName = user.contactName || user.displayName || user.email;
  const initials = displayName
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((n) => n.charAt(0).toUpperCase())
    .join('');

  const fields = [
    { label: t('admin.accountEmail'), value: user.email },
    { label: t('admin.contactEmail'), value: user.contactEmail },
    { label: t('admin.phone'), value: user.contactPhone },
    {
      label: t('admin.registered'),
      value: user.createdAt ? formatDateTime(user.createdAt, locale) : '',
    },
    {
      label: t('admin.lastUpdated'),
      value: user.updatedAt ? formatDateTime(user.updatedAt, locale) : '',
    },
  ];

  return (
    <Dialog
      open={open}
      onOpenChange={(o) => {
        if (!o) onClose();
      }}
    >
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{t('admin.userDetail')}</DialogTitle>
        </DialogHeader>

        {/* Profile header */}
        <div className="flex items-center gap-4 py-1">
          <Avatar className="size-16 rounded-xl shrink-0">
            <AvatarImage
              src={user.photoURL}
              alt={displayName}
              className="rounded-xl object-cover"
            />
            <AvatarFallback className="rounded-xl text-xl font-semibold bg-muted">
              {initials}
            </AvatarFallback>
          </Avatar>
          <div className="min-w-0 flex-1 space-y-1">
            <p className="text-base font-semibold leading-tight">{displayName}</p>
            <p className="text-sm text-muted-foreground break-all">{user.email}</p>
            <div className="pt-0.5">
              <RoleBadge role={user.role} isPending={user.isPending} t={t} />
            </div>
          </div>
        </div>

        <Separator />

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-4 py-1">
          {fields.map((f) =>
            f.value ? (
              <div key={f.label}>
                <p className="text-sm text-muted-foreground">{f.label}</p>
                <p className="text-base font-medium break-all">{f.value}</p>
              </div>
            ) : null,
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            {t('admin.cancel')}
          </Button>
          <Button onClick={() => onEditRole(user)}>{t('admin.editRole')}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

const roleMeta: Record<string, { labelKey: string; className: string }> = {
  admin: {
    labelKey: 'admin.roleAdmin',
    className:
      'bg-violet-50 dark:bg-violet-950/30 text-violet-700 dark:text-violet-400 border-violet-200 dark:border-violet-800',
  },
  owner: {
    labelKey: 'admin.roleOwner',
    className:
      'bg-amber-50 dark:bg-amber-950/30 text-amber-700 dark:text-amber-400 border-amber-200 dark:border-amber-800',
  },
  system_admin: {
    labelKey: 'admin.roleSystemAdmin',
    className:
      'bg-blue-50 dark:bg-blue-950/30 text-blue-700 dark:text-blue-400 border-blue-200 dark:border-blue-800',
  },
  manager: {
    labelKey: 'admin.roleManager',
    className:
      'bg-emerald-50 dark:bg-emerald-950/30 text-emerald-700 dark:text-emerald-400 border-emerald-200 dark:border-emerald-800',
  },
};

function getRoleLabel(role: string, t: (key: string) => string): string {
  const meta = roleMeta[role];
  return meta ? t(meta.labelKey) : t('admin.roleUser');
}

function RoleBadge({
  role,
  isPending,
  t,
}: Readonly<{ role: string; isPending?: boolean; t: (key: string) => string }>) {
  if (isPending) {
    return (
      <Badge className="text-[10px] border bg-amber-50 dark:bg-amber-950/30 text-amber-700 dark:text-amber-400 border-amber-200 dark:border-amber-800">
        {t('admin.pendingInvite')}
      </Badge>
    );
  }
  const meta = roleMeta[role];
  const className = meta ? meta.className : 'bg-muted text-muted-foreground border-border';
  return <Badge className={`text-[10px] border ${className}`}>{getRoleLabel(role, t)}</Badge>;
}

const allRoles = ['user', 'manager', 'system_admin', 'owner'] as const;

function RoleEditDialog({
  user,
  onCancel,
  onConfirm,
  t,
}: Readonly<{
  user: AdminUser | null;
  onCancel: () => void;
  onConfirm: (newRole: string) => void;
  t: (key: string) => string;
}>) {
  const [selectedRole, setSelectedRole] = useState(user?.role ?? 'user');

  return (
    <Dialog
      open={!!user}
      onOpenChange={(open) => {
        if (!open) onCancel();
      }}
    >
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle>{t('admin.editRole')}</DialogTitle>
          <DialogDescription>
            {user?.contactName || user?.displayName || user?.email}
          </DialogDescription>
        </DialogHeader>
        <Select value={selectedRole} onValueChange={setSelectedRole}>
          <SelectTrigger data-testid="admin-role-select">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {allRoles.map((r) => (
              <SelectItem key={r} value={r}>
                {getRoleLabel(r, t)}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <DialogFooter className="gap-2 sm:gap-0">
          <Button variant="outline" onClick={onCancel} data-testid="admin-role-cancel-btn">
            {t('admin.cancel')}
          </Button>
          <Button
            onClick={() => onConfirm(selectedRole)}
            disabled={selectedRole === user?.role}
            data-testid="admin-role-confirm-btn"
          >
            {t('admin.saveRole')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function UserRowActions({
  user,
  updatingUid,
  onEdit,
  onCancel,
  onResend,
  t,
}: Readonly<{
  user: AdminUser;
  updatingUid: string | null;
  onEdit: (user: AdminUser) => void;
  onCancel: (uid: string) => void;
  onResend: (uid: string) => void;
  t: (key: string) => string;
}>) {
  if (user.isPending) {
    return (
      <div className="flex items-center justify-end gap-1">
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8"
          title={t('admin.resendInvite')}
          aria-label={t('admin.resendInvite')}
          onClick={() => onResend(user.uid)}
        >
          <RotateCcw className="h-4 w-4" />
        </Button>
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8 text-destructive hover:text-destructive"
          title={t('admin.cancelInvite')}
          aria-label={t('admin.cancelInvite')}
          onClick={() => onCancel(user.uid)}
        >
          <X className="h-4 w-4" />
        </Button>
      </div>
    );
  }
  const isUpdating = updatingUid === user.uid;
  return (
    <Button
      variant="ghost"
      size="sm"
      className="h-8 w-8 p-0 text-muted-foreground hover:text-foreground"
      disabled={isUpdating}
      onClick={() => onEdit(user)}
      aria-label={t('admin.editRole')}
    >
      {isUpdating ? '...' : <Pencil className="h-4 w-4" />}
    </Button>
  );
}

function UsersTab() {
  const [toast, setToast] = useState<{ type: 'success' | 'error'; msg: string } | null>(null);
  const [roleDialog, setRoleDialog] = useState<AdminUser | null>(null);
  const [detailUser, setDetailUser] = useState<AdminUser | null>(null);
  const [roleFilter, setRoleFilter] = useState('');
  const [search, setSearch] = useState('');
  const [inviteOpen, setInviteOpen] = useState(false);
  const [permissionsOpen, setPermissionsOpen] = useState(false);
  const { t, locale } = useLocale();
  const queryClient = useQueryClient();

  const { data: users = [], isPending: loading } = useQuery({
    queryKey: ['manage-users'],
    queryFn: () => api.get<AdminUser[]>('/manage/users'),
    select: (data) => data.filter((u) => u.role !== 'admin' && u.role !== 'superadmin'),
  });

  const filteredUsers = useMemo(
    () =>
      users.filter((u) => {
        const matchRole = !roleFilter || u.role === roleFilter;
        const q = search.toLowerCase();
        const matchSearch =
          !q ||
          (u.contactName || u.displayName || '').toLowerCase().includes(q) ||
          u.email.toLowerCase().includes(q);
        return matchRole && matchSearch;
      }),
    [users, roleFilter, search],
  );

  const openRoleDialog = useCallback((user: AdminUser) => {
    setDetailUser(null);
    requestAnimationFrame(() => setRoleDialog(user));
  }, []);

  const roleMutation = useMutation({
    mutationFn: ({ uid, role }: { uid: string; role: string }) =>
      api.put(`/manage/users/${uid}/role`, { role }),
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: ['manage-users'] });
      setToast({ type: 'success', msg: t('admin.roleUpdated') });
      trackEvent('admin_role_change', { newRole: variables.role });
    },
    onError: (_err, variables) => {
      setToast({ type: 'error', msg: t('admin.roleError') });
      trackEvent('admin_role_change_error', { newRole: variables.role });
    },
  });

  const updatingUid = roleMutation.isPending ? (roleMutation.variables?.uid ?? null) : null;

  const confirmRoleChange = (newRole: string) => {
    if (!roleDialog) return;
    const user = roleDialog;
    setRoleDialog(null);
    setToast(null);
    roleMutation.mutate({ uid: user.uid, role: newRole });
  };

  const roleCounts = useMemo(
    () =>
      users.reduce<Record<string, number>>((acc, u) => {
        acc[u.role] = (acc[u.role] || 0) + 1;
        return acc;
      }, {}),
    [users],
  );

  const statChips = useMemo(
    () =>
      [
        { key: '', labelKey: 'admin.allUsers', count: users.length },
        { key: 'owner', labelKey: 'admin.roleOwner', count: roleCounts.owner ?? 0 },
        {
          key: 'system_admin',
          labelKey: 'admin.roleSystemAdmin',
          count: roleCounts.system_admin ?? 0,
        },
        { key: 'manager', labelKey: 'admin.roleManager', count: roleCounts.manager ?? 0 },
        { key: 'user', labelKey: 'admin.roleUser', count: roleCounts.user ?? 0 },
      ].filter((c) => c.key === '' || c.count > 0),
    [users, roleCounts],
  );

  const cancelInvitationMutation = useMutation({
    mutationFn: (uid: string) => api.delete(`/manage/invitations/${uid}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['manage-users'] });
    },
    onError: () => {
      setToast({ type: 'error', msg: t('admin.roleError') });
    },
  });

  const resendInvitationMutation = useMutation({
    mutationFn: (uid: string) => api.post(`/manage/invitations/${uid}/resend`, {}),
    onSuccess: () => {
      setToast({ type: 'success', msg: t('admin.inviteResent') });
    },
    onError: () => {
      setToast({ type: 'error', msg: t('admin.inviteError') });
    },
  });

  const handleCancelInvitation = cancelInvitationMutation.mutate;
  const handleResendInvitation = resendInvitationMutation.mutate;

  const handleInviteSuccess = () => {
    setInviteOpen(false);
    setToast({ type: 'success', msg: t('admin.inviteSent') });
    queryClient.invalidateQueries({ queryKey: ['manage-users'] });
  };

  const userColumns = useMemo<ColumnDef<AdminUser, unknown>[]>(
    () => [
      {
        id: 'contact',
        header: () => t('admin.contactName'),
        cell: ({ row }) => {
          const u = row.original;
          return (
            <div className="flex items-center gap-3">
              <Avatar className="size-8 rounded-lg shrink-0">
                <AvatarImage
                  src={u.photoURL}
                  alt={u.contactName || u.displayName}
                  className="rounded-lg"
                />
                <AvatarFallback className="rounded-lg text-xs bg-muted">
                  {(u.contactName || u.displayName || u.email).charAt(0).toUpperCase()}
                </AvatarFallback>
              </Avatar>
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <span className="font-medium truncate">
                    {u.contactName || u.displayName || '--'}
                  </span>
                  <RoleBadge role={u.role} isPending={u.isPending} t={t} />
                </div>
                <div className="text-[11px] text-muted-foreground font-mono mt-0.5 truncate">
                  {u.email}
                </div>
              </div>
            </div>
          );
        },
      },
      {
        id: 'registered',
        header: () => t('admin.registered'),
        cell: ({ row }) => {
          const raw = row.original.isPending ? row.original.invitedAt : row.original.createdAt;
          return raw ? formatDateTime(raw, locale) : '--';
        },
        meta: {
          headerClassName: 'hidden sm:table-cell',
          cellClassName: 'text-muted-foreground font-mono text-xs hidden sm:table-cell',
        },
      },
      {
        id: 'actions',
        header: () => null,
        enableSorting: false,
        cell: ({ row }) => (
          <div className="text-right" onClick={(e) => e.stopPropagation()}>
            <UserRowActions
              user={row.original}
              updatingUid={updatingUid}
              onEdit={openRoleDialog}
              onCancel={handleCancelInvitation}
              onResend={handleResendInvitation}
              t={t}
            />
          </div>
        ),
      },
    ],
    [t, locale, updatingUid, openRoleDialog, handleCancelInvitation, handleResendInvitation],
  );

  return (
    <>
      {toast && (
        <div
          className={`mb-4 p-3 rounded-md text-sm animate-scale-in ${
            toast.type === 'success'
              ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
              : 'bg-red-50 text-red-800 border border-red-200'
          }`}
        >
          {toast.msg}
        </div>
      )}

      <div className="flex items-center justify-between mb-5 animate-fade-up">
        <div className="flex flex-wrap gap-2">
          {statChips.map((chip) => {
            const isActive = roleFilter === chip.key;
            const activeClass = isActive
              ? 'bg-primary text-primary-foreground border-primary'
              : 'bg-card text-muted-foreground hover:text-foreground border-border hover:border-foreground/30';
            return (
              <button
                key={chip.key}
                type="button"
                onClick={() => setRoleFilter(chip.key)}
                className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-full border text-sm font-medium transition-colors ${activeClass}`}
              >
                {t(chip.labelKey)}
                <span
                  className={`inline-flex items-center justify-center min-w-5 h-5 rounded-full text-xs font-mono px-1 ${
                    isActive
                      ? 'bg-primary-foreground/20 text-primary-foreground'
                      : 'bg-muted text-muted-foreground'
                  }`}
                >
                  {chip.count}
                </span>
              </button>
            );
          })}
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <Button
            variant="outline"
            size="sm"
            className="gap-1.5"
            onClick={() => setPermissionsOpen(true)}
            aria-label={t('permissions.title')}
          >
            <ShieldCheck className="h-4 w-4" />
            <span className="hidden sm:inline text-xs">{t('permissions.title')}</span>
          </Button>
          <Button size="sm" className="gap-2" onClick={() => setInviteOpen(true)}>
            <UserPlus className="h-4 w-4" />
            <span className="hidden sm:inline">{t('admin.inviteMember')}</span>
          </Button>
        </div>
      </div>

      <div className="relative mb-5 animate-fade-up">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
        <Input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder={t('admin.searchPlaceholder')}
          className="pl-9"
        />
      </div>

      <p className="text-xs text-muted-foreground mb-3">
        {filteredUsers.length} / {users.length} {t('admin.users').toLowerCase()}
      </p>

      {loading ? (
        <div className="bg-card rounded-lg border overflow-hidden">
          <div className="p-4 space-y-3">
            {['u-1', 'u-2', 'u-3', 'u-4'].map((id) => (
              <Skeleton key={id} className="h-14 w-full rounded-md" />
            ))}
          </div>
        </div>
      ) : (
        <div className="animate-fade-up">
          <DataTable
            data-testid="admin-users-table"
            columns={userColumns}
            data={filteredUsers}
            getRowId={(u) => u.uid}
            onRowClick={(u) => setDetailUser(u)}
            emptyState={
              <div className="flex flex-col items-center gap-2">
                <div className="h-12 w-12 rounded-lg bg-muted flex items-center justify-center">
                  <Users className="h-6 w-6 text-muted-foreground" />
                </div>
                <p className="text-sm text-muted-foreground">{t('admin.noUsers')}</p>
              </div>
            }
          />
        </div>
      )}

      <UserDetailDialog
        user={detailUser}
        open={!!detailUser}
        onClose={() => setDetailUser(null)}
        onEditRole={openRoleDialog}
        t={t}
        locale={locale}
      />

      <RoleEditDialog
        key={roleDialog?.uid}
        user={roleDialog}
        onCancel={() => setRoleDialog(null)}
        onConfirm={confirmRoleChange}
        t={t}
      />

      <InviteMemberDialog
        open={inviteOpen}
        onClose={() => setInviteOpen(false)}
        onSuccess={handleInviteSuccess}
        t={t}
      />

      <PermissionsDialog open={permissionsOpen} onClose={() => setPermissionsOpen(false)} t={t} />
    </>
  );
}

// --- Main Admin Page ---

export function AdminPage() {
  const { t } = useLocale();
  const location = useLocation();
  const { isAdmin, profile } = useAppSelector((s) => s.auth);
  const [exportError, setExportError] = useState<string | null>(null);
  const canViewAssessments = isAdmin;
  const canManageUserList = canManageUsers(profile, isAdmin);
  const requestedTab = new URLSearchParams(location.searchStr).get('tab');
  const fallbackTab = canViewAssessments ? 'quiz' : 'users';
  const initialTab = requestedTab === 'users' && canManageUserList ? 'users' : fallbackTab;
  const [activeTab, setActiveTab] = useState(initialTab);

  useEffect(() => {
    const tab = new URLSearchParams(location.searchStr).get('tab');
    const wantsUsersTab = tab === 'users' && canManageUserList;
    const defaultTab = canViewAssessments ? 'quiz' : 'users';
    const next = wantsUsersTab ? 'users' : defaultTab;
    setActiveTab(next);
  }, [location.searchStr, canManageUserList, canViewAssessments]);

  const handleExport = async () => {
    setExportError(null);
    try {
      const token = auth.currentUser ? await auth.currentUser.getIdToken() : null;
      if (!token) {
        setExportError(t('export.error'));
        return;
      }
      const res = await fetch(apiUrl('/admin/export'), {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      if (!res.ok) throw new Error('Export failed');
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `assessments-${new Date().toISOString().slice(0, 10)}.csv`;
      a.click();
      URL.revokeObjectURL(url);
      trackEvent('admin_export_csv');
    } catch {
      setExportError(t('export.error'));
      trackEvent('admin_export_csv_error');
    }
  };

  const exportButton = canViewAssessments ? (
    <Button
      variant="outline"
      onClick={handleExport}
      data-testid="admin-export-csv-btn"
      className="gap-2 hidden sm:flex"
    >
      <svg width="15" height="15" viewBox="0 0 16 16" fill="none">
        <path
          d="M2 10v3a1 1 0 001 1h10a1 1 0 001-1v-3M8 2v8m0 0l-3-3m3 3l3-3"
          stroke="currentColor"
          strokeWidth="1.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
      {t('admin.exportCsv')}
    </Button>
  ) : undefined;

  return (
    <PageLayout fluid>
      <PageHeader
        title={canViewAssessments ? t('admin.title') : t('admin.manageUsersTitle')}
        description={canViewAssessments ? t('admin.subtitle') : t('admin.manageUsersSubtitle')}
        actions={exportButton}
      />

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        {canViewAssessments && canManageUserList && (
          <TabsList className="mb-5">
            <TabsTrigger value="quiz">{t('admin.tabQuiz')}</TabsTrigger>
            <TabsTrigger value="users">{t('admin.tabUsers')}</TabsTrigger>
          </TabsList>
        )}

        {canViewAssessments && (
          <TabsContent value="quiz">
            <QuizTab onExport={handleExport} exportError={exportError} />
          </TabsContent>
        )}

        {canManageUserList && (
          <TabsContent value="users">
            <UsersTab />
          </TabsContent>
        )}
      </Tabs>
    </PageLayout>
  );
}
