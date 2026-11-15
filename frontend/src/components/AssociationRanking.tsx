import { useEffect, useMemo, useState } from 'react';
import type { AssociationRankingResponse, SeasonsResponse } from '@uefa-ranking/contracts';
import { getAssociationRanking, getSeasons } from '../api/client.js';
import { AssociationDetails } from './AssociationDetails.js';
import { DataStatus } from './DataStatus.js';
import { RankMovement } from './RankMovement.js';

type SortState = { seasonId: string; direction: 'asc' | 'desc' } | null;
type Props = {
  availableSeasons?: SeasonsResponse;
  selectedSeasonId?: string;
  onSelectedSeasonChange?: (seasonId: string) => void;
};

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : 'Unable to load association rankings';
}

function contributionOrder(left: string | null, right: string | null, direction: 'asc' | 'desc'): number {
  if (left === null || right === null) return left === right ? 0 : left === null ? 1 : -1;
  const toMilli = (value: string) => {
    const [whole, fraction] = value.split('.');
    return BigInt(whole) * 1000n + BigInt(((fraction ?? '') + '000').slice(0, 3));
  };
  const a = toMilli(left);
  const b = toMilli(right);
  return (a < b ? -1 : a > b ? 1 : 0) * (direction === 'asc' ? 1 : -1);
}

export function AssociationRanking({ availableSeasons, selectedSeasonId, onSelectedSeasonChange }: Props) {
  const [loadedSeasons, setLoadedSeasons] = useState<SeasonsResponse | null>(null);
  const [localSeasonId, setLocalSeasonId] = useState('');
  const seasons = availableSeasons ?? loadedSeasons;
  const seasonId = selectedSeasonId ?? localSeasonId;
  const [ranking, setRanking] = useState<AssociationRankingResponse | null>(null);
  const [sort, setSort] = useState<SortState>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const chooseSeason = (id: string) => {
    setLocalSeasonId(id);
    onSelectedSeasonChange?.(id);
  };

  useEffect(() => {
    if (availableSeasons) return undefined;
    let active = true;
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
    getAssociationRanking(seasonId, sort?.seasonId, sort?.direction).then((response) => {
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
  }, [seasonId, sort]);

  const rows = useMemo(() => {
    if (!ranking || !sort) return ranking?.associations ?? [];
    const index = ranking.seasons.findIndex((season) => season.id === sort.seasonId);
    return [...ranking.associations].sort((left, right) =>
      contributionOrder(left.contributions[index]?.coefficient ?? null,
        right.contributions[index]?.coefficient ?? null, sort.direction)
      || left.association.name.localeCompare(right.association.name)
      || left.association.id.localeCompare(right.association.id));
  }, [ranking, sort]);
  const status = ranking?.dataStatus ?? seasons?.dataStatus;

  return (
    <section aria-labelledby="association-ranking-heading" aria-busy={loading} className="ranking-section space-y-4">
      <h2 id="association-ranking-heading" className="text-xl font-semibold">Global association ranking</h2>
      <p className="ranking-intro">Five-season association coefficients from each season&apos;s association-specific coefficient input.</p>
      <DataStatus dataStatus={status} />
      {loading && <DataStatus loading />}
      {error && <DataStatus error={error} />}
      {seasons && (
        <label className="season-picker">
          Season
          <select value={seasonId} onChange={(event) => {
            setRanking(null);
            setSort(null);
            chooseSeason(event.target.value);
          }}>
            {seasons.seasons.map((season) => <option key={season.id} value={season.id}>{season.label}</option>)}
          </select>
        </label>
      )}
      {ranking && (
        <>
          <p role="status" className="ranking-note">{ranking.explanation}</p>
          {ranking.provisional && <p className="ranking-note"><strong>Provisional:</strong> current-season five-year coefficients, not an official final UEFA ranking.</p>}
          {rows.length === 0 ? <p>No associations are available for this five-season period.</p> : (
            <>
            <div className="mobile-sort-controls" aria-label="Sort association ranking">
              <label>
                Sort by season contribution
                <select
                  aria-label="Sort by season contribution"
                  value={sort?.seasonId ?? ranking.seasons[4].id}
                  onChange={(event) => setSort({ seasonId: event.target.value, direction: 'desc' })}
                >
                  {ranking.seasons.map((season) => <option key={season.id} value={season.id}>{season.label}</option>)}
                </select>
              </label>
              <button
                type="button"
                aria-label={`Sort ${sort?.direction === 'asc' ? 'descending' : 'ascending'}`}
                onClick={() => setSort((current) => ({
                  seasonId: current?.seasonId ?? ranking.seasons[4].id,
                  direction: current?.direction === 'asc' ? 'desc' : 'asc',
                }))}
              >
                {sort?.direction === 'asc' ? 'Ascending' : 'Descending'}
              </button>
            </div>
            <div className="table-scroll">
              <table className="ranking-table">
                <caption className="text-left font-semibold">
                  Association coefficients, {ranking.seasons[0].label}–{ranking.season.label}
                </caption>
                <thead>
                  <tr>
                    <th scope="col">Rank</th>
                    <th scope="col">Movement</th>
                    <th scope="col">Association</th>
                    {ranking.seasons.map((season) => {
                      const activeSort = sort?.seasonId === season.id;
                      return (
                        <th key={season.id} scope="col"
                          aria-sort={activeSort ? (sort.direction === 'asc' ? 'ascending' : 'descending') : 'none'}>
                          <button type="button" className="underline" onClick={() => setSort({
                            seasonId: season.id,
                            direction: activeSort && sort.direction === 'desc' ? 'asc' : 'desc',
                          })}>
                            {season.label} contribution{activeSort ? (sort.direction === 'asc' ? ' ascending' : ' descending') : ''}
                          </button>
                        </th>
                      );
                    })}
                    <th scope="col">Five-season coefficient</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((row) => (
                    <tr key={row.association.id} className="border-t align-top">
                      <td>{row.rank ?? (row.rankStatus === 'unresolved' ? 'Tie unresolved' : 'Unavailable')}</td>
                      <td><RankMovement movement={row.movement} /></td>
                      <th scope="row">
                        <span className="block">{row.association.name}</span>
                        <AssociationDetails
                          associationId={row.association.id}
                          associationName={row.association.name}
                          seasonId={ranking.season.id}
                          idSuffix="table"
                        />
                      </th>
                      {row.contributions.map((contribution) => (
                        <td key={contribution.seasonId}>
                          {contribution.coefficient ?? 'Unavailable'}
                          {contribution.status === 'partial' ? ' (partial)' : ''}
                        </td>
                      ))}
                      <td>
                        {row.coefficient ?? 'Unavailable'}
                        {row.reason && <p className="reason-text">{row.reason}</p>}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="ranking-cards">
              {rows.map((row) => (
                <article className="ranking-card" key={row.association.id} aria-label={`${row.association.name} ranking details`}>
                  <div className="ranking-card-heading">
                    <div className="ranking-card-identity">
                      <h3>{row.association.name}</h3>
                    </div>
                    <div className="ranking-card-rank">
                      <strong>{row.rank ?? '—'}</strong>
                      <span>{row.rankStatus === 'unresolved' ? 'Tie unresolved' : row.rank === null ? 'Rank unavailable' : 'Rank'}</span>
                    </div>
                    <div className="ranking-card-movement">
                      Movement: <RankMovement movement={row.movement} />
                    </div>
                  </div>
                  <dl className="contribution-list">
                    {row.contributions.map((contribution) => (
                      <div className="contribution-item" key={contribution.seasonId}>
                        <dt>{ranking.seasons.find((season) => season.id === contribution.seasonId)?.label} contribution</dt>
                        <dd>
                          {contribution.coefficient ?? 'Unavailable'}
                          {contribution.status === 'partial' && <span className="partial-label"> (partial)</span>}
                        </dd>
                      </div>
                    ))}
                    <div className="contribution-item contribution-item-primary">
                      <dt>Five-season coefficient</dt>
                      <dd>{row.coefficient ?? 'Unavailable'}</dd>
                    </div>
                  </dl>
                  <p className="partial-label">Status: {row.status}</p>
                  {row.reason && <p className="reason-text">{row.reason}</p>}
                  <div className="card-detail-action">
                    <AssociationDetails
                      associationId={row.association.id}
                      associationName={row.association.name}
                      seasonId={ranking.season.id}
                      idSuffix="card"
                    />
                  </div>
                </article>
              ))}
            </div>
            </>
          )}
        </>
      )}
    </section>
  );
}
