import request from 'supertest';
import { describe, expect, it } from 'vitest';
import { createApp } from '../src/api/app.js';
import { MockRankingDataProvider } from '../src/providers/mock-provider.js';
import { ProviderUnavailableError, type RankingDataProvider } from '../src/providers/provider.js';

describe('season endpoint', () => {
  const app = createApp();

  it('returns the active season and only selectable seasons', async () => {
    const seasons = await request(app).get('/api/v1/seasons').expect(200);
    expect(seasons.body.activeSeasonId).toBe('2026-27');
    expect(seasons.body.seasons.map(({ id }: { id: string }) => id)).toEqual(['2023-24', '2026-27']);
    expect(seasons.body.dataStatus).toMatchObject({ mode: 'mock', quality: 'partial' });
  });

  it('no longer exposes the interim association picker or country-only ranking routes', async () => {
    await request(app).get('/api/v1/associations?seasonId=2026-27').expect(404);
    await request(app).get('/api/v1/season-rankings?seasonId=2026-27&associationId=albion').expect(404);
    await request(app).get('/api/v1/associations/albion/season-details?seasonId=2026-27').expect(200);
  });

  it('returns explicit source failures instead of empty results', async () => {
    const provider: RankingDataProvider = {
      dataStatus: new MockRankingDataProvider().dataStatus,
      getActiveSeasonSnapshot: async () => { throw new ProviderUnavailableError('private source details'); },
    };
    const response = await request(createApp(provider)).get('/api/v1/seasons').expect(503);
    expect(response.body.error).toEqual({ code: 'SOURCE_UNAVAILABLE', message: 'The data source is unavailable' });
  });
});
