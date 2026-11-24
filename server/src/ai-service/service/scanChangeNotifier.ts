import { SERVICE_CALL_TIMEOUT_MS, SERVICE_ROUTES } from '../../common/serviceRoutes.consts';

/**
 * Tells the scan service that a scan changed in MongoDB, so it pushes the new state to the UI over SSE.
 * The data itself is read from MongoDB, so a lost or late call only delays an update.
 */
export const createScanChangeNotifier = (scanServiceUrl: string) => (scanId: string) => {
  const route = SERVICE_ROUTES.SCAN_CHANGED.replace(':id', encodeURIComponent(scanId));
  void fetch(`${scanServiceUrl}${SERVICE_ROUTES.INTERNAL}${route}`, {
    method: 'POST',
    signal: AbortSignal.timeout(SERVICE_CALL_TIMEOUT_MS),
  }).catch((error: unknown) => console.error(`Could not notify the scan service about scan ${scanId}`, error));
};
