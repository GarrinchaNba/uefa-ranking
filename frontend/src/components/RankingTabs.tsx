import { useEffect, useRef, useState } from 'react';
import type { SeasonsResponse } from '@uefa-ranking/contracts';
import { getSeasons } from '../api/client.js';
import { AssociationRanking } from './AssociationRanking.js';
import { ClubRanking } from './ClubRanking.js';

type Tab = 'clubs' | 'associations';

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : 'Unable to load ranking seasons';
}

export function RankingTabs() {
  const [seasons, setSeasons] = useState<SeasonsResponse | null>(null);
  const [seasonId, setSeasonId] = useState('');
  const [tab, setTab] = useState<Tab>('clubs');
  const [error, setError] = useState<string | null>(null);
  const clubTab = useRef<HTMLButtonElement>(null);
  const associationTab = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    let active = true;
    getSeasons().then((response) => {
      if (!active) return;
      setSeasons(response);
      setSeasonId(response.activeSeasonId);
    }).catch((failure: unknown) => {
      if (active) setError(errorMessage(failure));
    });
    return () => { active = false; };
  }, []);

  const selectTab = (next: Tab, focus = false) => {
    setTab(next);
    if (focus) (next === 'clubs' ? clubTab : associationTab).current?.focus();
  };
  const onTabKeyDown = (event: React.KeyboardEvent<HTMLButtonElement>) => {
    if (event.key === 'ArrowRight' || event.key === 'ArrowLeft') {
      event.preventDefault();
      selectTab(tab === 'clubs' ? 'associations' : 'clubs', true);
    } else if (event.key === 'Home') {
      event.preventDefault();
      selectTab('clubs', true);
    } else if (event.key === 'End') {
      event.preventDefault();
      selectTab('associations', true);
    }
  };

  return (
    <section>
      {error && <p role="alert">{error}</p>}
      {seasons && (
        <>
          <div role="tablist" aria-label="Ranking type">
            <button
              ref={clubTab}
              id="clubs-tab"
              type="button"
              role="tab"
              aria-selected={tab === 'clubs'}
              aria-controls="ranking-panel"
              tabIndex={tab === 'clubs' ? 0 : -1}
              onClick={() => selectTab('clubs')}
              onKeyDown={onTabKeyDown}
            >
              Clubs
            </button>
            <button
              ref={associationTab}
              id="associations-tab"
              type="button"
              role="tab"
              aria-selected={tab === 'associations'}
              aria-controls="ranking-panel"
              tabIndex={tab === 'associations' ? 0 : -1}
              onClick={() => selectTab('associations')}
              onKeyDown={onTabKeyDown}
            >
              Countries
            </button>
          </div>
          <div role="tabpanel" id="ranking-panel" aria-labelledby={`${tab}-tab`}>
            {tab === 'clubs'
              ? <ClubRanking availableSeasons={seasons} selectedSeasonId={seasonId} onSelectedSeasonChange={setSeasonId} />
              : <AssociationRanking availableSeasons={seasons} selectedSeasonId={seasonId} onSelectedSeasonChange={setSeasonId} />}
          </div>
        </>
      )}
    </section>
  );
}
