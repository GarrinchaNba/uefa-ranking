import type { DataStatus } from '@uefa-ranking/contracts';
import type { RankingDataProvider } from './provider.js';
import { mockSnapshot } from './fixtures/mock-snapshot.js';

export class MockRankingDataProvider implements RankingDataProvider {
  readonly dataStatus: DataStatus = {
    mode: 'mock',
    quality: 'partial',
    source: 'Deterministic synthetic fixture (not live data)',
    lastSuccessfulUpdate: null,
  };

  async getActiveSeasonSnapshot(): Promise<unknown> {
    return structuredClone(mockSnapshot);
  }
}
