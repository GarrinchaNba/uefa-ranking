import express from 'express';
import request from 'supertest';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { ApiError, errorHandler, notFoundHandler } from '../src/api/errors.js';

function createErrorApp() {
  const testApp = express();
  testApp.use(express.json());
  testApp.get('/invalid', () => {
    throw new ApiError(400, 'INVALID_INPUT', 'The supplied input is invalid');
  });
  testApp.get('/unknown-entity', () => {
    throw new ApiError(404, 'UNKNOWN_SEASON', 'The requested season was not found');
  });
  testApp.get('/unavailable', () => {
    throw new ApiError(503, 'SOURCE_UNAVAILABLE', 'The data source is unavailable');
  });
  testApp.get('/unexpected', () => {
    throw new Error('private database details');
  });
  testApp.use(notFoundHandler);
  testApp.use(errorHandler);
  return testApp;
}

describe('API error handling', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('returns a structured 400 for invalid input', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => undefined);
    const response = await request(createErrorApp()).get('/invalid');
    expect(response.status).toBe(400);
    expect(response.body).toEqual({
      error: { code: 'INVALID_INPUT', message: 'The supplied input is invalid' },
    });
  });

  it('returns a structured 404 for unknown entities and routes', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => undefined);
    const app = createErrorApp();
    const unknownEntity = await request(app).get('/unknown-entity');
    const unknownRoute = await request(app).get('/missing');
    expect(unknownEntity.status).toBe(404);
    expect(unknownEntity.body.error.code).toBe('UNKNOWN_SEASON');
    expect(unknownRoute.status).toBe(404);
    expect(unknownRoute.body.error.code).toBe('NOT_FOUND');
  });

  it('returns a structured 503 for unavailable sources', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => undefined);
    const response = await request(createErrorApp()).get('/unavailable');
    expect(response.status).toBe(503);
    expect(response.body.error.code).toBe('SOURCE_UNAVAILABLE');
  });

  it('sanitizes unexpected failures in the client response', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => undefined);
    const response = await request(createErrorApp()).get('/unexpected');
    expect(response.status).toBe(500);
    expect(response.body).toEqual({
      error: { code: 'INTERNAL_ERROR', message: 'An unexpected error occurred' },
    });
    expect(JSON.stringify(response.body)).not.toContain('private database details');
  });

  it('rejects malformed JSON without exposing parser details', async () => {
    const app = createErrorApp();
    const response = await request(app)
      .post('/invalid')
      .set('Content-Type', 'application/json')
      .send('{"broken":');
    expect(response.status).toBe(400);
    expect(response.body.error.code).toBe('INVALID_JSON');
  });
});
