export const ROUTES = {
  HOME: '/',
  SCAN: '/scans/:scanId',
  NOT_FOUND: '*',
} as const;

export const SCAN_ROUTE_PARAM = 'scanId';
