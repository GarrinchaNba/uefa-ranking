import { describe, expect, it } from 'vitest';
import {
  getValidatedSnapshot,
  InvalidProviderDataError,
  type RankingDataProvider,
} from '../src/providers/provider.js';

const validSnapshot = {
  activeSeasonId: '2026-27',
  seasons: [{ id: '2026-27', label: '2026/27' }],
  selectableSeasonIds: ['2026-27'],
  associations: [{ id: 'england', name: 'England' }],
  leagues: [],
  clubs: [],
  competitions: [],
  stages: [],
  games: [],
  pointEntries: [],
  clubSeasonRecords: [],
  associationCoefficients: [{
    associationId: 'england',
    seasonId: '2026-27',
    points: '0',
    status: 'complete',
    provenance: 'synthetic',
  }],
};

function providerFor(snapshot: unknown): RankingDataProvider {
  return {
    dataStatus: { mode: 'mock', quality: 'partial', source: 'Test fixture', lastSuccessfulUpdate: null },
    getActiveSeasonSnapshot: async () => snapshot,
  };
}

describe('ranking data provider boundary', () => {
  it('returns a validated snapshot with its explicit active season', async () => {
    await expect(getValidatedSnapshot(providerFor(validSnapshot))).resolves.toMatchObject({
      activeSeasonId: '2026-27',
    });
  });

  it('rejects missing active-season records and duplicate IDs', async () => {
    await expect(getValidatedSnapshot(providerFor({
      ...validSnapshot,
      seasons: [],
    }))).rejects.toBeInstanceOf(InvalidProviderDataError);

    await expect(getValidatedSnapshot(providerFor({
      ...validSnapshot,
      associations: [
        { id: 'england', name: 'England' },
        { id: 'england', name: 'Duplicate England' },
      ],
    }))).rejects.toThrow(/Duplicate association IDs/);
  });

  it('rejects omitted club-season and association-season source records', async () => {
    const snapshot = {
      ...validSnapshot,
      clubs: [{ id: 'club-a', name: 'Club A', associationId: 'england', leagueId: null }],
    };

    await expect(getValidatedSnapshot(providerFor(snapshot))).rejects.toThrow(
      'Missing club season record for club-a in 2026-27',
    );
    await expect(getValidatedSnapshot(providerFor({
      ...snapshot,
      clubSeasonRecords: [{
        clubId: 'club-a',
        seasonId: '2026-27',
        participation: 'did-not-participate',
        points: '0',
        status: 'complete',
        provenance: 'synthetic',
      }],
      associationCoefficients: [],
    }))).rejects.toThrow(
      'Missing association coefficient for england in 2026-27',
    );
  });

  it('rejects multiple settled entries for a club/game', async () => {
    const snapshot = {
      ...validSnapshot,
      competitions: [{ id: 'champions-league', name: 'Champions League' }],
      stages: [{
        id: 'league-phase',
        seasonId: '2026-27',
        competitionId: 'champions-league',
        order: 0,
        group: 'league-phase',
        label: 'League phase',
      }],
      games: [{
        id: 'game-1',
        seasonId: '2026-27',
        competitionId: 'champions-league',
        stageId: 'league-phase',
        homeClubId: 'club-a',
        awayClubId: 'club-b',
        status: 'ratified',
        homeScore: 2,
        awayScore: 1,
      }],
      clubs: [
        { id: 'club-a', name: 'Club A', associationId: 'england', leagueId: null },
        { id: 'club-b', name: 'Club B', associationId: 'england', leagueId: null },
      ],
      pointEntries: [
        {
          id: 'entry-1',
          clubId: 'club-a',
          seasonId: '2026-27',
          kind: 'match',
          status: 'awarded',
          points: '2',
          ruleId: 'ucl-match-points',
          sourceId: 'game-1-home',
          gameId: 'game-1',
          label: 'Win',
        },
        {
          id: 'entry-2',
          clubId: 'club-a',
          seasonId: '2026-27',
          kind: 'match',
          status: 'awarded',
          points: '2',
          ruleId: 'ucl-match-points',
          sourceId: 'game-1-home-correction',
          gameId: 'game-1',
          label: 'Corrected win',
        },
      ],
    };

    await expect(getValidatedSnapshot(providerFor(snapshot))).rejects.toThrow(
      'has duplicate entries for game',
    );
  });

  it('rejects settled points for an unratified result', async () => {
    const snapshot = {
      ...validSnapshot,
      associations: [{ id: 'england', name: 'England' }],
      clubs: [
        { id: 'club-a', name: 'Club A', associationId: 'england', leagueId: null },
        { id: 'club-b', name: 'Club B', associationId: 'england', leagueId: null },
      ],
      clubSeasonRecords: ['club-a', 'club-b'].map((clubId) => ({
        clubId,
        seasonId: '2026-27',
        participation: 'participated',
        points: null,
        status: 'partial',
        provenance: 'calculated',
      })),
      competitions: [{ id: 'champions-league', name: 'Champions League' }],
      stages: [{
        id: 'league-phase',
        seasonId: '2026-27',
        competitionId: 'champions-league',
        order: 0,
        group: 'league-phase',
        label: 'League phase',
      }],
      games: [{
        id: 'game-1',
        seasonId: '2026-27',
        competitionId: 'champions-league',
        stageId: 'league-phase',
        homeClubId: 'club-a',
        awayClubId: 'club-b',
        status: 'in-progress',
        homeScore: null,
        awayScore: null,
      }],
      pointEntries: [{
        id: 'entry-1',
        clubId: 'club-a',
        seasonId: '2026-27',
        kind: 'match',
        status: 'awarded',
        points: '2',
        ruleId: 'ucl-match-points',
        sourceId: 'game-1-home',
        gameId: 'game-1',
        label: 'Win',
      }],
    };

    await expect(getValidatedSnapshot(providerFor(snapshot))).rejects.toThrow(
      'cannot yield settled points',
    );
  });

  it('accepts completed scores without treating them as ratified points', async () => {
    const snapshot = {
      ...validSnapshot,
      clubs: [
        { id: 'club-a', name: 'Club A', associationId: 'england', leagueId: null },
        { id: 'club-b', name: 'Club B', associationId: 'england', leagueId: null },
      ],
      clubSeasonRecords: ['club-a', 'club-b'].map((clubId) => ({
        clubId,
        seasonId: '2026-27',
        participation: 'participated',
        points: null,
        status: 'partial',
        provenance: 'calculated',
      })),
      competitions: [{ id: 'champions-league', name: 'Champions League' }],
      stages: [{
        id: 'league-phase',
        seasonId: '2026-27',
        competitionId: 'champions-league',
        order: 0,
        group: 'league-phase',
        label: 'League phase',
      }],
      games: [{
        id: 'game-1',
        seasonId: '2026-27',
        competitionId: 'champions-league',
        stageId: 'league-phase',
        homeClubId: 'club-a',
        awayClubId: 'club-b',
        status: 'completed',
        homeScore: 2,
        awayScore: 1,
      }],
    };

    await expect(getValidatedSnapshot(providerFor(snapshot))).resolves.toMatchObject({
      games: [{ status: 'completed' }],
      pointEntries: [],
    });
  });
});
