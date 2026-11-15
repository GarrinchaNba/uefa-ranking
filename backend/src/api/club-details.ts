import { Router } from 'express';
import {
  ClubSeasonDetailsResponseSchema, IdSchema, SeasonIdSchema,
} from '@uefa-ranking/contracts';
import { clubSeasonDetails } from '../domain/club-details.js';
import { getValidatedRankingSnapshot, type RankingDataProvider } from '../providers/provider.js';
import { ApiError } from './errors.js';

export function clubDetailsRouter(provider: RankingDataProvider) {
  const router = Router();
  router.get('/clubs/:clubId/season-details', async (request, response) => {
    if (Object.keys(request.query).some((key) => key !== 'seasonId')
      || Object.values(request.query).some((value) => Array.isArray(value))) {
      throw new ApiError(400, 'INVALID_PARAMETER', 'Unsupported or repeated detail parameter');
    }
    const clubId = IdSchema.safeParse(request.params.clubId);
    if (!clubId.success) throw new ApiError(400, 'INVALID_CLUB', 'A valid clubId is required');
    const seasonId = SeasonIdSchema.safeParse(request.query.seasonId);
    if (!seasonId.success) throw new ApiError(400, 'INVALID_SEASON', 'A valid seasonId is required');

    const snapshot = await getValidatedRankingSnapshot(provider);
    if (!snapshot.clubs.some((club) => club.id === clubId.data)) {
      throw new ApiError(404, 'UNKNOWN_CLUB', 'The requested club was not found');
    }
    if (!snapshot.seasons.some((season) => season.id === seasonId.data)) {
      throw new ApiError(404, 'UNKNOWN_SEASON', 'The requested season was not found');
    }
    if (!snapshot.selectableSeasonIds.includes(seasonId.data)) {
      throw new ApiError(404, 'UNSUPPORTED_SEASON', 'The requested season is not selectable');
    }

    const result = clubSeasonDetails(snapshot, clubId.data, seasonId.data);
    const validated = ClubSeasonDetailsResponseSchema.safeParse({
      ...result,
      dataStatus: provider.dataStatus,
    });
    if (!validated.success) {
      throw new ApiError(500, 'INVALID_CLUB_DETAILS', 'Club season details could not be validated');
    }
    response.json(validated.data);
  });
  return router;
}
