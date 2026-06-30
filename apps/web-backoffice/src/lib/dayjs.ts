import dayjs from 'dayjs';
import buddhistEra from 'dayjs/plugin/buddhistEra';

dayjs.extend(buddhistEra);

/**
 * Format a date string with locale awareness.
 * Thai locale uses Buddhist Era (พ.ศ.) via the BBBB token.
 */
export function formatDateTime(date: string | Date, locale: string, withTime = true): string {
  if (!date) return '--';
  const d = dayjs(date);
  if (!d.isValid()) return '--';

  if (locale === 'th') {
    return withTime ? d.format('D/MM/BBBB HH:mm') : d.format('D/MM/BBBB');
  }
  return withTime ? d.format('D/MM/YYYY HH:mm') : d.format('D/MM/YYYY');
}

export { dayjs };
