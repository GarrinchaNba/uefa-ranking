import type { RankingSnapshot } from '@uefa-ranking/contracts';
import { decimalToMilli, milliToDecimal } from './decimal.js';
import { getVerifiedClubScoringRule } from './rules/club-scoring.js';

type DetailStatus = 'complete' | 'partial' | 'missing';
type EntryStatus = 'awarded' | 'pending' | 'unknown' | 'inapplicable';
type CompetitionId = RankingSnapshot['competitions'][number]['id'];

export type ScoredClubEntry = {
  id: string;
  competition: { id: CompetitionId; name: string };
  round: { id: string; label: string; order: number } | null;
  game: {
    id: string;
    status: string;
    homeClub: { id: string; name: string };
    awayClub: { id: string; name: string };
    homeScore: number | null;
    awayScore: number | null;
  } | null;
  kind: 'match' | 'bonus' | 'adjustment';
  status: EntryStatus;
  points: string | null;
  ruleId: string;
  sourceId: string;
  label: string;
};

export type ScoredClubSeason = {
  club: { id: string; name: string };
  participation: 'participated' | 'did-not-participate' | 'unknown';
  competitions: { id: string; name: string }[];
  entries: ScoredClubEntry[];
  total: string | null;
  status: DetailStatus;
  explanation: string;
};

function matchAward(snapshot: RankingSnapshot, clubId: string, gameId: string) {
  return snapshot.clubAwards.find((award) => award.clubId === clubId && award.gameId === gameId);
}

export function scoreClubSeason(
  snapshot: RankingSnapshot,
  clubId: string,
  seasonId: string,
): ScoredClubSeason {
  const club = snapshot.clubs.find((entry) => entry.id === clubId);
  if (!club) throw new RangeError(`Unknown club: ${clubId}`);
  const record = snapshot.clubSeasons.find((entry) => entry.clubId === clubId && entry.seasonId === seasonId);
  if (!record) {
    return {
      club: { id: club.id, name: club.name }, participation: 'unknown', competitions: [],
      entries: [], total: null, status: 'missing', explanation: 'Season participation and details are unavailable.',
    };
  }
  if (record.participation === 'did-not-participate') {
    return {
      club: { id: club.id, name: club.name }, participation: record.participation, competitions: [],
      entries: [], total: '0', status: 'complete',
      explanation: 'The club did not participate in this season; its season points are zero.',
    };
  }
  if (record.participation === 'unknown') {
    return {
      club: { id: club.id, name: club.name }, participation: record.participation, competitions: [],
      entries: [], total: null, status: 'missing', explanation: 'Season participation and details are unavailable.',
    };
  }
  const scoringRule = getVerifiedClubScoringRule(snapshot, seasonId);
  if (!scoringRule) {
    return {
      club: { id: club.id, name: club.name }, participation: record.participation, competitions: [],
      entries: [], total: null, status: 'missing',
      explanation: 'Club scoring rules for this season are unsupported, so details cannot be calculated.',
    };
  }
  if (record.detailStatus === 'unavailable') {
    return {
      club: { id: club.id, name: club.name }, participation: record.participation, competitions: [],
      entries: [], total: null, status: 'missing', explanation: 'Competition and point details are unavailable for this season.',
    };
  }

  const clubs = new Map(snapshot.clubs.map((entry) => [entry.id, entry]));
  const competitions = new Map(snapshot.competitions.map((entry) => [entry.id, entry]));
  const stages = new Map(snapshot.stages.map((entry) => [entry.id, entry]));
  const entries: ScoredClubEntry[] = [];

  for (const game of snapshot.games.filter((entry) => entry.seasonId === seasonId
    && (entry.homeClubId === clubId || entry.awayClubId === clubId))) {
    const stage = stages.get(game.stageId);
    const competition = competitions.get(game.competitionId);
    const award = matchAward(snapshot, clubId, game.id);
    if (!stage || !competition) {
      entries.push({
        id: award?.id ?? `detail-${game.id}-${clubId}`, competition: competition ?? { id: game.competitionId, name: game.competitionId },
        round: stage ? { id: stage.id, label: stage.label, order: stage.order } : null,
        game: null, kind: 'match', status: 'unknown', points: null,
        ruleId: award?.ruleId ?? scoringRule.id, sourceId: award?.sourceId ?? game.id,
        label: 'Competition or round information unavailable',
      });
      continue;
    }
    const home = clubs.get(game.homeClubId)!;
    const away = clubs.get(game.awayClubId)!;
    const detailGame = {
      id: game.id, status: game.status, homeClub: { id: home.id, name: home.name },
      awayClub: { id: away.id, name: away.name }, homeScore: game.homeScore, awayScore: game.awayScore,
    };
    const common = {
      id: award?.id ?? `detail-${game.id}-${clubId}`,
      competition: { id: competition.id, name: competition.name },
      round: { id: stage.id, label: stage.label, order: stage.order },
      game: detailGame, kind: 'match' as const,
      ruleId: award?.ruleId ?? scoringRule.id,
      sourceId: award?.sourceId ?? game.id,
    };
    if (scoringRule.excludedStageGroups.includes(stage.group)) {
      entries.push({ ...common, status: 'inapplicable', points: null, label: 'No club match points apply in this stage' });
    } else if (game.status !== 'ratified' || game.homeScore === null || game.awayScore === null) {
      const pending = ['scheduled', 'postponed', 'in-progress'].includes(game.status);
      entries.push({
        ...common, status: pending ? 'pending' : 'unknown', points: null,
        label: pending ? 'Pending match result' : 'Unratified or unknown match result',
      });
    } else {
      const clubScore = game.homeClubId === clubId ? game.homeScore : game.awayScore;
      const opponentScore = game.homeClubId === clubId ? game.awayScore : game.homeScore;
      const points = clubScore > opponentScore ? scoringRule.pointsForWin
        : clubScore === opponentScore ? scoringRule.pointsForDraw : scoringRule.pointsForLoss;
      entries.push({
        ...common, status: 'awarded', points,
        label: clubScore > opponentScore ? 'Win' : clubScore === opponentScore ? 'Draw' : 'Defeat',
      });
    }
  }

  for (const award of snapshot.clubAwards.filter((entry) => entry.clubId === clubId
    && entry.seasonId === seasonId && entry.kind !== 'match')) {
    const competition = competitions.get(award.competitionId);
    const stage = award.stageId === null ? null : stages.get(award.stageId);
    if (!competition) continue;
    entries.push({
      id: award.id,
      competition: { id: competition.id, name: competition.name },
      round: stage ? { id: stage.id, label: stage.label, order: stage.order } : null,
      game: null,
      kind: award.kind,
      status: award.status,
      points: award.points,
      ruleId: award.ruleId,
      sourceId: award.sourceId,
      label: award.label,
    });
  }

  entries.sort((left, right) => left.competition.name.localeCompare(right.competition.name)
    || (left.round?.order ?? Number.MAX_SAFE_INTEGER) - (right.round?.order ?? Number.MAX_SAFE_INTEGER)
    || (left.game?.id ?? left.id).localeCompare(right.game?.id ?? right.id)
    || left.kind.localeCompare(right.kind));
  const competitionIds = new Set([
    ...snapshot.participations
      .filter((entry) => entry.clubId === clubId && entry.seasonId === seasonId)
      .map((entry) => entry.competitionId),
    ...entries.map((entry) => entry.competition.id),
  ]);
  const competitionsForSeason = [...competitionIds]
    .flatMap((id) => {
      const competition = competitions.get(id);
      return competition ? [{ id: competition.id, name: competition.name }] : [];
    })
    .sort((left, right) => left.name.localeCompare(right.name));

  const awarded = entries.filter((entry) => entry.status === 'awarded');
  const total = milliToDecimal(awarded.reduce((sum, entry) => sum + decimalToMilli(entry.points!), 0n));
  const hasUnknown = entries.some((entry) => entry.status === 'unknown');
  const hasPending = entries.some((entry) => entry.status === 'pending');
  const reconciles = record.points !== null && decimalToMilli(record.points) === decimalToMilli(total);
  const isComplete = record.detailStatus === 'available' && record.status === 'complete'
    && !hasUnknown && !hasPending && reconciles;
  const status: DetailStatus = isComplete ? 'complete'
    : entries.length === 0 && record.status === 'missing' ? 'missing' : 'partial';
  const explanation = status === 'complete'
    ? 'All available season entries reconcile to the season total.'
    : !reconciles && record.points !== null
      ? 'The known detail total does not reconcile with the stored season total; the displayed value is only the known subtotal.'
      : hasUnknown || hasPending
        ? 'The displayed value is the known awarded subtotal; pending or unknown entries are not counted as zero.'
        : 'Season details are partial or incomplete; the displayed value is the known subtotal.';

  return { club: { id: club.id, name: club.name }, participation: record.participation,
    competitions: competitionsForSeason, entries, total, status, explanation };
}
