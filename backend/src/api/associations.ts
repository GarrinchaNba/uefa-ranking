import { Router } from 'express';
import { getValidatedSnapshot, type RankingDataProvider } from '../providers/provider.js';
import { requiredSeason } from './parameters.js';

export function associationsRouter(provider: RankingDataProvider) {
  const router = Router();
  router.get('/associations', async (request, response) => {
    const snapshot = await getValidatedSnapshot(provider);
    const season = requiredSeason(request.query.seasonId, snapshot);
    const participatingClubIds = new Set(snapshot.clubSeasonRecords
      .filter((record) => record.seasonId === season.id && record.participation === 'participated')
      .map((record) => record.clubId));
    const associationIds = new Set(snapshot.clubs
      .filter((club) => participatingClubIds.has(club.id))
      .map((club) => club.associationId));
    response.json({
      seasonId: season.id,
      associations: snapshot.associations
        .filter((association) => associationIds.has(association.id))
        .sort((a, b) => a.name.localeCompare(b.name) || a.id.localeCompare(b.id)),
      dataStatus: provider.dataStatus,
    });
  });
  return router;
}
