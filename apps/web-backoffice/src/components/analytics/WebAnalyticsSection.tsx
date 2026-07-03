import { backofficeApi } from '@/api/backoffice';
import type {
  AnalyticsAudience,
  AnalyticsChannels,
  AnalyticsOverview,
  AnalyticsRange,
  AnalyticsTopPages,
} from '@/api/types';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useLocale } from '@/lib/i18n';
import { RefreshCw } from 'lucide-react';
import { useCallback, useEffect, useState } from 'react';
import { AudiencePanel } from './AudiencePanel';
import { ChannelsChart } from './ChannelsChart';
import { TopPagesTable } from './TopPagesTable';
import { TrafficOverview } from './TrafficOverview';

const RANGE_OPTIONS: AnalyticsRange[] = ['7d', '28d', '90d'];

interface PanelState<T> {
  data: T | null;
  error: string | null;
}

function initialPanelState<T>(): PanelState<T> {
  return { data: null, error: null };
}

export function WebAnalyticsSection() {
  const { t } = useLocale();

  const [range, setRange] = useState<AnalyticsRange>('28d');
  const [loading, setLoading] = useState(true);
  const [reloadToken, setReloadToken] = useState(0);

  const [overview, setOverview] = useState<PanelState<AnalyticsOverview>>(initialPanelState);
  const [topPages, setTopPages] = useState<PanelState<AnalyticsTopPages>>(initialPanelState);
  const [channels, setChannels] = useState<PanelState<AnalyticsChannels>>(initialPanelState);
  const [audience, setAudience] = useState<PanelState<AnalyticsAudience>>(initialPanelState);

  // biome-ignore lint/correctness/useExhaustiveDependencies: reloadToken forces a manual refetch on retry
  useEffect(() => {
    let cancelled = false;

    async function fetchAll() {
      setLoading(true);

      const [overviewResult, topPagesResult, channelsResult, audienceResult] =
        await Promise.allSettled([
          backofficeApi.getAnalyticsOverview(range),
          backofficeApi.getAnalyticsTopPages(range),
          backofficeApi.getAnalyticsChannels(range),
          backofficeApi.getAnalyticsAudience(range),
        ]);

      if (cancelled) return;

      setOverview(
        overviewResult.status === 'fulfilled'
          ? { data: overviewResult.value, error: null }
          : { data: null, error: t('analytics.unavailable') },
      );
      setTopPages(
        topPagesResult.status === 'fulfilled'
          ? { data: topPagesResult.value, error: null }
          : { data: null, error: t('analytics.unavailable') },
      );
      setChannels(
        channelsResult.status === 'fulfilled'
          ? { data: channelsResult.value, error: null }
          : { data: null, error: t('analytics.unavailable') },
      );
      setAudience(
        audienceResult.status === 'fulfilled'
          ? { data: audienceResult.value, error: null }
          : { data: null, error: t('analytics.unavailable') },
      );
      setLoading(false);
    }

    fetchAll();
    return () => {
      cancelled = true;
    };
  }, [range, reloadToken, t]);

  const handleRangeChange = useCallback((value: string) => {
    setRange(value as AnalyticsRange);
  }, []);

  const handleRetry = useCallback(() => {
    setReloadToken((n) => n + 1);
  }, []);

  const isStale = Boolean(
    overview.data?.stale || topPages.data?.stale || channels.data?.stale || audience.data?.stale,
  );
  const hasAnyError = Boolean(overview.error || topPages.error || channels.error || audience.error);
  const showRetry = (isStale || hasAnyError) && !loading;

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between gap-4">
        <CardTitle className="text-lg">{t('analytics.sectionTitle')}</CardTitle>
        <div className="flex items-center gap-2">
          {showRetry && (
            <Button variant="outline" size="sm" onClick={handleRetry}>
              <RefreshCw className="mr-1 size-3.5" />
              {t('analytics.retry')}
            </Button>
          )}
          <Select value={range} onValueChange={handleRangeChange}>
            <SelectTrigger className="w-48">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {RANGE_OPTIONS.map((opt) => (
                <SelectItem key={opt} value={opt}>
                  {t(`analytics.range.${opt}`)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </CardHeader>
      <CardContent className="flex flex-col gap-6">
        {isStale && !loading && (
          <p className="rounded-md border border-amber-300 bg-amber-50 px-4 py-2 text-sm text-amber-800 dark:border-amber-800 dark:bg-amber-950/30 dark:text-amber-400">
            {t('analytics.staleWarning')}
          </p>
        )}

        <TrafficOverview data={overview.data} loading={loading} error={overview.error} />

        <div className="grid gap-6 lg:grid-cols-2">
          <TopPagesTable data={topPages.data} loading={loading} error={topPages.error} />
          <ChannelsChart data={channels.data} loading={loading} error={channels.error} />
        </div>

        <AudiencePanel data={audience.data} loading={loading} error={audience.error} />
      </CardContent>
    </Card>
  );
}
