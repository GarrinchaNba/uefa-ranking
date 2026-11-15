import type { ActiveSeasonSnapshot, RankingSnapshot } from '@uefa-ranking/contracts';

const seasonIds = [
  '2018-19', '2019-20', '2020-21', '2021-22', '2022-23',
  '2023-24', '2024-25', '2025-26', '2026-27',
] as const;
const activeSeasonId = '2026-27';

const competitions = [
  { id: 'champions-league', name: 'UEFA Champions League' },
  { id: 'europa-league', name: 'UEFA Europa League' },
  { id: 'conference-league', name: 'UEFA Conference League' },
] as const;

const legacyStages = {
  'champions-league': ['qualifying', 'group-stage', 'round-of-16', 'quarter-final', 'semi-final', 'final'],
  'europa-league': ['qualifying', 'group-stage', 'knockout-play-off', 'round-of-16', 'quarter-final', 'semi-final', 'final'],
  'conference-league': ['qualifying', 'group-stage', 'knockout-play-off', 'round-of-16', 'quarter-final', 'semi-final', 'final'],
} as const;

const leaguePhaseStages = {
  'champions-league': ['qualifying', 'league-phase', 'knockout-phase-play-off', 'round-of-16', 'quarter-final', 'semi-final', 'final'],
  'europa-league': ['qualifying', 'league-phase', 'knockout-phase-play-off', 'round-of-16', 'quarter-final', 'semi-final', 'final'],
  'conference-league': ['qualifying', 'league-phase', 'knockout-phase-play-off', 'round-of-16', 'quarter-final', 'semi-final', 'final'],
} as const;

const stageLabel: Record<string, string> = {
  qualifying: 'Qualifying',
  'group-stage': 'Group stage',
  'league-phase': 'League phase',
  'knockout-play-off': 'Knockout round play-offs',
  'knockout-phase-play-off': 'Knockout phase play-offs',
  'round-of-16': 'Round of 16',
  'quarter-final': 'Quarter-finals',
  'semi-final': 'Semi-finals',
  final: 'Final',
};

const stages = seasonIds.flatMap((seasonId) => {
  const seasonStart = Number(seasonId.slice(0, 4));
  const schedules = seasonStart <= 2023 ? legacyStages : leaguePhaseStages;
  return competitions.filter((competition) => seasonStart >= 2021 || competition.id !== 'conference-league')
    .flatMap((competition) => schedules[competition.id].map((group, order) => ({
    id: `stage-${seasonId}-${competition.id}-${group}`,
    seasonId,
    competitionId: competition.id,
    order,
    group,
    label: stageLabel[group],
    })));
});

const clubs: ActiveSeasonSnapshot['clubs'] = [
  { id: 'albion-rovers', name: 'Albion Rovers', associationId: 'albion', leagueId: 'albion-premier' },
  { id: 'north-city', name: 'North City', associationId: 'albion', leagueId: 'albion-premier' },
  { id: 'caledonia-athletic', name: 'Caledonia Athletic', associationId: 'caledonia', leagueId: 'caledonia-premier' },
  { id: 'caledonia-thistle', name: 'Caledonia Thistle', associationId: 'caledonia', leagueId: 'caledonia-premier' },
  { id: 'historic-town', name: 'Historic Town', associationId: 'caledonia', leagueId: null },
  { id: 'unverified-united', name: 'Unverified United', associationId: 'albion', leagueId: null },
  { id: 'coastal-fc', name: 'Coastal FC', associationId: 'caledonia', leagueId: null },
  { id: 'meadow-fc', name: 'Meadow FC', associationId: 'island', leagueId: null },
];

function makeGame(
  id: string,
  competitionId: (typeof competitions)[number]['id'],
  homeClubId: string,
  awayClubId: string,
  status: 'ratified' | 'scheduled',
  homeScore: number | null,
  awayScore: number | null,
  seasonId: string = activeSeasonId,
) {
  return {
    id,
    seasonId,
    competitionId,
    stageId: `stage-${seasonId}-${competitionId}-league-phase`,
    homeClubId,
    awayClubId,
    status,
    homeScore,
    awayScore,
  };
}

const games = [
  makeGame('ucl-match-1', 'champions-league', 'albion-rovers', 'caledonia-athletic', 'ratified', 2, 1),
  makeGame('ucl-match-2', 'champions-league', 'caledonia-athletic', 'albion-rovers', 'ratified', 0, 0),
  {
    ...makeGame('ucl-qualifier-1', 'champions-league', 'caledonia-athletic', 'unverified-united', 'ratified', 2, 0),
    stageId: `stage-${activeSeasonId}-champions-league-qualifying`,
  },
  {
    ...makeGame('uel-qualifier-1', 'europa-league', 'north-city', 'unverified-united', 'ratified', 2, 0),
    stageId: `stage-${activeSeasonId}-europa-league-qualifying`,
  },
  {
    ...makeGame('uecl-qualifier-1', 'conference-league', 'meadow-fc', 'coastal-fc', 'ratified', 0, 2),
    stageId: `stage-${activeSeasonId}-conference-league-qualifying`,
  },
  {
    ...makeGame('uecl-qualifier-2', 'conference-league', 'coastal-fc', 'meadow-fc', 'ratified', 2, 0),
    stageId: `stage-${activeSeasonId}-conference-league-qualifying`,
  },
  {
    ...makeGame('uecl-qualifier-2023-1', 'conference-league', 'meadow-fc', 'coastal-fc', 'ratified', 0, 2, '2023-24'),
    stageId: 'stage-2023-24-conference-league-qualifying',
  },
  {
    ...makeGame('uecl-qualifier-2023-2', 'conference-league', 'coastal-fc', 'meadow-fc', 'ratified', 2, 0, '2023-24'),
    stageId: 'stage-2023-24-conference-league-qualifying',
  },
  makeGame('uel-match-1', 'europa-league', 'north-city', 'caledonia-thistle', 'ratified', 1, 0),
  makeGame('uel-match-2', 'europa-league', 'caledonia-thistle', 'north-city', 'ratified', 1, 1),
  makeGame('uecl-match-1', 'conference-league', 'unverified-united', 'coastal-fc', 'ratified', 1, 0),
  makeGame('uecl-match-2', 'conference-league', 'coastal-fc', 'unverified-united', 'scheduled', null, null),
];

function resultPoints(homeScore: number, awayScore: number, side: 'home' | 'away'): string {
  const score = side === 'home' ? homeScore : awayScore;
  const opponentScore = side === 'home' ? awayScore : homeScore;
  return score > opponentScore ? '2' : score === opponentScore ? '1' : '0';
}

const pointEntries: ActiveSeasonSnapshot['pointEntries'] = games.filter((game) => !game.id.includes('qualifier')).flatMap((game) => {
  const clubsInGame = [
    { clubId: game.homeClubId, side: 'home' as const, score: game.homeScore, opponentScore: game.awayScore },
    { clubId: game.awayClubId, side: 'away' as const, score: game.awayScore, opponentScore: game.homeScore },
  ];

  return clubsInGame.map(({ clubId, side, score, opponentScore }) => {
    const awarded = game.status === 'ratified';
    const points = awarded
      ? resultPoints(game.homeScore!, game.awayScore!, side)
      : null;
    return {
      id: `entry-${game.id}-${side}`,
      clubId,
      seasonId: activeSeasonId,
      kind: 'match' as const,
      status: awarded ? 'awarded' as const : 'pending' as const,
      points,
      ruleId: 'club-match-points-2026-27',
      sourceId: `${game.id}-${side}`,
      gameId: game.id,
      label: awarded
        ? score! > opponentScore! ? 'Win' : score === opponentScore ? 'Draw' : 'Defeat'
        : 'Pending result',
    };
  });
});
pointEntries.push({
  id: 'entry-meadow-elimination', clubId: 'meadow-fc', seasonId: activeSeasonId,
  kind: 'bonus', status: 'awarded', points: '1', ruleId: 'conference-q1-elimination-2026-27',
  sourceId: 'conference-q1-elimination-meadow', gameId: null, label: 'First qualifying round elimination',
});

const historicalPoints: Record<string, Record<string, string | null>> = {
  'albion-rovers': { '2018-19': '3', '2019-20': '4', '2020-21': '5', '2021-22': '6', '2022-23': '4', '2023-24': '6', '2024-25': '7', '2025-26': '8' },
  'north-city': { '2018-19': '1', '2019-20': '2', '2020-21': '1', '2021-22': '2', '2022-23': '2', '2023-24': '2', '2024-25': '2', '2025-26': '2' },
  'caledonia-athletic': { '2018-19': '7', '2019-20': '6', '2020-21': '7', '2021-22': '6', '2022-23': '6', '2023-24': '7', '2024-25': '8', '2025-26': '8' },
  'caledonia-thistle': { '2018-19': '1', '2019-20': '1', '2020-21': '2', '2021-22': '1', '2022-23': '1', '2023-24': '2', '2024-25': '3', '2025-26': '4' },
  'historic-town': { '2018-19': '2', '2019-20': '1', '2020-21': '1', '2021-22': '2', '2022-23': '1', '2023-24': '2', '2024-25': '4', '2025-26': '5' },
  'unverified-united': { '2018-19': '1', '2019-20': '2', '2020-21': '2', '2021-22': '3', '2022-23': '3', '2023-24': null, '2024-25': '5', '2025-26': '6' },
  'coastal-fc': { '2018-19': '1', '2019-20': '1', '2020-21': '1', '2021-22': '1', '2022-23': '1', '2023-24': '1', '2024-25': '1', '2025-26': '1' },
  'meadow-fc': { '2018-19': '1', '2019-20': '1', '2020-21': '1', '2021-22': '1', '2022-23': '1', '2023-24': '1', '2024-25': '1', '2025-26': '1' },
};

const currentSeasonPoints: Record<string, string> = {
  'albion-rovers': '3',
  'north-city': '3',
  'caledonia-athletic': '1',
  'caledonia-thistle': '1',
  'historic-town': '0',
  'unverified-united': '2',
  'coastal-fc': '0',
  'meadow-fc': '1',
};

const clubSeasonRecords = clubs.flatMap((club) => seasonIds.map((seasonId) => {
  if (seasonId === activeSeasonId) {
    if (club.id === 'historic-town') {
      return {
        clubId: club.id,
        seasonId,
        participation: 'did-not-participate' as const,
        points: '0',
        status: 'complete' as const,
        provenance: 'synthetic' as const,
      };
    }

    return {
      clubId: club.id,
      seasonId,
      participation: 'participated' as const,
      points: currentSeasonPoints[club.id],
      status: club.id === 'meadow-fc' ? 'complete' as const : 'partial' as const,
      provenance: 'calculated' as const,
    };
  }

  const points = historicalPoints[club.id][seasonId];
  return {
    clubId: club.id,
    seasonId,
    participation: 'participated' as const,
    points,
    status: points === null ? 'missing' as const : 'complete' as const,
    provenance: 'synthetic' as const,
  };
}));

const associationCoefficients: ActiveSeasonSnapshot['associationCoefficients'] = [
  ...(['albion', 'caledonia'] as const).flatMap((associationId) =>
    seasonIds.slice(0, 4).map((seasonId) => ({
      associationId, seasonId, points: associationId === 'albion' ? '20' : '19.5',
      status: 'complete' as const, provenance: 'synthetic' as const,
    }))),
  ...seasonIds.map((seasonId) => ({
    associationId: 'island', seasonId, points: seasonId === activeSeasonId || seasonId === '2023-24' ? '0' : '1',
    status: 'complete' as const, provenance: 'synthetic' as const,
  })),
  { associationId: 'albion', seasonId: '2022-23', points: '20', status: 'complete', provenance: 'synthetic' },
  { associationId: 'albion', seasonId: '2023-24', points: '22', status: 'complete', provenance: 'synthetic' },
  { associationId: 'albion', seasonId: '2024-25', points: '25', status: 'complete', provenance: 'synthetic' },
  { associationId: 'albion', seasonId: '2025-26', points: '23', status: 'complete', provenance: 'synthetic' },
  { associationId: 'albion', seasonId: '2026-27', points: '30', status: 'complete', provenance: 'synthetic' },
  { associationId: 'caledonia', seasonId: '2022-23', points: '20', status: 'complete', provenance: 'synthetic' },
  { associationId: 'caledonia', seasonId: '2023-24', points: '25', status: 'complete', provenance: 'synthetic' },
  { associationId: 'caledonia', seasonId: '2024-25', points: null, status: 'missing', provenance: 'synthetic' },
  { associationId: 'caledonia', seasonId: '2025-26', points: '10', status: 'complete', provenance: 'synthetic' },
  { associationId: 'caledonia', seasonId: '2026-27', points: '10', status: 'complete', provenance: 'synthetic' },
];

const legacySnapshot = {
  activeSeasonId,
  selectableSeasonIds: ['2023-24', '2026-27'],
  seasons: seasonIds.map((id) => ({
    id,
    label: `${id.slice(0, 4)}/${id.slice(5)}`,
  })),
  associations: [
    { id: 'albion', name: 'Albion' },
    { id: 'caledonia', name: 'Caledonia' },
    { id: 'island', name: 'Island' },
  ],
  leagues: [
    { id: 'albion-premier', name: 'Albion Premier Division', associationId: 'albion' },
    { id: 'caledonia-premier', name: 'Caledonia Premier Division', associationId: 'caledonia' },
  ],
  clubs,
  competitions: competitions.map((competition) => ({
    id: competition.id,
    name: competition.name,
  })),
  stages,
  games,
  pointEntries,
  clubSeasonRecords,
  associationCoefficients,
} satisfies ActiveSeasonSnapshot;

const clubSeasons: RankingSnapshot['clubSeasons'] = clubSeasonRecords.map((record) => {
  const club = clubs.find(({ id }) => id === record.clubId)!;
  const historicalTransfer = club.id === 'historic-town' && record.seasonId <= '2023-24';
  return {
    ...record,
    sourceId: 'synthetic-fixture',
    associationId: historicalTransfer ? 'albion' : club.associationId,
    leagueId: historicalTransfer ? null : club.leagueId,
    domesticPosition: null,
    detailStatus: record.participation === 'did-not-participate'
      || (record.clubId === 'meadow-fc' && [activeSeasonId, '2023-24'].includes(record.seasonId))
      ? 'available' : record.seasonId === activeSeasonId ? 'partial' : 'unavailable',
  };
});

const participations: RankingSnapshot['participations'] = [];
for (const game of games) {
  for (const clubId of [game.homeClubId, game.awayClubId]) {
    if (!participations.some((entry) => entry.clubId === clubId
      && entry.seasonId === game.seasonId && entry.competitionId === game.competitionId)) {
      participations.push({ clubId, seasonId: game.seasonId, competitionId: game.competitionId });
    }
  }
}

const clubAwards: RankingSnapshot['clubAwards'] = pointEntries.map((entry) => ({
  ...entry,
  competitionId: entry.gameId === null ? 'conference-league' : games.find(({ id }) => id === entry.gameId)!.competitionId,
  stageId: entry.gameId === null
    ? `stage-${activeSeasonId}-conference-league-qualifying`
    : games.find(({ id }) => id === entry.gameId)!.stageId,
}));
clubAwards.push({
  id: 'entry-meadow-elimination-2023', clubId: 'meadow-fc', seasonId: '2023-24',
  competitionId: 'conference-league', stageId: 'stage-2023-24-conference-league-qualifying',
  gameId: null, kind: 'bonus', status: 'awarded', points: '1',
  ruleId: 'conference-q1-elimination-2023-24', sourceId: 'conference-q1-elimination-meadow-2023',
  label: 'First qualifying round elimination',
});

const associationAwards: RankingSnapshot['associationAwards'] = clubAwards.filter((award) => award.kind === 'match').map((award) => ({
  id: `association-${award.id}`,
  associationId: clubs.find(({ id }) => id === award.clubId)!.associationId,
  clubId: award.clubId,
  seasonId: award.seasonId,
  competitionId: award.competitionId,
  stageId: award.stageId,
  gameId: award.gameId,
  status: award.status,
  points: award.points,
  ruleId: 'association-league-match-2026-27',
  sourceId: award.sourceId,
  label: award.label,
}));
associationAwards.push(...[
  { clubId: 'caledonia-athletic', associationId: 'caledonia', points: '1' },
  { clubId: 'unverified-united', associationId: 'albion', points: '0' },
].map(({ clubId, associationId, points }) => ({
  id: `association-ucl-qualifier-1-${clubId}`,
  associationId, clubId, seasonId: activeSeasonId,
  competitionId: 'champions-league' as const,
  stageId: `stage-${activeSeasonId}-champions-league-qualifying`,
  gameId: 'ucl-qualifier-1', status: 'awarded' as const, points,
  ruleId: 'association-qualifying-match-2026-27',
  sourceId: `ucl-qualifier-1-${clubId}`, label: 'Qualifying result',
})));
for (const gameId of ['uecl-qualifier-1', 'uecl-qualifier-2']) {
  for (const { clubId, associationId, points } of [
    { clubId: 'coastal-fc', associationId: 'caledonia', points: '1' },
    { clubId: 'meadow-fc', associationId: 'island', points: '0' },
  ]) {
    associationAwards.push({
      id: `association-${gameId}-${clubId}`, associationId, clubId, seasonId: activeSeasonId,
      competitionId: 'conference-league',
      stageId: `stage-${activeSeasonId}-conference-league-qualifying`,
      gameId, status: 'awarded', points, ruleId: 'association-qualifying-match-2026-27',
      sourceId: `${gameId}-${clubId}`, label: 'Qualifying result',
    });
  }
}
for (const gameId of ['uecl-qualifier-2023-1', 'uecl-qualifier-2023-2']) {
  for (const { clubId, associationId, points } of [
    { clubId: 'coastal-fc', associationId: 'caledonia', points: '1' },
    { clubId: 'meadow-fc', associationId: 'island', points: '0' },
  ]) {
    associationAwards.push({
      id: `association-${gameId}-${clubId}`, associationId, clubId, seasonId: '2023-24',
      competitionId: 'conference-league', stageId: 'stage-2023-24-conference-league-qualifying',
      gameId, status: 'awarded', points, ruleId: 'association-qualifying-match-2023-24',
      sourceId: `${gameId}-${clubId}`, label: 'Qualifying result',
    });
  }
}
associationAwards.push(...[
  { clubId: 'north-city', points: '1' },
  { clubId: 'unverified-united', points: '0' },
].map(({ clubId, points }) => ({
  id: `association-uel-qualifier-1-${clubId}`,
  associationId: 'albion', clubId, seasonId: activeSeasonId,
  competitionId: 'europa-league' as const,
  stageId: `stage-${activeSeasonId}-europa-league-qualifying`,
  gameId: 'uel-qualifier-1', status: 'awarded' as const, points,
  ruleId: 'association-qualifying-match-2026-27',
  sourceId: `uel-qualifier-1-${clubId}`, label: 'Qualifying result',
})));

const associationSeasons: RankingSnapshot['associationSeasons'] = associationCoefficients.map((record) => {
  const active = record.seasonId === activeSeasonId;
  const completeIsland = (active || record.seasonId === '2023-24') && record.associationId === 'island';
  return {
    ...record,
    points: completeIsland ? '0' : active ? null : record.points,
    status: completeIsland ? 'complete' : active ? 'missing' : record.status,
    provenance: completeIsland ? 'calculated' : 'synthetic',
    sourceId: 'synthetic-fixture',
    participantCount: completeIsland ? 1 : null,
    divisor: completeIsland ? 1 : null,
    divisorReason: completeIsland ? 'participants' : 'unknown',
    entitledCount: null,
    unreplacedReason: null,
    awardStatus: completeIsland ? 'available' : active ? 'partial' : 'unavailable',
  };
});

export const mockSnapshot = {
  ...legacySnapshot,
  ruleSupport: seasonIds.map((seasonId) => ({
    seasonId,
    clubScoring: [activeSeasonId, '2021-22', '2023-24'].includes(seasonId) ? 'verified' : 'unsupported',
    associationScoring: [activeSeasonId, '2021-22', '2023-24'].includes(seasonId) ? 'verified' : 'unsupported',
    ranking: seasonId === activeSeasonId ? 'verified' : 'unsupported',
    sourceId: seasonId === activeSeasonId ? 'uefa-2026-27'
      : seasonId === '2021-22' ? 'user-supplied-uefa-2021-22'
      : seasonId === '2023-24' ? 'user-supplied-uefa-2023-24-and-2024-25'
      : 'research-pending',
  })),
  clubSeasons,
  participations,
  clubAwards,
  associationAwards,
  associationSeasons,
} satisfies ActiveSeasonSnapshot & RankingSnapshot;
