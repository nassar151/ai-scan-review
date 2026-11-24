import { SERVICE_CALL_TIMEOUT_MS, SERVICE_ROUTES } from '../../common/serviceRoutes.consts';
import type { InvestigationClient } from './pipeline.types';

/** Calls the AI service over HTTP. It answers 202 right away and investigates in the background. */
export const createAiServiceClient = (baseUrl: string): InvestigationClient => ({
  start: async (scanId) => {
    const response = await fetch(`${baseUrl}${SERVICE_ROUTES.INVESTIGATIONS}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ scanId }),
      signal: AbortSignal.timeout(SERVICE_CALL_TIMEOUT_MS),
    });
    if (!response.ok) {
      throw new Error(`AI service answered ${response.status}`);
    }
  },
});
