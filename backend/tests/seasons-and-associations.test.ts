import request from 'supertest';
import { describe, expect, it } from 'vitest';
import { createApp } from '../src/api/app.js';
import { mockSnapshot } from '../src/providers/fixtures/mock-snapshot.js';
import { MockRankingDataProvider } from '../src/providers/mock-provider.js';
import { ProviderUnavailableError, type RankingDataProvider } from '../src/providers/provider.js';

describe('season and association endpoints', () => {
  const app = createApp();

  it('returns the active season and available season-scoped countries', async () => {
    const seasons = await request(app).get('/api/v1/seasons').expect(200);
    expect(seasons.body.activeSeasonId).toBe('2026-27');
    expect(seasons.body.seasons.map(({ id }: { id: string }) => id)).toEqual(['2023-24', '2026-27']);
    expect(seasons.body.dataStatus).toMatchObject({ mode: 'mock', quality: 'partial' });
    const associations = await request(app).get('/api/v1/associations?seasonId=2026-27').expect(200);
    expect(associations.body.associations.map((association: { id: string }) => association.id))
      .toEqual(['albion', 'caledonia', 'island']);
  });

  it('rejects malformed, missing, repeated and unknown seasons', async () => {
    for (const query of ['', '?seasonId=wrong', '?seasonId=2026-27&seasonId=2025-26']) {
      await request(app).get(`/api/v1/associations${query}`).expect(400);
    }
    const response = await request(app).get('/api/v1/associations?seasonId=2027-28').expect(404);
    expect(response.body.error.code).toBe('UNKNOWN_SEASON');
  });

  it('returns no associations for a season with no participating clubs', async () => {
    const snapshot = structuredClone(mockSnapshot);
    snapshot.clubSeasonRecords.filter((record) => record.seasonId === '2022-23').forEach((record) => {
      record.participation = 'did-not-participate';
      record.points = '0';
      record.status = 'complete';
    });
    const provider: RankingDataProvider = {
      dataStatus: new MockRankingDataProvider().dataStatus,
      getActiveSeasonSnapshot: async () => snapshot,
    };
    const response = await request(createApp(provider)).get('/api/v1/associations?seasonId=2022-23').expect(200);
    expect(response.body.associations).toEqual([]);
  });

  it('returns explicit source failures instead of empty results', async () => {
    const provider: RankingDataProvider = {
      dataStatus: new MockRankingDataProvider().dataStatus,
      getActiveSeasonSnapshot: async () => { throw new ProviderUnavailableError('private source details'); },
    };
    for (const path of ['/api/v1/seasons', '/api/v1/associations?seasonId=2026-27']) {
      const response = await request(createApp(provider)).get(path).expect(503);
      expect(response.body.error).toEqual({ code: 'SOURCE_UNAVAILABLE', message: 'The data source is unavailable' });
    }
  });
});
