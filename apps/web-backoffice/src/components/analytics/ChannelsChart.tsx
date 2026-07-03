import type { AnalyticsChannel, AnalyticsChannels } from '@/api/types';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import type { Locale } from '@/lib/i18n';
import { useLocale } from '@/lib/i18n';
import type { ReactNode } from 'react';
import { formatNumber, formatPercent } from './analyticsFormat';

interface ChannelsChartProps {
  readonly data: AnalyticsChannels | null;
  readonly loading: boolean;
  readonly error: string | null;
}

const SKELETON_ROW_KEYS = ['ch-sk-1', 'ch-sk-2', 'ch-sk-3', 'ch-sk-4'];

function ChannelBar({
  channel,
  locale,
}: { readonly channel: AnalyticsChannel; readonly locale: Locale }) {
  const widthPercent = Math.round(channel.share * 1000) / 10;
  return (
    <li className="flex flex-col gap-1">
      <div className="flex items-center justify-between text-sm">
        <span className="font-medium">{channel.channel}</span>
        <span className="text-muted-foreground">
          {formatNumber(channel.sessions, locale)} · {formatPercent(channel.share, locale)}
        </span>
      </div>
      <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
        <div
          className="h-full rounded-full bg-[var(--chart-1)]"
          style={{ width: `${widthPercent}%` }}
        />
      </div>
    </li>
  );
}

export function ChannelsChart({ data, loading, error }: ChannelsChartProps) {
  const { t, locale } = useLocale();

  let bodyContent: ReactNode;
  if (loading) {
    bodyContent = (
      <div className="flex flex-col gap-3">
        {SKELETON_ROW_KEYS.map((key) => (
          <Skeleton key={key} className="h-8 w-full" />
        ))}
      </div>
    );
  } else if (error) {
    bodyContent = <p className="text-sm text-destructive">{error}</p>;
  } else if (data?.channels.length === 0) {
    bodyContent = <p className="text-sm text-muted-foreground">{t('common.noData')}</p>;
  } else {
    bodyContent = (
      <ul className="flex flex-col gap-4">
        {data?.channels.map((channel) => (
          <ChannelBar key={channel.channel} channel={channel} locale={locale} />
        ))}
      </ul>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">{t('analytics.channels.title')}</CardTitle>
      </CardHeader>
      <CardContent>{bodyContent}</CardContent>
    </Card>
  );
}
