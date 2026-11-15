import { z } from 'zod';
import {
  AssociationSchema, CompetitionIdSchema, CompetitionSchema, GameSchema, IdSchema, LeagueSchema,
  StageSchema,
  SeasonIdSchema, SeasonSchema,
} from './domain.js';

const PointsSchema = z.string().regex(/^(0|[1-9]\d*)(\.\d{1,3})?$/);
const StatusSchema = z.enum(['complete', 'partial', 'missing']);
const ProvenanceSchema = z.enum(['synthetic', 'calculated', 'source']);
const AwardStatusSchema = z.enum(['awarded', 'pending', 'unknown']);

export const RankingClubSchema = z.object({
  id: IdSchema,
  name: z.string().min(1),
});

export const RankingClubSeasonSchema = z.object({
  clubId: IdSchema,
  seasonId: SeasonIdSchema,
  associationId: IdSchema.nullable(),
  leagueId: IdSchema.nullable(),
  domesticPosition: z.number().int().safe().positive().nullable(),
  participation: z.enum(['participated', 'did-not-participate', 'unknown']),
  points: PointsSchema.nullable(),
  status: StatusSchema,
  detailStatus: z.enum(['available', 'partial', 'unavailable']),
  provenance: ProvenanceSchema,
  sourceId: IdSchema,
}).superRefine((record, context) => {
  if ((record.status === 'complete' && record.points === null)
    || (record.status === 'missing' && record.points !== null)) {
    context.addIssue({ code: 'custom', message: 'Club season status disagrees with points' });
  }
  if (record.participation === 'unknown' && record.points !== null) {
    context.addIssue({ code: 'custom', message: 'Unknown participation cannot claim points' });
  }
  if (record.participation === 'did-not-participate'
    && (record.points !== '0' || record.status !== 'complete')) {
    context.addIssue({ code: 'custom', message: 'Confirmed absence requires a complete zero' });
  }
  if (record.detailStatus === 'available' && record.status !== 'complete') {
    context.addIssue({ code: 'custom', message: 'Available details require a complete total' });
  }
  if (record.associationId === null && record.leagueId !== null) {
    context.addIssue({ code: 'custom', message: 'A league requires a known association' });
  }
});

export const RankingParticipationSchema = z.object({
  clubId: IdSchema,
  seasonId: SeasonIdSchema,
  competitionId: CompetitionIdSchema,
});

const AwardFields = {
  id: IdSchema,
  clubId: IdSchema,
  seasonId: SeasonIdSchema,
  competitionId: CompetitionIdSchema,
  stageId: IdSchema.nullable(),
  gameId: IdSchema.nullable(),
  status: AwardStatusSchema,
  points: PointsSchema.nullable(),
  ruleId: IdSchema,
  sourceId: IdSchema,
  label: z.string().min(1),
};

function validateAward(award: { status: string; points: string | null }, context: z.RefinementCtx) {
  if ((award.status === 'awarded') !== (award.points !== null)) {
    context.addIssue({ code: 'custom', message: 'Award status disagrees with points' });
  }
}

export const RankingClubAwardSchema = z.object({
  ...AwardFields,
  kind: z.enum(['match', 'bonus', 'adjustment']),
}).superRefine((award, context) => {
  validateAward(award, context);
  if ((award.kind === 'match') !== (award.gameId !== null)) {
    context.addIssue({ code: 'custom', message: 'Match awards must reference a game' });
  }
});

export const RankingAssociationAwardSchema = z.object({
  ...AwardFields,
  associationId: IdSchema,
}).superRefine(validateAward);

export const RankingAssociationSeasonSchema = z.object({
  associationId: IdSchema,
  seasonId: SeasonIdSchema,
  points: PointsSchema.nullable(),
  status: StatusSchema,
  provenance: ProvenanceSchema,
  sourceId: IdSchema,
  participantCount: z.number().int().safe().nonnegative().nullable(),
  divisor: z.number().int().safe().positive().nullable(),
  divisorReason: z.enum(['participants', 'unreplaced-qualified-club', 'unknown']),
  entitledCount: z.number().int().safe().positive().nullable(),
  unreplacedReason: z.enum(['refused', 'excluded', 'not-admitted']).nullable(),
  awardStatus: z.enum(['available', 'partial', 'unavailable']),
}).superRefine((record, context) => {
  if ((record.status === 'complete' && record.points === null)
    || (record.status === 'missing' && record.points !== null)) {
    context.addIssue({ code: 'custom', message: 'Association season status disagrees with points' });
  }
  if (record.provenance !== 'calculated') return;
  if ((record.divisorReason === 'unreplaced-qualified-club') !== (record.unreplacedReason !== null)) {
    context.addIssue({ code: 'custom', message: 'A non-replacement divisor requires the reason the qualified club did not enter' });
  }
  if (record.status === 'complete' && record.awardStatus !== 'available') {
    context.addIssue({ code: 'custom', message: 'A complete calculation requires complete awards' });
  }
  if (record.divisorReason === 'unknown') {
    if (record.divisor !== null || record.status === 'complete') {
      context.addIssue({ code: 'custom', message: 'Unknown divisor cannot yield a complete calculation' });
    }
  } else if (record.divisorReason === 'participants') {
    if (record.participantCount === null || record.divisor !== record.participantCount) {
      context.addIssue({ code: 'custom', message: 'Participant divisor must equal the participant count' });
    }
  } else if (!['2021-22', '2023-24', '2026-27'].includes(record.seasonId) || record.entitledCount === null
    || record.divisor !== record.entitledCount || record.participantCount === null) {
    context.addIssue({ code: 'custom', message: 'Non-replacement divisor requires verified season and entitlement evidence' });
  }
});

function milli(value: string): bigint {
  const [whole, fraction = ''] = value.split('.');
  return BigInt(whole) * 1000n + BigInt((fraction + '000').slice(0, 3));
}

function validPoints(value: string | null): value is string {
  return value !== null && PointsSchema.safeParse(value).success;
}

export const RankingSnapshotSchema = z.object({
  activeSeasonId: SeasonIdSchema,
  seasons: z.array(SeasonSchema).min(1),
  selectableSeasonIds: z.array(SeasonIdSchema).min(1),
  ruleSupport: z.array(z.object({
    seasonId: SeasonIdSchema,
    clubScoring: z.enum(['verified', 'unsupported']),
    associationScoring: z.enum(['verified', 'unsupported']),
    ranking: z.enum(['verified', 'unsupported']),
    sourceId: IdSchema,
  })),
  associations: z.array(AssociationSchema),
  leagues: z.array(LeagueSchema),
  clubs: z.array(RankingClubSchema),
  competitions: z.array(CompetitionSchema),
  stages: z.array(StageSchema),
  games: z.array(GameSchema),
  clubSeasons: z.array(RankingClubSeasonSchema),
  participations: z.array(RankingParticipationSchema),
  clubAwards: z.array(RankingClubAwardSchema),
  associationAwards: z.array(RankingAssociationAwardSchema),
  associationSeasons: z.array(RankingAssociationSeasonSchema),
}).superRefine((snapshot, context) => {
  const issue = (message: string) => context.addIssue({ code: 'custom', message });
  const key = (...parts: string[]) => JSON.stringify(parts);
  const checkUnique = (name: string, keys: string[]) => {
    if (new Set(keys).size !== keys.length) issue(`Duplicate ${name}`);
  };
  for (const [name, ids] of [
    ['season', snapshot.seasons.map(({ id }) => id)],
    ['selectable season', snapshot.selectableSeasonIds],
    ['season rule support', snapshot.ruleSupport.map(({ seasonId }) => seasonId)],
    ['association', snapshot.associations.map(({ id }) => id)],
    ['league', snapshot.leagues.map(({ id }) => id)],
    ['club', snapshot.clubs.map(({ id }) => id)],
    ['competition', snapshot.competitions.map(({ id }) => id)],
    ['stage', snapshot.stages.map(({ id }) => id)],
    ['game', snapshot.games.map(({ id }) => id)],
    ['club season', snapshot.clubSeasons.map((r) => key(r.clubId, r.seasonId))],
    ['participation', snapshot.participations.map((r) => key(r.clubId, r.seasonId, r.competitionId))],
    ['club award ID', snapshot.clubAwards.map(({ id }) => id)],
    ['association award ID', snapshot.associationAwards.map(({ id }) => id)],
    ['club award source', snapshot.clubAwards.map((r) => key(r.clubId, r.seasonId, r.ruleId, r.sourceId))],
    ['association award source', snapshot.associationAwards.map((r) => key(r.clubId, r.seasonId, r.ruleId, r.sourceId))],
    ['club game award', snapshot.clubAwards.filter((r) => r.gameId !== null).map((r) => key(r.clubId, r.gameId!))],
    ['association game award', snapshot.associationAwards.filter((r) => r.gameId !== null).map((r) => key(r.clubId, r.gameId!))],
    ['association season', snapshot.associationSeasons.map((r) => key(r.associationId, r.seasonId))],
  ] as const) checkUnique(name, ids);

  const seasons = new Set(snapshot.seasons.map(({ id }) => id));
  const associations = new Set(snapshot.associations.map(({ id }) => id));
  const clubs = new Set(snapshot.clubs.map(({ id }) => id));
  const competitions = new Set(snapshot.competitions.map(({ id }) => id));
  const leagues = new Map(snapshot.leagues.map((r) => [r.id, r]));
  const stages = new Map(snapshot.stages.map((r) => [r.id, r]));
  const games = new Map(snapshot.games.map((r) => [r.id, r]));
  const clubSeasons = new Map(snapshot.clubSeasons.map((r) => [key(r.clubId, r.seasonId), r]));
  const participations = new Set(snapshot.participations.map((r) => key(r.clubId, r.seasonId, r.competitionId)));
  if (!snapshot.selectableSeasonIds.includes(snapshot.activeSeasonId)
    || snapshot.selectableSeasonIds.some((id) => !seasons.has(id))) {
    issue('Selectable seasons must be stored and include the active season');
  }
  if (snapshot.ruleSupport.some((rule) => !seasons.has(rule.seasonId))
    || snapshot.seasons.some(({ id }) => !snapshot.ruleSupport.some((rule) => rule.seasonId === id))) {
    issue('Every stored season must have explicit rule support');
  }
  for (const league of snapshot.leagues) {
    if (!associations.has(league.associationId)) issue(`Unknown association for league ${league.id}`);
  }
  for (const stage of snapshot.stages) {
    if (!seasons.has(stage.seasonId) || !competitions.has(stage.competitionId)) {
      issue(`Invalid stage ${stage.id}`);
    }
  }
  for (const game of snapshot.games) {
    const stage = stages.get(game.stageId);
    if (!clubs.has(game.homeClubId) || !clubs.has(game.awayClubId)
      || stage?.seasonId !== game.seasonId || stage?.competitionId !== game.competitionId) {
      issue(`Invalid game ${game.id}`);
    }
  }
  for (const record of snapshot.clubSeasons) {
    if (!clubs.has(record.clubId) || !seasons.has(record.seasonId)
      || (record.associationId !== null && !associations.has(record.associationId))
      || (record.leagueId !== null && leagues.get(record.leagueId)?.associationId !== record.associationId)) {
      issue(`Invalid membership for ${record.clubId} in ${record.seasonId}`);
    }
  }
  for (const participation of snapshot.participations) {
    const record = clubSeasons.get(key(participation.clubId, participation.seasonId));
    if (record?.participation !== 'participated' || !competitions.has(participation.competitionId)) {
      issue(`Invalid participation for ${participation.clubId}`);
    }
  }
  for (const award of [...snapshot.clubAwards, ...snapshot.associationAwards]) {
    const record = clubSeasons.get(key(award.clubId, award.seasonId));
    const stage = award.stageId === null ? null : stages.get(award.stageId);
    const game = award.gameId === null ? null : games.get(award.gameId);
    if (!record || !participations.has(key(award.clubId, award.seasonId, award.competitionId))
      || ('associationId' in award && award.associationId !== record.associationId)
      || (award.stageId !== null && (!stage || stage.seasonId !== award.seasonId
        || stage.competitionId !== award.competitionId))
      || (award.gameId !== null && (!game || game.seasonId !== award.seasonId
        || game.competitionId !== award.competitionId || game.stageId !== award.stageId
        || (game.homeClubId !== award.clubId && game.awayClubId !== award.clubId)
        || (award.status === 'awarded' && game.status !== 'ratified')))) {
      issue(`Invalid attribution for award ${award.id}`);
    }
  }
  for (const record of snapshot.clubSeasons) {
    const awards = snapshot.clubAwards.filter((a) => a.clubId === record.clubId && a.seasonId === record.seasonId);
    if (record.detailStatus === 'available'
      && ((record.participation === 'participated'
        && !snapshot.participations.some((p) => p.clubId === record.clubId && p.seasonId === record.seasonId))
        || awards.some((a) => !validPoints(a.points)) || !validPoints(record.points)
        || awards.reduce((total, a) => total + milli(a.points!), 0n) !== milli(record.points))) {
      issue(`Club details do not reconcile for ${record.clubId}`);
    }
  }
  for (const record of snapshot.associationSeasons) {
    if (!associations.has(record.associationId) || !seasons.has(record.seasonId)) {
      issue(`Invalid association season for ${record.associationId}`);
    }
    if (record.provenance !== 'calculated') continue;
    const knownClubs = snapshot.clubSeasons.filter((r) => r.seasonId === record.seasonId
      && r.associationId === record.associationId && r.participation === 'participated');
    const membershipComplete = snapshot.clubs.every((club) => {
      const membership = clubSeasons.get(key(club.id, record.seasonId));
      return membership && membership.associationId !== null && membership.participation !== 'unknown';
    });
    if (record.participantCount !== null && (knownClubs.length > record.participantCount
      || (membershipComplete && knownClubs.length !== record.participantCount))) {
      issue(`Participant count disagrees with membership for ${record.associationId}`);
    }
    const awards = snapshot.associationAwards.filter((a) => a.associationId === record.associationId
      && a.seasonId === record.seasonId);
    if (record.status === 'complete' && (!membershipComplete || record.divisor === null
      || !Number.isSafeInteger(record.divisor) || record.divisor <= 0
      || awards.some((a) => !validPoints(a.points)) || !validPoints(record.points)
      || awards.reduce((total, a) => total + milli(a.points!), 0n) / BigInt(record.divisor)
        !== milli(record.points))) {
      issue(`Association awards do not reconcile for ${record.associationId}`);
    }
  }
});

export type RankingSnapshot = z.infer<typeof RankingSnapshotSchema>;
export type RankingClubSeason = z.infer<typeof RankingClubSeasonSchema>;
export type RankingAssociationSeason = z.infer<typeof RankingAssociationSeasonSchema>;
