import {
  ActiveSeasonSnapshotSchema,
  DataStatusSchema,
  RankingSnapshotSchema,
  type ActiveSeasonSnapshot,
  type DataStatus,
  type RankingSnapshot,
} from '@uefa-ranking/contracts';

export interface RankingDataProvider {
  readonly dataStatus: DataStatus;
  getActiveSeasonSnapshot(): Promise<unknown>;
}

export class ProviderUnavailableError extends Error {
  constructor(message = 'The data source is unavailable') {
    super(message);
    this.name = 'ProviderUnavailableError';
  }
}

export class InvalidProviderDataError extends Error {
  constructor(message = 'The data provider returned an invalid snapshot') {
    super(message);
    this.name = 'InvalidProviderDataError';
  }
}

async function validateSnapshot<T>(
  provider: RankingDataProvider,
  schema: {
    safeParse(input: unknown):
      | { success: true; data: T }
      | { success: false; error: { issues: { path: PropertyKey[]; message: string }[] } };
  },
): Promise<T> {
  const status = DataStatusSchema.safeParse(provider.dataStatus);
  if (!status.success) {
    throw new InvalidProviderDataError('The data provider returned invalid source status');
  }
  if (status.data.quality === 'unavailable') {
    throw new ProviderUnavailableError();
  }
  const input = await provider.getActiveSeasonSnapshot();
  const result = schema.safeParse(input);
  if (!result.success) {
    const details = result.error.issues
      .map(({ path, message }) => `${path.join('.') || 'snapshot'}: ${message}`)
      .join('; ');
    throw new InvalidProviderDataError(details);
  }
  return result.data;
}

export async function getValidatedSnapshot(
  provider: RankingDataProvider,
): Promise<ActiveSeasonSnapshot> {
  return validateSnapshot(provider, ActiveSeasonSnapshotSchema);
}

export async function getValidatedRankingSnapshot(
  provider: RankingDataProvider,
): Promise<RankingSnapshot> {
  return validateSnapshot(provider, RankingSnapshotSchema);
}
