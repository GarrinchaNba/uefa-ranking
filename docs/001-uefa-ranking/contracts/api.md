# HTTP API Contract: UEFA Club and Association Rankings

This documents the implemented club and association ranking MVP contracts. JSON responses use opaque stable IDs, `YYYY-YY` season IDs, and decimal strings (or `null` for unavailable values). Shared runtime schemas validate ranking and detail responses. UI sorting does not modify ranking fields.

## Common conventions

Successful responses contain `dataStatus: { mode: "mock" | "live", quality: "current" | "stale" | "partial" | "unavailable", source: string, lastSuccessfulUpdate: string | null }`. Mock is explicitly labelled, never live; live sources disclose last successful update when known. A view including the active season carries `provisional: true` and explains it is not UEFA's fixed current-season seeding coefficient.

Malformed, missing, duplicate, or unsupported query parameters produce 400; syntactically valid but unknown season/entity produces 404; source unavailable without usable data produces 503. All use `{ "error": { "code": string, "message": string } }`; unexpected 500 errors are sanitized and logged. No successful empty ranking is used as a fallback for failures.

Ranking rows use `rank: integer | null`, `rankStatus: "resolved" | "unresolved" | "incomplete"`, `previousRank: integer | null`, and `movement: integer | null`. Movement equals previous rank minus current rank only when both are resolved; unavailable or unresolved ranks imply null movement. A provisional ranking from an ongoing season must remain labelled provisional/partial; missing required inputs never become verified rankings. If missing competitor data can change an otherwise complete entity's position, its rank and movement cannot be marked definitive. Unresolved equal-rank groups are explicitly marked.

The shared response schemas also expose `previousRankStatus` with the same three states, so they can validate that `previousRank` and `movement` are not fabricated.

The target contract must also expose coefficient comparison status separately from calculation completeness and rule/rank support: `matched`, `different`, or `unavailable`, with a reason when the official reference is absent or not comparable. When available, retain the official value and its source, retrieval time, measure, period and as-of snapshot so the comparison can be audited and repeated. Compare only the same entity, measure, period and as-of snapshot at applicable precision. A difference is displayed italic with an accessible ambiguity label; exact agreement removes that coefficient mismatch indicator, without independently resolving a rule or rank. The current shared schemas do not yet implement these fields.

## GET /api/v1/seasons

Returns `{ activeSeasonId, seasons: [{ id, label }], dataStatus }`. `seasons` lists only selectable seasons, including the active season; coefficient-only historical input years do not have to appear. A selectable season may contain explicitly missing entity inputs, but details for it must be available or explicitly unavailable, not fabricated.

## GET /api/v1/club-rankings (implemented for synthetic MVP)

Query: required `seasonId`. Optional `sortSeasonId` must name one of the returned five seasons, and optional `direction` is `asc | desc` (default `desc`). Without `sortSeasonId`, rows use global coefficient ranking order. Alternative sorts reorder rows without changing rank or movement; null contributions follow known values in either direction.

Response: `{ season, seasons, provisional, explanation, clubs, dataStatus }` where `seasons` is exactly five chronological `{ id, label }` values ending in the selected season. The endpoint currently uses the deterministic mock snapshot only; its explanation and per-row `reason` disclose provisional assumptions. This is not a real-data or UEFA-verified ranking. Each club row contains:

- `clubId`, `name`, selected-season `association` (`{ id, name } | null`), rank fields above;
- five `{ seasonId, points: string | null, participation: "participated" | "did-not-participate" | "unknown", status: "complete" | "partial" | "missing" }` contributions;
- `clubPointsSum`, `associationCoefficient`, `associationMinimum`, and `coefficient` as decimal strings or null; `minimumApplied: boolean | null`, `status: "complete" | "partial" | "incomplete"`, and `reason: string | null`.

The calculation uses the 20% club floor. The mock provider's explicitly tagged synthetic fixture may substitute zero for missing numeric inputs and use assumed historical ranking tie-break behavior; these assumptions are returned in `reason` and have corresponding `FIXME(mvp-...)` comments in the calculation code. Non-fixture missing competitors prevent definite ranks. Eligible historical-only clubs remain present. Exact unresolved ties are not ordered by club ID.

The UI defaults to the active season, labels the active view provisional, and sorts locally by each displayed contribution. The API also supports contribution sorting; returned `rank` and `movement` remain unchanged.

## GET /api/v1/clubs/:clubId/season-details

Query: required selectable `seasonId`. Response `{ season, club, participation, competitions, entries, total, status, explanation, dataStatus }`. `competitions` contains stable ID/name pairs for all competitions in that season. Each entry has competition, nullable ordered round, nullable game (with both clubs and ratified score when available), display label, `kind: "match" | "bonus" | "adjustment"`, `status: "awarded" | "pending" | "unknown" | "inapplicable"`, nullable points, and rule/source identifiers. Only supported versioned rules are used to calculate 2/1/0 club match points; qualifying and the specified play-off stages are inapplicable for club match scoring, while separately attributed bonus/adjustment awards remain separate entries. Scheduled games are pending; other unratified results and missing rule/detail data are unknown or unavailable, never zero.

`status` is `complete | partial | missing`; confirmed non-participation has `participation: "did-not-participate"`, total `"0"`, no competitions and an explanatory message. Unknown participation or details have explicit nulls/status and no fabricated zero. A complete detail total reconciles with awarded entries; partial totals are only known awarded subtotals and include an explanation. The route returns the common structured 400/404/503 errors for invalid parameters, unknown clubs/seasons and provider failures.

## GET /api/v1/association-rankings (implemented for synthetic MVP)

Query: `seasonId`, optional `sortSeasonId` and `direction`, with the same validation and sort semantics as club rankings. Response `{ season, seasons, provisional, explanation, associations, dataStatus }`. Each row includes association `{ id, name }`, rank fields, five `{ seasonId, coefficient: string | null, status: "complete" | "partial" | "missing" }` contributions, five-season `coefficient: string | null`, `status: "complete" | "partial" | "incomplete"`, and a nullable explanation.

For supported scoring seasons, association match awards are checked against 2/1/0 match points or 1/0.5/0 qualifying/play-off points; the association coefficient uses the distinct participating-club divisor or an evidenced non-replacement divisor. Association-only awards are sourced from association awards; club-only minima are excluded. Rolling five-season rows use annual association coefficient inputs and preserve missing contributions and ranks. Historical fixture inputs are synthetic, unsupported ranking tie-breaks remain unresolved on exact ties, and incomplete active-season competitors prevent definitive ranks. These values are not real-data or UEFA-verified rankings.

## GET /api/v1/associations/:associationId/season-details

Query: required selectable `seasonId`. Response `{ season, association, groups, explanation, dataStatus }`. Each group has `{ competition: { id, name }, clubs: [{ clubId, name, points: string | null, status, entries }], total: string | null, status }`; each entry preserves its source and club-point award, and club points are attributed to the specific competition, not to the club's whole rolling coefficient. A club may appear in multiple groups but each award belongs to only one group. Unknown competition attribution or missing points is explicit and makes affected totals partial or unavailable. Empty participation returns `groups: []` with an explanation, not a fabricated subtotal.

## Client behavior and migration

The client uses keyboard-operable club/country tabs, a shared labelled season selector, sortable semantic headers and expandable row controls with correct expanded/panel relationships. Both views show global rank, movement, period and source state. Movement is previous resolved rank minus current resolved rank; otherwise it is null and announced as unavailable. Handle loading, empty, stale, unavailable and error states without displaying an obsolete response after selection changes. The interim `/api/v1/associations` and `/api/v1/season-rankings` routes remain for existing consumers.
