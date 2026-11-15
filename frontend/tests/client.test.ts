import { describe, expect, it, vi } from 'vitest';
import { ApiClientError, getSeasons } from '../src/api/client.js';

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

});
