import type { ClubRankingResponse, RankingSnapshot } from '@uefa-ranking/contracts';
import { associationMinimum, decimalToMilli, milliToDecimal } from './decimal.js';
import { rankingPeriods } from './periods.js';

type Contribution = {
  seasonId: string;
  points: string | null;
  participation: 'participated' | 'did-not-participate' | 'unknown';
  status: 'complete' | 'partial' | 'missing';
};

export type ClubFiveSeasonCoefficient = {
  clubId: string;
  associationId: string | null;
  contributions: Contribution[];
  clubPointsSum: string | null;
  associationCoefficient: string | null;
  associationMinimum: string | null;
  coefficient: string | null;
  minimumApplied: boolean | null;
  status: 'complete' | 'partial' | 'incomplete';
  reasons: string[];
  assumptions: ClubRankingResponse['clubs'][number]['assumptions'];
};

/**
 * Computes coefficients from a provider-validated snapshot. Eligibility remains
 * uncertain when any season's participation is unknown, so such clubs remain
 * in the population even when no known participation exists.
 */
export function clubFiveSeasonCoefficients(
  snapshot: RankingSnapshot,
  seasonId: string,
): ClubFiveSeasonCoefficient[] {
  if (!snapshot.seasons.some((season) => season.id === seasonId)) {
    throw new RangeError(`Season is not stored: ${seasonId}`);
  }
  const period = rankingPeriods(seasonId, snapshot.seasons.map(({ id }) => id)).current;
  const rule = snapshot.ruleSupport.find((entry) => entry.seasonId === seasonId);
  const fixtureAssumptions = snapshot.clubSeasons.length > 0
    && snapshot.clubSeasons.every((record) => record.sourceId === 'synthetic-fixture')
    && snapshot.associationSeasons.every((record) => record.sourceId === 'synthetic-fixture');

  return snapshot.clubs.flatMap((club) => {
    const records = period.map(({ seasonId: id }) =>
      snapshot.clubSeasons.find((record) => record.clubId === club.id && record.seasonId === id));
    const contributions: Contribution[] = period.map(({ seasonId: id }, index) => {
      const record = records[index];
      return record
        ? { seasonId: id, points: record.points, participation: record.participation, status: record.status }
        : { seasonId: id, points: null, participation: 'unknown', status: 'missing' };
    });
    if (contributions.every((entry) => entry.participation === 'did-not-participate')) return [];

    const associationId = records[4]?.associationId ?? null;
    const reasons: string[] = [];
    const assumptions: ClubFiveSeasonCoefficient['assumptions'] = [];
    const clubCanBeSummed = contributions.every((entry) => entry.points !== null
      || (fixtureAssumptions && entry.participation === 'participated'));
    const clubPointsSum = clubCanBeSummed
      ? milliToDecimal(contributions.reduce((sum, entry) =>
        sum + (entry.points === null ? 0n : decimalToMilli(entry.points)), 0n))
      : null;
    if (clubCanBeSummed && contributions.some((entry) => entry.points === null)) {
      // FIXME(mvp-fixture-assumption): synthetic records with an unknown score are provisionally treated as zero.
      assumptions.push({ code: 'missing-club-contribution', message: 'A missing synthetic club contribution is assumed to be 0.' });
    }
    if (contributions.some((entry) => entry.status !== 'complete' && entry.points !== null)) {
      if (fixtureAssumptions) assumptions.push({ code: 'partial-club-total', message: 'Partial synthetic club totals use the reported fixture value.' });
      else reasons.push('A club contribution is partial');
    }
    if (clubPointsSum === null) reasons.push('Club contributions are incomplete');

    if (associationId === null) reasons.push('Selected-season association is unavailable');
    const associationRecords = period.map(({ seasonId: id }) => snapshot.associationSeasons.find(
      (record) => record.associationId === associationId && record.seasonId === id,
    ));
    const associationCanBeSummed = associationId !== null && associationRecords.every((record) =>
      record !== undefined && (record.points !== null || fixtureAssumptions));
    const associationCoefficient = associationCanBeSummed
      ? milliToDecimal(associationRecords.reduce((sum, record) =>
        sum + (record?.points === null || record === undefined ? 0n : decimalToMilli(record.points)), 0n))
      : null;
    if (associationCanBeSummed && associationRecords.some((record) =>
      record?.points === null || record?.status !== 'complete')) {
      // FIXME(mvp-fixture-assumption): synthetic missing association seasons are provisionally treated as zero.
      assumptions.push({ code: 'missing-or-partial-association-coefficient', message: 'A missing or partial synthetic association coefficient is assumed to be 0.' });
    }
    if (associationCoefficient === null) reasons.push('Association coefficient inputs are incomplete');
    const floorSupported = rule?.clubScoring === 'verified';
    if (!floorSupported && fixtureAssumptions) {
      // FIXME(mvp-rule-assumption): mock MVP applies the stated 20% floor pending rule verification for this period.
      assumptions.push({ code: 'unverified-association-floor', message: 'The 20% association floor is provisionally applied for this synthetic period.' });
    } else if (!floorSupported) {
      reasons.push('Club floor rule is unsupported for this period');
    }
    const floor = associationCoefficient !== null && (floorSupported || fixtureAssumptions)
      ? associationMinimum(associationCoefficient) : null;
    const complete = clubPointsSum !== null && floor !== null;
    const minimumApplied = complete ? decimalToMilli(floor) > decimalToMilli(clubPointsSum) : null;
    const coefficient = complete ? (minimumApplied ? floor : clubPointsSum) : null;
    if (rule?.ranking !== 'verified' && fixtureAssumptions) {
      // FIXME(mvp-tie-break-assumption): the mock ranking uses annual contributions while the historical tie-break mapping is unresolved.
      assumptions.push({ code: 'unverified-ranking-tie-break', message: 'Historical tie-break behavior is assumed for this synthetic ranking.' });
    } else if (rule?.ranking !== 'verified') {
      reasons.push('Historical ranking tie-break rules are unsupported');
    }
    const partial = assumptions.length > 0 || contributions.some((entry) => entry.status !== 'complete')
      || associationRecords.some((record) => record?.status !== 'complete') || reasons.length > 0;
    const missing = clubPointsSum === null || associationId === null || associationCoefficient === null
      || floor === null;
    return [{
      clubId: club.id, associationId, contributions, clubPointsSum, associationCoefficient,
      associationMinimum: floor, coefficient, minimumApplied,
      status: missing ? 'incomplete' : partial ? 'partial' : 'complete',
      reasons, assumptions,
    }];
  });
}
