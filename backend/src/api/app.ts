import express, { type RequestHandler } from 'express';
import { errorHandler, notFoundHandler } from './errors.js';
import { MockRankingDataProvider } from '../providers/mock-provider.js';
import type { RankingDataProvider } from '../providers/provider.js';
import { seasonsRouter } from './seasons.js';
import { associationsRouter } from './associations.js';
import { seasonRankingsRouter } from './season-rankings.js';
import { clubRankingsRouter } from './club-rankings.js';
import { clubDetailsRouter } from './club-details.js';
import { associationRankingsRouter } from './association-rankings.js';
import { associationDetailsRouter } from './association-details.js';

const requestLogger: RequestHandler = (request, response, next) => {
  const startedAt = performance.now();
  response.on('finish', () => {
    console.info(JSON.stringify({
      level: 'info',
      method: request.method,
      path: request.path,
      status: response.statusCode,
      durationMs: Math.round(performance.now() - startedAt),
    }));
  });
  next();
};

export function createApp(provider: RankingDataProvider = new MockRankingDataProvider()) {
  const app = express();

  app.use(requestLogger);
  app.use(express.json());

  app.get('/api/health', (_request, response) => {
    response.json({ status: 'ok' });
  });

  app.use('/api/v1', seasonsRouter(provider), associationsRouter(provider), seasonRankingsRouter(provider),
    clubRankingsRouter(provider), clubDetailsRouter(provider), associationRankingsRouter(provider),
    associationDetailsRouter(provider));
  app.use(notFoundHandler);
  app.use(errorHandler);
  return app;
}

export const app = createApp();
