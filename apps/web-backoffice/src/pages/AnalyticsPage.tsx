import { WebAnalyticsSection } from '@/components/analytics/WebAnalyticsSection';
import { useLocale } from '@/lib/i18n';
import { PageHeader, PageLayout } from '@shared/ui/PageLayout';

export function AnalyticsPage() {
  const { t } = useLocale();

  return (
    <PageLayout fluid>
      <PageHeader title={t('analytics.pageTitle')} description={t('analytics.pageSubtitle')} />
      <WebAnalyticsSection />
    </PageLayout>
  );
}
