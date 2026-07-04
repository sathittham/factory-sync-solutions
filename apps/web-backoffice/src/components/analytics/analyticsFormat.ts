import type { Locale } from '@/lib/i18n';

export function formatNumber(value: number, locale: Locale): string {
  return value.toLocaleString(locale === 'th' ? 'th-TH' : 'en-US');
}

export function formatSeconds(seconds: number, locale: Locale): string {
  const unit = locale === 'th' ? 'วิ' : 's';
  return `${formatNumber(Math.round(seconds * 10) / 10, locale)}${unit}`;
}

export function formatPercent(share: number, locale: Locale): string {
  return `${formatNumber(Math.round(share * 1000) / 10, locale)}%`;
}
