import type { ErrorRequestHandler, RequestHandler } from 'express';
import { ProviderUnavailableError } from '../providers/provider.js';

export class ApiError extends Error {
  constructor(
    readonly status: number,
    readonly code: string,
    message: string,
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

export const notFoundHandler: RequestHandler = (_request, _response, next) => {
  next(new ApiError(404, 'NOT_FOUND', 'The requested resource was not found'));
};

export const errorHandler: ErrorRequestHandler = (error, request, response, next) => {
  if (response.headersSent) {
    next(error);
    return;
  }

  if (error instanceof ProviderUnavailableError) {
    console.error(JSON.stringify({
      level: 'error', code: 'SOURCE_UNAVAILABLE', status: 503,
      method: request.method, path: request.path, error: error.message,
    }));
    response.status(503).json({
      error: { code: 'SOURCE_UNAVAILABLE', message: 'The data source is unavailable' },
    });
    return;
  }

  if (error instanceof ApiError) {
    console.error(JSON.stringify({
      level: 'error',
      code: error.code,
      status: error.status,
      method: request.method,
      path: request.path,
    }));
    response.status(error.status).json({
      error: { code: error.code, message: error.message },
    });
    return;
  }

  if (isInvalidJson(error)) {
    response.status(400).json({
      error: { code: 'INVALID_JSON', message: 'Request body must contain valid JSON' },
    });
    return;
  }

  console.error(JSON.stringify({
    level: 'error',
    code: 'INTERNAL_ERROR',
    status: 500,
    method: request.method,
    path: request.path,
    error: error instanceof Error ? error.message : 'Unknown error',
  }));
  response.status(500).json({
    error: { code: 'INTERNAL_ERROR', message: 'An unexpected error occurred' },
  });
};

function isInvalidJson(error: unknown): boolean {
  return typeof error === 'object'
    && error !== null
    && 'type' in error
    && error.type === 'entity.parse.failed';
}
