import { cleanup, render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { SeasonRanking } from '../src/components/SeasonRanking.js';

const dataStatus = { mode: 'mock', quality: 'partial', source: 'Test fixture', lastSuccessfulUpdate: null };
const seasons = {
  activeSeasonId: '2026-27',
  seasons: [{ id: '2025-26', label: '2025/26' }, { id: '2026-27', label: '2026/27' }],
  dataStatus,
};
const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status });
const ranking = (seasonId: string, clubs: unknown[] = []) => ({
  season: { id: seasonId, label: seasonId === '2026-27' ? '2026/27' : '2025/26' },
  association: { id: 'albion', name: 'Albion' },
  clubs,
  dataStatus,
});
const clubs = [
  { clubId: 'rovers', name: 'Rovers', league: null, total: '3', totalStatus: 'partial' },
  { clubId: 'city', name: 'City', league: { id: 'premier', name: 'Premier' }, total: '2', totalStatus: 'complete' },
];

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

describe('country ranking', () => {
  it('defaults to the active season and reaches a country ranking in one selection, then changes season', async () => {
    const fetcher = vi.fn<typeof fetch>().mockImplementation(async (input) => {
      const url = new URL(String(input), 'http://localhost');
      if (url.pathname.endsWith('/seasons')) return json(seasons);
      if (url.pathname.endsWith('/associations')) return json({
        seasonId: url.searchParams.get('seasonId'), associations: [{ id: 'albion', name: 'Albion' }], dataStatus,
      });
      return json(ranking(url.searchParams.get('seasonId')!, clubs));
    });
    vi.stubGlobal('fetch', fetcher);
    const user = userEvent.setup();
    render(<SeasonRanking />);

    expect(await screen.findByRole('option', { name: 'Albion' })).toBeVisible();
    expect(screen.getByLabelText('Season')).toHaveValue('2026-27');
    expect(screen.getByText('Mock data')).toBeVisible();
    await user.selectOptions(screen.getByLabelText('Country'), 'albion');
    const table = await screen.findByRole('table');
    expect(within(table).getAllByRole('row').slice(1).map((row) => within(row).getAllByRole('rowheader')[0].textContent))
      .toEqual(['Rovers', 'City']);
    expect(within(table).getByText('3 (partial)')).toBeVisible();
    expect(within(table).getByText('Unknown')).toBeVisible();

    await user.selectOptions(screen.getByLabelText('Season'), '2025-26');
    await waitFor(() => expect(screen.getByLabelText('Country')).toHaveValue(''));
    expect(screen.queryByRole('table')).not.toBeInTheDocument();
    await user.selectOptions(await screen.findByLabelText('Country'), 'albion');
    expect(await screen.findByText('Albion — 2025/26')).toBeVisible();
  });

  it('shows loading and empty-country states', async () => {
    let resolveSeasons!: (value: Response) => void;
    vi.stubGlobal('fetch', vi.fn<typeof fetch>().mockImplementation((input) => {
      if (String(input).endsWith('/seasons')) return new Promise((resolve) => { resolveSeasons = resolve; });
      return Promise.resolve(json({ seasonId: '2026-27', associations: [], dataStatus }));
    }));
    render(<SeasonRanking />);
    expect(screen.getByText('Loading ranking data...')).toBeVisible();
    resolveSeasons(json(seasons));
    expect(await screen.findByText('No countries have participating clubs for this season.')).toBeVisible();
  });

  it('renders empty rankings and explicit API errors', async () => {
    vi.stubGlobal('fetch', vi.fn<typeof fetch>().mockImplementation(async (input) => {
      const url = String(input);
      if (url.endsWith('/seasons')) return json(seasons);
      if (url.includes('/associations')) return json({
        seasonId: '2026-27', associations: [{ id: 'albion', name: 'Albion' }], dataStatus,
      });
      return json(ranking('2026-27'));
    }));
    const user = userEvent.setup();
    const { unmount } = render(<SeasonRanking />);
    await screen.findByRole('option', { name: 'Albion' });
    await user.selectOptions(screen.getByLabelText('Country'), 'albion');
    expect(await screen.findByText('No participating clubs for Albion in 2026/27.')).toBeVisible();
    unmount();
    vi.stubGlobal('fetch', vi.fn<typeof fetch>().mockResolvedValue(
      json({ error: { code: 'SOURCE_UNAVAILABLE', message: 'Data source unavailable' } }, 503),
    ));
    render(<SeasonRanking />);
    expect(await screen.findByRole('alert')).toHaveTextContent('Data source unavailable');
    expect(screen.queryByRole('table')).not.toBeInTheDocument();
  });

  it('ignores a delayed ranking after the selected season changes', async () => {
    let resolveOld!: (value: Response) => void;
    vi.stubGlobal('fetch', vi.fn<typeof fetch>().mockImplementation((input) => {
      const url = new URL(String(input), 'http://localhost');
      if (url.pathname.endsWith('/seasons')) return Promise.resolve(json(seasons));
      if (url.pathname.endsWith('/associations')) return Promise.resolve(json({
        seasonId: url.searchParams.get('seasonId'), associations: [{ id: 'albion', name: 'Albion' }], dataStatus,
      }));
      if (url.searchParams.get('seasonId') === '2026-27') {
        return new Promise((resolve) => { resolveOld = resolve; });
      }
      return Promise.resolve(json(ranking('2025-26', clubs)));
    }));
    const user = userEvent.setup();
    render(<SeasonRanking />);
    await screen.findByRole('option', { name: 'Albion' });
    await user.selectOptions(screen.getByLabelText('Country'), 'albion');
    await user.selectOptions(screen.getByLabelText('Season'), '2025-26');
    await screen.findByRole('option', { name: 'Albion' });
    await user.selectOptions(screen.getByLabelText('Country'), 'albion');
    expect(await screen.findByText('Albion — 2025/26')).toBeVisible();
    resolveOld(json(ranking('2026-27', clubs)));
    await waitFor(() => expect(screen.queryByText('Albion — 2026/27')).not.toBeInTheDocument());
    expect(screen.getByText('Albion — 2025/26')).toBeVisible();
  });

  it('clears loading when a country is deselected during a pending ranking request', async () => {
    vi.stubGlobal('fetch', vi.fn<typeof fetch>().mockImplementation((input) => {
      const url = new URL(String(input), 'http://localhost');
      if (url.pathname.endsWith('/seasons')) return Promise.resolve(json(seasons));
      if (url.pathname.endsWith('/associations')) return Promise.resolve(json({
        seasonId: '2026-27', associations: [{ id: 'albion', name: 'Albion' }], dataStatus,
      }));
      return new Promise(() => {});
    }));
    const user = userEvent.setup();
    render(<SeasonRanking />);
    await screen.findByRole('option', { name: 'Albion' });
    await user.selectOptions(screen.getByLabelText('Country'), 'albion');
    expect(screen.getByText('Loading ranking data...')).toBeVisible();
    await user.selectOptions(screen.getByLabelText('Country'), '');
    expect(screen.queryByText('Loading ranking data...')).not.toBeInTheDocument();
  });
});
