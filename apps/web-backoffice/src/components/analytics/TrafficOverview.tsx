import type { AnalyticsOverview } from '@/api/types';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { formatDateTime } from '@/lib/dayjs';
import { useLocale } from '@/lib/i18n';
import type { ReactNode } from 'react';
import {
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { formatNumber, formatSeconds } from './analyticsFormat';

interface TrafficOverviewProps {
  readonly data: AnalyticsOverview | null;
  readonly loading: boolean;
  readonly error: string | null;
}

const SKELETON_CARD_KEYS = ['ov-sk-1', 'ov-sk-2', 'ov-sk-3', 'ov-sk-4'];

export function TrafficOverview({ data, loading, error }: TrafficOverviewProps) {
  const { t, locale } = useLocale();

  const statCards = [
    { key: 'activeUsers', value: data?.totals.activeUsers },
    { key: 'sessions', value: data?.totals.sessions },
    { key: 'pageViews', value: data?.totals.pageViews },
    { key: 'avgEngagementTime', value: data?.totals.avgEngagementTimeSec },
  ] as const;

  const hasSeriesData =
    (data?.series.length ?? 0) > 0 && (data?.series.some((p) => p.sessions > 0) ?? false);

  const skeletonCards: ReactNode = SKELETON_CARD_KEYS.map((key) => (
    <Card key={key}>
      <CardHeader className="pb-2">
        <Skeleton className="h-4 w-24" />
      </CardHeader>
      <CardContent>
        <Skeleton className="h-8 w-16" />
      </CardContent>
    </Card>
  ));

  const errorCard: ReactNode = (
    <Card className="sm:col-span-2 lg:col-span-4">
      <CardContent className="p-4">
        <p className="text-sm text-destructive">{error}</p>
      </CardContent>
    </Card>
  );

  const loadedCards: ReactNode = statCards.map(({ key, value }) => {
    const displayValue =
      key === 'avgEngagementTime'
        ? formatSeconds(value ?? 0, locale)
        : formatNumber(value ?? 0, locale);
    return (
      <Card key={key}>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium text-muted-foreground">
            {t(`analytics.${key}`)}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-3xl font-bold">{displayValue}</p>
        </CardContent>
      </Card>
    );
  });

  let cardsContent: ReactNode = loadedCards;
  if (loading) cardsContent = skeletonCards;
  else if (error) cardsContent = errorCard;

  const emptyChart: ReactNode = (
    <p className="py-12 text-center text-sm text-muted-foreground">{t('common.noData')}</p>
  );

  const lineChart: ReactNode = (
    <ResponsiveContainer width="100%" height={280}>
      <LineChart data={data?.series} margin={{ top: 8, right: 16, left: 0, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
        <XAxis
          dataKey="date"
          tickFormatter={(value: string) => formatDateTime(value, locale, false)}
          className="text-sm"
          tick={{ fontSize: 13 }}
        />
        <YAxis allowDecimals={false} tick={{ fontSize: 13 }} />
        <Tooltip
          labelFormatter={(value: string) => formatDateTime(value, locale, false)}
          formatter={(value: number) => formatNumber(value, locale)}
        />
        <Legend
          formatter={(value: string) =>
            value === 'activeUsers' ? t('analytics.activeUsers') : t('analytics.sessions')
          }
        />
        <Line
          type="monotone"
          dataKey="activeUsers"
          stroke="var(--chart-1)"
          strokeWidth={2}
          dot={false}
        />
        <Line
          type="monotone"
          dataKey="sessions"
          stroke="var(--chart-2)"
          strokeWidth={2}
          dot={false}
        />
      </LineChart>
    </ResponsiveContainer>
  );

  const noSeriesData = !hasSeriesData;
  let chartContent: ReactNode = lineChart;
  if (loading) chartContent = <Skeleton className="h-64 w-full" />;
  else if (error) chartContent = null;
  else if (noSeriesData) chartContent = emptyChart;

  return (
    <div className="flex flex-col gap-4">
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">{cardsContent}</div>
      <Card>
        <CardHeader>
          <CardTitle className="text-base">{t('analytics.dailyTrend')}</CardTitle>
        </CardHeader>
        <CardContent>{chartContent}</CardContent>
      </Card>
    </div>
  );
}
