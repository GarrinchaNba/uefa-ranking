import { describe, expect, it } from 'vitest';
import { RankingSnapshotSchema, type RankingSnapshot } from '@uefa-ranking/contracts';
import { clubFiveSeasonCoefficients } from '../src/domain/five-season.js';
import { mockSnapshot } from '../src/providers/fixtures/mock-snapshot.js';

function fixture(): RankingSnapshot {
  const snapshot = structuredClone(mockSnapshot);
  for (const record of snapshot.clubSeasons) {
    if (record.clubId === 'meadow-fc' && record.seasonId >= '2022-23') {
      record.points = '1';
      record.status = 'complete';
      record.participation = 'participated';
    }
  }
  return snapshot;
}

describe('club five-season coefficients', () => {
  it('uses the greater of the club sum and the selected-season association floor with exact truncation', () => {
    const snapshot = fixture();
    for (const record of snapshot.associationSeasons) {
      if (record.associationId === 'island' && ['2022-23', '2024-25', '2025-26'].includes(record.seasonId)) {
        record.points = '13.335';
      }
    }
    expect(RankingSnapshotSchema.safeParse(snapshot).success).toBe(true);
    const meadow = clubFiveSeasonCoefficients(snapshot, '2026-27').find((row) => row.clubId === 'meadow-fc')!;
    expect(meadow).toMatchObject({
      clubPointsSum: '5', associationCoefficient: '40.005', associationMinimum: '8.001',
      coefficient: '8.001', minimumApplied: true, status: 'complete',
    });
    expect(meadow.contributions.map(({ seasonId }) => seasonId)).toEqual([
      '2022-23', '2023-24', '2024-25', '2025-26', '2026-27',
    ]);
    snapshot.associationSeasons.filter((record) => record.associationId === 'island'
      && ['2022-23', '2024-25', '2025-26'].includes(record.seasonId))
      .forEach((record) => { record.points = '1'; });
    expect(clubFiveSeasonCoefficients(snapshot, '2026-27').find((row) => row.clubId === 'meadow-fc'))
      .toMatchObject({ clubPointsSum: '5', associationMinimum: '0.6', coefficient: '5', minimumApplied: false });
  });

  it('uses membership of the season being ranked, not a historic or current membership', () => {
    const snapshot = fixture();
    const selected = snapshot.clubSeasons.find((record) => record.clubId === 'meadow-fc'
      && record.seasonId === '2026-27')!;
    selected.associationId = 'albion';
    expect(clubFiveSeasonCoefficients(snapshot, '2026-27').find((row) => row.clubId === 'meadow-fc'))
      .toMatchObject({ associationId: 'albion', coefficient: '18', status: 'partial' });
  });

  it('does not treat missing or partial records, unavailable association inputs or unsupported rules as complete', () => {
    const snapshot = fixture();
    snapshot.clubSeasons.find((record) => record.clubId === 'meadow-fc'
      && record.seasonId === '2024-25')!.status = 'partial';
    expect(clubFiveSeasonCoefficients(snapshot, '2026-27').find((row) => row.clubId === 'meadow-fc'))
      .toMatchObject({ coefficient: '5', clubPointsSum: '5', status: 'partial' });
    snapshot.clubSeasons = snapshot.clubSeasons.filter((record) => !(record.clubId === 'meadow-fc'
      && record.seasonId === '2024-25'));
    expect(clubFiveSeasonCoefficients(snapshot, '2026-27').find((row) => row.clubId === 'meadow-fc'))
      .toMatchObject({ coefficient: null, status: 'incomplete' });
    expect(clubFiveSeasonCoefficients(fixture(), '2023-24').find((row) => row.clubId === 'meadow-fc'))
      .toMatchObject({ coefficient: '5', status: 'partial' });
  });

  it('limits missing-value assumptions to wholly synthetic fixtures and flags unsupported floor periods', () => {
    const snapshot = fixture();
    const unknown = snapshot.associationSeasons.find((record) =>
      record.associationId === 'island' && record.seasonId === '2024-25')!;
    unknown.points = null;
    unknown.status = 'missing';
    const fixtureResult = clubFiveSeasonCoefficients(snapshot, '2026-27').find((row) => row.clubId === 'meadow-fc')!;
    expect(fixtureResult).toMatchObject({ associationCoefficient: '2', coefficient: '5', status: 'partial' });
    expect(fixtureResult.assumptions).toContainEqual({
      code: 'missing-or-partial-association-coefficient',
      message: 'A missing or partial synthetic association coefficient is assumed to be 0.',
    });

    snapshot.clubSeasons.find((record) => record.clubId === 'north-city' && record.seasonId === '2018-19')!.sourceId = 'imported-source';
    expect(clubFiveSeasonCoefficients(snapshot, '2026-27').find((row) => row.clubId === 'meadow-fc'))
      .toMatchObject({ associationCoefficient: null, coefficient: null, status: 'incomplete' });
    const unsupported = clubFiveSeasonCoefficients(fixture(), '2025-26').find((row) => row.clubId === 'meadow-fc')!;
    expect(unsupported.status).toBe('partial');
    expect(unsupported.assumptions).toContainEqual({
      code: 'unverified-association-floor',
      message: 'The 20% association floor is provisionally applied for this synthetic period.',
    });
  });

  it('identifies simultaneous assumptions without replacing a known partial association value', () => {
    const snapshot = fixture();
    const partialClub = snapshot.clubSeasons.find((record) =>
      record.clubId === 'meadow-fc' && record.seasonId === '2024-25')!;
    partialClub.status = 'partial';
    const partialAssociation = snapshot.associationSeasons.find((record) =>
      record.associationId === 'island' && record.seasonId === '2024-25')!;
    partialAssociation.points = '3';
    partialAssociation.status = 'partial';
    const result = clubFiveSeasonCoefficients(snapshot, '2026-27').find((row) => row.clubId === 'meadow-fc')!;
    expect(result.associationCoefficient).toBe('5');
    expect(result.assumptions.map(({ code }) => code)).toEqual(expect.arrayContaining([
      'partial-club-total', 'missing-or-partial-association-coefficient',
    ]));
    const unaffected = clubFiveSeasonCoefficients(fixture(), '2026-27').find((row) => row.clubId === 'meadow-fc')!;
    expect(unaffected.assumptions).toEqual([]);
  });

  it('rejects unknown seasons and does not apply the floor when it equals the club sum', () => {
    const snapshot = fixture();
    expect(() => clubFiveSeasonCoefficients(snapshot, '2027-28')).toThrow(RangeError);
    for (const record of snapshot.associationSeasons) {
      if (record.associationId === 'island' && record.seasonId === '2022-23') record.points = '25';
      if (record.associationId === 'island' && ['2024-25', '2025-26'].includes(record.seasonId)) record.points = '0';
    }
    expect(clubFiveSeasonCoefficients(snapshot, '2026-27').find((row) => row.clubId === 'meadow-fc'))
      .toMatchObject({ associationMinimum: '5', coefficient: '5', minimumApplied: false });
  });

  it('includes clubs absent in the selected season, excludes confirmed absence throughout, and preserves uncertain eligibility', () => {
    const snapshot = fixture();
    for (const record of snapshot.clubSeasons.filter((entry) => entry.clubId === 'meadow-fc'
      && entry.seasonId >= '2022-23')) {
      record.participation = 'did-not-participate';
      record.points = '0';
      record.status = 'complete';
    }
    let rows = clubFiveSeasonCoefficients(snapshot, '2026-27');
    expect(rows.some(({ clubId }) => clubId === 'historic-town')).toBe(true);
    expect(rows.some(({ clubId }) => clubId === 'meadow-fc')).toBe(false);
    snapshot.clubSeasons = snapshot.clubSeasons.filter((record) => !(record.clubId === 'meadow-fc'
      && record.seasonId === '2024-25'));
    rows = clubFiveSeasonCoefficients(snapshot, '2026-27');
    expect(rows.find(({ clubId }) => clubId === 'meadow-fc'))
      .toMatchObject({ status: 'incomplete', coefficient: null });
  });
});
