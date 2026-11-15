import type { ActiveSeasonSnapshot, SeasonRankingResponse } from '@uefa-ranking/contracts';
import { decimalToMilli } from './decimal.js';

export function seasonRanking(
  snapshot: ActiveSeasonSnapshot,
  seasonId: string,
  associationId: string,
): SeasonRankingResponse['clubs'] {
  const records = new Map(snapshot.clubSeasonRecords
    .filter((record) => record.seasonId === seasonId)
    .map((record) => [record.clubId, record]));
  const leagues = new Map(snapshot.leagues.map((league) => [league.id, league]));

  return snapshot.clubs.flatMap((club) => {
    const record = records.get(club.id);
    if (club.associationId !== associationId || record?.participation !== 'participated') {
      return [];
    }
    const league = club.leagueId === null ? null : leagues.get(club.leagueId);
    return [{
      clubId: club.id,
      name: club.name,
      league: league ? { id: league.id, name: league.name } : null,
      total: record.points,
      totalStatus: record.status === 'complete' ? 'complete' as const : 'partial' as const,
    }];
  }).sort((a, b) => {
    if (a.total === null) return b.total === null ? a.name.localeCompare(b.name) || a.clubId.localeCompare(b.clubId) : 1;
    if (b.total === null) return -1;
    const left = decimalToMilli(a.total);
    const right = decimalToMilli(b.total);
    return (left > right ? -1 : left < right ? 1 : 0)
      || a.name.localeCompare(b.name) || a.clubId.localeCompare(b.clubId);
  });
}
