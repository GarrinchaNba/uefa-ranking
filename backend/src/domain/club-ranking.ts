import type { ClubRankingResponse, RankingSnapshot } from '@uefa-ranking/contracts';
import { decimalToMilli } from './decimal.js';
import { clubFiveSeasonCoefficients } from './five-season.js';
import { rankingPeriods } from './periods.js';

type RankedInput = ReturnType<typeof clubFiveSeasonCoefficients>[number];

function compareNullableDecimals(left: string | null, right: string | null, direction: 1 | -1): number {
  if (left === null || right === null) return left === right ? 0 : left === null ? 1 : -1;
  const a = decimalToMilli(left);
  const b = decimalToMilli(right);
  return (a < b ? -1 : a > b ? 1 : 0) * direction;
}

function tieBreak(left: RankedInput, right: RankedInput, snapshot: RankingSnapshot): number {
  const contributionOrder = left.contributions.map(({ points }) => points)
    .map((points, index) => compareNullableDecimals(points, right.contributions[index].points, -1))
    .find((result) => result !== 0);
  if (contributionOrder !== undefined) return contributionOrder;
  const associationOrder = compareNullableDecimals(left.associationCoefficient, right.associationCoefficient, -1);
  if (associationOrder !== 0) return associationOrder;
  const leftPosition = snapshot.clubSeasons.find((record) => record.clubId === left.clubId
    && record.seasonId === left.contributions[4].seasonId)?.domesticPosition ?? null;
  const rightPosition = snapshot.clubSeasons.find((record) => record.clubId === right.clubId
    && record.seasonId === right.contributions[4].seasonId)?.domesticPosition ?? null;
  if (leftPosition === null || rightPosition === null) return 0;
  return leftPosition - rightPosition;
}

function assignRanks(inputs: RankedInput[], snapshot: RankingSnapshot) {
  const ordered = [...inputs].sort((left, right) =>
    compareNullableDecimals(left.coefficient, right.coefficient, -1)
    || tieBreak(left, right, snapshot)
    || left.clubId.localeCompare(right.clubId));
  const ranks = new Map<string, { rank: number | null; rankStatus: 'resolved' | 'unresolved' | 'incomplete' }>();
  const assumptionsAllowed = snapshot.clubSeasons.length > 0
    && snapshot.clubSeasons.every((record) => record.sourceId === 'synthetic-fixture')
    && snapshot.associationSeasons.every((record) => record.sourceId === 'synthetic-fixture');
  const hasUnknownCompetitors = ordered.some((entry) => entry.coefficient === null
    || (!assumptionsAllowed && entry.status !== 'complete'));

  ordered.forEach((entry, index) => {
    if (entry.coefficient === null || hasUnknownCompetitors) {
      ranks.set(entry.clubId, { rank: null, rankStatus: 'incomplete' });
      return;
    }
    const previous = ordered[index - 1];
    const sameAsPrevious = previous !== undefined
      && decimalToMilli(previous.coefficient!) === decimalToMilli(entry.coefficient!)
      && tieBreak(previous, entry, snapshot) === 0;
    const next = ordered[index + 1];
    const sameAsNext = next !== undefined
      && decimalToMilli(next.coefficient!) === decimalToMilli(entry.coefficient!)
      && tieBreak(entry, next, snapshot) === 0;
    ranks.set(entry.clubId, sameAsPrevious || sameAsNext
      ? { rank: null, rankStatus: 'unresolved' }
      : { rank: index + 1, rankStatus: 'resolved' });
  });
  return { ordered, ranks };
}

function priorSeasonId(seasonId: string): string {
  const year = Number(seasonId.slice(0, 4));
  return `${String(year - 1).padStart(4, '0')}-${String(year % 100).padStart(2, '0')}`;
}

export function clubRanking(
  snapshot: RankingSnapshot,
  seasonId: string,
  options: { sortSeasonId?: string; direction?: 'asc' | 'desc'; dataStatus: ClubRankingResponse['dataStatus'] },
): ClubRankingResponse {
  if (!snapshot.selectableSeasonIds.includes(seasonId)) {
    throw new RangeError(`Season is not selectable: ${seasonId}`);
  }
  const periods = rankingPeriods(seasonId, snapshot.seasons.map(({ id }) => id));
  const priorSeason = priorSeasonId(seasonId);
  const currentInputs = clubFiveSeasonCoefficients(snapshot, seasonId);
  const previousInputs = snapshot.seasons.some((season) => season.id === priorSeason)
    ? clubFiveSeasonCoefficients(snapshot, priorSeason) : [];
  const currentRanks = assignRanks(currentInputs, snapshot).ranks;
  const previousRanks = assignRanks(previousInputs, snapshot).ranks;
  const associations = new Map(snapshot.associations.map((association) => [association.id, association]));
  const clubs = currentInputs.map((input) => {
    const currentRank = currentRanks.get(input.clubId)!;
    const previousRank = previousRanks.get(input.clubId) ?? { rank: null, rankStatus: 'incomplete' as const };
    const movement = currentRank.rankStatus === 'resolved' && previousRank.rankStatus === 'resolved'
      ? previousRank.rank! - currentRank.rank! : null;
    return {
      clubId: input.clubId,
      name: snapshot.clubs.find((club) => club.id === input.clubId)!.name,
      association: input.associationId === null ? null : associations.get(input.associationId) ?? null,
      rank: currentRank.rank,
      rankStatus: currentRank.rankStatus,
      previousRank: previousRank.rank,
      previousRankStatus: previousRank.rankStatus,
      movement,
      contributions: input.contributions,
      clubPointsSum: input.clubPointsSum,
      associationCoefficient: input.associationCoefficient,
      associationMinimum: input.associationMinimum,
      coefficient: input.coefficient,
      minimumApplied: input.minimumApplied,
      status: input.status,
      reason: [...input.reasons, ...input.assumptions].join(' ') || null,
    };
  });

  if (options.sortSeasonId !== undefined && !periods.current.some((entry) => entry.seasonId === options.sortSeasonId)) {
    throw new RangeError('sortSeasonId must be in the selected five-season period');
  }
  if (options.sortSeasonId !== undefined) {
    const contributionIndex = periods.current.findIndex((entry) => entry.seasonId === options.sortSeasonId);
    const direction = options.direction === 'asc' ? 1 : -1;
    clubs.sort((left, right) => compareNullableDecimals(
      left.contributions[contributionIndex].points,
      right.contributions[contributionIndex].points,
      direction,
    ) || left.name.localeCompare(right.name) || left.clubId.localeCompare(right.clubId));
  } else {
    clubs.sort((left, right) => (left.rank ?? Number.MAX_SAFE_INTEGER) - (right.rank ?? Number.MAX_SAFE_INTEGER)
      || left.name.localeCompare(right.name) || left.clubId.localeCompare(right.clubId));
  }

  const seasons = periods.current.map(({ seasonId: id }) => snapshot.seasons.find((season) => season.id === id)!);
  return {
    season: seasons[4],
    seasons,
    provisional: seasonId === snapshot.activeSeasonId,
    explanation: 'Synthetic MVP ranking. Numeric assumptions are provisional and listed on each affected club; this is not a verified UEFA ranking.',
    clubs,
    dataStatus: options.dataStatus,
  };
}
