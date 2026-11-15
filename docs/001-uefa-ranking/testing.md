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

Phase 7 tasks T092–T096 are complete. Real-data reconstruction and official coefficient comparisons remain open.

## Phase 8 responsive experience and themes

Documented the editorial data-dashboard direction, semantic palette, typography and spacing scales, component hierarchy, and responsive behavior in [ui-design.md](ui-design.md). The interface now defaults to a dark color scheme, provides a visible theme toggle persisted in `localStorage`, and uses semantic light/dark tokens. Global ranking tables remain high-density on desktop; narrow screens use stacked club/association cards that preserve rank, movement, identity, all five contributions, totals, status, sorting and expandable details. Detail panels wrap on small screens, controls have 45px minimum heights, focus rings remain visible, and nonessential animation honors `prefers-reduced-motion`.

The Playwright acceptance checks enforce at least 4.5:1 contrast for primary/muted text, accents, and movement states and at least 3:1 for control boundaries in both palettes. They check first-visit dark mode and persistence of both choices, keyboard tab/sort/expansion, visible focus, touch control dimensions, full values and details at 320/375/768/1024/1440 CSS pixels without page-level horizontal overflow, and 200% text scaling with a 640px layout viewport (equivalent to a 1280px display at 200% browser zoom).

Validation run from the project root:

| Command | Result |
|---|---|
| `npm run build` | Passed: contracts, backend, and frontend |
| `npm test` | Passed: 2 shared contract tests, 17 backend test files / 87 tests, and 8 frontend test files / 23 tests |
| `npm run test:e2e` | Passed: 21 Playwright tests across Chromium, Firefox 159.0, and Brave 157.1.99.57; includes core ranking and UI/UX journeys in each browser |
| Responsive/theme/contrast acceptance | Passed at all five required widths and both themes; no page-level horizontal overflow; color pairs meet tested WCAG AA thresholds |

Phase 8 tasks T103–T110 are complete. Browser checks use Playwright's Firefox distribution and the installed Brave binary; the CI workflow installs both and explicitly fails if Brave is missing. Acceptance covers CSS text enlargement at the specified zoom-equivalent viewport, not operating-system magnification or assistive technology output. Real-data reconstruction, official UEFA coefficient comparisons and their associated rule-evidence limitations remain open as documented in [missing-requirements.md](missing-requirements.md).

## Phase 9 synthetic-assumption disclosures

Club ranking rows now expose coded assumptions separately from other limitations, retaining the existing combined API reason. An affected association-coefficient assumption appears as an asterisk with a hover, keyboard-focus and touch disclosure; Escape dismisses it. Partial synthetic club-total wording appears once above the table or cards when needed. Other reasons and incomplete states remain visible. The disclosure clarifies that missing association inputs use zero while known partial values retain their reported fixture values; scoring and ranking are unchanged.

Validation from the project root: `npm run build` passed; `npm test` passed 2 shared contract, 90 backend and 25 frontend tests; `npm run test:e2e` passed 24 journeys across Chromium, Firefox and Brave. These include affected/unaffected rows, simultaneous reasons, the conditional shared note, both responsive presentations, hover, keyboard and touch. Actual screen-reader output was not tested.

Phase 9 tasks T111–T114 are complete. Competition detail tables remain Phase 10 work.
