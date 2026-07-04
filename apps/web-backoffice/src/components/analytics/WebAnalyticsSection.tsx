import { backofficeApi } from '@/api/backoffice';
import type {
  AnalyticsAudience,
  AnalyticsChannels,
  AnalyticsEngagement,
  AnalyticsOverview,
  AnalyticsRange,
  AnalyticsSite,
  AnalyticsSources,
  AnalyticsTopPages,
} from '@/api/types';
import { Button, buttonVariants } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useLocale } from '@/lib/i18n';
import { cn } from '@/lib/utils';
import { ExternalLink, RefreshCw } from 'lucide-react';
import { useCallback, useEffect, useState } from 'react';
import { AudiencePanel } from './AudiencePanel';
import { ChannelsChart } from './ChannelsChart';
import { EngagementPanel } from './EngagementPanel';
import { SourcesTable } from './SourcesTable';
import { TopPagesTable } from './TopPagesTable';
import { TrafficOverview } from './TrafficOverview';

function gaPropertyUrl(propertyID: string): string {
  return `https://analytics.google.com/analytics/web/#/p${propertyID}/reports/intelligenthome`;
}

const RANGE_OPTIONS: AnalyticsRange[] = ['7d', '28d', '90d'];

const SITE_OPTIONS: AnalyticsSite[] = ['all', 'official', 'app'];

interface PanelState<T> {
  data: T | null;
  error: string | null;
}

function initialPanelState<T>(): PanelState<T> {
  return { data: null, error: null };
}

function toPanelState<T>(result: PromiseSettledResult<T>, errorMessage: string): PanelState<T> {
  return result.status === 'fulfilled'
    ? { data: result.value, error: null }
    : { data: null, error: errorMessage };
}

export function WebAnalyticsSection() {
  const { t } = useLocale();

  const [range, setRange] = useState<AnalyticsRange>('28d');
  const [site, setSite] = useState<AnalyticsSite>('all');
  const [loading, setLoading] = useState(true);
  const [reloadToken, setReloadToken] = useState(0);

  const [overview, setOverview] = useState<PanelState<AnalyticsOverview>>(initialPanelState);
  const [topPages, setTopPages] = useState<PanelState<AnalyticsTopPages>>(initialPanelState);
  const [channels, setChannels] = useState<PanelState<AnalyticsChannels>>(initialPanelState);
  const [audience, setAudience] = useState<PanelState<AnalyticsAudience>>(initialPanelState);
  const [engagement, setEngagement] = useState<PanelState<AnalyticsEngagement>>(initialPanelState);
  const [sources, setSources] = useState<PanelState<AnalyticsSources>>(initialPanelState);
  const [propertyID, setPropertyID] = useState<string | null>(null);

  // biome-ignore lint/correctness/useExhaustiveDependencies: reloadToken forces a manual refetch on retry
  useEffect(() => {
    let cancelled = false;

    async function fetchAll() {
      setLoading(true);

      const [
        overviewResult,
        topPagesResult,
        channelsResult,
        audienceResult,
        engagementResult,
        sourcesResult,
      ] = await Promise.allSettled([
        backofficeApi.getAnalyticsOverview(range, site),
        backofficeApi.getAnalyticsTopPages(range, site),
        backofficeApi.getAnalyticsChannels(range, site),
        backofficeApi.getAnalyticsAudience(range, site),
        backofficeApi.getAnalyticsEngagement(range, site),
        backofficeApi.getAnalyticsSources(range, site),
      ]);

      if (cancelled) return;

      const unavailable = t('analytics.unavailable');
      setOverview(toPanelState(overviewResult, unavailable));
      setTopPages(toPanelState(topPagesResult, unavailable));
      setChannels(toPanelState(channelsResult, unavailable));
      setAudience(toPanelState(audienceResult, unavailable));
      setEngagement(toPanelState(engagementResult, unavailable));
      setSources(toPanelState(sourcesResult, unavailable));
      setLoading(false);
    }

    fetchAll();
    return () => {
      cancelled = true;
    };
  }, [range, site, reloadToken, t]);

  // The GA console deep link needs the server-side property ID. Fetch it once on
  // mount; on failure (service unconfigured) the link is simply not shown.
  useEffect(() => {
    let cancelled = false;
    backofficeApi
      .getAnalyticsMeta()
      .then((meta) => {
        if (!cancelled) setPropertyID(meta.propertyID);
      })
      .catch(() => {
        if (!cancelled) setPropertyID(null);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const handleRangeChange = useCallback((value: string) => {
    setRange(value as AnalyticsRange);
  }, []);

  const handleSiteChange = useCallback((value: string) => {
    setSite(value as AnalyticsSite);
  }, []);

  const handleRetry = useCallback(() => {
    setReloadToken((n) => n + 1);
  }, []);

  const isStale = Boolean(
    overview.data?.stale ||
      topPages.data?.stale ||
      channels.data?.stale ||
      audience.data?.stale ||
      engagement.data?.stale ||
      sources.data?.stale,
  );
  const hasAnyError = Boolean(
    overview.error ||
      topPages.error ||
      channels.error ||
      audience.error ||
      engagement.error ||
      sources.error,
  );
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
          {propertyID && (
            <a
              href={gaPropertyUrl(propertyID)}
              target="_blank"
              rel="noopener noreferrer"
              className={cn(buttonVariants({ variant: 'outline', size: 'sm' }))}
            >
              <ExternalLink className="mr-1 size-3.5" />
              {t('analytics.openInGA')}
            </a>
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
        <Tabs value={site} onValueChange={handleSiteChange}>
          <TabsList>
            {SITE_OPTIONS.map((opt) => (
              <TabsTrigger key={opt} value={opt}>
                {t(`analytics.site.${opt}`)}
              </TabsTrigger>
            ))}
          </TabsList>
        </Tabs>

        {isStale && !loading && (
          <p className="rounded-md border border-amber-300 bg-amber-50 px-4 py-2 text-sm text-amber-800 dark:border-amber-800 dark:bg-amber-950/30 dark:text-amber-400">
            {t('analytics.staleWarning')}
          </p>
        )}

        <TrafficOverview data={overview.data} loading={loading} error={overview.error} />

        <EngagementPanel data={engagement.data} loading={loading} error={engagement.error} />

        <div className="grid gap-6 lg:grid-cols-2">
          <TopPagesTable data={topPages.data} loading={loading} error={topPages.error} />
          <ChannelsChart data={channels.data} loading={loading} error={channels.error} />
        </div>

        <SourcesTable data={sources.data} loading={loading} error={sources.error} />

        <AudiencePanel data={audience.data} loading={loading} error={audience.error} />
      </CardContent>
    </Card>
  );
}
