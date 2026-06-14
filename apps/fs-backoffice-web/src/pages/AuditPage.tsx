import { backofficeApi } from '@/api/backoffice';
import type { AuditEvent, AuditFilters } from '@/api/types';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { formatDateTime } from '@/lib/dayjs';
import { useLocale } from '@/lib/i18n';
import { PageHeader, PageLayout } from '@shared/ui/PageLayout';
import { RefreshCw, Search } from 'lucide-react';
import { useEffect, useState } from 'react';

const eventTypes = [
  'backoffice.user_deleted',
  'backoffice.user_role_changed',
  'backoffice.staff_role_granted',
  'backoffice.staff_role_changed',
  'backoffice.staff_role_revoked',
  'backoffice.project_created',
  'backoffice.project_updated',
  'backoffice.project_deactivated',
  'backoffice.project_reactivated',
  'backoffice.project_member_role_changed',
  'backoffice.project_member_removed',
  'project.created',
  'project.settings_updated',
  'project.member_role_changed',
  'project.member_removed',
  'user.login',
  'user.registered',
  'user.profile_updated',
  'user.role_changed',
  'assessment.submitted',
  'admin.export',
];

const resourceTypes = ['profile', 'staff', 'project', 'project_member', 'assessment', 'export'];

function cleanFilters(filters: AuditFilters): AuditFilters {
  return Object.fromEntries(
    Object.entries(filters).filter(([, value]) => value !== undefined && value !== ''),
  ) as AuditFilters;
}

function eventLabel(t: (key: string) => string, eventType: string) {
  const key = `audit.event.${eventType.split('.').join('_')}`;
  const label = t(key);
  return label === key ? eventType : label;
}

function metadataSummary(metadata?: Record<string, unknown>) {
  if (!metadata || Object.keys(metadata).length === 0) return '—';
  return Object.entries(metadata)
    .map(([key, value]) => `${key}: ${String(value)}`)
    .join(' · ');
}

export function AuditPage() {
  const { t, locale } = useLocale();
  const [events, setEvents] = useState<AuditEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [filters, setFilters] = useState<AuditFilters>({ limit: 100 });
  const [appliedFilters, setAppliedFilters] = useState<AuditFilters>({ limit: 100 });

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError('');
    backofficeApi
      .listAudit(cleanFilters(appliedFilters))
      .then((data) => {
        if (!cancelled) setEvents(data);
      })
      .catch(() => {
        if (!cancelled) setError(t('common.error'));
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [appliedFilters, t]);

  function applyFilters() {
    setAppliedFilters(cleanFilters({ ...filters, limit: 100 }));
  }

  function resetFilters() {
    const next = { limit: 100 };
    setFilters(next);
    setAppliedFilters(next);
  }

  return (
    <PageLayout className="max-w-7xl">
      <PageHeader
        title={t('audit.title')}
        actions={
          <Button
            size="sm"
            variant="outline"
            onClick={() => setAppliedFilters({ ...appliedFilters })}
          >
            <RefreshCw data-icon="inline-start" />
            {t('audit.refresh')}
          </Button>
        }
      />

      {error && <p className="text-sm text-destructive">{error}</p>}

      <Card>
        <CardContent className="p-4">
          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-5">
            <Select
              value={filters.eventType || 'all'}
              onValueChange={(value) =>
                setFilters((prev) => ({ ...prev, eventType: value === 'all' ? '' : value }))
              }
            >
              <SelectTrigger>
                <SelectValue placeholder={t('audit.eventType')} />
              </SelectTrigger>
              <SelectContent>
                <SelectGroup>
                  <SelectItem value="all">{t('common.all')}</SelectItem>
                  {eventTypes.map((eventType) => (
                    <SelectItem key={eventType} value={eventType}>
                      {eventLabel(t, eventType)}
                    </SelectItem>
                  ))}
                </SelectGroup>
              </SelectContent>
            </Select>

            <Select
              value={filters.resourceType || 'all'}
              onValueChange={(value) =>
                setFilters((prev) => ({ ...prev, resourceType: value === 'all' ? '' : value }))
              }
            >
              <SelectTrigger>
                <SelectValue placeholder={t('audit.resourceType')} />
              </SelectTrigger>
              <SelectContent>
                <SelectGroup>
                  <SelectItem value="all">{t('common.all')}</SelectItem>
                  {resourceTypes.map((resourceType) => (
                    <SelectItem key={resourceType} value={resourceType}>
                      {resourceType}
                    </SelectItem>
                  ))}
                </SelectGroup>
              </SelectContent>
            </Select>

            <Input
              placeholder={t('audit.actorUID')}
              value={filters.actorUID || ''}
              onChange={(event) =>
                setFilters((prev) => ({ ...prev, actorUID: event.target.value }))
              }
            />
            <Input
              placeholder={t('audit.targetUID')}
              value={filters.targetUID || ''}
              onChange={(event) =>
                setFilters((prev) => ({ ...prev, targetUID: event.target.value }))
              }
            />
            <Input
              placeholder={t('audit.projectID')}
              value={filters.projectID || ''}
              onChange={(event) =>
                setFilters((prev) => ({ ...prev, projectID: event.target.value }))
              }
            />
          </div>
          <div className="mt-3 flex justify-end gap-2">
            <Button variant="outline" onClick={resetFilters}>
              {t('audit.reset')}
            </Button>
            <Button onClick={applyFilters}>
              <Search data-icon="inline-start" />
              {t('audit.apply')}
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b bg-muted/40">
                  <th className="px-4 py-3 text-left font-medium">{t('audit.time')}</th>
                  <th className="px-4 py-3 text-left font-medium">{t('audit.eventType')}</th>
                  <th className="px-4 py-3 text-left font-medium">{t('audit.actor')}</th>
                  <th className="px-4 py-3 text-left font-medium">{t('audit.target')}</th>
                  <th className="px-4 py-3 text-left font-medium">{t('audit.project')}</th>
                  <th className="px-4 py-3 text-left font-medium">{t('audit.metadata')}</th>
                </tr>
              </thead>
              <tbody>
                {loading &&
                  ['a1', 'a2', 'a3', 'a4', 'a5'].map((key) => (
                    <tr key={key} className="border-b">
                      <td className="px-4 py-3">
                        <Skeleton className="h-4 w-28" />
                      </td>
                      <td className="px-4 py-3">
                        <Skeleton className="h-4 w-48" />
                      </td>
                      <td className="px-4 py-3">
                        <Skeleton className="h-4 w-36" />
                      </td>
                      <td className="px-4 py-3">
                        <Skeleton className="h-4 w-28" />
                      </td>
                      <td className="px-4 py-3">
                        <Skeleton className="h-4 w-28" />
                      </td>
                      <td className="px-4 py-3">
                        <Skeleton className="h-4 w-56" />
                      </td>
                    </tr>
                  ))}
                {!loading && events.length === 0 && (
                  <tr>
                    <td colSpan={6} className="px-4 py-8 text-center text-muted-foreground">
                      {t('audit.empty')}
                    </td>
                  </tr>
                )}
                {!loading &&
                  events.map((event) => (
                    <tr key={event.id} className="border-b hover:bg-muted/30">
                      <td className="whitespace-nowrap px-4 py-3 text-muted-foreground">
                        {formatDateTime(event.createdAt, locale)}
                      </td>
                      <td className="min-w-56 px-4 py-3">
                        <div className="flex flex-col gap-1">
                          <span className="font-medium">{eventLabel(t, event.eventType)}</span>
                          <Badge variant="secondary">{event.resourceType || 'event'}</Badge>
                        </div>
                      </td>
                      <td className="min-w-48 px-4 py-3">
                        {event.actorEmail || event.actorUID || '—'}
                      </td>
                      <td className="min-w-40 px-4 py-3">
                        {event.targetUID || event.resourceID || '—'}
                      </td>
                      <td className="px-4 py-3">{event.projectID || '—'}</td>
                      <td className="max-w-sm px-4 py-3 text-muted-foreground">
                        <p className="truncate">{metadataSummary(event.metadata)}</p>
                      </td>
                    </tr>
                  ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </PageLayout>
  );
}
