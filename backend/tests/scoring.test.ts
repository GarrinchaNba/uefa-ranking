import { describe, expect, it } from 'vitest';
import { scoreClubSeason } from '../src/domain/scoring.js';
import { mockSnapshot } from '../src/providers/fixtures/mock-snapshot.js';

describe('versioned club scoring', () => {
  it('scores ratified stage matches as 2/1/0 and excludes qualifying games from club match points', () => {
    const snapshot = structuredClone(mockSnapshot);
    const result = scoreClubSeason(snapshot, 'albion-rovers', '2026-27');
    expect(result.entries.filter((entry) => entry.kind === 'match').map(({ points }) => points)).toEqual(['2', '1']);
    const qualifier = scoreClubSeason(snapshot, 'unverified-united', '2026-27');
    expect(qualifier.entries.find((entry) => entry.game?.id === 'ucl-qualifier-1'))
      .toMatchObject({ status: 'inapplicable', points: null });
    expect(result.total).toBe('3');
  });

  it('keeps scheduled results pending and separately attributes bonuses and adjustments', () => {
    const snapshot = structuredClone(mockSnapshot);
    const result = scoreClubSeason(snapshot, 'unverified-united', '2026-27');
    expect(result.entries.find((entry) => entry.game?.id === 'uecl-match-2'))
      .toMatchObject({ kind: 'match', status: 'pending', points: null });
    const adjustment = snapshot.clubAwards.find((award) => award.clubId === 'meadow-fc'
      && award.seasonId === '2026-27')!;
    adjustment.kind = 'adjustment';
    const meadow = scoreClubSeason(snapshot, 'meadow-fc', '2026-27');
    expect(meadow.entries.find((entry) => entry.kind === 'adjustment'))
      .toMatchObject({ status: 'awarded', points: '1' });
  });

  it('does not score unsupported season rules and preserves unknown award states', () => {
    const snapshot = structuredClone(mockSnapshot);
    snapshot.ruleSupport.find((rule) => rule.seasonId === '2026-27')!.clubScoring = 'unsupported';
    expect(scoreClubSeason(snapshot, 'albion-rovers', '2026-27'))
      .toMatchObject({ total: null, status: 'missing' });
    snapshot.ruleSupport.find((rule) => rule.seasonId === '2026-27')!.clubScoring = 'verified';
    const award = snapshot.clubAwards.find((entry) => entry.id === 'entry-uecl-match-2-away')!;
    award.status = 'unknown';
    award.points = null;
    expect(scoreClubSeason(snapshot, 'coastal-fc', '2026-27').status).toBe('partial');
  });

  it('reconciles complete selected-season detail totals to unique attributable awards', () => {
    for (const [clubId, seasonId] of [['meadow-fc', '2023-24'], ['meadow-fc', '2026-27'], ['historic-town', '2026-27']]) {
      const result = scoreClubSeason(structuredClone(mockSnapshot), clubId, seasonId);
      expect(result.status).toBe('complete');
      expect(result.total).toBe(clubId === 'historic-town' ? '0' : '1');
    }
  });
});
