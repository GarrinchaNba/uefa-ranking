export type RankState = {
  rank: number | null;
  rankStatus: 'resolved' | 'unresolved' | 'incomplete';
};

export type RankMovement = {
  previousRank: number | null;
  previousRankStatus: RankState['rankStatus'];
  movement: number | null;
};

export function rankMovement(
  currentRanks: ReadonlyMap<string, RankState>,
  previousRanks: ReadonlyMap<string, RankState>,
): Map<string, RankMovement> {
  return new Map([...currentRanks].map(([entityId, current]) => {
    const previous = previousRanks.get(entityId) ?? { rank: null, rankStatus: 'incomplete' as const };
    const resolved = current.rankStatus === 'resolved' && previous.rankStatus === 'resolved';
    return [entityId, {
      previousRank: previous.rank,
      previousRankStatus: previous.rankStatus,
      movement: resolved ? previous.rank! - current.rank! : null,
    }];
  }));
}
