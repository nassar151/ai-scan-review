export const scanKeys = {
  all: ['scans'] as const,
  list: () => [...scanKeys.all, 'list'] as const,
  detail: (scanId: string) => [...scanKeys.all, 'detail', scanId] as const,
};

/** Recent-scans list refresh while some scan is still running, so its status and grade stay current. */
export const ACTIVE_LIST_REFRESH_MS = 3000;
/** Fallback polling for the scan page if the live event stream drops. */
export const SCAN_POLL_FALLBACK_MS = 4000;
export const QUERY_STALE_MS = 5000;
export const QUERY_RETRY_COUNT = 1;
