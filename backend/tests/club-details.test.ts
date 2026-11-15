import request from 'supertest';
import { describe, expect, it } from 'vitest';
import { createApp } from '../src/api/app.js';
import { mockSnapshot } from '../src/providers/fixtures/mock-snapshot.js';
import { MockRankingDataProvider } from '../src/providers/mock-provider.js';
import { ProviderUnavailableError, type RankingDataProvider } from '../src/providers/provider.js';

describe('club season details endpoint', () => {
  it('returns ordered active-season competitions and distinguishes awarded points from pending games', async () => {
    const response = await request(createApp()).get(
      '/api/v1/clubs/unverified-united/season-details?seasonId=2026-27',
    ).expect(200);
    expect(response.body).toMatchObject({
      participation: 'participated', status: 'partial', total: '2',
    });
    expect(response.body.entries.find((entry: { game?: { id: string } }) =>
      entry.game?.id === 'uecl-match-2')).toMatchObject({ status: 'pending', points: null });
    expect(response.body.competitions.map((competition: { id: string }) => competition.id))
      .toEqual(['champions-league', 'conference-league', 'europa-league']);
  });

  it('returns historical selected-season bonus and chronological round information', async () => {
    const response = await request(createApp()).get(
      '/api/v1/clubs/meadow-fc/season-details?seasonId=2023-24',
    ).expect(200);
    expect(response.body).toMatchObject({ status: 'complete', total: '1', participation: 'participated' });
    expect(response.body.entries).toContainEqual(expect.objectContaining({
      kind: 'bonus', points: '1', label: 'First qualifying round elimination',
    }));
    expect(response.body.entries[0].round).toMatchObject({ label: 'Qualifying', order: 0 });
  });

  it('explains confirmed non-participation without inventing competitions or entries', async () => {
    const response = await request(createApp()).get(
      '/api/v1/clubs/historic-town/season-details?seasonId=2026-27',
    ).expect(200);
    expect(response.body).toMatchObject({
      participation: 'did-not-participate', competitions: [], entries: [], total: '0', status: 'complete',
    });
    expect(response.body.explanation).toMatch(/did not participate/i);
  });

  it('returns unavailable for unprovided historic details and structured errors for bad inputs', async () => {
    const unavailable = await request(createApp()).get(
      '/api/v1/clubs/albion-rovers/season-details?seasonId=2023-24',
    ).expect(200);
    expect(unavailable.body).toMatchObject({ participation: 'participated', total: null, status: 'missing' });
    for (const query of ['', '?seasonId=bad', '?seasonId=2018-19', '?seasonId=2027-28']) {
      const path = `/api/v1/clubs/meadow-fc/season-details${query}`;
      const response = await request(createApp()).get(path);
      expect(response.status).toBeGreaterThanOrEqual(400);
      expect(response.body.error.code).toBeTruthy();
    }
    await request(createApp()).get('/api/v1/clubs/not-a-club/season-details?seasonId=2026-27').expect(404);
  });

  it('surfaces provider failures', async () => {
    const provider: RankingDataProvider = {
      dataStatus: new MockRankingDataProvider().dataStatus,
      getActiveSeasonSnapshot: async () => { throw new ProviderUnavailableError(); },
    };
    const response = await request(createApp(provider)).get(
      '/api/v1/clubs/meadow-fc/season-details?seasonId=2026-27',
    ).expect(503);
    expect(response.body.error.code).toBe('SOURCE_UNAVAILABLE');
  });

  it('returns partial rather than complete if awarded detail does not reconcile with the season record', async () => {
    const snapshot = structuredClone(mockSnapshot);
    const provider: RankingDataProvider = {
      dataStatus: new MockRankingDataProvider().dataStatus,
      getActiveSeasonSnapshot: async () => {
        const copy = structuredClone(snapshot);
        copy.clubSeasonRecords.find((record) => record.clubId === 'meadow-fc'
          && record.seasonId === '2026-27')!.points = '9';
        const rankingRecord = copy.clubSeasons.find((record) => record.clubId === 'meadow-fc'
          && record.seasonId === '2026-27')!;
        rankingRecord.points = '9';
        rankingRecord.status = 'partial';
        rankingRecord.detailStatus = 'partial';
        return copy;
      },
    };
    const response = await request(createApp(provider)).get(
      '/api/v1/clubs/meadow-fc/season-details?seasonId=2026-27',
    ).expect(200);
    expect(response.body.status).toBe('partial');
    expect(response.body.explanation).toMatch(/does not reconcile/i);
  });
});
