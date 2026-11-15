import { z } from 'zod';

export const IdSchema = z.string().regex(/^[A-Za-z0-9][A-Za-z0-9._:-]*$/);

export const SeasonIdSchema = z
  .string()
  .regex(/^\d{4}-\d{2}$/)
  .refine((value) => Number(value.slice(5)) === (Number(value.slice(0, 4)) + 1) % 100);

export const SeasonSchema = z.object({
  id: SeasonIdSchema,
  label: z.string().min(1),
});

export const AssociationSchema = z.object({
  id: IdSchema,
  name: z.string().min(1),
});

export const LeagueSchema = z.object({
  id: IdSchema,
  name: z.string().min(1),
  associationId: IdSchema,
});

export const ClubSchema = z.object({
  id: IdSchema,
  name: z.string().min(1),
  associationId: IdSchema,
  leagueId: IdSchema.nullable(),
});

export const CompetitionIdSchema = z.enum([
  'champions-league',
  'europa-league',
  'conference-league',
]);

export const CompetitionSchema = z.object({
  id: CompetitionIdSchema,
  name: z.string().min(1),
});

export const StageSchema = z.object({
  id: IdSchema,
  seasonId: SeasonIdSchema,
  competitionId: CompetitionIdSchema,
  order: z.number().int().nonnegative(),
  group: z.string().min(1),
  label: z.string().min(1),
});

export const GameStatusSchema = z.enum([
  'scheduled',
  'in-progress',
  'completed',
  'ratified',
  'postponed',
  'abandoned',
  'unknown',
]);

export const GameSchema = z.object({
  id: IdSchema,
  seasonId: SeasonIdSchema,
  competitionId: CompetitionIdSchema,
  stageId: IdSchema,
  homeClubId: IdSchema,
  awayClubId: IdSchema,
  status: GameStatusSchema,
  homeScore: z.number().int().nonnegative().nullable(),
  awayScore: z.number().int().nonnegative().nullable(),
}).superRefine((game, context) => {
  if (game.homeClubId === game.awayClubId) {
    context.addIssue({ code: 'custom', message: 'A game must have two distinct clubs' });
  }

  if (game.status === 'ratified' && (game.homeScore === null || game.awayScore === null)) {
    context.addIssue({ code: 'custom', message: 'Ratified games require a final score' });
  }

  if ((game.homeScore === null) !== (game.awayScore === null)) {
    context.addIssue({ code: 'custom', message: 'A game score must include both clubs' });
  }

  if (
    (game.homeScore !== null || game.awayScore !== null)
    && game.status !== 'completed'
    && game.status !== 'ratified'
  ) {
    context.addIssue({ code: 'custom', message: 'Only completed games can carry a final score' });
  }
});

export const PointEntrySchema = z.object({
  id: IdSchema,
  clubId: IdSchema,
  seasonId: SeasonIdSchema,
  kind: z.enum(['match', 'bonus', 'adjustment']),
  status: z.enum(['awarded', 'pending', 'unknown']),
  points: z.string().regex(/^(0|[1-9]\d*)(\.\d{1,3})?$/).nullable(),
  ruleId: IdSchema,
  sourceId: IdSchema,
  gameId: IdSchema.nullable(),
  label: z.string().min(1),
}).superRefine((entry, context) => {
  if (entry.kind === 'match' && entry.gameId === null) {
    context.addIssue({ code: 'custom', message: 'Match entries must reference a game' });
  }

  if (entry.kind !== 'match' && entry.gameId !== null) {
    context.addIssue({ code: 'custom', message: 'Only match entries may reference a game' });
  }

  if (entry.status === 'awarded' && entry.points === null) {
    context.addIssue({ code: 'custom', message: 'Awarded entries require a points value' });
  }

  if (entry.status !== 'awarded' && entry.points !== null) {
    context.addIssue({ code: 'custom', message: 'Pending or unknown entries cannot carry points' });
  }
});

export const ClubSeasonRecordSchema = z.object({
  clubId: IdSchema,
  seasonId: SeasonIdSchema,
  participation: z.enum(['participated', 'did-not-participate', 'unknown']),
  points: z.string().regex(/^(0|[1-9]\d*)(\.\d{1,3})?$/).nullable(),
  status: z.enum(['complete', 'partial', 'missing']),
  provenance: z.enum(['synthetic', 'calculated']),
}).superRefine((record, context) => {
  if (record.status === 'complete' && record.points === null) {
    context.addIssue({ code: 'custom', message: 'Complete season records require points' });
  }

  if (record.status === 'missing' && record.points !== null) {
    context.addIssue({ code: 'custom', message: 'Missing season records cannot claim points' });
  }

  if (record.participation === 'did-not-participate' && record.points !== '0') {
    context.addIssue({ code: 'custom', message: 'Confirmed non-participation must be recorded as zero' });
  }

  if (record.participation === 'unknown' && record.points !== null) {
    context.addIssue({ code: 'custom', message: 'Unknown participation cannot claim points' });
  }
});

export const AssociationCoefficientSchema = z.object({
  associationId: IdSchema,
  seasonId: SeasonIdSchema,
  points: z.string().regex(/^(0|[1-9]\d*)(\.\d{1,3})?$/).nullable(),
  status: z.enum(['complete', 'missing']),
  provenance: z.enum(['synthetic', 'calculated']),
}).superRefine((record, context) => {
  if ((record.status === 'complete') !== (record.points !== null)) {
    context.addIssue({ code: 'custom', message: 'Association coefficient status must agree with its points value' });
  }
});

export const ActiveSeasonSnapshotSchema = z.object({
  activeSeasonId: SeasonIdSchema,
  seasons: z.array(SeasonSchema).min(1),
  selectableSeasonIds: z.array(SeasonIdSchema).min(1),
  associations: z.array(AssociationSchema),
  leagues: z.array(LeagueSchema),
  clubs: z.array(ClubSchema),
  competitions: z.array(CompetitionSchema),
  stages: z.array(StageSchema),
  games: z.array(GameSchema),
  pointEntries: z.array(PointEntrySchema),
  clubSeasonRecords: z.array(ClubSeasonRecordSchema),
  associationCoefficients: z.array(AssociationCoefficientSchema),
}).superRefine((snapshot, context) => {
  const uniqueIds = [
    ['season', snapshot.seasons.map(({ id }) => id)],
    ['association', snapshot.associations.map(({ id }) => id)],
    ['league', snapshot.leagues.map(({ id }) => id)],
    ['club', snapshot.clubs.map(({ id }) => id)],
    ['competition', snapshot.competitions.map(({ id }) => id)],
    ['stage', snapshot.stages.map(({ id }) => id)],
    ['game', snapshot.games.map(({ id }) => id)],
    ['point entry', snapshot.pointEntries.map(({ id }) => id)],
  ] as const;

  for (const [entity, ids] of uniqueIds) {
    if (new Set(ids).size !== ids.length) {
      context.addIssue({ code: 'custom', message: `Duplicate ${entity} IDs are not allowed` });
    }
  }

  const seasonIds = new Set(snapshot.seasons.map(({ id }) => id));
  if (!snapshot.selectableSeasonIds.includes(snapshot.activeSeasonId)
    || snapshot.selectableSeasonIds.some((id) => !seasonIds.has(id))
    || new Set(snapshot.selectableSeasonIds).size !== snapshot.selectableSeasonIds.length) {
    context.addIssue({ code: 'custom', message: 'Selectable seasons must be unique, stored, and include the active season' });
  }
  const seasonOrder = snapshot.seasons.map(({ id }) => Number(id.slice(0, 4)));
  if (seasonOrder.some((year, index) => index > 0 && year !== seasonOrder[index - 1] + 1)) {
    context.addIssue({ code: 'custom', message: 'Seasons must be ordered and consecutive' });
  }
  const associationIds = new Set(snapshot.associations.map(({ id }) => id));
  const leagueById = new Map(snapshot.leagues.map((league) => [league.id, league]));
  const clubById = new Map(snapshot.clubs.map((club) => [club.id, club]));
  const competitionIds = new Set(snapshot.competitions.map(({ id }) => id));
  const stageById = new Map(snapshot.stages.map((stage) => [stage.id, stage]));
  const gameById = new Map(snapshot.games.map((game) => [game.id, game]));

  const clubSeasonKeys = new Set<string>();
  for (const record of snapshot.clubSeasonRecords) {
    const key = JSON.stringify([record.clubId, record.seasonId]);
    if (clubSeasonKeys.has(key)) {
      context.addIssue({ code: 'custom', message: `Duplicate club season record for ${record.clubId} in ${record.seasonId}` });
    }
    clubSeasonKeys.add(key);

    if (!seasonIds.has(record.seasonId) || !clubById.has(record.clubId)) {
      context.addIssue({ code: 'custom', message: `Club season record for ${record.clubId} has an unknown reference` });
    }
  }

  for (const club of snapshot.clubs) {
    for (const seasonId of seasonIds) {
      if (!clubSeasonKeys.has(JSON.stringify([club.id, seasonId]))) {
        context.addIssue({
          code: 'custom',
          message: `Missing club season record for ${club.id} in ${seasonId}`,
        });
      }
    }
  }

  const associationSeasonKeys = new Set<string>();
  for (const record of snapshot.associationCoefficients) {
    const key = JSON.stringify([record.associationId, record.seasonId]);
    if (associationSeasonKeys.has(key)) {
      context.addIssue({ code: 'custom', message: `Duplicate association coefficient for ${record.associationId} in ${record.seasonId}` });
    }
    associationSeasonKeys.add(key);

    if (!seasonIds.has(record.seasonId) || !associationIds.has(record.associationId)) {
      context.addIssue({ code: 'custom', message: `Association coefficient for ${record.associationId} has an unknown reference` });
    }
  }

  for (const association of snapshot.associations) {
    for (const seasonId of seasonIds) {
      if (!associationSeasonKeys.has(JSON.stringify([association.id, seasonId]))) {
        context.addIssue({
          code: 'custom',
          message: `Missing association coefficient for ${association.id} in ${seasonId}`,
        });
      }
    }
  }

  if (!seasonIds.has(snapshot.activeSeasonId)) {
    context.addIssue({ code: 'custom', message: 'The active season must exist in the snapshot' });
  }

  for (const league of snapshot.leagues) {
    if (!associationIds.has(league.associationId)) {
      context.addIssue({ code: 'custom', message: `League ${league.id} has an unknown association` });
    }
  }

  for (const club of snapshot.clubs) {
    if (!associationIds.has(club.associationId)) {
      context.addIssue({ code: 'custom', message: `Club ${club.id} has an unknown association` });
    }
    if (club.leagueId !== null && leagueById.get(club.leagueId)?.associationId !== club.associationId) {
      context.addIssue({ code: 'custom', message: `Club ${club.id} has an inconsistent league` });
    }
  }

  for (const stage of snapshot.stages) {
    if (!seasonIds.has(stage.seasonId) || !competitionIds.has(stage.competitionId)) {
      context.addIssue({ code: 'custom', message: `Stage ${stage.id} references an unknown season or competition` });
    }
  }

  for (const game of snapshot.games) {
    const stage = stageById.get(game.stageId);
    if (
      !seasonIds.has(game.seasonId)
      || !competitionIds.has(game.competitionId)
      || !clubById.has(game.homeClubId)
      || !clubById.has(game.awayClubId)
      || stage?.seasonId !== game.seasonId
      || stage.competitionId !== game.competitionId
    ) {
      context.addIssue({ code: 'custom', message: `Game ${game.id} has inconsistent references` });
    }
  }

  const pointSources = new Set<string>();
  const clubGameEntries = new Set<string>();
  for (const entry of snapshot.pointEntries) {
    if (!seasonIds.has(entry.seasonId) || !clubById.has(entry.clubId)) {
      context.addIssue({ code: 'custom', message: `Point entry ${entry.id} has an unknown season or club` });
    }

    const sourceKey = JSON.stringify([entry.clubId, entry.sourceId, entry.ruleId]);
    if (pointSources.has(sourceKey)) {
      context.addIssue({ code: 'custom', message: `Point entry ${entry.id} duplicates a rule/source award` });
    }
    pointSources.add(sourceKey);

    if (entry.gameId !== null) {
      const game = gameById.get(entry.gameId);
      if (
        !game
        || game.seasonId !== entry.seasonId
        || (game.homeClubId !== entry.clubId && game.awayClubId !== entry.clubId)
      ) {
        context.addIssue({ code: 'custom', message: `Point entry ${entry.id} has an inconsistent game` });
      } else {
        const clubGameKey = JSON.stringify([entry.clubId, entry.gameId]);
        if (clubGameEntries.has(clubGameKey)) {
          context.addIssue({ code: 'custom', message: `Club ${entry.clubId} has duplicate entries for game ${entry.gameId}` });
        }
        clubGameEntries.add(clubGameKey);

        if (entry.status === 'awarded' && game.status !== 'ratified') {
          context.addIssue({ code: 'custom', message: `Unratified game ${game.id} cannot yield settled points` });
        }
      }
    }
  }
});

export type Id = z.infer<typeof IdSchema>;
export type SeasonId = z.infer<typeof SeasonIdSchema>;
export type Season = z.infer<typeof SeasonSchema>;
export type Association = z.infer<typeof AssociationSchema>;
export type League = z.infer<typeof LeagueSchema>;
export type Club = z.infer<typeof ClubSchema>;
export type CompetitionId = z.infer<typeof CompetitionIdSchema>;
export type Competition = z.infer<typeof CompetitionSchema>;
export type Stage = z.infer<typeof StageSchema>;
export type GameStatus = z.infer<typeof GameStatusSchema>;
export type Game = z.infer<typeof GameSchema>;
export type PointEntry = z.infer<typeof PointEntrySchema>;
export type ClubSeasonRecord = z.infer<typeof ClubSeasonRecordSchema>;
export type AssociationCoefficient = z.infer<typeof AssociationCoefficientSchema>;
export type ActiveSeasonSnapshot = z.infer<typeof ActiveSeasonSnapshotSchema>;
