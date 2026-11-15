import { SeasonIdSchema } from '@uefa-ranking/contracts';

export interface PeriodSeason {
  seasonId: string;
  available: boolean;
}

export function rankingPeriods(
  selectedSeasonId: string,
  availableSeasonIds: readonly string[],
): { current: PeriodSeason[]; previous: PeriodSeason[] } {
  if (!SeasonIdSchema.safeParse(selectedSeasonId).success
    || availableSeasonIds.some((id) => !SeasonIdSchema.safeParse(id).success)) {
    throw new TypeError('Invalid season ID');
  }
  const selectedYear = Number(selectedSeasonId.slice(0, 4));
  if (selectedYear < 5) {
    throw new RangeError('Selected season is too early for a prior five-season window');
  }
  const available = new Set(availableSeasonIds);
  const season = (year: number): PeriodSeason => {
    const seasonId = `${String(year).padStart(4, '0')}-${String((year + 1) % 100).padStart(2, '0')}`;
    return { seasonId, available: available.has(seasonId) };
  };
  const window = (end: number) => Array.from({ length: 5 }, (_, index) => season(end - 4 + index));
  return { current: window(selectedYear), previous: window(selectedYear - 1) };
}
