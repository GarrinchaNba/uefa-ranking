import { useEffect, useState } from 'react';
import type { AssociationSeasonDetailsResponse } from '@uefa-ranking/contracts';
import { getAssociationSeasonDetails } from '../api/client.js';

type Props = { associationId: string; associationName: string; seasonId: string };

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : 'Unable to load association season details';
}

export function AssociationDetails({ associationId, associationName, seasonId }: Props) {
  const [expanded, setExpanded] = useState(false);
  const [detail, setDetail] = useState<AssociationSeasonDetailsResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const panelId = `association-details-${associationId}`;

  useEffect(() => {
    if (!expanded) return undefined;
    let active = true;
    setDetail(null);
    setLoading(true);
    setError(null);
    getAssociationSeasonDetails(associationId, seasonId).then((response) => {
      if (!active) return;
      if (response.season.id !== seasonId || response.association.id !== associationId) {
        throw new Error('The server returned details for a different association or season');
      }
      setDetail(response);
      setLoading(false);
    }).catch((failure: unknown) => {
      if (!active) return;
      setError(errorMessage(failure));
      setLoading(false);
    });
    return () => { active = false; };
  }, [associationId, expanded, seasonId]);

  return (
    <>
      <button
        type="button"
        className="underline"
        aria-expanded={expanded}
        aria-controls={panelId}
        onClick={() => setExpanded((value) => !value)}
      >
        {expanded ? `Hide competition details for ${associationName}` : `Show competition details for ${associationName}`}
      </button>
      <section
        id={panelId}
        className="mt-2 min-w-72 space-y-2"
        aria-busy={loading}
        aria-label={`${associationName} ${seasonId} competition details`}
        hidden={!expanded}
      >
        {expanded && (
          <>
            {loading && <p role="status">Loading association details...</p>}
            {error && <p role="alert">{error}</p>}
            {detail && (
              <>
                <p>{detail.explanation}</p>
                {detail.groups.length === 0 && <p>No competition groups are available.</p>}
                {detail.groups.map((group) => (
                  <section key={group.competition.id} aria-label={group.competition.name}>
                    <h3 className="font-semibold">{group.competition.name}</h3>
                    <p>
                      Club-point subtotal: {group.total ?? 'Unavailable'}
                      {group.status === 'partial' ? ' (partial)' : group.status === 'missing' ? ' (unavailable)' : ''}
                    </p>
                    {group.clubs.map((club) => (
                      <div key={club.clubId}>
                        <h4>{club.name}: {club.points ?? 'Unavailable'}{club.status === 'partial' ? ' (partial)' : ''}</h4>
                        {club.entries.map((entry) => (
                          <p key={entry.id}>
                            {entry.round && <span>{entry.round.label}: </span>}
                            <span>{entry.kind === 'match' ? 'Match' : entry.kind === 'bonus' ? 'Bonus' : 'Adjustment'}: </span>
                            <span>{entry.label}</span>
                            {entry.status === 'awarded' && <span> Points: {entry.points}</span>}
                            {entry.status === 'pending' && <span> Pending; points not yet awarded</span>}
                            {entry.status === 'unknown' && <span> Points unavailable</span>}
                          </p>
                        ))}
                      </div>
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
