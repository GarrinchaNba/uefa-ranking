import { IdSchema, SeasonIdSchema, type ActiveSeasonSnapshot } from '@uefa-ranking/contracts';
import { ApiError } from './errors.js';

export function requiredSeason(value: unknown, snapshot: ActiveSeasonSnapshot) {
  const parsed = SeasonIdSchema.safeParse(value);
  if (!parsed.success) {
    throw new ApiError(400, 'INVALID_SEASON', 'A valid seasonId is required');
  }
  const season = snapshot.seasons.find(({ id }) => id === parsed.data);
  if (!season) {
    throw new ApiError(404, 'UNKNOWN_SEASON', 'The requested season was not found');
  }
  return season;
}

export function requiredAssociation(value: unknown, snapshot: ActiveSeasonSnapshot) {
  const parsed = IdSchema.safeParse(value);
  if (!parsed.success) {
    throw new ApiError(400, 'INVALID_ASSOCIATION', 'A valid associationId is required');
  }
  const association = snapshot.associations.find(({ id }) => id === parsed.data);
  if (!association) {
    throw new ApiError(404, 'UNKNOWN_ASSOCIATION', 'The requested association was not found');
  }
  return association;
}
