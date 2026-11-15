import { describe, expect, it } from 'vitest';
import { RankingAssociationSeasonSchema, RankingSnapshotSchema } from '@uefa-ranking/contracts';
import { getValidatedRankingSnapshot, InvalidProviderDataError, ProviderUnavailableError } from '../src/providers/provider.js';

const snapshot = {
  activeSeasonId: '2026-27',
  seasons: ['2018-19', '2019-20', '2020-21', '2021-22', '2022-23', '2023-24',
    '2024-25', '2025-26', '2026-27'].map((id) => ({ id, label: id })),
  selectableSeasonIds: ['2023-24', '2026-27'],
  ruleSupport: ['2018-19', '2019-20', '2020-21', '2021-22', '2022-23', '2023-24',
    '2024-25', '2025-26', '2026-27'].map((seasonId) => ({
    seasonId, clubScoring: 'unsupported', associationScoring: 'unsupported',
    ranking: 'unsupported', sourceId: 'research-pending',
  })),
  associations: [{ id: 'a', name: 'Association A' }],
  leagues: [{ id: 'league', name: 'League', associationId: 'a' }],
  clubs: [{ id: 'club', name: 'Club' }],
  competitions: [
    { id: 'champions-league', name: 'Champions League' },
    { id: 'europa-league', name: 'Europa League' },
  ],
  stages: [],
  games: [],
  clubSeasons: [{
    clubId: 'club', seasonId: '2026-27', associationId: 'a', leagueId: 'league', domesticPosition: null,
    participation: 'participated', points: '2', status: 'complete',
    detailStatus: 'available', provenance: 'synthetic', sourceId: 'fixture',
  }],
  participations: [
    { clubId: 'club', seasonId: '2026-27', competitionId: 'champions-league' },
    { clubId: 'club', seasonId: '2026-27', competitionId: 'europa-league' },
  ],
  clubAwards: [{
    id: 'club-award', clubId: 'club', seasonId: '2026-27',
    competitionId: 'europa-league', stageId: null, gameId: null, kind: 'bonus', status: 'awarded', points: '2',
    ruleId: 'rule', sourceId: 'match', label: 'Win',
  }],
  associationAwards: [{
    id: 'association-award', associationId: 'a', clubId: 'club', seasonId: '2026-27',
    competitionId: 'europa-league', stageId: null, gameId: null, status: 'awarded', points: '1',
    ruleId: 'association-rule', sourceId: 'match', label: 'Qualifying win',
  }],
  associationSeasons: [{
    associationId: 'a', seasonId: '2026-27', points: '1', status: 'complete',
    provenance: 'calculated', sourceId: 'fixture', participantCount: 1, divisor: 1,
    divisorReason: 'participants', entitledCount: null, unreplacedReason: null, awardStatus: 'available',
  }],
};

describe('ranking snapshot contract', () => {
  it('accepts stored input-only years, season-specific membership and transfers', () => {
    expect(RankingSnapshotSchema.safeParse(snapshot).success).toBe(true);
  });

  it('requires a selectable active season and rejects duplicate or unknown selectable seasons', () => {
    for (const selectableSeasonIds of [
      ['2023-24'], ['2026-27', '2026-27'], ['2026-27', '2030-31'],
    ]) {
      expect(RankingSnapshotSchema.safeParse({ ...snapshot, selectableSeasonIds }).success).toBe(false);
    }
  });

  it('requires explicit rule support for every stored season', () => {
    expect(RankingSnapshotSchema.safeParse({ ...snapshot, ruleSupport: snapshot.ruleSupport.slice(1) }).success).toBe(false);
    expect(RankingSnapshotSchema.safeParse({
      ...snapshot, ruleSupport: [...snapshot.ruleSupport, snapshot.ruleSupport[1]],
    }).success).toBe(false);
    expect(RankingSnapshotSchema.safeParse({
      ...snapshot, ruleSupport: [{ ...snapshot.ruleSupport[0], ranking: 'assumed' }, ...snapshot.ruleSupport.slice(1)],
    }).success).toBe(false);
  });

  it('distinguishes known absence from missing values and missing details', () => {
    const record = snapshot.clubSeasons[0];
    expect(RankingSnapshotSchema.safeParse({
      ...snapshot,
      clubSeasons: [{ ...record, participation: 'did-not-participate', points: null }],
    }).success).toBe(false);
    expect(RankingSnapshotSchema.safeParse({
      ...snapshot,
      clubSeasons: [{ ...record, points: null, status: 'missing', detailStatus: 'unavailable' }],
      clubAwards: [],
    }).success).toBe(true);
  });

  it('checks unique and consistent membership, participation and award attribution', () => {
    const award = snapshot.clubAwards[0];
    const invalid = [
      { clubSeasons: [...snapshot.clubSeasons, snapshot.clubSeasons[0]] },
      { clubSeasons: [{ ...snapshot.clubSeasons[0], associationId: null }] },
      { participations: [...snapshot.participations, snapshot.participations[0]] },
      { clubAwards: [award, { ...award, id: 'duplicate' }] },
      { clubAwards: [{ ...award, competitionId: 'conference-league' }] },
      { associationAwards: [{ ...snapshot.associationAwards[0], associationId: 'other' }] },
    ];
    for (const override of invalid) {
      expect(RankingSnapshotSchema.safeParse({ ...snapshot, ...override }).success).toBe(false);
    }
  });

  it('enforces detail reconciliation and distinct participant counts across competitions', () => {
    expect(RankingSnapshotSchema.safeParse({
      ...snapshot, clubAwards: [{ ...snapshot.clubAwards[0], points: '1' }],
    }).success).toBe(false);
    expect(RankingSnapshotSchema.safeParse({
      ...snapshot, associationSeasons: [{ ...snapshot.associationSeasons[0], participantCount: 2 }],
    }).success).toBe(false);
  });

  it('requires entitlement evidence for a non-replacement divisor', () => {
    const record = snapshot.associationSeasons[0];
    expect(RankingSnapshotSchema.safeParse({
      ...snapshot,
      associationSeasons: [{
        ...record, points: '0.5', divisor: 2, divisorReason: 'unreplaced-qualified-club',
        entitledCount: 2, unreplacedReason: 'excluded',
      }],
    }).success).toBe(true);
    expect(RankingSnapshotSchema.safeParse({
      ...snapshot,
      associationSeasons: [{ ...record, divisor: 2, divisorReason: 'unreplaced-qualified-club' }],
    }).success).toBe(false);
  });

  it('accepts non-replacement evidence only for seasons with documented rules', () => {
    const record = {
      ...snapshot.associationSeasons[0], points: '0.5', divisor: 2,
      divisorReason: 'unreplaced-qualified-club', entitledCount: 2, unreplacedReason: 'excluded',
    };
    for (const seasonId of ['2021-22', '2023-24', '2026-27']) {
      expect(RankingAssociationSeasonSchema.safeParse({ ...record, seasonId }).success).toBe(true);
    }
    for (const seasonId of ['2020-21', '2022-23', '2025-26']) {
      expect(RankingAssociationSeasonSchema.safeParse({ ...record, seasonId }).success).toBe(false);
    }
  });

  it('rejects invalid numbers without throwing and never certifies missing award inputs', () => {
    const record = snapshot.associationSeasons[0];
    expect(() => RankingSnapshotSchema.safeParse({
      ...snapshot, associationSeasons: [{ ...record, divisor: 0 }],
    })).not.toThrow();
    expect(() => RankingSnapshotSchema.safeParse({
      ...snapshot, clubAwards: [{ ...snapshot.clubAwards[0], points: 'invalid' }],
    })).not.toThrow();
    expect(RankingSnapshotSchema.safeParse({
      ...snapshot, associationSeasons: [{ ...record, awardStatus: 'unavailable' }],
    }).success).toBe(false);
    expect(RankingSnapshotSchema.safeParse({
      ...snapshot, clubs: [...snapshot.clubs, { id: 'unknown', name: 'Unknown' }],
    }).success).toBe(false);
  });

  it('validates the new model at the provider boundary', async () => {
    const dataStatus = {
      mode: 'mock' as const, quality: 'partial' as const,
      source: 'Test fixture', lastSuccessfulUpdate: null,
    };
    await expect(getValidatedRankingSnapshot({
      dataStatus, getActiveSeasonSnapshot: async () => snapshot,
    })).resolves.toMatchObject({ activeSeasonId: '2026-27' });
    await expect(getValidatedRankingSnapshot({
      dataStatus, getActiveSeasonSnapshot: async () => ({ ...snapshot, selectableSeasonIds: [] }),
    })).rejects.toBeInstanceOf(InvalidProviderDataError);
    await expect(getValidatedRankingSnapshot({
      dataStatus: { ...dataStatus, quality: 'unavailable' },
      getActiveSeasonSnapshot: async () => snapshot,
    })).rejects.toBeInstanceOf(ProviderUnavailableError);
  });
});
