import { QueryClient } from '@tanstack/react-query';

/**
 * Shared TanStack Query client. Owns server state (data fetched from the backend);
 * Redux is retained for client state (auth session, in-progress quiz answers).
 */
export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 30_000,
      retry: 1,
      refetchOnWindowFocus: false,
    },
  },
});
