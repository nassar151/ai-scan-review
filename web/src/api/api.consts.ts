export const API_BASE = '/api';

export const API_PATHS = {
  SCANS: `${API_BASE}/scans`,
} as const;

export const JSON_HEADERS = { 'Content-Type': 'application/json' } as const;

export const HTTP_METHOD = {
  POST: 'POST',
} as const;

export const RECENT_SCANS_LIMIT = 10;
