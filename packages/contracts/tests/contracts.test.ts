import {
  AssociationSeasonDetailsResponseSchema,
  ClubSeasonDetailsResponseSchema,
} from '../src/api.js';
import { describe, expect, it } from 'vitest';

const dataStatus = {
  mode: 'mock',
  quality: 'partial',
  source: 'Synthetic contract fixture',
  lastSuccessfulUpdate: null,
};
const season = { id: '2026-27', label: '2026/27' };
const awardedClubPoints = {
  id: 'club-award',
  competition: { id: 'conference-league', name: 'UEFA Conference League' },
  round: null,
  game: null,
  kind: 'bonus',
  status: 'awarded',
  points: '1',
  ruleId: 'conference-elimination',
  sourceId: 'synthetic-award',
  label: 'Qualifying elimination',
};

describe('detail response contracts', () => {
  it('requires complete club totals to reconcile with awarded detail entries', () => {
    const detail = {
      season,
      club: { id: 'club', name: 'Club' },
      participation: 'participated',
      competitions: [{ id: 'conference-league', name: 'UEFA Conference League' }],
      entries: [awardedClubPoints],
      total: '1',
      status: 'complete',
      explanation: 'Synthetic complete detail.',
      dataStatus,
    };

    expect(ClubSeasonDetailsResponseSchema.safeParse(detail).success).toBe(true);
    expect(ClubSeasonDetailsResponseSchema.safeParse({ ...detail, total: '0' }).success).toBe(false);
  });

  it('keeps association competition subtotals separate and reconciled to club awards', () => {
    const entry = { ...awardedClubPoints, game: null };
    const detail = {
      season,
      association: { id: 'island', name: 'Island' },
      groups: [{
        competition: entry.competition,
        clubs: [{ clubId: 'club', name: 'Club', points: '1', status: 'complete', entries: [entry] }],
        total: '1',
        status: 'complete',
      }],
      explanation: 'Competition totals are not association coefficients.',
      dataStatus,
    };

    expect(AssociationSeasonDetailsResponseSchema.safeParse(detail).success).toBe(true);
    expect(AssociationSeasonDetailsResponseSchema.safeParse({
      ...detail,
      groups: [{ ...detail.groups[0], total: '2' }],
    }).success).toBe(false);
  });
});
