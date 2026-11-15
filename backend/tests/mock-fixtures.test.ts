import {
  AssociationRankingResponseSchema,
  AssociationSeasonDetailsResponseSchema,
  ClubRankingResponseSchema,
  ClubSeasonDetailsResponseSchema,
} from '@uefa-ranking/contracts';
import { describe, expect, it } from 'vitest';
import { associationSeasonDetails } from '../src/domain/association-details.js';
import { associationRanking } from '../src/domain/association-ranking.js';
import { scoreAssociationSeason } from '../src/domain/association-scoring.js';
import { clubSeasonDetails } from '../src/domain/club-details.js';
import { clubRanking } from '../src/domain/club-ranking.js';
import { rankingPeriods } from '../src/domain/periods.js';
import { MockRankingDataProvider } from '../src/providers/mock-provider.js';
import { getValidatedRankingSnapshot } from '../src/providers/provider.js';

describe('deterministic ranking fixtures', () => {
  it('is deterministic and has attributed rule evidence and pre-2022 input seasons', async () => {
    const provider = new MockRankingDataProvider();
    const [snapshot, repeated] = await Promise.all([
      getValidatedRankingSnapshot(provider),
      getValidatedRankingSnapshot(provider),
    ]);
    expect(snapshot).toEqual(repeated);
    expect(snapshot.seasons.slice(0, 4).map(({ id }) => id))
      .toEqual(['2018-19', '2019-20', '2020-21', '2021-22']);

    for (const support of snapshot.ruleSupport) {
      if (support.clubScoring === 'verified' || support.associationScoring === 'verified'
        || support.ranking === 'verified') {
        expect(support.sourceId).toBeTruthy();
      }
    }
    expect(snapshot.ruleSupport.find(({ seasonId }) => seasonId === '2023-24'))
      .toMatchObject({ clubScoring: 'verified', associationScoring: 'verified', sourceId: 'user-supplied-uefa-2023-24-and-2024-25' });
  });

  it('provides complete current and previous five-season windows for both selectable seasons', async () => {
    const snapshot = await getValidatedRankingSnapshot(new MockRankingDataProvider());
    const expected = {
      '2023-24': {
        previous: ['2018-19', '2019-20', '2020-21', '2021-22', '2022-23'],
        current: ['2019-20', '2020-21', '2021-22', '2022-23', '2023-24'],
      },
      '2026-27': {
        previous: ['2021-22', '2022-23', '2023-24', '2024-25', '2025-26'],
        current: ['2022-23', '2023-24', '2024-25', '2025-26', '2026-27'],
      },
    };

    for (const [seasonId, windows] of Object.entries(expected)) {
      const periods = rankingPeriods(seasonId, snapshot.seasons.map(({ id }) => id));
      expect(periods.previous.map(({ seasonId: id }) => id)).toEqual(windows.previous);
      expect(periods.current.map(({ seasonId: id }) => id)).toEqual(windows.current);
      expect(periods.previous.every(({ available }) => available)).toBe(true);
      expect(periods.current.every(({ available }) => available)).toBe(true);

      const clubs = clubRanking(snapshot, seasonId, { dataStatus: new MockRankingDataProvider().dataStatus });
      const associations = associationRanking(snapshot, seasonId, { dataStatus: new MockRankingDataProvider().dataStatus });
      expect(ClubRankingResponseSchema.safeParse(clubs).success).toBe(true);
      expect(AssociationRankingResponseSchema.safeParse(associations).success).toBe(true);
    }
  });

  it('reconciles complete expanded details and keeps club awards distinct from association points', async () => {
    const snapshot = await getValidatedRankingSnapshot(new MockRankingDataProvider());
    const dataStatus = new MockRankingDataProvider().dataStatus;

    for (const seasonId of snapshot.selectableSeasonIds) {
      for (const club of snapshot.clubs) {
        const detail = clubSeasonDetails(snapshot, club.id, seasonId);
        const membership = snapshot.clubSeasons.find((record) =>
          record.clubId === club.id && record.seasonId === seasonId);
        if (membership?.detailStatus === 'available') {
          expect(ClubSeasonDetailsResponseSchema.safeParse({ ...detail, dataStatus }).success).toBe(true);
        }
      }
      for (const association of snapshot.associations) {
        const detail = associationSeasonDetails(snapshot, association.id, seasonId);
        expect(AssociationSeasonDetailsResponseSchema.safeParse({ ...detail, dataStatus }).success).toBe(true);
      }
    }

    const meadowClubSeason = snapshot.clubSeasons.find((record) =>
      record.clubId === 'meadow-fc' && record.seasonId === '2023-24');
    const islandAssociationSeason = scoreAssociationSeason(snapshot, 'island', '2023-24');
    expect(meadowClubSeason?.points).toBe('1');
    expect(islandAssociationSeason).toMatchObject({ points: '0', coefficient: '0', divisor: 1, status: 'complete' });
    expect(snapshot.associationAwards.some((award) =>
      award.clubId === 'meadow-fc' && award.seasonId === '2023-24' && award.points === '1')).toBe(false);
  });
});
