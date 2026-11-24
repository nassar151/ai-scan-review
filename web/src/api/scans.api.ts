import type { CreateScanRequest, Scan, ScanSummary } from '@scan/shared';
import { API_PATHS, HTTP_METHOD } from './api.consts';
import { requestJson } from './http';

export const listScans = (limit: number, signal?: AbortSignal) =>
  requestJson<ScanSummary[]>(`${API_PATHS.SCANS}?limit=${limit}`, { signal });

export const getScan = (scanId: string, signal?: AbortSignal) =>
  requestJson<Scan>(`${API_PATHS.SCANS}/${encodeURIComponent(scanId)}`, { signal });

export const createScan = (request: CreateScanRequest) =>
  requestJson<Scan>(API_PATHS.SCANS, { method: HTTP_METHOD.POST, body: JSON.stringify(request) });

export const scanEventsUrl = (scanId: string) => `${API_PATHS.SCANS}/${encodeURIComponent(scanId)}/events`;
