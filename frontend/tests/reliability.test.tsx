import { cleanup, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { RankingTabs } from '../src/components/RankingTabs.js';

const dataStatus = { mode: 'live', quality: 'partial', source: 'Test source', lastSuccessfulUpdate: null };
const seasons = [
  { id: '2023-24', label: '2023/24' },
  { id: '2026-27', label: '2026/27' },
];
const ranking = (selectedSeasonId: string) => {
  const endYear = Number(selectedSeasonId.slice(0, 4));
  const period = Array.from({ length: 5 }, (_, index) => {
    const year = endYear - 4 + index;
    const id = `${year}-${String((year + 1) % 100).padStart(2, '0')}`;
    return { id, label: `${year}/${String((year + 1) % 100).padStart(2, '0')}` };
  });
  return {
    season: period[4],
    seasons: period,
    provisional: selectedSeasonId === '2026-27',
    explanation: 'Test ranking.',
    associations: [{
      association: { id: 'albion', name: 'Albion' },
      rank: 1, rankStatus: 'resolved',
      previousRank: null, previousRankStatus: 'incomplete', movement: null,
      contributions: period.map((season) => ({
        seasonId: season.id, coefficient: '1', status: 'complete',
      })),
      coefficient: '5', status: 'complete', reason: null,
    }],
    dataStatus,
  };
};
const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status });

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

describe('ranking request reliability', () => {
  it('ignores a delayed association response after the selected season changes', async () => {
    let resolveActive!: (response: Response) => void;
    vi.stubGlobal('fetch', vi.fn<typeof fetch>().mockImplementation((input) => {
      const url = new URL(String(input), 'http://localhost');
      if (url.pathname.endsWith('/seasons')) {
        return Promise.resolve(json({ activeSeasonId: '2026-27', seasons, dataStatus }));
      }
      if (url.pathname.endsWith('/association-rankings')) {
        if (url.searchParams.get('seasonId') === '2026-27') {
          return new Promise((resolve) => { resolveActive = resolve; });
        }
        return Promise.resolve(json(ranking('2023-24')));
      }
      return Promise.resolve(json({ error: { code: 'NOT_FOUND', message: 'Not found' } }, 404));
    }));

    const user = userEvent.setup();
    render(<RankingTabs />);
    await user.click(await screen.findByRole('tab', { name: 'Countries' }));
    await user.selectOptions(await screen.findByLabelText('Season'), '2023-24');
    expect(await screen.findByText('Association coefficients, 2019/20–2023/24')).toBeVisible();
    resolveActive(json(ranking('2026-27')));
    await waitFor(() => {
      expect(screen.queryByText('Association coefficients, 2022/23–2026/27')).not.toBeInTheDocument();
    });
    expect(screen.getByText('Association coefficients, 2019/20–2023/24')).toBeVisible();
    expect(screen.getByRole('combobox', { name: 'Season' })).toHaveValue('2023-24');
  });

  it('shows association API failures as explicit errors instead of stale rows or empty success', async () => {
    vi.stubGlobal('fetch', vi.fn<typeof fetch>().mockImplementation(async (input) => {
      const url = new URL(String(input), 'http://localhost');
      if (url.pathname.endsWith('/seasons')) {
        return json({ activeSeasonId: '2023-24', seasons: [seasons[0]], dataStatus });
      }
      if (url.pathname.endsWith('/association-rankings')) {
        return json({ error: { code: 'SOURCE_UNAVAILABLE', message: 'Association source unavailable' } }, 503);
      }
      return json({ error: { code: 'NOT_FOUND', message: 'Not found' } }, 404);
    }));

    const user = userEvent.setup();
    render(<RankingTabs />);
    await user.click(await screen.findByRole('tab', { name: 'Countries' }));
    expect(await screen.findByRole('alert')).toHaveTextContent('Association source unavailable');
    expect(screen.queryByRole('table')).not.toBeInTheDocument();
  });
});
