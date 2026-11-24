import { QueryClient } from '@tanstack/react-query';
import { QUERY_RETRY_COUNT, QUERY_STALE_MS } from './queries.consts';

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: { staleTime: QUERY_STALE_MS, retry: QUERY_RETRY_COUNT, refetchOnWindowFocus: false },
  },
});
