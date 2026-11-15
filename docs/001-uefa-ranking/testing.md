# Validation and Convergence: UEFA Club and Association Rankings

## Previous implementation phases

Phase 4 delivered version-gated club-season details and accessible expansion. Phase 5 delivered association scoring/ranking, competition detail groups, and the shared club/country tab experience. Both remain synthetic MVP behavior and are not a real-data or UEFA-verified ranking.

## Phase 6 rank movement and reliability

Implemented shared backend rank comparison for both ranking populations. Movement is computed by entity identity as `previousRank - currentRank` only when both independently calculated ranks are resolved; new entities, missing records and unresolved ties have null movement. Alternative season-column sorting does not alter rank or movement.

Both tables now display a Movement column directly after Rank. Rises, falls, unchanged positions and unavailable movement have accessible text labels as well as color treatment. Data status exposes mock/live source, current/stale/partial/unavailable quality and machine-readable live update timestamps. Ranking panels indicate loading, surface API failures, and discard responses from previous season selections.

Validation run from the project root:

| Command | Result |
|---|---|
| `npm run build` | Passed: contracts, backend, and frontend |
| Focused backend movement/ranking tests | Passed: 3 files / 16 tests |
| Focused frontend movement/status/reliability tests | Passed: 5 files / 15 tests |
| `npm test` | Passed: 17 backend test files / 90 tests; 9 frontend test files / 30 tests |
| `npm run test:e2e` | Passed: 1 club-and-country Playwright smoke journey |

Phase 6 tasks T087–T091 are complete. Historical coefficient inputs and the fixture remain synthetic, incomplete and not UEFA-verified. Missing values or unresolved rank ties are not presented as definite movement. T056, real-data reconstruction and coefficient comparisons remain open; no real UEFA values have been compared.

## Phase 7 cross-cutting validation and migration

Added Playwright journeys for both ranking tabs, the five labelled contributions, historical selection, floor display, detail expansion, transferred-club competition attribution, sorting with stable global rank, accessible movement and keyboard tab navigation, missing contributions, structured API failures, and the health endpoint. Added fixture checks for deterministic validated snapshots, supported-rule source references, pre-2022 inputs, both five-season current/prior windows, ranking/detail contract conformance, and separate club versus association calculations. Shared contract tests verify complete club-detail and association subtotal reconciliation.

Removed the obsolete country-picker and country-only ranking routes, their client methods/schemas, and the interim UI. The global ranking and association detail routes remain available; regression coverage verifies the obsolete endpoints return 404 and the association detail endpoint still works.

Validation run from the project root:

| Command | Result |
|---|---|
| `npm run build` | Passed: contracts, backend, and frontend |
| `npm test` | Passed: 2 shared contract tests, 17 backend test files / 87 tests, and 8 frontend test files / 23 tests |
| `npm run test:e2e` | Passed: 3 Playwright tests, including the cross-ranking journey and structured error state |
| `docs/001-uefa-ranking/quickstart.md` scenarios | Covered by the focused unit, API, and browser journeys above |

Review against FR-001–FR-024 and SC-001–SC-011 confirms the synthetic MVP and its uncertainty states are covered by implementation and tests, but does not establish UEFA verification. Remaining gaps are: T056 season/rule/tie-break verification; incomplete synthetic/history inputs and unavailable historical event detail; no official coefficient comparison data or implementation for FR-022–FR-024 and SC-010–SC-011; and the follow-on responsive/theme/browser requirements FR-025–FR-027 and SC-012–SC-014. These constraints remain explicit in the specification, plan, data model, and [missing-requirements.md](missing-requirements.md); no real-data or official-match claim is made.

Phase 7 tasks T092–T096 are complete. Real-data reconstruction, official coefficient comparisons, and responsive/theme acceptance remain open.
