import { useEffect, useState } from 'react';
import type {
  AssociationsResponse, SeasonRankingResponse, SeasonsResponse,
} from '@uefa-ranking/contracts';
import { getAssociations, getSeasonRanking, getSeasons } from '../api/client.js';
import { DataStatus } from './DataStatus.js';

function message(error: unknown): string {
  return error instanceof Error ? error.message : 'Unable to load ranking data';
}

export function SeasonRanking() {
  const [seasons, setSeasons] = useState<SeasonsResponse | null>(null);
  const [seasonId, setSeasonId] = useState('');
  const [associations, setAssociations] = useState<AssociationsResponse | null>(null);
  const [associationId, setAssociationId] = useState('');
  const [ranking, setRanking] = useState<SeasonRankingResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    getSeasons().then((result) => {
      if (!active) return;
      setSeasons(result);
      setSeasonId(result.activeSeasonId);
    }).catch((failure: unknown) => {
      if (!active) return;
      setError(message(failure));
      setLoading(false);
    });
    return () => { active = false; };
  }, []);

  useEffect(() => {
    if (!seasonId) return;
    let active = true;
    setLoading(true);
    setError(null);
    setAssociations(null);
    setAssociationId('');
    setRanking(null);
    getAssociations(seasonId).then((result) => {
      if (!active) return;
      if (result.seasonId !== seasonId) throw new Error('The server returned a different season');
      setAssociations(result);
      setLoading(false);
    }).catch((failure: unknown) => {
      if (!active) return;
      setError(message(failure));
      setLoading(false);
    });
    return () => { active = false; };
  }, [seasonId]);

  useEffect(() => {
    if (!seasonId || !associationId) return;
    let active = true;
    setLoading(true);
    setError(null);
    setRanking(null);
    getSeasonRanking(seasonId, associationId).then((result) => {
      if (!active) return;
      if (result.season.id !== seasonId || result.association.id !== associationId) {
        throw new Error('The server returned a different ranking');
      }
      setRanking(result);
      setLoading(false);
    }).catch((failure: unknown) => {
      if (!active) return;
      setError(message(failure));
      setLoading(false);
    });
    return () => { active = false; };
  }, [seasonId, associationId]);

  const status = ranking?.dataStatus ?? associations?.dataStatus ?? seasons?.dataStatus;

  return (
    <section aria-labelledby="season-ranking-heading" className="space-y-4">
      <h2 id="season-ranking-heading" className="text-xl font-semibold">Current-season performance</h2>
      <p>Club points for the selected season, not UEFA's five-season ranking. Partial totals may change.</p>
      <DataStatus dataStatus={status} />
      {loading && <DataStatus loading />}
      {error && <DataStatus error={error} />}
      {seasons && (
        <div className="flex flex-wrap gap-4">
          <label className="grid gap-1">
            Season
            <select className="rounded border p-2" value={seasonId} onChange={(event) => {
              setRanking(null);
              setAssociations(null);
              setAssociationId('');
              setSeasonId(event.target.value);
            }}>
              {seasons.seasons.map((season) => <option key={season.id} value={season.id}>{season.label}</option>)}
            </select>
          </label>
          <label className="grid gap-1">
            Country
            <select className="rounded border p-2" value={associationId} disabled={!associations} onChange={(event) => {
              setRanking(null);
              setError(null);
              if (!event.target.value) setLoading(false);
              setAssociationId(event.target.value);
            }}>
              <option value="">Select a country</option>
              {associations?.associations.map((association) => (
                <option key={association.id} value={association.id}>{association.name}</option>
              ))}
            </select>
          </label>
        </div>
      )}
      {!loading && !error && associations?.associations.length === 0 && (
        <p>No countries have participating clubs for this season.</p>
      )}
      {ranking && (
        ranking.clubs.length === 0
          ? <p>No participating clubs for {ranking.association.name} in {ranking.season.label}.</p>
          : <div className="overflow-x-auto">
            <table className="w-full text-left">
              <caption className="text-left font-semibold">{ranking.association.name} — {ranking.season.label}</caption>
              <thead><tr><th scope="col">Club</th><th scope="col">League</th><th scope="col">Points</th></tr></thead>
              <tbody>
                {ranking.clubs.map((club) => (
                  <tr key={club.clubId}>
                    <th scope="row">{club.name}</th>
                    <td>{club.league?.name ?? 'Unknown'}</td>
                    <td>{club.total ?? 'Unavailable'}{club.totalStatus === 'partial' ? ' (partial)' : ''}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
      )}
    </section>
  );
}
