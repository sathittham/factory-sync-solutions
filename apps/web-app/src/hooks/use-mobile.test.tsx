import { act, renderHook } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { useIsMobile } from './use-mobile';

function setInnerWidth(width: number) {
  Object.defineProperty(window, 'innerWidth', {
    writable: true,
    configurable: true,
    value: width,
  });
}

function mockMatchMedia() {
  const listeners: Array<() => void> = [];
  const addEventListener = vi.fn((_event: string, cb: () => void) => {
    listeners.push(cb);
  });
  const removeEventListener = vi.fn();
  const matchMediaMock = vi.fn().mockReturnValue({ addEventListener, removeEventListener });
  vi.stubGlobal('matchMedia', matchMediaMock);
  return { addEventListener, removeEventListener, listeners, matchMediaMock };
}

describe('useIsMobile', () => {
  const originalInnerWidth = window.innerWidth;

  afterEach(() => {
    vi.unstubAllGlobals();
    setInnerWidth(originalInnerWidth);
  });

  it('returns true when the viewport is narrower than the mobile breakpoint', () => {
    mockMatchMedia();
    setInnerWidth(500);

    const { result } = renderHook(() => useIsMobile());

    expect(result.current).toBe(true);
  });

  it('returns false when the viewport is at or above the mobile breakpoint', () => {
    mockMatchMedia();
    setInnerWidth(1024);

    const { result } = renderHook(() => useIsMobile());

    expect(result.current).toBe(false);
  });

  it('queries matchMedia with the expected breakpoint expression', () => {
    const { addEventListener, matchMediaMock } = mockMatchMedia();
    setInnerWidth(1024);

    renderHook(() => useIsMobile());

    expect(matchMediaMock).toHaveBeenCalledWith('(max-width: 767px)');
    expect(addEventListener).toHaveBeenCalledWith('change', expect.any(Function));
  });

  it('updates when the media query change listener fires', () => {
    const { listeners } = mockMatchMedia();
    setInnerWidth(1024);

    const { result } = renderHook(() => useIsMobile());
    expect(result.current).toBe(false);

    setInnerWidth(400);
    act(() => {
      for (const listener of listeners) listener();
    });

    expect(result.current).toBe(true);
  });

  it('removes the change listener on unmount', () => {
    const { removeEventListener } = mockMatchMedia();
    setInnerWidth(1024);

    const { unmount } = renderHook(() => useIsMobile());
    unmount();

    expect(removeEventListener).toHaveBeenCalledWith('change', expect.any(Function));
  });
});
