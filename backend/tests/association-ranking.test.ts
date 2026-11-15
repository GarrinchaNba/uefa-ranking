import request from 'supertest';
import { describe, expect, it } from 'vitest';
import { createApp } from '../src/api/app.js';
import { associationRanking } from '../src/domain/association-ranking.js';
import { mockSnapshot } from '../src/providers/fixtures/mock-snapshot.js';
import { MockRankingDataProvider } from '../src/providers/mock-provider.js';
import type { RankingDataProvider } from '../src/providers/provider.js';

describe('association ranking and competition details', () => {
  it('uses the newest annual association contribution as a verified tie-break', () => {
    const snapshot = structuredClone(mockSnapshot);
    const values = {
      albion: ['10', '10', '10', '10', '11'],
      caledonia: ['10', '10', '10', '12', '9'],
      island: ['10', '10', '10', '9', '12'],
    };
    const period = ['2019-20', '2020-21', '2021-22', '2022-23', '2023-24'];
    for (const [associationId, points] of Object.entries(values)) {
      period.forEach((seasonId, index) => {
        const record = snapshot.associationSeasons.find((entry) =>
          entry.associationId === associationId && entry.seasonId === seasonId)!;
        record.points = points[index];
        record.status = 'complete';
        record.provenance = 'synthetic';
        record.awardStatus = 'unavailable';
      });
    }
    snapshot.ruleSupport.find((entry) => entry.seasonId === '2023-24')!.ranking = 'verified';
    const ranking = associationRanking(snapshot, '2023-24', {
      dataStatus: new MockRankingDataProvider().dataStatus,
    });
    expect(ranking.associations.map((row) => [row.association.id, row.rank])).toEqual([
      ['island', 1], ['albion', 2], ['caledonia', 3],
    ]);
  });

  it('returns five chronological association contributions and keeps incomplete ranks explicit', async () => {
    const historical = await request(createApp()).get('/api/v1/association-rankings?seasonId=2023-24').expect(200);
    expect(historical.body.seasons).toHaveLength(5);
    expect(historical.body.seasons[0].id).toBe('2019-20');
    expect(historical.body.associations.find((row: { association: { id: string } }) =>
      row.association.id === 'island')).toMatchObject({
      coefficient: '4', status: 'complete', rankStatus: 'resolved',
    });
    const comparable = historical.body.associations.filter((row: {
      rankStatus: string; previousRankStatus: string;
    }) => row.rankStatus === 'resolved' && row.previousRankStatus === 'resolved');
    expect(comparable.length).toBeGreaterThan(0);
    for (const row of comparable) expect(row.movement).toBe(row.previousRank - row.rank);
    const active = await request(createApp()).get('/api/v1/association-rankings?seasonId=2026-27').expect(200);
    expect(active.body.associations.some((row: { rankStatus: string }) =>
      row.rankStatus === 'incomplete')).toBe(true);
    expect(active.body.associations.find((row: { association: { id: string } }) =>
      row.association.id === 'albion').contributions[4].status).toBe('partial');
  });

  it('sorts season contributions without changing rank and rejects malformed or unsupported inputs', async () => {
    const base = await request(createApp()).get('/api/v1/association-rankings?seasonId=2023-24').expect(200);
    const sorted = await request(createApp())
      .get('/api/v1/association-rankings?seasonId=2023-24&sortSeasonId=2023-24&direction=asc').expect(200);
    expect(new Map(sorted.body.associations.map((row: {
      association: { id: string }; rank: number | null; movement: number | null;
    }) => [row.association.id, [row.rank, row.movement]]))).toEqual(new Map(base.body.associations.map((row: {
      association: { id: string }; rank: number | null; movement: number | null;
    }) => [row.association.id, [row.rank, row.movement]])));
    await request(createApp()).get('/api/v1/association-rankings?seasonId=not-a-season').expect(400);
    await request(createApp()).get('/api/v1/association-rankings?seasonId=2018-19').expect(404);
    await request(createApp()).get('/api/v1/association-rankings?seasonId=2023-24&direction=asc').expect(400);
  });

  it('returns competition-scoped club point groups with transferred clubs attributed only once per award', async () => {
    const response = await request(createApp()).get(
      '/api/v1/associations/albion/season-details?seasonId=2026-27',
    ).expect(200);
    expect(response.body.association.id).toBe('albion');
    expect(response.body.groups.map((group: { competition: { id: string } }) => group.competition.id))
      .toEqual(['champions-league', 'conference-league', 'europa-league']);
    const groupClubIds = response.body.groups.flatMap((group: {
      clubs: { clubId: string; entries: { sourceId: string }[] }[];
    }) => group.clubs.flatMap((club) => club.entries.map((entry) => `${club.clubId}:${entry.sourceId}`)));
    expect(new Set(groupClubIds).size).toBe(groupClubIds.length);
    expect(response.body.explanation).toMatch(/club-point/i);
  });

  it('explains empty participation and surfaces provider failures', async () => {
    const emptySnapshot = structuredClone(mockSnapshot);
    const emptyProvider: RankingDataProvider = {
      dataStatus: new MockRankingDataProvider().dataStatus,
      getActiveSeasonSnapshot: async () => {
        const copy = structuredClone(emptySnapshot);
        copy.participations = copy.participations.filter((item) => item.seasonId !== '2023-24'
          || item.clubId !== 'meadow-fc');
        const meadow = copy.clubSeasons.find((item) => item.clubId === 'meadow-fc'
          && item.seasonId === '2023-24')!;
        meadow.participation = 'did-not-participate';
        meadow.points = '0';
        meadow.status = 'complete';
        meadow.detailStatus = 'available';
        copy.clubAwards = copy.clubAwards.filter((item) => item.clubId !== 'meadow-fc' || item.seasonId !== '2023-24');
        copy.associationAwards = copy.associationAwards.filter((item) => item.clubId !== 'meadow-fc' || item.seasonId !== '2023-24');
        const island = copy.associationSeasons.find((item) => item.associationId === 'island'
          && item.seasonId === '2023-24')!;
        island.points = null;
        island.status = 'missing';
        island.awardStatus = 'unavailable';
        island.provenance = 'synthetic';
        island.divisor = null;
        island.divisorReason = 'unknown';
        return copy;
      },
    };
    const noGroups = await request(createApp(emptyProvider)).get(
      '/api/v1/associations/island/season-details?seasonId=2023-24',
    ).expect(200);
    expect(noGroups.body.groups).toEqual([]);
    expect(noGroups.body.explanation).toMatch(/no participating clubs/i);

    const failingProvider: RankingDataProvider = {
      dataStatus: new MockRankingDataProvider().dataStatus,
      getActiveSeasonSnapshot: async () => { throw new Error('test provider failure'); },
    };
    await request(createApp(failingProvider)).get('/api/v1/association-rankings?seasonId=2023-24').expect(500);
  });
});
