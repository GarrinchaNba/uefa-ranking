import { act, cleanup, render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { ClubRanking } from '../src/components/ClubRanking.js';

const dataStatus = { mode: 'mock', quality: 'partial', source: 'Test fixture', lastSuccessfulUpdate: null } as const;
const seasons = [
  { id: '2022-23', label: '2022/23' },
  { id: '2023-24', label: '2023/24' },
  { id: '2024-25', label: '2024/25' },
  { id: '2025-26', label: '2025/26' },
  { id: '2026-27', label: '2026/27' },
];
const historicalSeasons = ['2019-20', '2020-21', '2021-22', '2022-23', '2023-24']
  .map((id) => ({ id, label: `${id.slice(0, 4)}/${id.slice(5)}` }));
const row = (
  clubId: string, name: string, rank: number, movement: number, points: string[],
  period: { id: string; label: string }[],
) => ({
  clubId, name, association: { id: 'albion', name: 'Albion' },
  rank, rankStatus: 'resolved', previousRank: rank + movement, previousRankStatus: 'resolved', movement,
  contributions: points.map((value, index) => ({
    seasonId: period[index].id, points: value, participation: 'participated', status: 'complete',
  })),
  clubPointsSum: points.reduce((sum, value) => sum + Number(value), 0).toString(),
  associationCoefficient: '40', associationMinimum: '8', coefficient: '8', minimumApplied: true,
  status: 'partial', reason: 'Assumed fixture value for this MVP.',
  reasons: ['Assumed fixture value for this MVP.'], assumptions: [] as { code: string; message: string }[],
});
const rankings = (seasonId: string) => {
  const selectedSeasons = seasonId === '2026-27' ? seasons : historicalSeasons;
  return {
    season: selectedSeasons[4],
    seasons: selectedSeasons,
    provisional: seasonId === '2026-27',
    explanation: 'Synthetic MVP ranking. Numeric assumptions are provisional.',
    clubs: [
      row('rovers', 'Albion Rovers', 1, 2, ['2', '4', '6', '8', '10'], selectedSeasons),
      row('city', 'North City', 2, 0, ['7', '5', '3', '1', '0'], selectedSeasons),
    ],
    dataStatus,
  };
};
const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status });

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

describe('global club ranking view', () => {
  it('defaults to the active season and displays rank, movement, five labelled contributions and floor explanation', async () => {
    vi.stubGlobal('fetch', vi.fn<typeof fetch>().mockImplementation(async (input) => {
      const url = new URL(String(input), 'http://localhost');
      if (url.pathname.endsWith('/seasons')) return json({ activeSeasonId: '2026-27', seasons: [
        { id: '2023-24', label: '2023/24' }, { id: '2026-27', label: '2026/27' },
      ], dataStatus });
      return json(rankings(url.searchParams.get('seasonId')!));
    }));
    render(<ClubRanking />);
    const table = await screen.findByRole('table');
    expect(screen.getByLabelText('Season')).toHaveValue('2026-27');
    expect(screen.getByText('Provisional:')).toBeVisible();
    expect(screen.getByText('Mock data')).toBeVisible();
    expect(within(table).getAllByRole('columnheader')).toHaveLength(12);
    const rovers = within(table).getByRole('row', { name: /Albion Rovers/ });
    expect(within(rovers).getByText('+2')).toHaveAccessibleName('Up 2 places');
    expect(within(rovers).getByText('(applied)')).toBeVisible();
    expect(within(rovers).getByText('Assumed fixture value for this MVP.')).toBeVisible();
  });

  it('sorts each season column without changing the displayed global rank', async () => {
    vi.stubGlobal('fetch', vi.fn<typeof fetch>().mockImplementation(async (input) => {
      const url = new URL(String(input), 'http://localhost');
      if (url.pathname.endsWith('/seasons')) return json({ activeSeasonId: '2026-27', seasons: [
        { id: '2026-27', label: '2026/27' },
      ], dataStatus });
      return json(rankings('2026-27'));
    }));
    const user = userEvent.setup();
    render(<ClubRanking />);
    const table = await screen.findByRole('table');
    const baselineRanks = new Map(within(table).getAllByRole('row').slice(1).map((current) => [
      within(current).getAllByRole('rowheader')[0].textContent,
      within(current).getAllByRole('cell')[0].textContent,
    ]));
    for (const season of seasons) {
      await user.click(screen.getByRole('button', { name: new RegExp(`${season.label} contribution`) }));
      const rows = within(table).getAllByRole('row').slice(1);
      expect(new Map(rows.map((current) => [
        within(current).getAllByRole('rowheader')[0].textContent,
        within(current).getAllByRole('cell')[0].textContent,
      ]))).toEqual(baselineRanks);
    }
    await user.click(screen.getByRole('button', { name: /2022\/23 contribution/ }));
    expect(within(table).getAllByRole('row').slice(1).map((current) =>
      within(current).getAllByRole('rowheader')[0].querySelector('span')?.textContent))
      .toEqual(['North City', 'Albion Rovers']);
  });

  it('switches selectable periods and reports API failures accessibly', async () => {
    let fail = false;
    vi.stubGlobal('fetch', vi.fn<typeof fetch>().mockImplementation(async (input) => {
      const url = new URL(String(input), 'http://localhost');
      if (url.pathname.endsWith('/seasons')) return json({ activeSeasonId: '2026-27', seasons: [
        { id: '2023-24', label: '2023/24' }, { id: '2026-27', label: '2026/27' },
      ], dataStatus });
      if (fail) return json({ error: { code: 'SOURCE_UNAVAILABLE', message: 'Ranking unavailable' } }, 503);
      const selected = url.searchParams.get('seasonId')!;
      return json(rankings(selected));
    }));
    const user = userEvent.setup();
    render(<ClubRanking />);
    await screen.findByRole('table');
    await user.selectOptions(screen.getByLabelText('Season'), '2023-24');
    await screen.findByRole('table');
    expect(screen.getByText('Club coefficients, 2019/20–2023/24')).toBeVisible();
    expect(screen.queryByText('Provisional:')).not.toBeInTheDocument();
    fail = true;
    await user.selectOptions(screen.getByLabelText('Season'), '2026-27');
    expect(await screen.findByRole('alert')).toHaveTextContent('Ranking unavailable');
    expect(screen.queryByRole('table')).not.toBeInTheDocument();
  });

  it('ignores a delayed response for a previously selected period', async () => {
    let resolveActive!: (response: Response) => void;
    vi.stubGlobal('fetch', vi.fn<typeof fetch>().mockImplementation((input) => {
      const url = new URL(String(input), 'http://localhost');
      if (url.pathname.endsWith('/seasons')) return Promise.resolve(json({ activeSeasonId: '2026-27', seasons: [
        { id: '2023-24', label: '2023/24' }, { id: '2026-27', label: '2026/27' },
      ], dataStatus }));
      if (url.searchParams.get('seasonId') === '2026-27') {
        return new Promise((resolve) => { resolveActive = resolve; });
      }
      return Promise.resolve(json(rankings('2023-24')));
    }));
    const user = userEvent.setup();
    render(<ClubRanking />);
    await user.selectOptions(await screen.findByLabelText('Season'), '2023-24');
    expect(await screen.findByText('Club coefficients, 2019/20–2023/24')).toBeVisible();
    resolveActive(json(rankings('2026-27')));
    await waitFor(() => expect(screen.queryByText('Club coefficients, 2022/23–2026/27')).not.toBeInTheDocument());
    expect(screen.getByText('Club coefficients, 2019/20–2023/24')).toBeVisible();
  });

  it('discloses only affected assumptions without repeating the shared note in rows or cards', async () => {
    const association = 'A missing or partial synthetic association coefficient is assumed to be 0.';
    const partial = 'Partial synthetic club totals use the reported fixture value.';
    const response = rankings('2026-27');
    response.clubs[0] = {
      ...response.clubs[0],
      reason: `Other limitation. ${association} ${partial} Other assumption.`,
      reasons: ['Other limitation.'],
      assumptions: [
        { code: 'missing-or-partial-association-coefficient', message: association },
        { code: 'partial-club-total', message: partial },
        { code: 'unverified-ranking-tie-break', message: 'Other assumption.' },
      ],
    };
    response.clubs[1] = {
      ...response.clubs[1],
      reason: `Assumed fixture value for this MVP. ${partial}`,
      assumptions: [{ code: 'partial-club-total', message: partial }],
    };
    vi.stubGlobal('fetch', vi.fn<typeof fetch>().mockResolvedValue(json(response)));
    const user = userEvent.setup();
    render(<ClubRanking selectedSeasonId="2026-27" availableSeasons={{ activeSeasonId: '2026-27', seasons: [seasons[4]], dataStatus }} />);
    const table = await screen.findByRole('table');
    const affected = within(table).getByRole('row', { name: /Albion Rovers/ });
    const other = within(table).getByRole('row', { name: /North City/ });
    expect(screen.getAllByText(partial)).toHaveLength(1);
    expect(screen.getByText(partial).compareDocumentPosition(table) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    expect(within(affected).queryByText(partial)).not.toBeInTheDocument();
    expect(within(affected).getByText('Other limitation.')).toBeInTheDocument();
    expect(within(affected).getByText('Other assumption.')).toBeInTheDocument();
    expect(within(other).queryByRole('button', { name: /association coefficient assumption/i })).not.toBeInTheDocument();
    const indicator = within(affected).getByRole('button', { name: /association coefficient assumption/i });
    expect(indicator).toHaveTextContent('*');
    expect(within(affected).queryByRole('tooltip')).not.toBeInTheDocument();
    await user.hover(indicator);
    expect(within(affected).getByRole('tooltip')).toHaveTextContent(association);
    await user.unhover(indicator);
    act(() => indicator.focus());
    expect(within(affected).getByRole('tooltip')).toHaveTextContent(association);
    await user.keyboard('{Escape}');
    expect(within(affected).queryByRole('tooltip')).not.toBeInTheDocument();
    const card = screen.getByRole('article', { name: 'Albion Rovers ranking details', hidden: true });
    expect(within(card).getByRole('button', { name: /association coefficient assumption/i, hidden: true })).toHaveTextContent('*');
    expect(within(card).getByText('Other limitation.')).toBeInTheDocument();
    expect(within(card).queryByText(partial)).not.toBeInTheDocument();
  });

  it('does not show the partial fixture note when no club has that assumption', async () => {
    vi.stubGlobal('fetch', vi.fn<typeof fetch>().mockResolvedValue(json(rankings('2026-27'))));
    render(<ClubRanking selectedSeasonId="2026-27" availableSeasons={{ activeSeasonId: '2026-27', seasons: [seasons[4]], dataStatus }} />);
    await screen.findByRole('table');
    expect(screen.queryByText('Partial synthetic club totals use the reported fixture value.')).not.toBeInTheDocument();
  });
});
