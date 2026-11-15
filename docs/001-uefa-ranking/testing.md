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
