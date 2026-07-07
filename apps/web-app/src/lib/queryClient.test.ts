import { describe, expect, it } from 'vitest';
import { queryClient } from './queryClient';

describe('queryClient', () => {
  it('sets a 30 second stale time for queries', () => {
    expect(queryClient.getDefaultOptions().queries?.staleTime).toBe(30_000);
  });

  it('retries failed queries exactly once', () => {
    expect(queryClient.getDefaultOptions().queries?.retry).toBe(1);
  });

  it('disables refetch on window focus', () => {
    expect(queryClient.getDefaultOptions().queries?.refetchOnWindowFocus).toBe(false);
  });
});
