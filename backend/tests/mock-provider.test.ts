import { describe, expect, it } from 'vitest';
import {
  associationMinimum,
  decimalToMilli,
  milliToDecimal,
} from '../src/domain/decimal.js';
import { MockRankingDataProvider } from '../src/providers/mock-provider.js';
import { getValidatedRankingSnapshot, getValidatedSnapshot } from '../src/providers/provider.js';
import { rankingPeriods } from '../src/domain/periods.js';

describe('deterministic mock provider', () => {
  it('provides a fixed active season, selectable seasons and nine consecutive inputs', async () => {
    const provider = new MockRankingDataProvider();
    const snapshot = await getValidatedSnapshot(provider);

    expect(snapshot.activeSeasonId).toBe('2026-27');
    expect(snapshot.seasons.map(({ id }) => id)).toEqual([
      '2018-19',
      '2019-20',
      '2020-21',
      '2021-22',
      '2022-23',
      '2023-24',
      '2024-25',
      '2025-26',
      '2026-27',
    ]);
    expect(snapshot.selectableSeasonIds).toEqual(['2023-24', '2026-27']);
    expect(provider.dataStatus).toEqual({
      mode: 'mock',
      quality: 'partial',
      source: 'Deterministic synthetic fixture (not live data)',
      lastSuccessfulUpdate: null,
    });
  });

  it('covers multiple associations, all competitions, and different stage schedules', async () => {
    const snapshot = await getValidatedSnapshot(new MockRankingDataProvider());
    expect(snapshot.associations).toHaveLength(3);
    expect(snapshot.competitions.map(({ id }) => id).sort()).toEqual([
      'champions-league',
      'conference-league',
      'europa-league',
    ]);

    const stageCounts = snapshot.competitions.map((competition) => ({
      competitionId: competition.id,
      count: snapshot.stages.filter(({ competitionId }) => competitionId === competition.id).length,
    }));
    expect(new Set(stageCounts.map(({ count }) => count)).size).toBeGreaterThan(1);
    expect(snapshot.games.some(({ competitionId }) => competitionId === 'champions-league')).toBe(true);
    expect(snapshot.games.some(({ competitionId }) => competitionId === 'europa-league')).toBe(true);
    expect(snapshot.games.some(({ competitionId }) => competitionId === 'conference-league')).toBe(true);
  });

  it('includes a historical-only club and distinguishes missing data from confirmed zero', async () => {
    const snapshot = await getValidatedSnapshot(new MockRankingDataProvider());
    const historicClub = snapshot.clubs.find(({ id }) => id === 'historic-town');
    expect(historicClub).toBeDefined();
    expect(snapshot.clubSeasonRecords.find((record) => (
      record.clubId === 'historic-town' && record.seasonId === snapshot.activeSeasonId
    ))).toMatchObject({
      participation: 'did-not-participate',
      points: '0',
      status: 'complete',
    });

    expect(snapshot.clubSeasonRecords.find((record) => (
      record.clubId === 'unverified-united' && record.seasonId === '2023-24'
    ))).toMatchObject({
      participation: 'participated',
      points: null,
      status: 'missing',
    });
    expect(snapshot.associationCoefficients.find((record) => (
      record.associationId === 'caledonia' && record.seasonId === '2024-25'
    ))).toMatchObject({ points: null, status: 'missing' });
  });

  it('has complete examples on both sides of the association minimum', async () => {
    const snapshot = await getValidatedSnapshot(new MockRankingDataProvider());
    const associationTotal = snapshot.associationCoefficients
      .filter(({ associationId }) => associationId === 'albion')
      .filter(({ seasonId }) => seasonId >= '2022-23')
      .reduce((sum, record) => {
        if (record.points === null) {
          throw new Error('Albion association fixture unexpectedly has a missing coefficient');
        }
        return sum + decimalToMilli(record.points);
      }, 0n);
    const floor = decimalToMilli(associationMinimum(milliToDecimal(associationTotal)));

    const contributionTotal = (clubId: string): bigint => snapshot.clubSeasonRecords
      .filter((record) => record.clubId === clubId)
      .filter(({ seasonId }) => seasonId >= '2022-23')
      .reduce((sum, record) => {
        if (record.points === null) {
          throw new Error(`${clubId} fixture unexpectedly has a missing contribution`);
        }
        return sum + decimalToMilli(record.points);
      }, 0n);

    expect(contributionTotal('albion-rovers')).toBeGreaterThan(floor);
    expect(contributionTotal('north-city')).toBeLessThan(floor);
  });

  it('keeps returned snapshots isolated and consistently labelled mock', async () => {
    const provider = new MockRankingDataProvider();
    const first = await provider.getActiveSeasonSnapshot() as { seasons: { label: string }[] };
    first.seasons[0].label = 'Changed by caller';
    const next = await provider.getActiveSeasonSnapshot() as { seasons: { label: string }[] };
    expect(next.seasons[0].label).toBe('2018/19');
    expect(provider.dataStatus?.mode).toBe('mock');
  });

  it('provides both ranking windows and explicitly unavailable historical details', async () => {
    const snapshot = await getValidatedRankingSnapshot(new MockRankingDataProvider());
    const available = snapshot.seasons.map(({ id }) => id);
    for (const id of snapshot.selectableSeasonIds) {
      const periods = rankingPeriods(id, available);
      expect([...periods.current, ...periods.previous].every((season) => season.available)).toBe(true);
    }
    expect(snapshot.clubSeasons.find((record) =>
      record.clubId === 'albion-rovers' && record.seasonId === '2023-24'))
      .toMatchObject({ status: 'complete', detailStatus: 'unavailable', provenance: 'synthetic' });
    expect(snapshot.clubSeasons.find((record) =>
      record.clubId === 'historic-town' && record.seasonId === '2026-27'))
      .toMatchObject({ participation: 'did-not-participate', points: '0', detailStatus: 'available' });
    expect(snapshot.associationSeasons.find((record) =>
      record.associationId === 'albion' && record.seasonId === '2026-27'))
      .toMatchObject({ points: null, status: 'missing', divisorReason: 'unknown' });
    expect(snapshot.associationSeasons.find((record) =>
      record.associationId === 'island' && record.seasonId === '2026-27'))
      .toMatchObject({ points: '0', status: 'complete', participantCount: 1, divisor: 1 });
    expect(snapshot.associationAwards.filter((award) => award.associationId === 'island' && award.seasonId === '2026-27')
      .map((award) => award.points)).toEqual(['0', '0']);
    expect(snapshot.ruleSupport.find(({ seasonId }) => seasonId === '2023-24'))
      .toMatchObject({ clubScoring: 'verified', associationScoring: 'verified', ranking: 'unsupported',
        sourceId: 'user-supplied-uefa-2023-24-and-2024-25' });
    expect(snapshot.ruleSupport.find(({ seasonId }) => seasonId === '2021-22'))
      .toMatchObject({ clubScoring: 'verified', associationScoring: 'verified', ranking: 'unsupported',
        sourceId: 'user-supplied-uefa-2021-22' });
    expect(snapshot.ruleSupport.find(({ seasonId }) => seasonId === '2025-26'))
      .toMatchObject({ clubScoring: 'unsupported', associationScoring: 'unsupported', ranking: 'unsupported' });
    expect(snapshot.ruleSupport.find(({ seasonId }) => seasonId === '2026-27'))
      .toMatchObject({ clubScoring: 'verified', associationScoring: 'verified', ranking: 'verified' });
    expect(snapshot.clubSeasons.find((record) =>
      record.clubId === 'meadow-fc' && record.seasonId === '2026-27'))
      .toMatchObject({ points: '1', status: 'complete', detailStatus: 'available' });
    expect(snapshot.clubAwards.filter((award) => award.clubId === 'meadow-fc' && award.seasonId === '2026-27'))
      .toEqual([expect.objectContaining({ kind: 'bonus', points: '1', ruleId: 'conference-q1-elimination-2026-27' })]);
  });

  it('reconciles a historical qualifying elimination independently for clubs and associations', async () => {
    const snapshot = await getValidatedRankingSnapshot(new MockRankingDataProvider());
    expect(snapshot.clubSeasons.find((record) =>
      record.clubId === 'meadow-fc' && record.seasonId === '2023-24'))
      .toMatchObject({ points: '1', status: 'complete', detailStatus: 'available' });
    expect(snapshot.clubAwards.filter((award) => award.clubId === 'meadow-fc' && award.seasonId === '2023-24'))
      .toEqual([expect.objectContaining({ points: '1', ruleId: 'conference-q1-elimination-2023-24' })]);
    expect(snapshot.associationSeasons.find((record) =>
      record.associationId === 'island' && record.seasonId === '2023-24'))
      .toMatchObject({ points: '0', status: 'complete', provenance: 'calculated', divisor: 1 });
    expect(snapshot.associationAwards.filter((award) =>
      award.associationId === 'island' && award.seasonId === '2023-24').map((award) => award.points))
      .toEqual(['0', '0']);
  });

  it('provides both floor branches and a rank reversal in complete historical inputs', async () => {
    const snapshot = await getValidatedRankingSnapshot(new MockRankingDataProvider());
    const periods = rankingPeriods('2023-24', snapshot.seasons.map(({ id }) => id));
    const total = (values: Array<{ seasonId: string; points: string | null; status: string }>,
      seasons: typeof periods.current): bigint => seasons.reduce((sum, season) => {
      const record = values.find((entry) => entry.seasonId === season.seasonId);
      if (!record || record.status !== 'complete' || record.points === null) {
        throw new Error(`Missing complete input for ${season.seasonId}`);
      }
      return sum + decimalToMilli(record.points);
    }, 0n);
    const associationTotals = (seasons: typeof periods.current) => snapshot.associations.map(({ id }) => ({
      id, points: total(snapshot.associationSeasons.filter((record) => record.associationId === id), seasons),
    })).sort((a, b) => a.points > b.points ? -1 : a.points < b.points ? 1 : 0);
    const previous = associationTotals(periods.previous);
    const current = associationTotals(periods.current);
    expect(previous.map(({ id }) => id)).toEqual(['albion', 'caledonia', 'island']);
    expect(current.map(({ id }) => id)).toEqual(['caledonia', 'albion', 'island']);
    expect(previous.findIndex(({ id }) => id === 'caledonia') - current.findIndex(({ id }) => id === 'caledonia')).toBe(1);
    expect(previous.findIndex(({ id }) => id === 'albion') - current.findIndex(({ id }) => id === 'albion')).toBe(-1);
    const floor = decimalToMilli(associationMinimum(milliToDecimal(current.find(({ id }) => id === 'albion')!.points)));
    const clubTotal = (clubId: string) => total(snapshot.clubSeasons.filter((record) => record.clubId === clubId), periods.current);
    expect(clubTotal('albion-rovers')).toBeGreaterThan(floor);
    expect(clubTotal('north-city')).toBeLessThan(floor);
  });

  it('attributes a qualifying transfer without duplicating awards', async () => {
    const snapshot = await getValidatedRankingSnapshot(new MockRankingDataProvider());
    const entries = snapshot.participations.filter((p) => p.clubId === 'unverified-united');
    expect(entries.map((p) => p.competitionId).sort())
      .toEqual(['champions-league', 'conference-league', 'europa-league']);
    expect(snapshot.associationAwards.find((award) =>
      award.clubId === 'unverified-united' && award.gameId === 'ucl-qualifier-1'))
      .toMatchObject({ competitionId: 'champions-league', points: '0' });
    expect(snapshot.clubAwards.some((award) =>
      award.clubId === 'unverified-united' && award.gameId === 'ucl-qualifier-1')).toBe(false);
    const memberships = snapshot.clubSeasons.filter((r) =>
      r.clubId === 'historic-town' && ['2023-24', '2026-27'].includes(r.seasonId));
    expect(memberships.map((r) => r.associationId)).toEqual(['albion', 'caledonia']);
    expect(new Set(snapshot.clubAwards.map((a) => `${a.clubId}:${a.sourceId}`)).size)
      .toBe(snapshot.clubAwards.length);
  });
});
