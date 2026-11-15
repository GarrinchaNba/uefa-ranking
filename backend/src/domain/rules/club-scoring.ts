import type { RankingSnapshot } from '@uefa-ranking/contracts';

export type ClubScoringRule = {
  id: string;
  sourceId: string;
  pointsForWin: string;
  pointsForDraw: string;
  pointsForLoss: string;
  excludedStageGroups: readonly string[];
};

const verifiedRules: Record<string, Omit<ClubScoringRule, 'sourceId'>> = {
  '2021-22': {
    id: 'club-match-points-2021-22',
    pointsForWin: '2',
    pointsForDraw: '1',
    pointsForLoss: '0',
    excludedStageGroups: ['qualifying', 'knockout-play-off', 'knockout-phase-play-off'],
  },
  '2023-24': {
    id: 'club-match-points-2023-24',
    pointsForWin: '2',
    pointsForDraw: '1',
    pointsForLoss: '0',
    excludedStageGroups: ['qualifying', 'knockout-play-off', 'knockout-phase-play-off'],
  },
  '2026-27': {
    id: 'club-match-points-2026-27',
    pointsForWin: '2',
    pointsForDraw: '1',
    pointsForLoss: '0',
    excludedStageGroups: ['qualifying', 'knockout-play-off', 'knockout-phase-play-off'],
  },
};

export function getVerifiedClubScoringRule(
  snapshot: RankingSnapshot,
  seasonId: string,
): ClubScoringRule | null {
  const support = snapshot.ruleSupport.find((entry) => entry.seasonId === seasonId);
  const rule = verifiedRules[seasonId];
  if (!rule || support?.clubScoring !== 'verified') return null;
  return { ...rule, sourceId: support.sourceId };
}
