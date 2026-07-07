import { describe, expect, it } from 'vitest';
import { formatNumber, formatPercent, formatSeconds } from './analyticsFormat';

describe('formatNumber', () => {
  it('formats an integer with thousands separators for en locale', () => {
    expect(formatNumber(1234567, 'en')).toBe('1,234,567');
  });

  it('formats an integer with thousands separators for th locale', () => {
    expect(formatNumber(1234567, 'th')).toBe('1,234,567');
  });

  it('formats zero as "0"', () => {
    expect(formatNumber(0, 'en')).toBe('0');
  });
});

describe('formatSeconds', () => {
  it('rounds to one decimal place and appends the English unit', () => {
    expect(formatSeconds(74.34, 'en')).toBe('74.3s');
  });

  it('rounds up when the second decimal is 5 or greater', () => {
    expect(formatSeconds(74.36, 'en')).toBe('74.4s');
  });

  it('appends the Thai unit for th locale', () => {
    expect(formatSeconds(74.3, 'th')).toBe('74.3วิ');
  });

  it('formats zero seconds as "0s"', () => {
    expect(formatSeconds(0, 'en')).toBe('0s');
  });
});

describe('formatPercent', () => {
  it('treats share as a 0-1 fraction and converts it to a percentage', () => {
    expect(formatPercent(0.6, 'en')).toBe('60%');
  });

  it('rounds the percentage to one decimal place', () => {
    expect(formatPercent(0.333, 'en')).toBe('33.3%');
  });

  it('formats a zero share as "0%"', () => {
    expect(formatPercent(0, 'en')).toBe('0%');
  });

  it('formats a full share (1) as "100%"', () => {
    expect(formatPercent(1, 'en')).toBe('100%');
  });
});
