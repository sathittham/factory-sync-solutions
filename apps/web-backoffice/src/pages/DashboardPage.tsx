import { backofficeApi } from '@/api/backoffice';
import type { Assessment, BackofficeStats } from '@/api/types';
import { WebAnalyticsSection } from '@/components/analytics/WebAnalyticsSection';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { formatDateTime } from '@/lib/dayjs';
import { useLocale } from '@/lib/i18n';
import { PageHeader, PageLayout } from '@shared/ui/PageLayout';
import { BarChart3, Building2, FileText, Users } from 'lucide-react';
import { useEffect, useState } from 'react';

export function DashboardPage() {
  const { t, locale } = useLocale();

  const [stats, setStats] = useState<BackofficeStats | null>(null);
  const [recentResults, setRecentResults] = useState<Assessment[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function fetchData() {
      setLoading(true);
      setError(null);
      try {
        const [statsData, resultsData] = await Promise.all([
          backofficeApi.getStats(),
          backofficeApi.listResults(),
        ]);
        if (!cancelled) {
          setStats(statsData);
          setRecentResults(resultsData.slice(0, 10));
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
  }, [t]);

  const statCards = [
    { key: 'totalProjects', icon: Building2, value: stats?.totalProjects },
    { key: 'totalUsers', icon: Users, value: stats?.totalUsers },
    { key: 'avgScore', icon: BarChart3, value: stats?.avgScore?.toFixed(2) },
    { key: 'staffCount', icon: FileText, value: stats?.staffCount },
  ] as const;

  const statCardContent = loading
    ? statCards.map(({ key, icon: Icon }) => (
        <Card key={key}>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <Skeleton className="h-4 w-24" />
            <Icon className="size-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <Skeleton className="h-8 w-16" />
          </CardContent>
        </Card>
      ))
    : statCards.map(({ key, icon: Icon, value }) => (
        <Card key={key}>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              {t(`dashboard.${key}`)}
            </CardTitle>
            <Icon className="size-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold">{value ?? '—'}</p>
          </CardContent>
        </Card>
      ));

  return (
    <PageLayout fluid>
      <PageHeader title={t('dashboard.title')} description={t('dashboard.subtitle')} />

      {error && <p className="text-sm text-destructive">{error}</p>}

      <div className="flex flex-col gap-6">
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">{statCardContent}</div>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">{t('dashboard.recentResults')}</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            {loading && (
              <div className="flex flex-col gap-2 p-4">
                {['sk-r1', 'sk-r2', 'sk-r3', 'sk-r4', 'sk-r5'].map((id) => (
                  <Skeleton key={id} className="h-10 w-full" />
                ))}
              </div>
            )}
            {!loading && recentResults.length === 0 && (
              <p className="p-4 text-sm text-muted-foreground">{t('common.noData')}</p>
            )}
            {!loading && recentResults.length > 0 && (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b bg-muted/50">
                      <th className="px-4 py-3 text-left font-medium">{t('results.company')}</th>
                      <th className="px-4 py-3 text-left font-medium">{t('results.quizId')}</th>
                      <th className="px-4 py-3 text-left font-medium">{t('results.score')}</th>
                      <th className="px-4 py-3 text-left font-medium">{t('results.diagnosis')}</th>
                      <th className="px-4 py-3 text-left font-medium">{t('results.date')}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {recentResults.map((r) => (
                      <tr key={r.id} className="border-b last:border-0 hover:bg-muted/30">
                        <td className="px-4 py-3 font-medium">{r.companyName}</td>
                        <td className="px-4 py-3 text-muted-foreground">{r.quizId}</td>
                        <td className="px-4 py-3">{r.overallScore.toFixed(2)}</td>
                        <td className="px-4 py-3">{r.diagnosis}</td>
                        <td className="px-4 py-3 text-muted-foreground">
                          {formatDateTime(r.submittedAt, locale, false)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>

        <WebAnalyticsSection />
      </div>
    </PageLayout>
  );
}
