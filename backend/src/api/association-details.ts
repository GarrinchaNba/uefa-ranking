import { AssociationSeasonDetailsResponseSchema, IdSchema, SeasonIdSchema } from '@uefa-ranking/contracts';
import { Router } from 'express';
import { associationSeasonDetails } from '../domain/association-details.js';
import { getValidatedRankingSnapshot, type RankingDataProvider } from '../providers/provider.js';
import { ApiError } from './errors.js';

export function associationDetailsRouter(provider: RankingDataProvider) {
  const router = Router();
  router.get('/associations/:associationId/season-details', async (request, response) => {
    if (Object.keys(request.query).some((key) => key !== 'seasonId')
      || Object.values(request.query).some((value) => Array.isArray(value))) {
      throw new ApiError(400, 'INVALID_PARAMETER', 'Unsupported or repeated detail parameter');
    }
    const associationId = IdSchema.safeParse(request.params.associationId);
    if (!associationId.success) throw new ApiError(400, 'INVALID_ASSOCIATION', 'A valid associationId is required');
    const seasonId = SeasonIdSchema.safeParse(request.query.seasonId);
    if (!seasonId.success) throw new ApiError(400, 'INVALID_SEASON', 'A valid seasonId is required');

    const snapshot = await getValidatedRankingSnapshot(provider);
    if (!snapshot.associations.some((entry) => entry.id === associationId.data)) {
      throw new ApiError(404, 'UNKNOWN_ASSOCIATION', 'The requested association was not found');
    }
    if (!snapshot.seasons.some((entry) => entry.id === seasonId.data)) {
      throw new ApiError(404, 'UNKNOWN_SEASON', 'The requested season was not found');
    }
    if (!snapshot.selectableSeasonIds.includes(seasonId.data)) {
      throw new ApiError(404, 'UNSUPPORTED_SEASON', 'The requested season is not selectable');
    }
    const result = associationSeasonDetails(snapshot, associationId.data, seasonId.data);
    const validated = AssociationSeasonDetailsResponseSchema.safeParse({
      ...result,
      dataStatus: provider.dataStatus,
    });
    if (!validated.success) {
      throw new ApiError(500, 'INVALID_ASSOCIATION_DETAILS', 'Association season details could not be validated');
    }
    response.json(validated.data);
  });
  return router;
}
