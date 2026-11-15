import type { AssociationSeasonDetailsResponse, RankingSnapshot } from '@uefa-ranking/contracts';
import { decimalToMilli, milliToDecimal } from './decimal.js';

type AssociationDetails = Omit<AssociationSeasonDetailsResponse, 'dataStatus'>;

export function associationSeasonDetails(
  snapshot: RankingSnapshot,
  associationId: string,
  seasonId: string,
): AssociationDetails {
  const association = snapshot.associations.find((entry) => entry.id === associationId);
  const season = snapshot.seasons.find((entry) => entry.id === seasonId);
  if (!association || !season) throw new RangeError('Association or season is not stored');

  const members = new Map(snapshot.clubSeasons
    .filter((entry) => entry.seasonId === seasonId && entry.associationId === associationId
      && entry.participation === 'participated')
    .map((entry) => [entry.clubId, entry]));
  const competitionIds = new Set(snapshot.participations
    .filter((entry) => entry.seasonId === seasonId && members.has(entry.clubId))
    .map(({ competitionId }) => competitionId));
  const groups = [...competitionIds].flatMap((competitionId) => {
    const competition = snapshot.competitions.find((entry) => entry.id === competitionId);
    if (!competition) return [];
    const clubs = [...members.keys()].filter((clubId) => snapshot.participations.some((entry) =>
      entry.clubId === clubId && entry.seasonId === seasonId && entry.competitionId === competitionId))
      .flatMap((clubId) => {
        const membership = members.get(clubId)!;
        const clubAwards = snapshot.clubAwards.filter((entry) =>
          entry.clubId === clubId && entry.seasonId === seasonId && entry.competitionId === competitionId);
        const entries = clubAwards.map((award) => {
          const stage = award.stageId === null ? null : snapshot.stages.find(({ id }) => id === award.stageId) ?? null;
          const game = award.gameId === null ? null : snapshot.games.find(({ id }) => id === award.gameId);
          const club = snapshot.clubs.find(({ id }) => id === award.clubId)!;
          const opponentId = game && (game.homeClubId === club.id ? game.awayClubId : game.homeClubId);
          const opponent = opponentId === undefined ? null : snapshot.clubs.find(({ id }) => id === opponentId)!;
          return {
            id: award.id,
            competition,
            round: stage ? { id: stage.id, label: stage.label, order: stage.order } : null,
            game: game && opponent ? {
              id: game.id, status: game.status,
              homeClub: { id: game.homeClubId, name: snapshot.clubs.find(({ id }) => id === game.homeClubId)!.name },
              awayClub: { id: game.awayClubId, name: snapshot.clubs.find(({ id }) => id === game.awayClubId)!.name },
              homeScore: game.homeScore, awayScore: game.awayScore,
            } : null,
            kind: award.kind,
            status: award.status,
            points: award.points,
            ruleId: award.ruleId,
            sourceId: award.sourceId,
            label: award.label,
          };
        });
        const knownPoints = entries.filter((entry) => entry.status === 'awarded' && entry.points !== null)
          .reduce((sum, entry) => sum + decimalToMilli(entry.points!), 0n);
        const detailStatus = membership.detailStatus;
        const status: AssociationSeasonDetailsResponse['groups'][number]['clubs'][number]['status'] = detailStatus === 'available' ? 'complete'
          : entries.some((entry) => entry.status === 'awarded') ? 'partial' : 'missing';
        return [{
          clubId,
          name: snapshot.clubs.find((entry) => entry.id === clubId)!.name,
          points: status === 'missing' ? null : milliToDecimal(knownPoints),
          status,
          entries,
        }];
      }).sort((left, right) => left.name.localeCompare(right.name) || left.clubId.localeCompare(right.clubId));
    const allComplete = clubs.every((club) => club.status === 'complete');
    const hasKnownPoints = clubs.some((club) => club.points !== null);
    const status: AssociationSeasonDetailsResponse['groups'][number]['status'] =
      allComplete ? 'complete' : hasKnownPoints ? 'partial' : 'missing';
    const total = hasKnownPoints
      ? milliToDecimal(clubs.reduce((sum, club) => sum + (club.points === null ? 0n : decimalToMilli(club.points)), 0n))
      : null;
    return [{
      competition,
      total,
      status,
      clubs,
    }];
  }).sort((left, right) => left.competition.name.localeCompare(right.competition.name)
    || left.competition.id.localeCompare(right.competition.id));

  return {
    season,
    association,
    groups,
    explanation: groups.length === 0
      ? 'No participating clubs with a known association are available for this season.'
      : 'Competition subtotals show club-point awards attributed to that competition; they are not association coefficients.',
  };
}
