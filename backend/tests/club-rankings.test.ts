import request from 'supertest';
import { describe, expect, it } from 'vitest';
import { createApp } from '../src/api/app.js';
import { mockSnapshot } from '../src/providers/fixtures/mock-snapshot.js';
import { MockRankingDataProvider } from '../src/providers/mock-provider.js';
import { ProviderUnavailableError, type RankingDataProvider } from '../src/providers/provider.js';

describe('global club rankings', () => {
  const app = createApp();

  it('returns five chronological contributions, global ranks, mock assumptions and the provisional flag', async () => {
    for (const seasonId of ['2023-24', '2026-27']) {
      const response = await request(app).get(`/api/v1/club-rankings?seasonId=${seasonId}`).expect(200);
      expect(response.body.seasons).toHaveLength(5);
      expect(response.body.seasons.at(-1).id).toBe(seasonId);
      expect(response.body.clubs.length).toBeGreaterThan(0);
      expect(response.body.clubs.every((row: { contributions: unknown[] }) => row.contributions.length === 5)).toBe(true);
      expect(response.body.explanation).toContain('Synthetic MVP');
      expect(response.body.dataStatus.mode).toBe('mock');
      expect(response.body.provisional).toBe(seasonId === '2026-27');
      expect(response.body.clubs.some((row: { reason: string | null }) => row?.reason?.includes('assumed'))).toBe(true);
    }
  });

  it('includes clubs absent from the selected season when they participated in the five-season period', async () => {
    const response = await request(app).get('/api/v1/club-rankings?seasonId=2026-27').expect(200);
    const historicTown = response.body.clubs.find((row: { clubId: string }) => row.clubId === 'historic-town');
    expect(historicTown.contributions.at(-1)).toMatchObject({
      participation: 'did-not-participate', points: '0', status: 'complete',
    });
  });

  it('computes movement only from independently resolved current and previous ranks', async () => {
    const response = await request(app).get('/api/v1/club-rankings?seasonId=2026-27').expect(200);
    const comparable = response.body.clubs.filter((row: {
      rankStatus: string; previousRankStatus: string;
    }) => row.rankStatus === 'resolved' && row.previousRankStatus === 'resolved');
    expect(comparable.length).toBeGreaterThan(0);
    for (const row of comparable) expect(row.movement).toBe(row.previousRank - row.rank);
    expect(response.body.clubs.filter((row: { rankStatus: string }) => row.rankStatus !== 'resolved')
      .every((row: { movement: number | null }) => row.movement === null)).toBe(true);
  });

  it('leaves exact coefficient and tie-break ties unresolved instead of ordering by club ID', async () => {
    const provider: RankingDataProvider = {
      dataStatus: new MockRankingDataProvider().dataStatus,
      getActiveSeasonSnapshot: async () => {
        const snapshot = structuredClone(mockSnapshot);
        for (const record of snapshot.clubSeasons.filter((entry) => entry.seasonId >= '2019-20'
          && entry.seasonId <= '2023-24')) {
          record.points = '5';
          record.status = 'complete';
          record.participation = 'participated';
          record.detailStatus = 'unavailable';
        }
        for (const record of snapshot.associationSeasons.filter((entry) => entry.seasonId >= '2019-20'
          && entry.seasonId <= '2023-24')) {
          record.points = '1';
          record.status = 'complete';
          record.provenance = 'synthetic';
        }
        return snapshot;
      },
    };
    const response = await request(createApp(provider)).get('/api/v1/club-rankings?seasonId=2023-24').expect(200);
    expect(response.body.clubs.length).toBeGreaterThan(1);
    expect(response.body.clubs.every((row: { rank: number | null; rankStatus: string }) =>
      row.rank === null && row.rankStatus === 'unresolved')).toBe(true);
  });

  it('sorts by any season contribution without changing global rank or movement', async () => {
    const defaultResponse = await request(app).get('/api/v1/club-rankings?seasonId=2026-27').expect(200);
    const baseline = new Map(defaultResponse.body.clubs.map((row: {
      clubId: string; rank: number | null; movement: number | null;
    }) => [row.clubId, [row.rank, row.movement]]));
    for (const season of defaultResponse.body.seasons) {
      for (const direction of ['asc', 'desc']) {
        const sorted = await request(app)
          .get(`/api/v1/club-rankings?seasonId=2026-27&sortSeasonId=${season.id}&direction=${direction}`)
          .expect(200);
        expect(new Map(sorted.body.clubs.map((row: {
          clubId: string; rank: number | null; movement: number | null;
        }) => [row.clubId, [row.rank, row.movement]]))).toEqual(baseline);
      }
    }
  });

  it('returns structured input, season and sort errors', async () => {
    for (const query of [
      '', '?seasonId=bad', '?seasonId=2022-23', '?seasonId=2027-28',
      '?seasonId=2026-27&sortSeasonId=bad', '?seasonId=2026-27&sortSeasonId=2018-19',
      '?seasonId=2026-27&direction=asc', '?seasonId=2026-27&direction=sideways',
      '?seasonId=2026-27&seasonId=2023-24',
    ]) {
      await request(app).get(`/api/v1/club-rankings${query}`).expect((response) => {
        expect(response.status).toBeGreaterThanOrEqual(400);
        expect(response.body.error.code).toBeTruthy();
      });
    }
  });

  it('surfaces provider failures instead of returning a successful empty ranking', async () => {
    const provider: RankingDataProvider = {
      dataStatus: new MockRankingDataProvider().dataStatus,
      getActiveSeasonSnapshot: async () => { throw new ProviderUnavailableError(); },
    };
    const response = await request(createApp(provider)).get('/api/v1/club-rankings?seasonId=2026-27').expect(503);
    expect(response.body.error.code).toBe('SOURCE_UNAVAILABLE');
  });

  it('does not silently assign a definite rank if a non-synthetic competitor is missing a coefficient', async () => {
    const snapshot = structuredClone(mockSnapshot);
    snapshot.clubSeasons.forEach((record) => { record.sourceId = 'imported-source'; });
    const provider: RankingDataProvider = {
      dataStatus: new MockRankingDataProvider().dataStatus,
      getActiveSeasonSnapshot: async () => {
        const copy = structuredClone(snapshot);
        const missing = copy.clubSeasons.find((record) => record.clubId === 'albion-rovers'
          && record.seasonId === '2024-25')!;
        missing.points = null;
        missing.status = 'missing';
        return copy;
      },
    };
    const response = await request(createApp(provider))
      .get('/api/v1/club-rankings?seasonId=2026-27').expect(200);
    expect(response.body.clubs.find((row: { clubId: string }) => row.clubId === 'north-city'))
      .toMatchObject({ rank: null, rankStatus: 'incomplete', movement: null });
  });
});
