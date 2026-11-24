/** HTTP routes between the scan service and the AI service. Both listen on localhost only. */
export const SERVICE_ROUTES = {
  /** AI service: start investigating a scan. */
  INVESTIGATIONS: '/investigations',
  /** Scan service: prefix for calls from the AI service, kept out of the public `/api`. */
  INTERNAL: '/internal',
  /** Scan service: "this scan changed in MongoDB, push it to the UI". */
  SCAN_CHANGED: '/scans/:id/changed',
} as const;

export const SERVICE_CALL_TIMEOUT_MS = 5000;
