import { act, renderHook } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { ThemeProvider, useTheme } from './theme';

function setupMatchMedia(prefersDark = false) {
  vi.stubGlobal(
    'matchMedia',
    vi.fn().mockReturnValue({
      matches: prefersDark,
      media: '(prefers-color-scheme: dark)',
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
    }),
  );
}

describe('ThemeProvider + useTheme', () => {
  beforeEach(() => {
    localStorage.clear();
    document.documentElement.classList.remove('dark');
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('defaults to system theme when no preference is stored', () => {
    setupMatchMedia(false);
    const { result } = renderHook(() => useTheme(), { wrapper: ThemeProvider });
    expect(result.current.theme).toBe('system');
  });

  it('resolvedTheme is light when system prefers light', () => {
    setupMatchMedia(false);
    const { result } = renderHook(() => useTheme(), { wrapper: ThemeProvider });
    expect(result.current.resolvedTheme).toBe('light');
  });

  it('resolvedTheme is dark when system prefers dark', () => {
    setupMatchMedia(true);
    const { result } = renderHook(() => useTheme(), { wrapper: ThemeProvider });
    expect(result.current.resolvedTheme).toBe('dark');
  });

  it('reads stored theme from localStorage on mount', () => {
    localStorage.setItem('fss-theme', 'dark');
    setupMatchMedia(false);
    const { result } = renderHook(() => useTheme(), { wrapper: ThemeProvider });
    expect(result.current.theme).toBe('dark');
    expect(result.current.resolvedTheme).toBe('dark');
  });

  it('setTheme updates theme and persists to localStorage', () => {
    setupMatchMedia(false);
    const { result } = renderHook(() => useTheme(), { wrapper: ThemeProvider });
    act(() => result.current.setTheme('dark'));
    expect(result.current.theme).toBe('dark');
    expect(localStorage.getItem('fss-theme')).toBe('dark');
  });

  it('setTheme to light removes dark class from <html>', () => {
    localStorage.setItem('fss-theme', 'dark');
    setupMatchMedia(false);
    const { result } = renderHook(() => useTheme(), { wrapper: ThemeProvider });
    act(() => result.current.setTheme('light'));
    expect(document.documentElement.classList.contains('dark')).toBe(false);
  });

  it('useTheme throws when used outside ThemeProvider', () => {
    setupMatchMedia(false);
    expect(() => renderHook(() => useTheme())).toThrow(
      'useTheme must be used within ThemeProvider',
    );
  });
});
