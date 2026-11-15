import { Router } from 'express';
import { getValidatedSnapshot, type RankingDataProvider } from '../providers/provider.js';

export function seasonsRouter(provider: RankingDataProvider) {
  const router = Router();
  router.get('/seasons', async (_request, response) => {
    const snapshot = await getValidatedSnapshot(provider);
    response.json({
      activeSeasonId: snapshot.activeSeasonId,
      seasons: snapshot.seasons.filter(({ id }) => snapshot.selectableSeasonIds.includes(id)),
      dataStatus: provider.dataStatus,
    });
  });
  return router;
}
