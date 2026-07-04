import type { AnalyticsSource, AnalyticsSources } from '@/api/types';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import type { Locale } from '@/lib/i18n';
import { useLocale } from '@/lib/i18n';
import type { ReactNode } from 'react';
import { formatNumber, formatPercent } from './analyticsFormat';

interface SourcesTableProps {
  readonly data: AnalyticsSources | null;
  readonly loading: boolean;
  readonly error: string | null;
}

const SKELETON_ROW_KEYS = ['src-sk-1', 'src-sk-2', 'src-sk-3', 'src-sk-4', 'src-sk-5'];

function SourceRow({
  source,
  locale,
}: { readonly source: AnalyticsSource; readonly locale: Locale }) {
  return (
    <tr className="border-b last:border-0 hover:bg-muted/30">
      <td className="px-4 py-3 font-medium">{source.source}</td>
      <td className="px-4 py-3 text-right">{formatNumber(source.sessions, locale)}</td>
      <td className="px-4 py-3 text-right text-muted-foreground">
        {formatPercent(source.share, locale)}
      </td>
    </tr>
  );
}

export function SourcesTable({ data, loading, error }: SourcesTableProps) {
  const { t, locale } = useLocale();

  let bodyContent: ReactNode;
  if (loading) {
    bodyContent = (
      <div className="flex flex-col gap-2 p-4">
        {SKELETON_ROW_KEYS.map((key) => (
          <Skeleton key={key} className="h-10 w-full" />
        ))}
      </div>
    );
  } else if (error) {
    bodyContent = <p className="p-4 text-sm text-destructive">{error}</p>;
  } else if (data?.sources.length === 0) {
    bodyContent = <p className="p-4 text-sm text-muted-foreground">{t('common.noData')}</p>;
  } else {
    bodyContent = (
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b bg-muted/50">
              <th className="px-4 py-3 text-left font-medium">{t('analytics.sources.source')}</th>
              <th className="px-4 py-3 text-right font-medium">
                {t('analytics.sources.sessions')}
              </th>
              <th className="px-4 py-3 text-right font-medium">{t('analytics.sources.share')}</th>
            </tr>
          </thead>
          <tbody>
            {data?.sources.map((source) => (
              <SourceRow key={source.source} source={source} locale={locale} />
            ))}
          </tbody>
        </table>
      </div>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">{t('analytics.sources.title')}</CardTitle>
      </CardHeader>
      <CardContent className="p-0">{bodyContent}</CardContent>
    </Card>
  );
}
