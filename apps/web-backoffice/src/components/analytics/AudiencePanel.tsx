import type { AnalyticsAudience, AnalyticsCountry, AnalyticsDevice } from '@/api/types';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { useLocale } from '@/lib/i18n';
import type { ReactNode } from 'react';
import { formatNumber } from './analyticsFormat';

interface AudiencePanelProps {
  readonly data: AnalyticsAudience | null;
  readonly loading: boolean;
  readonly error: string | null;
}

const SKELETON_ROW_KEYS = ['aud-sk-1', 'aud-sk-2', 'aud-sk-3', 'aud-sk-4'];

const DEVICE_KEY_MAP: Record<string, string> = {
  desktop: 'analytics.audience.deviceDesktop',
  mobile: 'analytics.audience.deviceMobile',
  tablet: 'analytics.audience.deviceTablet',
};

function CountryList({ countries }: { readonly countries: AnalyticsCountry[] }) {
  const { locale } = useLocale();
  return (
    <ul className="flex flex-col gap-2">
      {countries.map((c) => (
        <li key={c.country} className="flex items-center justify-between text-sm">
          <span>{c.country}</span>
          <span className="text-muted-foreground">{formatNumber(c.sessions, locale)}</span>
        </li>
      ))}
    </ul>
  );
}

function DeviceList({ devices }: { readonly devices: AnalyticsDevice[] }) {
  const { t, locale } = useLocale();
  return (
    <ul className="flex flex-col gap-2">
      {devices.map((d) => {
        const labelKey = DEVICE_KEY_MAP[d.deviceCategory];
        const label = labelKey ? t(labelKey) : d.deviceCategory;
        return (
          <li key={d.deviceCategory} className="flex items-center justify-between text-sm">
            <span>{label}</span>
            <span className="text-muted-foreground">{formatNumber(d.sessions, locale)}</span>
          </li>
        );
      })}
    </ul>
  );
}

export function AudiencePanel({ data, loading, error }: AudiencePanelProps) {
  const { t } = useLocale();

  let countriesContent: ReactNode;
  let devicesContent: ReactNode;

  if (loading) {
    const skeleton = (
      <div className="flex flex-col gap-2">
        {SKELETON_ROW_KEYS.map((key) => (
          <Skeleton key={key} className="h-6 w-full" />
        ))}
      </div>
    );
    countriesContent = skeleton;
    devicesContent = skeleton;
  } else if (error) {
    countriesContent = <p className="text-sm text-destructive">{error}</p>;
    devicesContent = null;
  } else {
    countriesContent =
      data?.countries.length === 0 ? (
        <p className="text-sm text-muted-foreground">{t('common.noData')}</p>
      ) : (
        <CountryList countries={data?.countries ?? []} />
      );
    devicesContent =
      data?.devices.length === 0 ? (
        <p className="text-sm text-muted-foreground">{t('common.noData')}</p>
      ) : (
        <DeviceList devices={data?.devices ?? []} />
      );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">{t('analytics.audience.title')}</CardTitle>
      </CardHeader>
      <CardContent className="grid gap-6 sm:grid-cols-2">
        <div className="flex flex-col gap-3">
          <h4 className="text-sm font-medium text-muted-foreground">
            {t('analytics.audience.countries')}
          </h4>
          {countriesContent}
        </div>
        <div className="flex flex-col gap-3">
          <h4 className="text-sm font-medium text-muted-foreground">
            {t('analytics.audience.devices')}
          </h4>
          {devicesContent}
        </div>
      </CardContent>
    </Card>
  );
}
