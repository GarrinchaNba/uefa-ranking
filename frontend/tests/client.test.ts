import { describe, expect, it, vi } from 'vitest';
import { ApiClientError, getAssociations, getSeasonRanking, getSeasons } from '../src/api/client.js';

const dataStatus = {
  mode: 'mock',
  quality: 'current',
  source: 'Deterministic fixture',
  lastSuccessfulUpdate: null,
};

describe('ranking API client', () => {
  it('validates and returns the seasons response', async () => {
    const fetcher = vi.fn<typeof fetch>().mockResolvedValue(new Response(JSON.stringify({
      activeSeasonId: '2026-27',
      seasons: [{ id: '2026-27', label: '2026/27' }],
      dataStatus,
    })));

    await expect(getSeasons(fetcher)).resolves.toMatchObject({
      activeSeasonId: '2026-27',
      seasons: [{ id: '2026-27' }],
    });

    expect(fetcher).toHaveBeenCalledWith('/api/v1/seasons', {
      headers: { Accept: 'application/json' },
    });
  });

  it('rejects duplicate selectable seasons', async () => {
    const fetcher = vi.fn<typeof fetch>().mockResolvedValue(new Response(JSON.stringify({
      activeSeasonId: '2026-27',
      seasons: [
        { id: '2026-27', label: '2026/27' },
        { id: '2026-27', label: 'Duplicate' },
      ],
      dataStatus,
    })));
    await expect(getSeasons(fetcher)).rejects.toMatchObject({ code: 'INVALID_RESPONSE' });
  });

  it('encodes the selected season when requesting associations', async () => {
    const fetcher = vi.fn<typeof fetch>().mockResolvedValue(new Response(JSON.stringify({
      seasonId: '2026-27',
      associations: [{ id: 'england', name: 'England' }],
      dataStatus,
    })));

    await getAssociations('2026-27', fetcher);
    expect(fetcher).toHaveBeenCalledWith(
      '/api/v1/associations?seasonId=2026-27',
      { headers: { Accept: 'application/json' } },
    );
  });

  it('surfaces structured API failures and rejects invalid success payloads', async () => {
    const errorFetcher = vi.fn<typeof fetch>().mockResolvedValue(new Response(JSON.stringify({
      error: { code: 'UNKNOWN_SEASON', message: 'Season was not found' },
    }), { status: 404 }));
    const invalidFetcher = vi.fn<typeof fetch>().mockResolvedValue(new Response('{}'));

    await expect(getSeasons(errorFetcher)).rejects.toMatchObject({
      name: 'ApiClientError',
      status: 404,
      code: 'UNKNOWN_SEASON',
      message: 'Season was not found',
    } satisfies Partial<ApiClientError>);
    await expect(getSeasons(invalidFetcher)).rejects.toMatchObject({
      code: 'INVALID_RESPONSE',
    });
  });

  it('requests and validates a season ranking', async () => {
    const fetcher = vi.fn<typeof fetch>().mockResolvedValue(new Response(JSON.stringify({
      season: { id: '2026-27', label: '2026/27' },
      association: { id: 'albion', name: 'Albion' },
      clubs: [{ clubId: 'club', name: 'Club', league: null, total: null, totalStatus: 'partial' }],
      dataStatus,
    })));
    await expect(getSeasonRanking('2026-27', 'albion', fetcher)).resolves.toMatchObject({
      clubs: [{ total: null, totalStatus: 'partial' }],
    });
    expect(fetcher).toHaveBeenCalledWith(
      '/api/v1/season-rankings?seasonId=2026-27&associationId=albion',
      { headers: { Accept: 'application/json' } },
    );
    const invalid = vi.fn<typeof fetch>().mockResolvedValue(new Response(JSON.stringify({
      season: { id: '2026-27', label: '2026/27' },
      association: { id: 'albion', name: 'Albion' },
      clubs: [{ clubId: 'club', name: 'Club', league: null, total: 'bad', totalStatus: 'complete' }],
      dataStatus,
    })));
    await expect(getSeasonRanking('2026-27', 'albion', invalid)).rejects.toMatchObject({ code: 'INVALID_RESPONSE' });
  });
});
