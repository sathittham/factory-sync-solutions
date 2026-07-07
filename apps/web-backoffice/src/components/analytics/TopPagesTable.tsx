import type { AnalyticsTopPage, AnalyticsTopPages } from '@/api/types';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import type { Locale } from '@/lib/i18n';
import { useLocale } from '@/lib/i18n';
import type { ReactNode } from 'react';
import { formatNumber, formatSeconds } from './analyticsFormat';

interface TopPagesTableProps {
  readonly data: AnalyticsTopPages | null;
  readonly loading: boolean;
  readonly error: string | null;
}

const SKELETON_ROW_KEYS = ['tp-sk-1', 'tp-sk-2', 'tp-sk-3', 'tp-sk-4', 'tp-sk-5'];

function PagePathCell({ path }: { readonly path: string }) {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <span className="block max-w-[220px] truncate">{path}</span>
      </TooltipTrigger>
      <TooltipContent>{path}</TooltipContent>
    </Tooltip>
  );
}

function PageRow({ page, locale }: { readonly page: AnalyticsTopPage; readonly locale: Locale }) {
  return (
    <tr className="border-b last:border-0 hover:bg-muted/30">
      <td className="px-4 py-3 font-medium">
        <PagePathCell path={page.path} />
      </td>
      <td className="px-4 py-3 text-right">{formatNumber(page.views, locale)}</td>
      <td className="px-4 py-3 text-right text-muted-foreground">
        {formatSeconds(page.avgEngagementTimeSec, locale)}
      </td>
    </tr>
  );
}

export function TopPagesTable({ data, loading, error }: TopPagesTableProps) {
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
  } else if (data?.pages.length === 0) {
    bodyContent = <p className="p-4 text-sm text-muted-foreground">{t('common.noData')}</p>;
  } else {
    bodyContent = (
      <TooltipProvider delayDuration={200}>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b bg-muted/50">
                <th className="px-4 py-3 text-left font-medium">{t('analytics.topPages.path')}</th>
                <th className="px-4 py-3 text-right font-medium">
                  {t('analytics.topPages.views')}
                </th>
                <th className="px-4 py-3 text-right font-medium">
                  {t('analytics.topPages.avgEngagementTime')}
                </th>
              </tr>
            </thead>
            <tbody>
              {data?.pages.map((page) => (
                <PageRow key={page.path} page={page} locale={locale} />
              ))}
            </tbody>
          </table>
        </div>
      </TooltipProvider>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">{t('analytics.topPages.title')}</CardTitle>
      </CardHeader>
      <CardContent className="p-0">{bodyContent}</CardContent>
    </Card>
  );
}
