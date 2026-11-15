import { describe, expect, it } from 'vitest';
import { scoreAssociationSeason } from '../src/domain/association-scoring.js';
import { mockSnapshot } from '../src/providers/fixtures/mock-snapshot.js';

describe('association season scoring', () => {
  it('uses association-eligible match points and the distinct participating-club divisor', () => {
    const snapshot = structuredClone(mockSnapshot);
    const score = scoreAssociationSeason(snapshot, 'island', '2023-24');
    expect(score).toMatchObject({
      participantCount: 1, divisor: 1, points: '0', coefficient: '0', status: 'complete',
    });
  });

  it('does not count club-only bonuses or club minima as association points', () => {
    const snapshot = structuredClone(mockSnapshot);
    const before = scoreAssociationSeason(snapshot, 'island', '2023-24');
    snapshot.clubAwards.push({
      id: 'club-only-guarantee', clubId: 'meadow-fc', seasonId: '2023-24',
      competitionId: 'conference-league', stageId: null, gameId: null, kind: 'adjustment',
      status: 'awarded', points: '99', ruleId: 'club-guarantee', sourceId: 'club-only-guarantee',
      label: 'Club-only minimum guarantee',
    });
    const after = scoreAssociationSeason(snapshot, 'island', '2023-24');
    expect(after.coefficient).toBe(before.coefficient);
  });

  it('applies half-point draws in qualifying rounds and rejects an inconsistent attributed award', () => {
    const snapshot = structuredClone(mockSnapshot);
    const game = snapshot.games.find((entry) => entry.id === 'uecl-qualifier-1')!;
    game.homeScore = 1;
    game.awayScore = 1;
    for (const award of snapshot.associationAwards.filter((entry) => entry.gameId === game.id)) {
      award.points = '0.5';
    }
    expect(scoreAssociationSeason(snapshot, 'island', '2026-27'))
      .toMatchObject({ points: '0.5', coefficient: '0.5', status: 'partial' });

    snapshot.associationAwards.find((entry) => entry.gameId === game.id
      && entry.associationId === 'island')!.points = '1';
    expect(scoreAssociationSeason(snapshot, 'island', '2026-27'))
      .toMatchObject({ points: null, coefficient: null, status: 'missing' });
  });

  it('counts a transferred club once across competitions and applies the verified divisor exception', () => {
    const snapshot = structuredClone(mockSnapshot);
    const multiCompetition = scoreAssociationSeason(snapshot, 'albion', '2026-27');
    expect(multiCompetition).toMatchObject({
      points: '9', participantCount: 3, divisor: 3, coefficient: '3', status: 'partial',
    });

    const record = snapshot.associationSeasons.find((entry) => entry.associationId === 'albion'
      && entry.seasonId === '2026-27')!;
    record.divisorReason = 'unreplaced-qualified-club';
    record.unreplacedReason = 'refused';
    record.divisor = 4;
    record.entitledCount = 4;
    const exception = scoreAssociationSeason(snapshot, 'albion', '2026-27');
    expect(exception).toMatchObject({ participantCount: 3, divisor: 4, divisorReason: 'unreplaced-qualified-club' });
  });

  it('truncates the association coefficient to thousandths', () => {
    const snapshot = structuredClone(mockSnapshot);
    snapshot.associationAwards = snapshot.associationAwards.filter((entry) =>
      entry.associationId !== 'caledonia' || entry.seasonId !== '2026-27');
    snapshot.associationAwards.push({
      id: 'caledonia-one-point',
      associationId: 'caledonia',
      clubId: 'coastal-fc',
      seasonId: '2026-27',
      competitionId: 'conference-league',
      stageId: null,
      gameId: null,
      status: 'awarded',
      points: '1',
      ruleId: 'association-bonus',
      sourceId: 'caledonia-one-point',
      label: 'Association-eligible bonus',
    });
    const record = snapshot.associationSeasons.find((entry) =>
      entry.associationId === 'caledonia' && entry.seasonId === '2026-27')!;
    record.points = '0.333';
    record.status = 'complete';
    record.provenance = 'calculated';
    record.participantCount = 3;
    record.divisor = 3;
    record.divisorReason = 'participants';
    record.awardStatus = 'available';
    expect(scoreAssociationSeason(snapshot, 'caledonia', '2026-27'))
      .toMatchObject({ points: '1', divisor: 3, coefficient: '0.333', status: 'complete' });
  });

  it('returns an explicit missing state for unsupported rules or unknown divisors', () => {
    const snapshot = structuredClone(mockSnapshot);
    snapshot.ruleSupport.find((entry) => entry.seasonId === '2023-24')!.associationScoring = 'unsupported';
    expect(scoreAssociationSeason(snapshot, 'island', '2023-24'))
      .toMatchObject({ coefficient: null, status: 'missing' });
    snapshot.ruleSupport.find((entry) => entry.seasonId === '2023-24')!.associationScoring = 'verified';
    snapshot.associationSeasons.find((entry) => entry.associationId === 'island'
      && entry.seasonId === '2023-24')!.divisorReason = 'unknown';
    expect(scoreAssociationSeason(snapshot, 'island', '2023-24'))
      .toMatchObject({ coefficient: null, status: 'missing' });
  });
});
