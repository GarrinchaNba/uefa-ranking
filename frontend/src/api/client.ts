import {
  ApiErrorResponseSchema,
  AssociationRankingResponseSchema,
  AssociationSeasonDetailsResponseSchema,
  ClubRankingResponseSchema,
  ClubSeasonDetailsResponseSchema,
  SeasonsResponseSchema,
  type AssociationRankingResponse,
  type AssociationSeasonDetailsResponse,
  type ClubRankingResponse,
  type ClubSeasonDetailsResponse,
  type SeasonsResponse,
} from '@uefa-ranking/contracts';
import { z } from 'zod';

export class ApiClientError extends Error {
  constructor(
    message: string,
    readonly status: number,
    readonly code: string,
  ) {
    super(message);
    this.name = 'ApiClientError';
  }
}

async function request<T>(
  path: string,
  schema: z.ZodType<T>,
  fetcher: typeof fetch,
): Promise<T> {
  const response = await fetcher(path, { headers: { Accept: 'application/json' } });
  let payload: unknown;
  try {
    payload = await response.json();
  } catch {
    throw new ApiClientError('The server returned an invalid response', response.status, 'INVALID_RESPONSE');
  }

  if (!response.ok) {
    const errorResult = ApiErrorResponseSchema.safeParse(payload);
    if (errorResult.success) {
      throw new ApiClientError(
        errorResult.data.error.message,
        response.status,
        errorResult.data.error.code,
      );
    }
    throw new ApiClientError(
      `The request failed with status ${response.status}`,
      response.status,
      'REQUEST_FAILED',
    );
  }

  const result = schema.safeParse(payload);
  if (!result.success) {
    throw new ApiClientError('The server returned data in an unexpected format', response.status, 'INVALID_RESPONSE');
  }
  return result.data;
}

export function getSeasons(fetcher: typeof fetch = fetch): Promise<SeasonsResponse> {
  return request('/api/v1/seasons', SeasonsResponseSchema, fetcher);
}

export function getClubRanking(
  seasonId: string,
  sortSeasonId?: string,
  direction: 'asc' | 'desc' = 'desc',
  fetcher: typeof fetch = fetch,
): Promise<ClubRankingResponse> {
  const query = new URLSearchParams({ seasonId });
  if (sortSeasonId) {
    query.set('sortSeasonId', sortSeasonId);
    query.set('direction', direction);
  }
  return request(`/api/v1/club-rankings?${query.toString()}`, ClubRankingResponseSchema, fetcher);
}

export function getClubSeasonDetails(
  clubId: string,
  seasonId: string,
  fetcher: typeof fetch = fetch,
): Promise<ClubSeasonDetailsResponse> {
  const query = new URLSearchParams({ seasonId });
  return request(
    `/api/v1/clubs/${encodeURIComponent(clubId)}/season-details?${query.toString()}`,
    ClubSeasonDetailsResponseSchema,
    fetcher,
  );
}

export function getAssociationRanking(
  seasonId: string,
  sortSeasonId?: string,
  direction: 'asc' | 'desc' = 'desc',
  fetcher: typeof fetch = fetch,
): Promise<AssociationRankingResponse> {
  const query = new URLSearchParams({ seasonId });
  if (sortSeasonId) {
    query.set('sortSeasonId', sortSeasonId);
    query.set('direction', direction);
  }
  return request(`/api/v1/association-rankings?${query.toString()}`, AssociationRankingResponseSchema, fetcher);
}

export function getAssociationSeasonDetails(
  associationId: string,
  seasonId: string,
  fetcher: typeof fetch = fetch,
): Promise<AssociationSeasonDetailsResponse> {
  const query = new URLSearchParams({ seasonId });
  return request(
    `/api/v1/associations/${encodeURIComponent(associationId)}/season-details?${query.toString()}`,
    AssociationSeasonDetailsResponseSchema,
    fetcher,
  );
}
