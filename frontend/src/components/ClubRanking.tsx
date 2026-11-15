import { useEffect, useMemo, useState } from 'react';
import type { ClubRankingResponse, SeasonsResponse } from '@uefa-ranking/contracts';
import { getClubRanking, getSeasons } from '../api/client.js';
import { ClubDetails } from './ClubDetails.js';
import { DataStatus } from './DataStatus.js';

type SortState = { seasonId: string; direction: 'asc' | 'desc' } | null;
type Props = {
  availableSeasons?: SeasonsResponse;
  selectedSeasonId?: string;
  onSelectedSeasonChange?: (seasonId: string) => void;
};

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : 'Unable to load club rankings';
}

function contributionOrder(left: string | null, right: string | null, direction: 'asc' | 'desc'): number {
  if (left === null || right === null) return left === right ? 0 : left === null ? 1 : -1;
  const toMilli = (value: string) => {
    const [whole, fraction = ''] = value.split('.');
    return BigInt(whole) * 1000n + BigInt((fraction + '000').slice(0, 3));
  };
  const a = toMilli(left);
  const b = toMilli(right);
  return (a < b ? -1 : a > b ? 1 : 0) * (direction === 'asc' ? 1 : -1);
}

export function ClubRanking({ availableSeasons, selectedSeasonId, onSelectedSeasonChange }: Props) {
  const [loadedSeasons, setLoadedSeasons] = useState<SeasonsResponse | null>(null);
  const [localSeasonId, setLocalSeasonId] = useState('');
  const seasons = availableSeasons ?? loadedSeasons;
  const seasonId = selectedSeasonId ?? localSeasonId;
  const chooseSeason = (id: string) => {
    setLocalSeasonId(id);
    onSelectedSeasonChange?.(id);
  };
  const [ranking, setRanking] = useState<ClubRankingResponse | null>(null);
  const [sort, setSort] = useState<SortState>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    if (availableSeasons) return undefined;
    getSeasons().then((response) => {
      if (!active) return;
      setLoadedSeasons(response);
      if (selectedSeasonId === undefined) setLocalSeasonId(response.activeSeasonId);
    }).catch((failure: unknown) => {
      if (!active) return;
      setError(errorMessage(failure));
      setLoading(false);
    });
    return () => { active = false; };
  }, [availableSeasons, selectedSeasonId]);

  useEffect(() => {
    if (!seasonId) return;
    let active = true;
    setLoading(true);
    setError(null);
    setRanking(null);
    setSort(null);
    getClubRanking(seasonId).then((response) => {
      if (!active) return;
      if (response.season.id !== seasonId) throw new Error('The server returned a different ranking period');
      setRanking(response);
      setLoading(false);
    }).catch((failure: unknown) => {
      if (!active) return;
      setError(errorMessage(failure));
      setLoading(false);
    });
    return () => { active = false; };
  }, [seasonId]);

  const rows = useMemo(() => {
    if (!ranking) return [];
    if (!sort) return ranking.clubs;
    const index = ranking.seasons.findIndex((season) => season.id === sort.seasonId);
    return [...ranking.clubs].sort((left, right) =>
      contributionOrder(left.contributions[index]?.points ?? null, right.contributions[index]?.points ?? null, sort.direction)
      || left.name.localeCompare(right.name) || left.clubId.localeCompare(right.clubId));
  }, [ranking, sort]);

  const status = ranking?.dataStatus ?? seasons?.dataStatus;
  return (
    <section aria-labelledby="club-ranking-heading" className="space-y-4">
      <h2 id="club-ranking-heading" className="text-xl font-semibold">Global club ranking</h2>
      <p>Five-season club coefficients, with the applicable association minimum shown separately.</p>
      <DataStatus dataStatus={status} />
      {loading && <DataStatus loading />}
      {error && <DataStatus error={error} />}
      {seasons && (
        <label className="grid w-fit gap-1">
          Season
          <select className="rounded border p-2" value={seasonId} onChange={(event) => {
            setRanking(null);
            chooseSeason(event.target.value);
          }}>
            {seasons.seasons.map((season) => <option key={season.id} value={season.id}>{season.label}</option>)}
          </select>
        </label>
      )}
      {ranking && (
        <>
          <p role="status">{ranking.explanation}</p>
          {ranking.provisional && <p><strong>Provisional:</strong> current-season rolling ranking, not UEFA's fixed seeding ranking.</p>}
          {rows.length === 0 ? <p>No eligible clubs in this five-season period.</p> : (
            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <caption className="text-left font-semibold">
                  Club coefficients, {ranking.seasons[0].label}–{ranking.season.label}
                </caption>
                <thead>
                  <tr>
                    <th scope="col">Rank</th>
                    <th scope="col">Movement</th>
                    <th scope="col">Club</th>
                    <th scope="col">Association</th>
                    {ranking.seasons.map((season) => {
                      const activeSort = sort?.seasonId === season.id;
                      return (
                        <th key={season.id} scope="col" aria-sort={activeSort ? (sort.direction === 'asc' ? 'ascending' : 'descending') : 'none'}>
                          <button type="button" className="underline" onClick={() => setSort({
                            seasonId: season.id,
                            direction: activeSort && sort.direction === 'desc' ? 'asc' : 'desc',
                          })}>
                            {season.label} contribution{activeSort ? (sort.direction === 'asc' ? ' ascending' : ' descending') : ''}
                          </button>
                        </th>
                      );
                    })}
                    <th scope="col">Club sum</th>
                    <th scope="col">Association minimum</th>
                    <th scope="col">Final coefficient</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((club) => (
                    <tr key={club.clubId} className="border-t align-top">
                        <td>{club.rank ?? (club.rankStatus === 'unresolved' ? 'Tie unresolved' : 'Unavailable')}</td>
                        <td>
                          {club.movement === null ? <span aria-label="Movement unavailable">Unavailable</span> : (
                            <span
                              className={club.movement > 0 ? 'text-green-700' : club.movement < 0 ? 'text-red-700' : ''}
                              aria-label={club.movement > 0 ? `Up ${club.movement} places`
                                : club.movement < 0 ? `Down ${Math.abs(club.movement)} places` : 'Unchanged'}
                            >
                              {club.movement > 0 ? `+${club.movement}` : club.movement}
                            </span>
                          )}
                        </td>
                        <th scope="row">
                          <span className="block">{club.name}</span>
                          <ClubDetails clubId={club.clubId} clubName={club.name} seasonId={ranking.season.id} />
                        </th>
                        <td>{club.association?.name ?? 'Unknown'}</td>
                        {club.contributions.map((contribution) => (
                          <td key={contribution.seasonId}>
                            {contribution.points ?? 'Unavailable'}
                            {contribution.status === 'partial' ? ' (partial)' : ''}
                          </td>
                        ))}
                        <td>{club.clubPointsSum ?? 'Unavailable'}</td>
                        <td>
                          {club.associationMinimum ?? 'Unavailable'}
                          {club.minimumApplied === true ? ' (applied)' : club.minimumApplied === false ? ' (not applied)' : ''}
                        </td>
                        <td>
                          {club.coefficient ?? 'Unavailable'}
                          {club.reason && <p className="max-w-72 text-sm text-amber-800">{club.reason}</p>}
                          {club.status === 'incomplete' && <span className="text-sm">Incomplete</span>}
                        </td>
                      </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </>
      )}
    </section>
  );
}
