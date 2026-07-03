import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { renderHook } from '@testing-library/react';
import type { ReactElement, ReactNode } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { useMessagesQuery } from './useChatSession';

/** UT-F08 — polling only while the panel is open (docs/product/ai-chatbot/test-plan.md §2.3). */

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

function wrapper({ children }: Readonly<{ children: ReactNode }>): ReactElement {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>;
}

describe('useMessagesQuery — UT-F08', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.unstubAllGlobals();
  });

  it('does not fetch while the panel is closed', async () => {
    const fetchMock = vi.fn(() =>
      Promise.resolve(jsonResponse({ success: true, data: [], meta: {} })),
    );
    vi.stubGlobal('fetch', fetchMock);

    renderHook(
      () =>
        useMessagesQuery({
          getIdToken: async () => 'token',
          apiBaseUrl: 'https://api.test/v1',
          conversationId: 'conv-1',
          open: false,
        }),
      { wrapper },
    );

    await vi.advanceTimersByTimeAsync(10_000);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('fetches immediately and refetches on a >=3s interval while open', async () => {
    const fetchMock = vi.fn(() =>
      Promise.resolve(jsonResponse({ success: true, data: [], meta: {} })),
    );
    vi.stubGlobal('fetch', fetchMock);

    const { result } = renderHook(
      () =>
        useMessagesQuery({
          getIdToken: async () => 'token',
          apiBaseUrl: 'https://api.test/v1',
          conversationId: 'conv-1',
          open: true,
        }),
      { wrapper },
    );

    // Fake timers don't pause promise microtasks, only setTimeout/setInterval — flush those
    // instead of testing-library's `waitFor` (which itself schedules via a real/fake timer and
    // deadlocks unless nudged).
    await vi.advanceTimersByTimeAsync(0);
    expect(result.current.isSuccess).toBe(true);
    expect(fetchMock).toHaveBeenCalledTimes(1);

    await vi.advanceTimersByTimeAsync(3000);
    expect(fetchMock.mock.calls.length).toBeGreaterThanOrEqual(2);

    await vi.advanceTimersByTimeAsync(3000);
    expect(fetchMock.mock.calls.length).toBeGreaterThanOrEqual(3);
  });
});
