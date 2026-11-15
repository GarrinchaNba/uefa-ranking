# Validation and Convergence: UEFA Club and Association Rankings

## Phase 5 association ranking

Implemented the association scoring engine, rolling five-season association ranking, association competition details, and keyboard-operable club/country tabs with a shared season selector. Association scoring recomputes 2/1/0 match points and 1/0.5/0 qualifying/play-off points from ratified game results, counts distinct participating clubs, supports evidenced non-replacement divisors, excludes club-only awards, and truncates coefficients to thousandths. Award/rule/divisor inconsistencies remain partial or unavailable.

Association ranking contributions use the association-season coefficient inputs, recalculating where supported award coverage exists. Historical inputs remain synthetic; current non-Island association award coverage is partial, so five-season coefficients and ranks that depend on it remain unavailable. Association tie-breaks use the latest unequal annual coefficient only when supported; exact unsupported ties remain unresolved. Competition subtotals are based on club awards scoped to their attributed competition and are explicitly not association coefficients.

The Phase 4 club-detail scoring engine uses only season rules marked supported by the fixture (2021/22, 2023/24 and 2026/27). Match results are calculated only for ratified games, with non-ratified results left pending or unknown; qualifying-elimination bonuses remain separately attributed. The overall application remains a deterministic mock MVP, not a real-data or UEFA-verified ranking. Historical evidence gaps and real-data comparison remain documented in [missing-requirements.md](missing-requirements.md).

Validation run from the project root:

| Command | Result |
|---|---|
| `npm run build` | Passed: contracts, backend, and frontend |
| `npm test` | Passed: 16 backend test files / 87 tests; 7 frontend test files / 24 tests |
| `npm run test:e2e` | Passed: 1 club-and-country Playwright smoke journey |

Playwright reuses an existing local server outside CI because this workspace already had its own development server listening on the configured port. CI still starts a fresh server.

## Remaining feature work

Phase 5 tasks T078–T086 are complete. Shared movement/reliability behavior, broader cross-story browser journeys, historical source conversion/reconciliation, and responsive visual redesign remain tracked in [tasks.md](tasks.md). T056 and real-data verification remain open; no real UEFA values have been compared, so no coefficient is classified as matched or different.
