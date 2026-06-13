import { backofficeApi } from '@/api/backoffice';
import type { Project } from '@/api/types';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { useLocale } from '@/lib/i18n';
import { PageHeader, PageLayout } from '@shared/ui/PageLayout';
import { Search } from 'lucide-react';
import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router';

type StatusFilter = 'all' | 'active' | 'inactive';

export function ProjectsPage() {
  const { t } = useLocale();
  const navigate = useNavigate();

  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');

  useEffect(() => {
    let cancelled = false;

    async function fetchProjects() {
      setLoading(true);
      setError(null);
      try {
        const data = await backofficeApi.listProjects();
        if (!cancelled) setProjects(data);
      } catch {
        if (!cancelled) setError(t('common.error'));
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    fetchProjects();
    return () => {
      cancelled = true;
    };
  }, [t]);

  const filtered = projects.filter((p) => {
    const matchesSearch =
      p.name.toLowerCase().includes(search.toLowerCase()) ||
      p.companyRegId.toLowerCase().includes(search.toLowerCase());
    const matchesStatus =
      statusFilter === 'all' ||
      (statusFilter === 'active' && p.isActive) ||
      (statusFilter === 'inactive' && !p.isActive);
    return matchesSearch && matchesStatus;
  });

  const handleView = (projectID: string) => {
    navigate(`/projects/${projectID}`);
  };

  const skeletonRows = Array.from({ length: 5 }, (_, i) => `sk-proj-${i}`).map((id) => (
    <tr key={id} className="border-b">
      <td className="px-4 py-3">
        <Skeleton className="h-5 w-40" />
      </td>
      <td className="px-4 py-3">
        <Skeleton className="h-5 w-24" />
      </td>
      <td className="px-4 py-3">
        <Skeleton className="h-5 w-20" />
      </td>
      <td className="px-4 py-3">
        <Skeleton className="h-5 w-16" />
      </td>
      <td className="px-4 py-3">
        <Skeleton className="h-5 w-10" />
      </td>
      <td className="px-4 py-3">
        <Skeleton className="h-5 w-16" />
      </td>
      <td className="px-4 py-3">
        <Skeleton className="h-8 w-16" />
      </td>
    </tr>
  ));

  const emptyRow = (
    <tr>
      <td colSpan={7} className="px-4 py-6 text-center text-sm text-muted-foreground">
        {t('common.noData')}
      </td>
    </tr>
  );

  const dataRows = filtered.map((p) => {
    const statusBadge = p.isActive ? (
      <Badge variant="default">{t('common.active')}</Badge>
    ) : (
      <Badge variant="secondary">{t('common.inactive')}</Badge>
    );

    return (
      <tr key={p.projectID} className="border-b last:border-0 hover:bg-muted/30">
        <td className="px-4 py-3 font-medium">{p.name}</td>
        <td className="px-4 py-3 text-muted-foreground">{p.companyRegId}</td>
        <td className="px-4 py-3 text-muted-foreground">{p.industryType}</td>
        <td className="px-4 py-3 text-muted-foreground">{p.companySize}</td>
        <td className="px-4 py-3 text-muted-foreground">{p.memberCount}</td>
        <td className="px-4 py-3">{statusBadge}</td>
        <td className="px-4 py-3">
          <Button variant="outline" size="sm" onClick={() => handleView(p.projectID)}>
            {t('projects.viewDetail')}
          </Button>
        </td>
      </tr>
    );
  });

  let tableBody = dataRows;
  if (loading) tableBody = skeletonRows;
  else if (filtered.length === 0) tableBody = [emptyRow];

  return (
    <PageLayout className="max-w-6xl">
      <PageHeader title={t('projects.title')} />

      {error && <p className="text-sm text-destructive">{error}</p>}

      <div className="flex flex-col gap-6">
        <div className="flex flex-wrap items-center gap-3">
          <div className="relative max-w-sm flex-1">
            <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder={t('common.search')}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9"
            />
          </div>
          <Select value={statusFilter} onValueChange={(v) => setStatusFilter(v as StatusFilter)}>
            <SelectTrigger className="w-36">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">{t('projects.filterAll')}</SelectItem>
              <SelectItem value="active">{t('projects.filterActive')}</SelectItem>
              <SelectItem value="inactive">{t('projects.filterInactive')}</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">{t('projects.title')}</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b bg-muted/50">
                    <th className="px-4 py-3 text-left font-medium">{t('projects.companyName')}</th>
                    <th className="px-4 py-3 text-left font-medium">{t('projects.regId')}</th>
                    <th className="px-4 py-3 text-left font-medium">{t('projects.industry')}</th>
                    <th className="px-4 py-3 text-left font-medium">{t('projects.size')}</th>
                    <th className="px-4 py-3 text-left font-medium">{t('projects.members')}</th>
                    <th className="px-4 py-3 text-left font-medium">{t('common.status')}</th>
                    <th className="px-4 py-3 text-left font-medium">{t('common.actions')}</th>
                  </tr>
                </thead>
                <tbody>{tableBody}</tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      </div>
    </PageLayout>
  );
}
