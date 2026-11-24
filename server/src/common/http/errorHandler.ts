import type { ErrorRequestHandler, RequestHandler } from 'express';
import { ZodError } from 'zod';
import type { ApiError } from '@scan/shared';
import { HTTP_STATUS, HttpError } from './errors';

export const notFoundHandler: RequestHandler = (_req, res) => {
  const body: ApiError = { error: 'Route not found' };
  res.status(HTTP_STATUS.NOT_FOUND).json(body);
};

export const errorHandler: ErrorRequestHandler = (error, _req, res, _next) => {
  if (error instanceof HttpError) {
    const body: ApiError = { error: error.message, details: error.details };
    res.status(error.status).json(body);
    return;
  }
  if (error instanceof ZodError) {
    const body: ApiError = {
      error: 'Invalid request',
      details: error.issues.map((issue) => issue.message).join('; '),
    };
    res.status(HTTP_STATUS.BAD_REQUEST).json(body);
    return;
  }

  console.error('Unhandled error', error);
  const body: ApiError = { error: 'Internal server error' };
  res.status(HTTP_STATUS.INTERNAL_ERROR).json(body);
};
