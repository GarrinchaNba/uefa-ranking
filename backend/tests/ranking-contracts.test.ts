import { describe, expect, it } from 'vitest';
import { AssociationRankingResponseSchema, ClubRankingResponseSchema } from '@uefa-ranking/contracts';

const seasons = ['2022-23', '2023-24', '2024-25', '2025-26', '2026-27']
  .map((id) => ({ id, label: id }));
const status = { mode: 'mock', quality: 'partial', source: 'Test', lastSuccessfulUpdate: null };
const contribution = (seasonId: string) => ({
  seasonId, points: '2', participation: 'participated', status: 'complete',
});
const row = {
  clubId: 'club', name: 'Club', association: { id: 'a', name: 'A' },
  rank: 3, rankStatus: 'resolved', previousRank: 5, previousRankStatus: 'resolved', movement: 2,
  contributions: seasons.map(({ id }) => contribution(id)), clubPointsSum: '10',
  associationCoefficient: '20', associationMinimum: '4', coefficient: '10',
  minimumApplied: false, status: 'complete', reason: null,
};
const base = {
  season: seasons[4], seasons, provisional: true, explanation: 'Provisional mock',
  clubs: [row], dataStatus: status,
};

describe('ranking response contracts', () => {
  it('accepts a five-season club response and a correctly signed movement', () => {
    expect(ClubRankingResponseSchema.safeParse(base).success).toBe(true);
  });
  it('rejects mismatched periods, contribution ordering and movements', () => {
    const invalid = [
      { ...base, seasons: seasons.slice(1) },
      { ...base, season: seasons[3] },
      { ...base, clubs: [{ ...row, contributions: [...row.contributions].reverse() }] },
      { ...base, clubs: [{ ...row, movement: -2 }] },
      { ...base, clubs: [{ ...row, rankStatus: 'unresolved' }] },
      { ...base, clubs: [{ ...row, previousRankStatus: 'incomplete', previousRank: null }] },
      { ...base, clubs: [{ ...row, status: 'incomplete' }] },
      { ...base, clubs: [{ ...row, coefficient: null }] },
    ];
    for (const response of invalid) {
      expect(ClubRankingResponseSchema.safeParse(response).success).toBe(false);
    }
  });
  it('accepts unavailable ranks and prohibits fabricated movement', () => {
    const unresolved = { ...row, rank: null, rankStatus: 'unresolved', movement: null };
    expect(ClubRankingResponseSchema.safeParse({ ...base, clubs: [unresolved] }).success).toBe(true);
    expect(ClubRankingResponseSchema.safeParse({
      ...base, clubs: [{ ...unresolved, movement: 0 }],
    }).success).toBe(false);
  });
  it('validates association rows with independent coefficient contributions', () => {
    const association = {
      association: { id: 'a', name: 'A' }, rank: 1, rankStatus: 'resolved',
      previousRank: null, previousRankStatus: 'incomplete', movement: null,
      contributions: seasons.map(({ id }) => ({ seasonId: id, coefficient: '2', status: 'complete' })),
      coefficient: '10', status: 'complete', reason: null,
    };
    const response = { ...base, clubs: undefined, associations: [association] };
    expect(AssociationRankingResponseSchema.safeParse(response).success).toBe(true);
    expect(AssociationRankingResponseSchema.safeParse({
      ...response, associations: [{ ...association, previousRank: 2 }],
    }).success).toBe(false);
  });
});
