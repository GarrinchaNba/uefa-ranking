import { useEffect, useState } from 'react';
import type { ClubSeasonDetailsResponse } from '@uefa-ranking/contracts';
import { getClubSeasonDetails } from '../api/client.js';

type Props = { clubId: string; clubName: string; seasonId: string };

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : 'Unable to load club season details';
}

export function ClubDetails({ clubId, clubName, seasonId }: Props) {
  const [expanded, setExpanded] = useState(false);
  const [detail, setDetail] = useState<ClubSeasonDetailsResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const panelId = `club-details-${clubId}`;

  useEffect(() => {
    if (!expanded) return undefined;
    let active = true;
    setDetail(null);
    setLoading(true);
    setError(null);
    getClubSeasonDetails(clubId, seasonId).then((response) => {
      if (!active) return;
      if (response.season.id !== seasonId || response.club.id !== clubId) {
        throw new Error('The server returned details for a different club or season');
      }
      setDetail(response);
      setLoading(false);
    }).catch((failure: unknown) => {
      if (!active) return;
      setError(errorMessage(failure));
      setLoading(false);
    });
    return () => { active = false; };
  }, [clubId, expanded, seasonId]);

  return (
    <>
      <button
        type="button"
        className="underline"
        aria-expanded={expanded}
        aria-controls={panelId}
        onClick={() => setExpanded((value) => !value)}
      >
        {expanded ? `Hide season details for ${clubName}` : `Show season details for ${clubName}`}
      </button>
      <section
        id={panelId}
        className="mt-2 min-w-72 space-y-2"
        aria-busy={loading}
        aria-label={`${clubName} ${seasonId} season details`}
        hidden={!expanded}
      >
        {expanded && (
          <>
            {loading && <p role="status">Loading season details...</p>}
            {error && <p role="alert">{error}</p>}
            {detail && (
              <>
                <p>{detail.explanation}</p>
                <p>
                  Season points: {detail.total ?? 'Unavailable'}
                  {detail.status === 'partial' ? ' (partial)' : ''}
                </p>
                {detail.competitions.map((competition) => (
                  <section key={competition.id} aria-label={competition.name}>
                    <h3 className="font-semibold">{competition.name}</h3>
                    {detail.entries.filter((entry) => entry.competition.id === competition.id).map((entry) => (
                      <p key={entry.id}>
                        {entry.round && <span>{entry.round.label}: </span>}
                        <span>{entry.kind === 'match' ? 'Match' : entry.kind === 'bonus' ? 'Bonus' : 'Adjustment'}: </span>
                        <span>{entry.label}</span>
                        {entry.status === 'awarded' && <span>Points: {entry.points}</span>}
                        {entry.status === 'pending' && <span>Pending; points not yet awarded</span>}
                        {entry.status === 'unknown' && <span>Points unavailable</span>}
                        {entry.status === 'inapplicable' && <span>No club match points</span>}
                      </p>
                    ))}
                  </section>
                ))}
              </>
            )}
          </>
        )}
      </section>
    </>
  );
}
