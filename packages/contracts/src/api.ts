import { z } from 'zod';
import { AssociationSchema, IdSchema, SeasonIdSchema, SeasonSchema } from './domain.js';

export const DecimalStringSchema = z.string().regex(/^(0|[1-9]\d*)(\.\d{1,3})?$/);

function decimalToMilli(value: string): bigint {
  const [whole, fraction = ''] = value.split('.');
  return BigInt(whole) * 1000n + BigInt((fraction + '000').slice(0, 3));
}

export const DataStatusSchema = z.object({
  mode: z.enum(['mock', 'live']),
  quality: z.enum(['current', 'stale', 'partial', 'unavailable']),
  source: z.string().min(1),
  lastSuccessfulUpdate: z.iso.datetime().nullable(),
});

export const ApiErrorResponseSchema = z.object({
  error: z.object({
    code: z.string().min(1),
    message: z.string().min(1),
  }),
});

export const SeasonsResponseSchema = z.object({
  activeSeasonId: SeasonIdSchema,
  seasons: z.array(SeasonSchema),
  dataStatus: DataStatusSchema,
}).superRefine((response, context) => {
  if (!response.seasons.some(({ id }) => id === response.activeSeasonId)) {
    context.addIssue({ code: 'custom', message: 'The active season must be included in the response' });
  }
  if (new Set(response.seasons.map(({ id }) => id)).size !== response.seasons.length) {
    context.addIssue({ code: 'custom', message: 'Selectable seasons must be unique' });
  }
});

const RankStatusSchema = z.enum(['resolved', 'unresolved', 'incomplete']);
const RankFields = {
  rank: z.number().int().safe().positive().nullable(),
  rankStatus: RankStatusSchema,
  previousRank: z.number().int().safe().positive().nullable(),
  previousRankStatus: RankStatusSchema,
  movement: z.number().int().safe().nullable(),
};

function validateRanks(
  row: {
    rank: number | null; rankStatus: string; previousRank: number | null;
    previousRankStatus: string; movement: number | null;
  },
  context: z.RefinementCtx,
) {
  const resolved = row.rankStatus === 'resolved' && row.previousRankStatus === 'resolved';
  if ((row.rankStatus === 'resolved') !== (row.rank !== null)
    || (row.previousRankStatus === 'resolved') !== (row.previousRank !== null)
    || (resolved && row.movement !== row.previousRank! - row.rank!)
    || (!resolved && row.movement !== null)) {
    context.addIssue({ code: 'custom', message: 'Rank states and movement must agree' });
  }
}

const ContributionStatus = z.enum(['complete', 'partial', 'missing']);
export const ClubContributionSchema = z.object({
  seasonId: SeasonIdSchema,
  points: DecimalStringSchema.nullable(),
  participation: z.enum(['participated', 'did-not-participate', 'unknown']),
  status: ContributionStatus,
}).superRefine((entry, context) => {
  if ((entry.status === 'complete' && entry.points === null)
    || (entry.status === 'missing' && entry.points !== null)
    || (entry.participation === 'unknown' && entry.points !== null)
    || (entry.participation === 'did-not-participate'
      && (entry.points !== '0' || entry.status !== 'complete'))) {
    context.addIssue({ code: 'custom', message: 'Contribution status disagrees with participation or points' });
  }
});
export const AssociationContributionSchema = z.object({
  seasonId: SeasonIdSchema,
  coefficient: DecimalStringSchema.nullable(),
  status: ContributionStatus,
}).superRefine((entry, context) => {
  if ((entry.status === 'complete' && entry.coefficient === null)
    || (entry.status === 'missing' && entry.coefficient !== null)) {
    context.addIssue({ code: 'custom', message: 'Contribution status disagrees with coefficient' });
  }
});

export const ClubAssumptionSchema = z.object({
  code: z.enum([
    'missing-club-contribution',
    'partial-club-total',
    'missing-or-partial-association-coefficient',
    'unverified-association-floor',
    'unverified-ranking-tie-break',
  ]),
  message: z.string().min(1),
});

export const ClubRankingRowSchema = z.object({
  clubId: IdSchema, name: z.string().min(1), association: AssociationSchema.nullable(),
  ...RankFields,
  contributions: z.array(ClubContributionSchema).length(5),
  clubPointsSum: DecimalStringSchema.nullable(),
  associationCoefficient: DecimalStringSchema.nullable(),
  associationMinimum: DecimalStringSchema.nullable(),
  coefficient: DecimalStringSchema.nullable(),
  minimumApplied: z.boolean().nullable(),
  status: z.enum(['complete', 'partial', 'incomplete']),
  reason: z.string().min(1).nullable(),
  reasons: z.array(z.string().min(1)),
  assumptions: z.array(ClubAssumptionSchema),
}).superRefine((row, context) => {
  validateRanks(row, context);
  if (new Set(row.assumptions.map(({ code }) => code)).size !== row.assumptions.length
    || row.reason !== ([...row.reasons, ...row.assumptions.map(({ message }) => message)].join(' ') || null)) {
    context.addIssue({ code: 'custom', message: 'Club reasons and assumptions must be unique and match the summary' });
  }
  if ((row.status === 'complete' && (row.contributions.some((entry) => entry.status !== 'complete')
    || row.clubPointsSum === null || row.associationCoefficient === null || row.associationMinimum === null
    || row.coefficient === null || row.minimumApplied === null))
    || (row.status === 'incomplete' && (row.coefficient !== null || row.rankStatus === 'resolved'))
    || (row.coefficient === null && row.rankStatus === 'resolved')) {
    context.addIssue({ code: 'custom', message: 'Club ranking completeness disagrees with inputs or rank' });
  }
});

export const AssociationRankingRowSchema = z.object({
  association: AssociationSchema,
  ...RankFields,
  contributions: z.array(AssociationContributionSchema).length(5),
  coefficient: DecimalStringSchema.nullable(),
  status: z.enum(['complete', 'partial', 'incomplete']),
  reason: z.string().min(1).nullable(),
}).superRefine((row, context) => {
  validateRanks(row, context);
  if ((row.status === 'complete'
    && (row.contributions.some((entry) => entry.status !== 'complete') || row.coefficient === null))
    || (row.status !== 'complete' && (row.coefficient !== null || row.rankStatus === 'resolved'))) {
    context.addIssue({ code: 'custom', message: 'Association ranking completeness disagrees with inputs or rank' });
  }
  if (row.status === 'complete' && row.coefficient !== null) {
    const contributionTotal = row.contributions.reduce((sum, entry) =>
      sum + decimalToMilli(entry.coefficient!), 0n);
    if (contributionTotal !== decimalToMilli(row.coefficient)) {
      context.addIssue({ code: 'custom', message: 'Five-season coefficient must equal its annual contributions' });
    }
  }
  if (row.status !== 'complete' && row.reason === null) {
    context.addIssue({ code: 'custom', message: 'Incomplete association rows must explain their limitations' });
  }
});

const RankingResponseFields = {
  season: SeasonSchema,
  seasons: z.array(SeasonSchema).length(5),
  provisional: z.boolean(),
  explanation: z.string().min(1),
  dataStatus: DataStatusSchema,
};

function validatePeriod(
  response: { season: { id: string }; seasons: { id: string }[] },
  context: z.RefinementCtx,
) {
  const years = response.seasons.map(({ id }) => Number(id.slice(0, 4)));
  if (response.seasons.length !== 5 || response.seasons[4]?.id !== response.season.id
    || years.some((year, index) => index > 0 && year !== years[index - 1] + 1)) {
    context.addIssue({ code: 'custom', message: 'Ranking period must contain five consecutive seasons ending in the selected season' });
  }
}

export const ClubRankingResponseSchema = z.object({
  ...RankingResponseFields, clubs: z.array(ClubRankingRowSchema),
}).superRefine((response, context) => {
  validatePeriod(response, context);
  for (const row of response.clubs) {
    if (row.contributions.some((entry, index) => entry.seasonId !== response.seasons[index]?.id)) {
      context.addIssue({ code: 'custom', message: 'Club contributions must match the ranking period' });
    }
    if (row.status === 'partial' && row.reason === null) {
      context.addIssue({ code: 'custom', message: 'Partial club rows must explain their assumptions or limitations' });
    }
  }
});

const ClubDetailEntrySchema = z.object({
  id: IdSchema,
  competition: z.object({ id: IdSchema, name: z.string().min(1) }),
  round: z.object({ id: IdSchema, label: z.string().min(1), order: z.number().int().nonnegative() }).nullable(),
  game: z.object({
    id: IdSchema,
    status: z.string().min(1),
    homeClub: z.object({ id: IdSchema, name: z.string().min(1) }),
    awayClub: z.object({ id: IdSchema, name: z.string().min(1) }),
    homeScore: z.number().int().nonnegative().nullable(),
    awayScore: z.number().int().nonnegative().nullable(),
  }).nullable(),
  kind: z.enum(['match', 'bonus', 'adjustment']),
  status: z.enum(['awarded', 'pending', 'unknown', 'inapplicable']),
  points: DecimalStringSchema.nullable(),
  ruleId: IdSchema,
  sourceId: IdSchema,
  label: z.string().min(1),
}).superRefine((entry, context) => {
  if ((entry.status === 'awarded') !== (entry.points !== null)) {
    context.addIssue({ code: 'custom', message: 'Detail entry status disagrees with points' });
  }
  if ((entry.kind === 'match') !== (entry.game !== null)) {
    context.addIssue({ code: 'custom', message: 'Match details must reference a game' });
  }
  if (entry.status === 'inapplicable' && entry.kind !== 'match') {
    context.addIssue({ code: 'custom', message: 'Only match entries can be inapplicable' });
  }
});

export const ClubSeasonDetailsResponseSchema = z.object({
  season: SeasonSchema,
  club: z.object({ id: IdSchema, name: z.string().min(1) }),
  participation: z.enum(['participated', 'did-not-participate', 'unknown']),
  competitions: z.array(z.object({ id: IdSchema, name: z.string().min(1) })),
  entries: z.array(ClubDetailEntrySchema),
  total: DecimalStringSchema.nullable(),
  status: z.enum(['complete', 'partial', 'missing']),
  explanation: z.string().min(1),
  dataStatus: DataStatusSchema,
}).superRefine((detail, context) => {
  if ((detail.participation === 'did-not-participate'
    && (detail.total !== '0' || detail.status !== 'complete' || detail.entries.length > 0 || detail.competitions.length > 0))
    || (detail.participation === 'unknown' && detail.total !== null)
    || (detail.status === 'complete' && detail.total === null)
    || (detail.status === 'missing' && detail.total !== null)) {
    context.addIssue({ code: 'custom', message: 'Club season detail status disagrees with participation or total' });
  }
  if (new Set(detail.competitions.map(({ id }) => id)).size !== detail.competitions.length
    || new Set(detail.entries.map(({ id }) => id)).size !== detail.entries.length) {
    context.addIssue({ code: 'custom', message: 'Club season details must have unique competition and entry IDs' });
  }
  const competitionIds = new Set(detail.competitions.map(({ id }) => id));
  if (detail.entries.some((entry) => !competitionIds.has(entry.competition.id))) {
    context.addIssue({ code: 'custom', message: 'Every detail entry must belong to a listed competition' });
  }
  const awardedTotal = detail.entries.filter((entry) => entry.status === 'awarded')
    .reduce((sum, entry) => sum + decimalToMilli(entry.points!), 0n);
  if (detail.status === 'complete' && detail.total !== null && awardedTotal !== decimalToMilli(detail.total)) {
    context.addIssue({ code: 'custom', message: 'Complete detail total must reconcile to awarded entries' });
  }
});

export const AssociationRankingResponseSchema = z.object({
  ...RankingResponseFields, associations: z.array(AssociationRankingRowSchema),
}).superRefine((response, context) => {
  validatePeriod(response, context);
  for (const row of response.associations) {
    if (row.contributions.some((entry, index) => entry.seasonId !== response.seasons[index]?.id)) {
      context.addIssue({ code: 'custom', message: 'Association contributions must match the ranking period' });
    }
  }
});

const AssociationDetailEntrySchema = z.object({
  id: IdSchema,
  competition: z.object({ id: IdSchema, name: z.string().min(1) }),
  round: z.object({ id: IdSchema, label: z.string().min(1), order: z.number().int().nonnegative() }).nullable(),
  game: z.object({
    id: IdSchema,
    status: z.string().min(1),
    homeClub: z.object({ id: IdSchema, name: z.string().min(1) }),
    awayClub: z.object({ id: IdSchema, name: z.string().min(1) }),
    homeScore: z.number().int().nonnegative().nullable(),
    awayScore: z.number().int().nonnegative().nullable(),
  }).nullable(),
  kind: z.enum(['match', 'bonus', 'adjustment']),
  status: z.enum(['awarded', 'pending', 'unknown']),
  points: DecimalStringSchema.nullable(),
  ruleId: IdSchema,
  sourceId: IdSchema,
  label: z.string().min(1),
}).superRefine((entry, context) => {
  if ((entry.status === 'awarded') !== (entry.points !== null)) {
    context.addIssue({ code: 'custom', message: 'Detail entry status disagrees with points' });
  }
  if ((entry.kind === 'match') !== (entry.game !== null)) {
    context.addIssue({ code: 'custom', message: 'Match details must reference a game' });
  }
});

const AssociationDetailClubSchema = z.object({
  clubId: IdSchema,
  name: z.string().min(1),
  points: DecimalStringSchema.nullable(),
  status: z.enum(['complete', 'partial', 'missing']),
  entries: z.array(AssociationDetailEntrySchema),
}).superRefine((club, context) => {
  if ((club.status === 'complete' && club.points === null)
    || (club.status === 'missing' && club.points !== null)) {
    context.addIssue({ code: 'custom', message: 'Competition club detail status disagrees with points' });
  }
  const awardedTotal = club.entries.filter((entry) => entry.status === 'awarded')
    .reduce((sum, entry) => sum + decimalToMilli(entry.points!), 0n);
  if ((club.points === null && awardedTotal !== 0n)
    || (club.points !== null && awardedTotal !== decimalToMilli(club.points))) {
    context.addIssue({ code: 'custom', message: 'Competition club points must reconcile to their attributed awards' });
  }
});

export const AssociationSeasonDetailsResponseSchema = z.object({
  season: SeasonSchema,
  association: AssociationSchema,
  groups: z.array(z.object({
    competition: z.object({ id: IdSchema, name: z.string().min(1) }),
    total: DecimalStringSchema.nullable(),
    status: z.enum(['complete', 'partial', 'missing']),
    clubs: z.array(AssociationDetailClubSchema),
  })).superRefine((groups, context) => {
    if (new Set(groups.map((group) => group.competition.id)).size !== groups.length) {
      context.addIssue({ code: 'custom', message: 'Association competition groups must be unique' });
    }
    for (const group of groups) {
      if ((group.status === 'complete' && group.total === null)
        || (group.status === 'missing' && group.total !== null)) {
        context.addIssue({ code: 'custom', message: 'Competition subtotal status disagrees with its total' });
      }
      if (group.status === 'complete' && group.clubs.some((club) => club.status !== 'complete')) {
        context.addIssue({ code: 'custom', message: 'A complete subtotal requires complete club details' });
      }
      if (new Set(group.clubs.map((club) => club.clubId)).size !== group.clubs.length) {
        context.addIssue({ code: 'custom', message: 'A club must appear once in each competition group' });
      }
      const knownClubTotal = group.clubs.reduce((sum, club) =>
        sum + (club.points === null ? 0n : decimalToMilli(club.points)), 0n);
      if ((group.total === null && knownClubTotal !== 0n)
        || (group.total !== null && knownClubTotal !== decimalToMilli(group.total))) {
        context.addIssue({ code: 'custom', message: 'Competition subtotal must reconcile to its club subtotals' });
      }
    }
  }),
  explanation: z.string().min(1),
  dataStatus: DataStatusSchema,
});

export type ClubRankingResponse = z.infer<typeof ClubRankingResponseSchema>;
export type ClubSeasonDetailsResponse = z.infer<typeof ClubSeasonDetailsResponseSchema>;
export type AssociationRankingResponse = z.infer<typeof AssociationRankingResponseSchema>;
export type AssociationSeasonDetailsResponse = z.infer<typeof AssociationSeasonDetailsResponseSchema>;
export type DecimalString = z.infer<typeof DecimalStringSchema>;
export type DataStatus = z.infer<typeof DataStatusSchema>;
export type ApiErrorResponse = z.infer<typeof ApiErrorResponseSchema>;
export type SeasonsResponse = z.infer<typeof SeasonsResponseSchema>;
