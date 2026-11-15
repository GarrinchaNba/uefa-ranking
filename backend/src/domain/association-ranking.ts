import type { AssociationRankingResponse, RankingSnapshot } from '@uefa-ranking/contracts';
import { decimalToMilli, milliToDecimal } from './decimal.js';
import { rankingPeriods } from './periods.js';
import { scoreAssociationSeason } from './association-scoring.js';

type AssociationInput = {
  associationId: string;
  contributions: AssociationRankingResponse['associations'][number]['contributions'];
  coefficient: string | null;
  status: 'complete' | 'partial' | 'incomplete';
  reason: string | null;
};

function associationInputs(snapshot: RankingSnapshot, seasonId: string): AssociationInput[] {
  const period = rankingPeriods(seasonId, snapshot.seasons.map(({ id }) => id)).current;
  return snapshot.associations.map((association) => {
    const contributions = period.map(({ seasonId: id }) => {
      const record = snapshot.associationSeasons.find((entry) =>
        entry.associationId === association.id && entry.seasonId === id);
      const rule = snapshot.ruleSupport.find((entry) => entry.seasonId === id);
      if (rule?.associationScoring === 'verified' && record !== undefined
        && (record.provenance === 'calculated' || record.awardStatus !== 'unavailable')) {
        const score = scoreAssociationSeason(snapshot, association.id, id);
        return {
          seasonId: id,
          coefficient: score.coefficient,
          status: score.status,
        } as const;
      }
      return {
        seasonId: id,
        coefficient: record?.points ?? null,
        status: record?.status ?? 'missing',
      } as const;
    });
    const complete = contributions.every((entry) => entry.status === 'complete' && entry.coefficient !== null);
    const partial = contributions.some((entry) => entry.status === 'partial');
    return {
      associationId: association.id,
      contributions,
      coefficient: complete
        ? milliToDecimal(contributions.reduce((sum, entry) => sum + decimalToMilli(entry.coefficient!), 0n))
        : null,
      status: complete ? 'complete' : partial ? 'partial' : 'incomplete',
      reason: complete ? null : partial
        ? 'One or more season coefficients are partial'
        : 'One or more season coefficients are missing',
    };
  });
}

function rankPeriod(inputs: AssociationInput[], tieBreakSupported: boolean) {
  const hasUnknownCompetitors = inputs.some((entry) => entry.coefficient === null);
  const ordered = [...inputs].sort((left, right) => {
    if (left.coefficient === null || right.coefficient === null) {
      return left.coefficient === right.coefficient ? 0 : left.coefficient === null ? 1 : -1;
    }
    const total = decimalToMilli(right.coefficient) - decimalToMilli(left.coefficient);
    if (total !== 0n) return total < 0n ? -1 : 1;
    if (tieBreakSupported) {
      for (let index = 4; index >= 0; index -= 1) {
        const leftPoints = left.contributions[index].coefficient;
        const rightPoints = right.contributions[index].coefficient;
        if (leftPoints === null || rightPoints === null) continue;
        const difference = decimalToMilli(rightPoints) - decimalToMilli(leftPoints);
        if (difference !== 0n) return difference < 0n ? -1 : 1;
      }
    }
    return left.associationId.localeCompare(right.associationId);
  });
  const ranks = new Map<string, { rank: number | null; rankStatus: 'resolved' | 'unresolved' | 'incomplete' }>();
  ordered.forEach((entry, index) => {
    if (entry.coefficient === null || hasUnknownCompetitors) {
      ranks.set(entry.associationId, { rank: null, rankStatus: 'incomplete' });
      return;
    }
    const tiedWith = (other: AssociationInput | undefined) => other !== undefined
      && other.coefficient !== null
      && decimalToMilli(entry.coefficient!) === decimalToMilli(other.coefficient)
      && (!tieBreakSupported || entry.contributions.every((contribution, contributionIndex) =>
        contribution.coefficient === other.contributions[contributionIndex].coefficient));
    const tie = tiedWith(ordered[index - 1]) || tiedWith(ordered[index + 1]);
    ranks.set(entry.associationId, tie
      ? { rank: null, rankStatus: 'unresolved' }
      : { rank: index + 1, rankStatus: 'resolved' });
  });
  return ranks;
}

function priorSeasonId(seasonId: string): string {
  const year = Number(seasonId.slice(0, 4));
  return `${String(year - 1).padStart(4, '0')}-${String(year % 100).padStart(2, '0')}`;
}

export function associationRanking(
  snapshot: RankingSnapshot,
  seasonId: string,
  options: { sortSeasonId?: string; direction?: 'asc' | 'desc'; dataStatus: AssociationRankingResponse['dataStatus'] },
): AssociationRankingResponse {
  if (!snapshot.selectableSeasonIds.includes(seasonId)) {
    throw new RangeError(`Season is not selectable: ${seasonId}`);
  }
  const periods = rankingPeriods(seasonId, snapshot.seasons.map(({ id }) => id));
  const previousSeason = priorSeasonId(seasonId);
  const currentInputs = associationInputs(snapshot, seasonId);
  const previousInputs = snapshot.seasons.some((season) => season.id === previousSeason)
    ? associationInputs(snapshot, previousSeason) : [];
  const currentTieBreakSupported = snapshot.ruleSupport.find((entry) => entry.seasonId === seasonId)?.ranking === 'verified';
  const previousTieBreakSupported = snapshot.ruleSupport.find((entry) => entry.seasonId === previousSeason)?.ranking === 'verified';
  const currentRanks = rankPeriod(currentInputs, currentTieBreakSupported);
  const previousRanks = rankPeriod(previousInputs, previousTieBreakSupported);
  const associations = currentInputs.map((input) => {
    const rank = currentRanks.get(input.associationId)!;
    const previousRank = previousRanks.get(input.associationId) ?? { rank: null, rankStatus: 'incomplete' as const };
    return {
      association: snapshot.associations.find((entry) => entry.id === input.associationId)!,
      ...rank,
      previousRank: previousRank.rank,
      previousRankStatus: previousRank.rankStatus,
      movement: rank.rankStatus === 'resolved' && previousRank.rankStatus === 'resolved'
        ? previousRank.rank! - rank.rank! : null,
      contributions: input.contributions,
      coefficient: input.coefficient,
      status: input.status,
      reason: input.reason,
    };
  });

  if (options.sortSeasonId !== undefined && !periods.current.some((entry) => entry.seasonId === options.sortSeasonId)) {
    throw new RangeError('sortSeasonId must be in the selected five-season period');
  }
  if (options.sortSeasonId !== undefined) {
    const index = periods.current.findIndex((entry) => entry.seasonId === options.sortSeasonId);
    const direction = options.direction === 'asc' ? 1 : -1;
    associations.sort((left, right) => {
      const a = left.contributions[index].coefficient;
      const b = right.contributions[index].coefficient;
      if (a === null || b === null) return a === b ? 0 : a === null ? 1 : -1;
      const difference = decimalToMilli(a) - decimalToMilli(b);
      return (difference < 0n ? -1 : difference > 0n ? 1 : 0) * direction
        || left.association.name.localeCompare(right.association.name);
    });
  } else {
    associations.sort((left, right) => (left.rank ?? Number.MAX_SAFE_INTEGER) - (right.rank ?? Number.MAX_SAFE_INTEGER)
      || left.association.name.localeCompare(right.association.name));
  }

  const seasons = periods.current.map(({ seasonId: id }) => snapshot.seasons.find((season) => season.id === id)!);
  return {
    season: seasons[4],
    seasons,
    provisional: seasonId === snapshot.activeSeasonId,
    explanation: 'Association coefficients are sums of the association-season inputs. Synthetic fixture values are illustrative; missing seasons and ranks remain unavailable.',
    associations,
    dataStatus: options.dataStatus,
  };
}
