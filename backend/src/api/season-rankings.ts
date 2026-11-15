import { Router } from 'express';
import { seasonRanking } from '../domain/season-ranking.js';
import { getValidatedSnapshot, type RankingDataProvider } from '../providers/provider.js';
import { ApiError } from './errors.js';
import { requiredAssociation, requiredSeason } from './parameters.js';

export function seasonRankingsRouter(provider: RankingDataProvider) {
  const router = Router();
  router.get('/season-rankings', async (request, response) => {
    if (Object.keys(request.query).some((key) => key !== 'seasonId' && key !== 'associationId')) {
      throw new ApiError(400, 'INVALID_PARAMETER', 'Unsupported ranking parameter');
    }
    const snapshot = await getValidatedSnapshot(provider);
    const season = requiredSeason(request.query.seasonId, snapshot);
    const association = requiredAssociation(request.query.associationId, snapshot);
    response.json({
      season,
      association,
      clubs: seasonRanking(snapshot, season.id, association.id),
      dataStatus: provider.dataStatus,
    });
  });
  return router;
}
