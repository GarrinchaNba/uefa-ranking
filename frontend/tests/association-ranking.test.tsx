import { cleanup, render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { RankingTabs } from '../src/components/RankingTabs.js';

const dataStatus = { mode: 'mock', quality: 'partial', source: 'Test fixture', lastSuccessfulUpdate: null };
const historicalSeasons = ['2019-20', '2020-21', '2021-22', '2022-23', '2023-24']
  .map((id) => ({ id, label: `${id.slice(0, 4)}/${id.slice(5)}` }));
const seasons = [
  { id: '2023-24', label: '2023/24' },
  { id: '2026-27', label: '2026/27' },
];
const row = (id: string, name: string, coefficient: string | null, rank: number | null) => ({
  association: { id, name },
  rank, rankStatus: rank === null ? 'incomplete' : 'resolved',
  previousRank: rank === null ? null : rank + 1,
  previousRankStatus: rank === null ? 'incomplete' : 'resolved',
  movement: rank === null ? null : 1,
  contributions: historicalSeasons.map((season, index) => ({
    seasonId: season.id,
    coefficient: coefficient === null ? null
      : coefficient === '10' ? ['1', '1', '2', '2', '4'][index] : `${index + 1}`,
    status: coefficient === null ? 'missing' : 'complete',
  })),
  coefficient, status: coefficient === null ? 'incomplete' : 'complete',
  reason: coefficient === null ? 'One or more season coefficients are missing' : null,
});
const historicalRanking = {
  season: historicalSeasons[4],
  seasons: historicalSeasons,
  provisional: false,
  explanation: 'Association coefficients use five season inputs.',
  associations: [
    row('albion', 'Albion', '15', 1),
    row('island', 'Island', '10', 2),
    row('caledonia', 'Caledonia', null, null),
  ],
  dataStatus,
};
const details = {
  season: historicalSeasons[4],
  association: { id: 'albion', name: 'Albion' },
  groups: [{
    competition: { id: 'champions-league', name: 'Champions League' },
    total: '2', status: 'complete',
    clubs: [{
      clubId: 'albion-rovers', name: 'Albion Rovers', points: '2', status: 'complete',
      entries: [{
        id: 'award-cl', competition: { id: 'champions-league', name: 'Champions League' },
        round: { id: 'round', label: 'League phase', order: 1 },
        game: {
          id: 'game', status: 'ratified',
          homeClub: { id: 'albion-rovers', name: 'Albion Rovers' },
          awayClub: { id: 'opponent', name: 'Opponent' }, homeScore: 2, awayScore: 0,
        },
        kind: 'match', status: 'awarded', points: '2', ruleId: 'match-rule',
        sourceId: 'game-award', label: 'Win',
      }],
    }],
  }],
  explanation: 'Competition subtotals are club points, not association coefficients.',
  dataStatus,
};
const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status });

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

describe('global association ranking view', () => {
  it('switches tabs while preserving the selected season, shows five contributions and unranked states', async () => {
    vi.stubGlobal('fetch', vi.fn<typeof fetch>().mockImplementation(async (input) => {
      const url = new URL(String(input), 'http://localhost');
      if (url.pathname.endsWith('/seasons')) {
        return json({ activeSeasonId: '2026-27', seasons, dataStatus });
      }
      if (url.pathname.endsWith('/association-rankings')) {
        return json(url.searchParams.get('seasonId') === '2023-24'
          ? historicalRanking
          : { ...historicalRanking, season: { id: '2026-27', label: '2026/27' }, provisional: true });
      }
      if (url.pathname.endsWith('/associations/albion/season-details')) return json(details);
      return json({ error: { code: 'NOT_FOUND', message: 'Not found' } }, 404);
    }));
    const user = userEvent.setup();
    render(<RankingTabs />);
    await screen.findByRole('tab', { name: 'Clubs' });
    await user.selectOptions(await screen.findByLabelText('Season'), '2023-24');
    await user.click(screen.getByRole('tab', { name: 'Countries' }));
    const table = await screen.findByRole('table');
    expect(screen.getByLabelText('Season')).toHaveValue('2023-24');
    expect(within(table).getAllByRole('columnheader')).toHaveLength(9);
    expect(within(table).getByRole('row', { name: /Caledonia/ })).toHaveTextContent('Unavailable');
    const albion = within(table).getByRole('row', { name: /Albion/ });
    expect(albion).toHaveTextContent('15');
    expect(within(albion).getByText('+1')).toHaveAccessibleName('Up 1 place');
  });

  it('expands competition subtotals accessibly and labels them separately from association coefficients', async () => {
    vi.stubGlobal('fetch', vi.fn<typeof fetch>().mockImplementation(async (input) => {
      const url = new URL(String(input), 'http://localhost');
      if (url.pathname.endsWith('/seasons')) return json({ activeSeasonId: '2023-24', seasons: [
        { id: '2023-24', label: '2023/24' },
      ], dataStatus });
      if (url.pathname.endsWith('/association-rankings')) return json(historicalRanking);
      if (url.pathname.endsWith('/associations/albion/season-details')) return json(details);
      return json({ error: { code: 'NOT_FOUND', message: 'Not found' } }, 404);
    }));
    const user = userEvent.setup();
    render(<RankingTabs />);
    await user.click(await screen.findByRole('tab', { name: 'Countries' }));
    const button = within(await screen.findByRole('table')).getByRole('button', { name: 'Show competition details for Albion' });
    await user.click(button);
    const panel = await screen.findByRole('region', { name: 'Albion 2023-24 competition details' });
    expect(await within(panel).findByText(/Club-point subtotal: 2/)).toBeVisible();
    expect(within(panel).getByText(/not association coefficients/)).toBeVisible();
    expect(within(panel).getByText(/Points: 2/)).toBeVisible();
  });

  it('supports arrow-key navigation between the accessible club and country tabs', async () => {
    vi.stubGlobal('fetch', vi.fn<typeof fetch>().mockImplementation(async (input) => {
      const url = new URL(String(input), 'http://localhost');
      if (url.pathname.endsWith('/seasons')) return json({ activeSeasonId: '2023-24', seasons: [
        { id: '2023-24', label: '2023/24' },
      ], dataStatus });
      if (url.pathname.endsWith('/association-rankings')) return json(historicalRanking);
      return json({ error: { code: 'NOT_FOUND', message: 'Not found' } }, 404);
    }));
    const user = userEvent.setup();
    render(<RankingTabs />);
    const clubTab = await screen.findByRole('tab', { name: 'Clubs' });
    clubTab.focus();
    await user.keyboard('{ArrowRight}');
    expect(screen.getByRole('tab', { name: 'Countries' })).toHaveFocus();
    expect(screen.getByRole('tabpanel')).toHaveAccessibleName('Countries');
    expect(screen.getByRole('tabpanel')).toHaveAttribute('aria-labelledby', 'associations-tab');
  });

  it('keeps global rank and movement unchanged when sorting season contributions', async () => {
    vi.stubGlobal('fetch', vi.fn<typeof fetch>().mockImplementation(async (input) => {
      const url = new URL(String(input), 'http://localhost');
      if (url.pathname.endsWith('/seasons')) return json({ activeSeasonId: '2023-24', seasons: [
        { id: '2023-24', label: '2023/24' },
      ], dataStatus });
      if (url.pathname.endsWith('/association-rankings')) return json(historicalRanking);
      return json({ error: { code: 'NOT_FOUND', message: 'Not found' } }, 404);
    }));
    const user = userEvent.setup();
    render(<RankingTabs />);
    await user.click(await screen.findByRole('tab', { name: 'Countries' }));
    const table = await screen.findByRole('table');
    const getRanksAndMovement = () => Object.fromEntries(within(table).getAllByRole('row').slice(1).map((current) => {
      const cells = within(current).getAllByRole('cell');
      return [within(current).getByRole('rowheader').textContent, [cells[0].textContent, cells[1].textContent]];
    }).sort(([left], [right]) => String(left).localeCompare(String(right))));
    const baseline = getRanksAndMovement();
    await user.click(screen.getByRole('button', { name: /2023\/24 contribution/ }));
    await user.click(screen.getByRole('button', { name: /2023\/24 contribution/ }));
    expect(getRanksAndMovement()).toEqual(baseline);
  });
});
