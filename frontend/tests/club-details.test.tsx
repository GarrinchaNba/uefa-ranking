import { act, cleanup, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { ClubRanking } from '../src/components/ClubRanking.js';

const dataStatus = { mode: 'mock', quality: 'partial', source: 'Test fixture', lastSuccessfulUpdate: null };
const seasons = [
  { id: '2022-23', label: '2022/23' },
  { id: '2023-24', label: '2023/24' },
  { id: '2024-25', label: '2024/25' },
  { id: '2025-26', label: '2025/26' },
  { id: '2026-27', label: '2026/27' },
];
const club = {
  clubId: 'meadow-fc', name: 'Meadow FC', association: { id: 'island', name: 'Island' },
  rank: 1, rankStatus: 'resolved', previousRank: 1, previousRankStatus: 'resolved', movement: 0,
  contributions: seasons.map((season) => ({
    seasonId: season.id, points: '1', participation: 'participated', status: 'complete',
  })),
  clubPointsSum: '5', associationCoefficient: '5', associationMinimum: '1', coefficient: '5',
  minimumApplied: false, status: 'complete', reason: null,
};

function setup(detail: unknown) {
  vi.stubGlobal('fetch', vi.fn<typeof fetch>().mockImplementation(async (input) => {
    const url = new URL(String(input), 'http://localhost');
    if (url.pathname.endsWith('/seasons')) return new Response(JSON.stringify({
      activeSeasonId: '2026-27', seasons: [{ id: '2023-24', label: '2023/24' }, { id: '2026-27', label: '2026/27' }], dataStatus,
    }));
    if (url.pathname.endsWith('/season-details')) return new Response(JSON.stringify(detail));
    const selected = url.searchParams.get('seasonId')!;
    const period = selected === '2026-27' ? seasons : [
      { id: '2019-20', label: '2019/20' }, { id: '2020-21', label: '2020/21' },
      { id: '2021-22', label: '2021/22' }, { id: '2022-23', label: '2022/23' },
      { id: '2023-24', label: '2023/24' },
    ];
    return new Response(JSON.stringify({
      season: { id: selected, label: selected },
      seasons: period,
      provisional: selected === '2026-27', explanation: 'Synthetic mock ranking.',
      clubs: [{ ...club, contributions: period.map((season) => ({
        seasonId: season.id, points: '1', participation: 'participated', status: 'complete',
      })) }], dataStatus,
    }));
  }));
}

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

describe('club detail expansion', () => {
  it('supports keyboard expansion and distinguishes bonus, awarded match and pending result entries', async () => {
    setup({
      season: { id: '2026-27', label: '2026/27' }, club: { id: 'meadow-fc', name: 'Meadow FC' },
      participation: 'participated',
      competitions: [{ id: 'conference-league', name: 'UEFA Conference League' }],
      entries: [
        { id: 'goal', competition: { id: 'conference-league', name: 'UEFA Conference League' },
          round: { id: 'qual', label: 'Qualifying', order: 0 }, game: null, kind: 'bonus',
          status: 'awarded', points: '1', ruleId: 'bonus-rule', sourceId: 'source', label: 'Elimination award' },
        { id: 'pending', competition: { id: 'conference-league', name: 'UEFA Conference League' },
          round: { id: 'league', label: 'League phase', order: 1 }, game: {
            id: 'future', status: 'scheduled', homeClub: { id: 'meadow-fc', name: 'Meadow FC' },
            awayClub: { id: 'rival-fc', name: 'Rival FC' }, homeScore: null, awayScore: null,
          },
          kind: 'match', status: 'pending', points: null, ruleId: 'match-rule', sourceId: 'future', label: 'Pending result' },
      ],
      total: '1', status: 'partial', explanation: 'Pending match result.', dataStatus,
    });
    const user = userEvent.setup();
    render(<ClubRanking />);
    const expand = await screen.findByRole('button', { name: 'Show season details for Meadow FC' });
    expand.focus();
    await user.keyboard('{Enter}');
    expect(await screen.findByText('Elimination award')).toBeVisible();
    expect(screen.getByText('UEFA Conference League')).toBeVisible();
    expect(screen.getByText('Points: 1')).toBeVisible();
    expect(screen.getByText(/Pending result/)).toBeVisible();
  });

  it('explains confirmed non-participation and unavailable historical detail', async () => {
    setup({
      season: { id: '2026-27', label: '2026/27' }, club: { id: 'meadow-fc', name: 'Meadow FC' },
      participation: 'did-not-participate', competitions: [], entries: [],
      total: '0', status: 'complete', explanation: 'The club did not participate in this season.', dataStatus,
    });
    const user = userEvent.setup();
    render(<ClubRanking />);
    await user.click(await screen.findByRole('button', { name: 'Show season details for Meadow FC' }));
    expect(await screen.findByText('The club did not participate in this season.')).toBeVisible();
    expect(screen.getByText('Season points: 0')).toBeVisible();
  });

  it('renders incomplete detail states without converting null to zero', async () => {
    setup({
      season: { id: '2023-24', label: '2023/24' }, club: { id: 'meadow-fc', name: 'Meadow FC' },
      participation: 'unknown', competitions: [], entries: [],
      total: null, status: 'missing', explanation: 'Participation and details unavailable.', dataStatus,
    });
    const user = userEvent.setup();
    render(<ClubRanking />);
    await user.selectOptions(await screen.findByLabelText('Season'), '2023-24');
    await user.click(await screen.findByRole('button', { name: 'Show season details for Meadow FC' }));
    expect(await screen.findByText('Participation and details unavailable.')).toBeVisible();
    expect(screen.getByText('Season points: Unavailable')).toBeVisible();
    expect(screen.queryByText('Season points: 0')).not.toBeInTheDocument();
  });

  it('ignores a detail response arriving after the selected season changes', async () => {
    let resolveOldDetail!: (response: Response) => void;
    vi.stubGlobal('fetch', vi.fn<typeof fetch>().mockImplementation(async (input) => {
      const url = new URL(String(input), 'http://localhost');
      if (url.pathname.endsWith('/seasons')) return new Response(JSON.stringify({
        activeSeasonId: '2026-27',
        seasons: [{ id: '2023-24', label: '2023/24' }, { id: '2026-27', label: '2026/27' }],
        dataStatus,
      }));
      if (url.pathname.endsWith('/season-details')) {
        return new Promise<Response>((resolve) => { resolveOldDetail = resolve; });
      }
      const selected = url.searchParams.get('seasonId')!;
      const period = selected === '2026-27' ? seasons : [
        { id: '2019-20', label: '2019/20' }, { id: '2020-21', label: '2020/21' },
        { id: '2021-22', label: '2021/22' }, { id: '2022-23', label: '2022/23' },
        { id: '2023-24', label: '2023/24' },
      ];
      return new Response(JSON.stringify({
        season: { id: selected, label: selected }, seasons: period,
        provisional: selected === '2026-27', explanation: 'Synthetic mock ranking.',
        clubs: [{ ...club, contributions: period.map((season) => ({
          seasonId: season.id, points: '1', participation: 'participated', status: 'complete',
        })) }],
        dataStatus,
      }));
    }));

    const user = userEvent.setup();
    render(<ClubRanking />);
    await user.click(await screen.findByRole('button', { name: 'Show season details for Meadow FC' }));
    expect(await screen.findByText('Loading season details...')).toBeVisible();
    await user.selectOptions(screen.getByLabelText('Season'), '2023-24');
    await screen.findByRole('button', { name: 'Show season details for Meadow FC' });
    await act(async () => {
      resolveOldDetail(new Response(JSON.stringify({
        season: { id: '2026-27', label: '2026/27' }, club: { id: 'meadow-fc', name: 'Meadow FC' },
        participation: 'participated', competitions: [], entries: [], total: '9', status: 'partial',
        explanation: 'Stale season detail.', dataStatus,
      })));
      await new Promise((resolve) => setTimeout(resolve, 0));
    });
    expect(screen.queryByText('Stale season detail.')).not.toBeInTheDocument();
  });
});
