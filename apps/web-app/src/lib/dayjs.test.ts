import { describe, expect, it } from 'vitest';
import { formatDateTime } from './dayjs';

describe('formatDateTime', () => {
  // Use a time that stays on the same date across all UTC offsets (-12 to +14)
  const iso = '2026-06-12T12:00:00.000Z';

  it('returns -- for empty string', () => {
    expect(formatDateTime('', 'en')).toBe('--');
  });

  it('returns -- for invalid date string', () => {
    expect(formatDateTime('not-a-date', 'en')).toBe('--');
  });

  it('formats EN date with time by default', () => {
    const result = formatDateTime(iso, 'en');
    expect(result).toMatch(/^\d{1,2}\/\d{2}\/\d{4} \d{2}:\d{2}$/);
  });

  it('formats EN date without time when withTime=false', () => {
    const result = formatDateTime(iso, 'en', false);
    expect(result).toMatch(/^\d{1,2}\/\d{2}\/\d{4}$/);
    expect(result).not.toContain(':');
  });

  it('TH output contains Buddhist Era year (2026 → 2569)', () => {
    const result = formatDateTime(iso, 'th', false);
    expect(result).toContain('2569');
  });

  it('TH output with time includes HH:mm', () => {
    const result = formatDateTime(iso, 'th');
    expect(result).toContain('2569');
    expect(result).toMatch(/\d{2}:\d{2}/);
  });

  it('accepts a Date object', () => {
    const result = formatDateTime(new Date(iso), 'en', false);
    expect(result).toMatch(/^\d{1,2}\/\d{2}\/\d{4}$/);
  });
});
