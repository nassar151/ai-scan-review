import type { ApiError } from '@scan/shared';
import { JSON_HEADERS } from './api.consts';

export class ApiRequestError extends Error {
  constructor(
    message: string,
    readonly status: number,
    readonly details?: string,
  ) {
    super(message);
    this.name = 'ApiRequestError';
  }
}

const readBody = async (response: Response): Promise<unknown> => {
  const text = await response.text();
  if (!text) return undefined;
  try {
    return JSON.parse(text);
  } catch {
    return undefined;
  }
};

export const requestJson = async <T>(url: string, init?: RequestInit): Promise<T> => {
  const response = await fetch(url, { ...init, headers: { ...JSON_HEADERS, ...init?.headers } });
  const body = await readBody(response);
  if (!response.ok) {
    const apiError = body as ApiError | undefined;
    throw new ApiRequestError(apiError?.error ?? response.statusText, response.status, apiError?.details);
  }
  return body as T;
};
