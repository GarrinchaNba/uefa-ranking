import { Router } from 'express';
import { SeasonIdSchema, ClubRankingResponseSchema } from '@uefa-ranking/contracts';
import { clubRanking } from '../domain/club-ranking.js';
import { getValidatedRankingSnapshot, type RankingDataProvider } from '../providers/provider.js';
import { ApiError } from './errors.js';

export function clubRankingsRouter(provider: RankingDataProvider) {
  const router = Router();
  router.get('/club-rankings', async (request, response) => {
    const allowed = new Set(['seasonId', 'sortSeasonId', 'direction']);
    if (Object.keys(request.query).some((key) => !allowed.has(key))
      || Object.values(request.query).some((value) => Array.isArray(value))) {
      throw new ApiError(400, 'INVALID_PARAMETER', 'Unsupported or repeated ranking parameter');
    }
    const snapshot = await getValidatedRankingSnapshot(provider);
    const season = SeasonIdSchema.safeParse(request.query.seasonId);
    if (!season.success) throw new ApiError(400, 'INVALID_SEASON', 'A valid seasonId is required');
    if (!snapshot.seasons.some((entry) => entry.id === season.data)) {
      throw new ApiError(404, 'UNKNOWN_SEASON', 'The requested season was not found');
    }
    if (!snapshot.selectableSeasonIds.includes(season.data)) {
      throw new ApiError(404, 'UNSUPPORTED_SEASON', 'The requested season is not selectable');
    }
    const sortSeason = request.query.sortSeasonId === undefined
      ? undefined : SeasonIdSchema.safeParse(request.query.sortSeasonId);
    if (sortSeason !== undefined && !sortSeason.success) {
      throw new ApiError(400, 'INVALID_SORT_SEASON', 'A valid sortSeasonId is required');
    }
    const direction = request.query.direction;
    if (direction !== undefined && direction !== 'asc' && direction !== 'desc') {
      throw new ApiError(400, 'INVALID_DIRECTION', 'direction must be asc or desc');
    }
    if (direction !== undefined && sortSeason === undefined) {
      throw new ApiError(400, 'INVALID_DIRECTION', 'direction requires sortSeasonId');
    }
    let result;
    try {
      result = clubRanking(snapshot, season.data, {
        sortSeasonId: sortSeason?.success ? sortSeason.data : undefined,
        direction: direction as 'asc' | 'desc' | undefined,
        dataStatus: provider.dataStatus,
      });
    } catch (error) {
      if (error instanceof RangeError) {
        throw new ApiError(400, 'INVALID_SORT_SEASON', error.message);
      }
      throw error;
    }
    const validated = ClubRankingResponseSchema.safeParse(result);
    if (!validated.success) {
      throw new ApiError(500, 'INVALID_RANKING', 'The ranking could not be validated');
    }
    response.json(validated.data);
  });
  return router;
}
