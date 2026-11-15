import type { RankingSnapshot } from '@uefa-ranking/contracts';
import { scoreClubSeason } from './scoring.js';

export function clubSeasonDetails(snapshot: RankingSnapshot, clubId: string, seasonId: string) {
  const season = snapshot.seasons.find((entry) => entry.id === seasonId);
  if (!season) throw new RangeError(`Unknown season: ${seasonId}`);
  return { season, ...scoreClubSeason(snapshot, clubId, seasonId) };
}
