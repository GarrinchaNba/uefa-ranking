import request from 'supertest';
import { describe, expect, it } from 'vitest';
import { createApp } from '../src/api/app.js';
import { mockSnapshot } from '../src/providers/fixtures/mock-snapshot.js';
import { MockRankingDataProvider } from '../src/providers/mock-provider.js';
import { ProviderUnavailableError, type RankingDataProvider } from '../src/providers/provider.js';

describe('season ranking endpoint', () => {
  const app = createApp();

  it('selects only participating country clubs and orders exact known totals descending', async () => {
    const response = await request(app)
      .get('/api/v1/season-rankings?seasonId=2026-27&associationId=albion').expect(200);
    expect(response.body.clubs.map((club: { clubId: string; total: string }) => [club.clubId, club.total]))
      .toEqual([['albion-rovers', '3'], ['north-city', '3'], ['unverified-united', '2']]);
    expect(response.body.clubs[2]).toMatchObject({ league: null, totalStatus: 'partial' });
    expect(response.body.dataStatus.mode).toBe('mock');
  });

  it('changes results by season and retains unknown totals as partial', async () => {
    const response = await request(app)
      .get('/api/v1/season-rankings?seasonId=2023-24&associationId=albion').expect(200);
    expect(response.body.season.id).toBe('2023-24');
    expect(response.body.clubs.map((club: { clubId: string; total: string | null }) => [club.clubId, club.total]))
      .toEqual([['albion-rovers', '6'], ['north-city', '2'], ['unverified-united', null]]);
    expect(response.body.clubs[2].totalStatus).toBe('partial');
  });

  it('returns an empty list for a known country without participating clubs', async () => {
    const snapshot = structuredClone(mockSnapshot);
    snapshot.clubSeasonRecords.filter((record) => record.seasonId === '2022-23'
      && snapshot.clubs.find((club) => club.id === record.clubId)?.associationId === 'albion')
      .forEach((record) => {
        record.participation = 'did-not-participate';
        record.points = '0';
        record.status = 'complete';
      });
    const provider: RankingDataProvider = {
      dataStatus: new MockRankingDataProvider().dataStatus,
      getActiveSeasonSnapshot: async () => snapshot,
    };
    const response = await request(createApp(provider))
      .get('/api/v1/season-rankings?seasonId=2022-23&associationId=albion').expect(200);
    expect(response.body.clubs).toEqual([]);
  });

  it('returns structured errors for invalid, unsupported, or unknown inputs', async () => {
    for (const query of [
      '', '?seasonId=bad&associationId=albion', '?seasonId=2026-27',
      '?seasonId=2026-27&associationId=!', '?seasonId=2026-27&associationId=albion&sort=club',
      '?seasonId=2026-27&associationId=albion&associationId=caledonia',
    ]) {
      await request(app).get(`/api/v1/season-rankings${query}`).expect(400);
    }
    for (const query of ['seasonId=2027-28&associationId=albion', 'seasonId=2026-27&associationId=unknown']) {
      await request(app).get(`/api/v1/season-rankings?${query}`).expect(404);
    }
  });

  it('surfaces provider failures without leaking source details', async () => {
    const provider: RankingDataProvider = {
      dataStatus: new MockRankingDataProvider().dataStatus,
      getActiveSeasonSnapshot: async () => { throw new ProviderUnavailableError('private source details'); },
    };
    const response = await request(createApp(provider))
      .get('/api/v1/season-rankings?seasonId=2026-27&associationId=albion').expect(503);
    expect(response.body.error.code).toBe('SOURCE_UNAVAILABLE');
    expect(JSON.stringify(response.body)).not.toContain('private source details');
  });
});
