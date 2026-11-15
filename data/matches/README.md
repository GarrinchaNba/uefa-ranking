# Historical match CSV

`2025-26.csv` is derived from the user-supplied local HTML at
`data/UEFA European Cup Matches 2025_2026.html`: *UEFA European Cup Matches
2025/2026*, Bert Kassies,
https://kassiesa.net/uefa/data/method5/match2026.html.
The source is not an official UEFA result feed; do not assume independent
verification or permission to redistribute the source or derived data.

Each row records one match, its competition and source round, home and away
club IDs, source club names and association codes, match score, optional shootout
score and source URL.
Two-leg ties produce two rows, reversing the home and away teams and the score
orientation for the second leg: the source reports both scores from the first
team's perspective. Scores are match scores, not aggregate or penalty results. A blank `leg`
indicates that the source presents a single match rather than a two-leg tie; it
does not establish the length or format of the tie. Dates, match status and
extra-time details are not supplied by this export and must not be inferred.

`club-identities.csv` assigns a persistent ID to each distinct 2025/26 source
name and association code. It preserves those original labels and provides the
registry for adding independently verified aliases from other sources.
IDs are consistent within this export, but cross-source identity matching is not
yet complete: for example, Kassies' `Qarabag FK` and RSSSF's `Qarabag Agdam`
have not yet been linked. The RSSSF files have not yet been converted to match
CSV, so cross-season CSV compatibility remains outstanding. Do not merge clubs
on approximate name similarity without verification.

Regenerate locally with `python3 scripts/convert-kassiesa-2025-26.py`. The
converter requires the existing identity registry and fails on missing or
duplicate aliases. `--init-identities` creates the initial registry only and
refuses to overwrite an existing one.
