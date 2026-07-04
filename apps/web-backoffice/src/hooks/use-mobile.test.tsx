import { act, renderHook } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { useIsMobile } from './use-mobile';

function setInnerWidth(width: number) {
  Object.defineProperty(window, 'innerWidth', { writable: true, configurable: true, value: width });
}

function mockMatchMedia() {
  const listeners: Array<() => void> = [];
  const mql = {
    matches: false,
    media: '',
    addEventListener: vi.fn((_event: string, cb: () => void) => listeners.push(cb)),
    removeEventListener: vi.fn(),
  };
  vi.stubGlobal('matchMedia', vi.fn().mockReturnValue(mql));
  return {
    mql,
    trigger: () => {
      for (const cb of listeners) cb();
    },
  };
}

describe('useIsMobile', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('returns true when the viewport is narrower than the mobile breakpoint', () => {
    setInnerWidth(500);
    mockMatchMedia();

    const { result } = renderHook(() => useIsMobile());

    expect(result.current).toBe(true);
  });

  it('returns false when the viewport is at or above the mobile breakpoint', () => {
    setInnerWidth(1024);
    mockMatchMedia();

    const { result } = renderHook(() => useIsMobile());

    expect(result.current).toBe(false);
  });

  it('updates when the matchMedia change event fires', () => {
    setInnerWidth(1024);
    const { trigger } = mockMatchMedia();

    const { result } = renderHook(() => useIsMobile());
    expect(result.current).toBe(false);

    setInnerWidth(400);
    act(() => trigger());

    expect(result.current).toBe(true);
  });

  it('registers and cleans up the matchMedia change listener on unmount', () => {
    setInnerWidth(1024);
    const { mql } = mockMatchMedia();

    const { unmount } = renderHook(() => useIsMobile());
    expect(mql.addEventListener).toHaveBeenCalledWith('change', expect.any(Function));

    unmount();
    expect(mql.removeEventListener).toHaveBeenCalledWith('change', expect.any(Function));
  });
});
