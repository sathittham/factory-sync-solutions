import { act, renderHook } from '@testing-library/react';
import { beforeEach, describe, expect, it } from 'vitest';
import { LocaleProvider, useLocale } from './i18n';

describe('LocaleProvider + useLocale', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('defaults to Thai locale', () => {
    const { result } = renderHook(() => useLocale(), { wrapper: LocaleProvider });
    expect(result.current.locale).toBe('th');
  });

  it('reads stored locale from localStorage on mount', () => {
    localStorage.setItem('fss-locale', 'en');
    const { result } = renderHook(() => useLocale(), { wrapper: LocaleProvider });
    expect(result.current.locale).toBe('en');
  });

  it('setLocale updates locale and persists to localStorage', () => {
    const { result } = renderHook(() => useLocale(), { wrapper: LocaleProvider });
    act(() => result.current.setLocale('en'));
    expect(result.current.locale).toBe('en');
    expect(localStorage.getItem('fss-locale')).toBe('en');
  });

  it('t() returns Thai translation by default', () => {
    const { result } = renderHook(() => useLocale(), { wrapper: LocaleProvider });
    expect(result.current.t('nav.dashboard')).toBe('แดชบอร์ด');
  });

  it('t() returns English translation after setLocale("en")', () => {
    const { result } = renderHook(() => useLocale(), { wrapper: LocaleProvider });
    act(() => result.current.setLocale('en'));
    expect(result.current.t('nav.dashboard')).toBe('Dashboard');
  });

  it('t() falls back to the key when translation is not found', () => {
    const { result } = renderHook(() => useLocale(), { wrapper: LocaleProvider });
    expect(result.current.t('nonexistent.key')).toBe('nonexistent.key');
  });

  it('useLocale throws when used outside LocaleProvider', () => {
    expect(() => renderHook(() => useLocale())).toThrow(
      'useLocale must be used within LocaleProvider',
    );
  });
});
