import { ApiRequestError } from '../../../api/http';
import { START_SCAN_ERROR_HINT } from './ScanForm.consts';

export const startScanErrorDetails = (error: Error): string =>
  (error instanceof ApiRequestError && error.details) || START_SCAN_ERROR_HINT;
