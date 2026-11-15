import type { RankingSnapshot } from '@uefa-ranking/contracts';
import { decimalToMilli, divideToThousandths, milliToDecimal } from './decimal.js';

export type AssociationSeasonScore = {
  associationId: string;
  seasonId: string;
  points: string | null;
  coefficient: string | null;
  participantCount: number | null;
  divisor: number | null;
  divisorReason: 'participants' | 'unreplaced-qualified-club' | 'unknown';
  provenance: 'synthetic' | 'calculated' | 'source' | null;
  status: 'complete' | 'partial' | 'missing';
  reason: string | null;
};

function expectedMatchPoints(
  snapshot: RankingSnapshot,
  award: RankingSnapshot['associationAwards'][number],
): string | null {
  if (award.gameId === null) return award.status === 'awarded' ? award.points : null;
  const game = snapshot.games.find((entry) => entry.id === award.gameId);
  const stage = snapshot.stages.find((entry) => entry.id === award.stageId);
  if (!game || !stage || game.status !== 'ratified'
    || game.homeScore === null || game.awayScore === null || award.status !== 'awarded') return null;
  const clubScore = award.clubId === game.homeClubId ? game.homeScore : game.awayScore;
  const opponentScore = award.clubId === game.homeClubId ? game.awayScore : game.homeScore;
  const qualifying = /qualifying|play-?off/i.test(stage.group);
  const win = qualifying ? '1' : '2';
  const draw = qualifying ? '0.5' : '1';
  return clubScore > opponentScore ? win : clubScore === opponentScore ? draw : '0';
}

export function scoreAssociationSeason(
  snapshot: RankingSnapshot,
  associationId: string,
  seasonId: string,
): AssociationSeasonScore {
  const record = snapshot.associationSeasons.find((entry) =>
    entry.associationId === associationId && entry.seasonId === seasonId);
  const rule = snapshot.ruleSupport.find((entry) => entry.seasonId === seasonId);
  const awards = snapshot.associationAwards.filter((entry) =>
    entry.associationId === associationId && entry.seasonId === seasonId);
  const clubSeasons = snapshot.clubSeasons.filter((entry) => entry.seasonId === seasonId);
  const participantClubIds = new Set(snapshot.participations
    .filter((entry) => entry.seasonId === seasonId
      && clubSeasons.some((membership) => membership.clubId === entry.clubId
        && membership.associationId === associationId))
    .map(({ clubId }) => clubId));
  const participantCount = record?.participantCount ?? participantClubIds.size;
  const divisorReason = record?.divisorReason ?? 'unknown';
  let divisor = record?.divisor ?? null;
  const membershipComplete = snapshot.clubs.every((club) => {
    const membership = snapshot.clubSeasons.find((entry) =>
      entry.clubId === club.id && entry.seasonId === seasonId);
    return membership !== undefined && membership.associationId !== null
      && membership.participation !== 'unknown';
  });

  if (divisorReason === 'participants' && divisor === null && participantCount > 0) {
    divisor = participantCount;
  }
  if (divisorReason === 'unknown') {
    divisor = record?.divisor === null && membershipComplete && participantCount > 0
      ? participantCount : null;
  }
  if (divisorReason === 'unreplaced-qualified-club') {
    const exceptionIsSupported = ['2021-22', '2023-24', '2026-27'].includes(seasonId)
      && record?.entitledCount !== null
      && record?.entitledCount === record?.divisor
      && record?.unreplacedReason !== null;
    if (!exceptionIsSupported) divisor = null;
  }

  const expectedAwards = awards.map((award) => ({
    award,
    points: expectedMatchPoints(snapshot, award),
  }));
  const allAwardsKnown = expectedAwards.every(({ points }) => points !== null);
  const awardsReconcileWithRules = expectedAwards.every(({ award, points }) =>
    points === null || award.points === points);
  const pointsMilli = expectedAwards.reduce((total, { points }) =>
    points === null ? total : total + decimalToMilli(points), 0n);
  const points = milliToDecimal(pointsMilli);
  const coefficient = divisor === null || divisor <= 0 || !awardsReconcileWithRules
    ? null : divideToThousandths(points, divisor);

  const awardsReconcile = record !== undefined && record.points !== null && record.divisor !== null
    && record.points === divideToThousandths(points, record.divisor);
  const complete = rule?.associationScoring === 'verified'
    && record !== undefined
    && record?.awardStatus === 'available'
    && record.status === 'complete'
    && record.points !== null
    && record.divisor !== null
    && record.divisor === divisor
    && membershipComplete
    && allAwardsKnown
    && awardsReconcileWithRules
    && awardsReconcile;
  const reason = rule?.associationScoring !== 'verified' ? 'Association scoring rules are unsupported for this season'
    : record === undefined ? 'Association season divisor and award coverage are unavailable'
    : divisor === null ? 'Association divisor is unavailable or unverified'
    : !awardsReconcileWithRules ? 'An attributed match award disagrees with the verified scoring rule'
    : !allAwardsKnown ? 'One or more association awards are pending or unknown'
    : record.awardStatus !== 'available' ? 'Association award coverage is incomplete'
    : !membershipComplete ? 'Association membership or participation is incomplete'
    : !awardsReconcile ? 'Attributed awards do not reconcile to the recorded coefficient'
    : null;

  return {
    associationId,
    seasonId,
    points: rule?.associationScoring === 'verified' && awardsReconcileWithRules ? points : null,
    coefficient: rule?.associationScoring === 'verified' ? coefficient : null,
    participantCount: participantCount || null,
    divisor,
    divisorReason: divisor === null ? 'unknown' : divisorReason === 'unknown' ? 'participants' : divisorReason,
    provenance: record?.provenance ?? null,
    status: rule?.associationScoring !== 'verified' || coefficient === null
      ? 'missing' : complete ? 'complete' : 'partial',
    reason: rule?.associationScoring === 'verified' ? reason : 'Association scoring rules are unsupported for this season',
  };
}
