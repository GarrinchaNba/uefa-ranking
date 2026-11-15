# Tasks: UEFA Club and Association Rankings

**Input**: [spec.md](spec.md), [plan.md](plan.md), [research.md](research.md), [data-model.md](data-model.md), [contracts/api.md](contracts/api.md), [quickstart.md](quickstart.md), and [constitution](../constitution.md).

**Status**: Revised backlog for the 2026-11-07 specification, extended with US5 responsive visual design requirements on 2026-11-15. Completed setup and Phase 1–3 work against the previous design remains in [tasks-previous.md](tasks-previous.md), including T001–T055. Those historical checkmarks do not assert compliance with this specification. IDs below start at T056 to avoid reuse. Checked tasks below record revised work completed; unchecked tasks may have partial work in progress.

**Format**: `- [ ] Tnnn [P] [USn] action and paths`. `[P]` indicates distinct files and no dependency on another unfinished task in the same parallel group. Tests are required by the constitution and specification; write failing targeted tests first where feasible.

## Phase 1: Existing setup

The npm workspaces, TypeScript, React/Vite, Express, Zod, Vitest, Supertest and Playwright are already configured; reuse them. No dependency or infrastructure change is planned. Historical tasks T001–T004 are recorded in [tasks-previous.md](tasks-previous.md).

## Phase 2: Foundational research and data

**Goal**: Establish verified, attributed historical and current scoring inputs and safe shared interfaces for both rankings.

- [ ] T056 Verify primary UEFA regulations for selectable `2023-24` and `2026-27`, plus the period-specific ranking/floor/tie-break/precision rules and association-eligible scoring, divisor and tie-breaks needed by their selected and prior windows; document exact read sources and worked checks in `docs/001-uefa-ranking/research.md`, marking any unverified rule unsupported rather than reusing it.
  Outstanding rule and rolling-rank mappings are ambiguous as recorded in research; this verification task remains open and does not prevent tracking separately identified coefficient discrepancies.
- [x] T057 [P] Add provider and shared-schema tests in `backend/tests/provider.test.ts`, `backend/tests/ranking-snapshot.test.ts` and `backend/tests/mock-provider.test.ts` for stored versus selectable seasons, six-year comparison coverage, season-specific membership, unique club/competition awards, transferred clubs, null versus zero, explicit unavailable detail, and duplicate/reference validation. The existing backend Vitest runner validates the exported contracts.
- [x] T058 Extend `packages/contracts/src/domain.ts`, `packages/contracts/src/ranking-domain.ts` and `backend/src/providers/provider.ts` for selectable seasons versus input-only history; season-specific nullable association/league membership; multiple competition participations; club and association-eligible entries; unique source/competition attribution; participant count and applicable divisor with reason (including the verified 2026/27 non-replacement exception); attributed coefficient history, per-season rule support, and explicit complete/partial/missing states. Preserve existing explicit source failures.
- [x] T059 Extend `backend/src/providers/fixtures/mock-snapshot.ts` and `backend/tests/mock-provider.test.ts` with deterministic synthetic inputs from `2018-19` through `2026-27`; selectable `2023-24` and `2026-27`; internally reconcilable selected-season events where rules are verified; history-only clubs, both floor outcomes, transfers, multiple competitions, missing inputs, and prior-rank movement cases. Mark unavailable rules/data rather than inventing verified results. The movement example is an independently calculated association ordering over complete synthetic inputs, not an implemented or verified ranking endpoint.
- [x] T060 Add exact arithmetic and period tests in `backend/tests/decimal.test.ts` and `backend/tests/periods.test.ts` for division/truncation boundaries, windows S-4..S and S-5..S-1, rollover, absent historical inputs, and no fabricated zero.
- [x] T061 Implement exact division/truncation and adjacent window selection in `backend/src/domain/decimal.ts` and `backend/src/domain/periods.ts`, using the relevant verified rule boundary and returning explicit missing/unsupported states.
- [x] T062 Update `packages/contracts/src/api.ts`, `backend/src/api/seasons.ts`, and `frontend/src/api/client.ts` so `/api/v1/seasons` lists only selectable seasons with one active season; retain stored input-only years in the provider and preserve structured 400/404/503 errors.
- [x] T063 Add shared ranking types/schemas and validation tests in `packages/contracts/src/api.ts` and `backend/tests/ranking-contracts.test.ts`: five chronological contributions; nullable values, ranks and movement; resolved/unresolved/incomplete rank; complete/partial/incomplete row; source/provisional metadata; `movement = previousRank - rank` only for resolved ranks. Contract tests use the existing backend Vitest runner.

**Checkpoint**: Inputs can represent every required scenario without conflating unknowns, old coefficient-only years, or club and association awards. T056 is a correctness gate for implementations that claim verified results.

The exact remaining external evidence is tracked in [missing-requirements.md](missing-requirements.md). MVP-only implementation and completion gates are tracked in [mvp-completion.md](mvp-completion.md); they do not close T056 or the later real-data tasks.

## Phase 3: User Story 1 — Global club ranking (P1)

**Independent test**: For both selectable seasons, compare global ranks and five-season values across associations, including an absent club, a missing input, both floor branches and a changed period; sorting any season leaves global ranks unchanged.

### Tests

- [x] T064 [P] [US1] Add exact coefficient, floor, eligibility and tie tests in `backend/tests/five-season-coefficient.test.ts` for both floor outcomes, season-specific membership, missing inputs, their effects on other clubs' definite ranks, unresolved tie-breaks and historical-only clubs.
- [x] T065 [P] [US1] Add API tests in `backend/tests/club-rankings.test.ts` for selected/default periods, exact response shapes, invalid/unknown seasons, provider errors, provisional state, sort on every season in both directions, and stable rank/movement.
- [x] T066 [P] [US1] Add component tests in `frontend/tests/club-ranking.test.tsx` for global rows, five labels, active/historical selection, floor explanation, partial/unavailable values, each season-column sort and unchanged rank.

### Implementation

- [x] T067 [US1] Implement club five-season totals and floor evaluation in `backend/src/domain/five-season.ts`, consuming correctly attributed association coefficients and using verified period-specific rules and null/incomplete handling.
  Complete for the synthetic MVP. Tagged mock inputs use explicitly disclosed `FIXME` fallbacks for missing values and unverified periods; non-fixture sources do not inherit those assumptions. This does not claim verified historical scoring.
- [x] T068 [US1] Implement global club ranking and applicable tie-break handling in `backend/src/domain/club-ranking.ts`, including selected/prior populations and unresolved or incomplete ranks without arbitrary verified order.
  Complete for the MVP: independently ranks the current/prior periods, computes club movement and leaves exact ties or non-fixture missing competitors without definite ranks. Historical tie-break assumptions are disclosed and marked `FIXME`.
- [x] T069 [US1] Implement `GET /api/v1/club-rankings` in `backend/src/api/club-rankings.ts`, wire it in `backend/src/api/app.ts`, and define matching schemas/client in `packages/contracts/src/api.ts` and `frontend/src/api/client.ts`; validate sort fields and preserve ranks when sorting.
- [x] T070 [US1] Build `frontend/src/components/ClubRanking.tsx` and integrate `frontend/src/App.tsx` with the season selector, global coefficient rank, five sortable contributions, final coefficient/floor explanation, mock/provisional status and explicit incomplete values; replace interim country-only view without breaking unrelated APIs.

## Phase 4: User Story 2 — Expand club season details (P1)

**Independent test**: Expand active and historical clubs, including confirmed absence and missing data; verify selected-season competitions, game/round points, bonuses, adjustments and reconciled total.

### Tests

- [x] T071 [P] [US2] Add versioned scoring tests in `backend/tests/scoring.test.ts` for verified club match eligibility, qualifying, award types, minimum adjustments, unratified games, unique awards and unsupported rule states.
- [x] T072 [P] [US2] Add club-detail API tests in `backend/tests/club-details.test.ts` for both selectable seasons, multiple competitions, round order, no participation, pending/missing data, complete-total reconciliation and provider failures.
- [x] T073 [P] [US2] Add keyboard expansion and detail rendering tests in `frontend/tests/club-details.test.tsx` for competition labels, historical details, bonuses/adjustments, pending versus zero and confirmed absence.

### Implementation

- [x] T074 [US2] Implement only verified season/competition rules in `backend/src/domain/rules/` and idempotent club event scoring in `backend/src/domain/scoring.ts`; keep unsupported rules and non-ratified results explicitly unavailable/pending.
- [x] T075 [US2] Implement ordered season/competition round mapping and selected-season detail aggregation in `backend/src/domain/club-details.ts`, enforcing unique competition attribution and reconciling complete totals to entries.
- [x] T076 [US2] Implement `GET /api/v1/clubs/:clubId/season-details` in `backend/src/api/club-details.ts`, wire `backend/src/api/app.ts`, and update schemas/client in `packages/contracts/src/api.ts` and `frontend/src/api/client.ts` with explicit participation/detail status and structured errors.
- [x] T077 [US2] Implement `frontend/src/components/ClubDetails.tsx` and integrate accessible expand/collapse in `frontend/src/components/ClubRanking.tsx`, preserving focus, labelling non-participation and unavailable details, and distinguishing entry types without color alone.

## Phase 5: User Story 3 — Global association ranking (P1)

**Independent test**: Check association-specific eligible points and divisor against worked fixtures, five-season order and historical window, transfer-safe competition groups and subtotals, and season sorting without rank changes.

### Tests

- [x] T078 [P] [US3] Add association scoring tests in `backend/tests/association-scoring.test.ts` for qualifying rules, association-eligible bonuses, exclusion of club minima, unique participant count including transfers, the 2026/27 non-replacement divisor exception, precision and missing inputs.
- [x] T079 [P] [US3] Add ranking and group API tests in `backend/tests/association-ranking.test.ts` for five-season coefficients, association tie-breaks, missing competitors affecting other ranks, historical windows, empty associations, transfer attribution, subtotal separation, sorting and provider errors.
- [x] T080 [P] [US3] Add component tests in `frontend/tests/association-ranking.test.tsx` for five columns, country tab, accessible expansion, groups, subtotals and unranked/unknown cases.

### Implementation

- [x] T081 [US3] Implement verified association scoring and the applicable divisor in `backend/src/domain/association-scoring.ts`, including distinct participant counts and the 2026/27 non-replacement exception, with provenance, exact arithmetic and explicit unsupported/missing states; never divide displayed club coefficients.
- [x] T082 [US3] Implement five-season association coefficients, global rank, period-specific tie-breaks and prior-rank inputs in `backend/src/domain/association-ranking.ts`; keep unresolved or incomplete records explicit.
- [x] T083 [US3] Implement transfer-safe club-point competition grouping and labelled per-group subtotals in `backend/src/domain/association-details.ts`, preserving unique source attribution, partial statuses and empty explanations.
- [x] T084 [US3] Implement association ranking/detail routes in `backend/src/api/association-rankings.ts` and `backend/src/api/association-details.ts`, wire `backend/src/api/app.ts`, and add response schemas/client methods in `packages/contracts/src/api.ts` and `frontend/src/api/client.ts`.
- [x] T085 [US3] Implement `frontend/src/components/AssociationRanking.tsx` and `frontend/src/components/AssociationDetails.tsx` with five sortable coefficients, global rank, expandable competition groups and subtotal labels distinct from the association coefficient.
- [x] T086 [US3] Implement keyboard-accessible club/country tablist and panel integration in `frontend/src/components/RankingTabs.tsx` and `frontend/src/App.tsx`, defaulting to clubs and preserving the selected season across both tabs.

## Phase 6: User Story 4 — Rank movement and reliability (P1)

**Independent test**: Compare selected and independently ranked prior seasons for rises, falls, unchanged, missing/new and unresolved cases in both tabs; verify labels, source states and stale-response handling.

### Tests

- [ ] T087 [P] [US4] Add movement tests in `backend/tests/rank-movement.test.ts` for 5→3 (`+2`), 3→4 (`-1`), unchanged, missing/new entity, unresolved ties, independently ranked prior windows and stable movement after sorting.
- [ ] T088 [P] [US4] Extend `frontend/tests/data-status.test.tsx` and add `frontend/tests/rank-movement.test.tsx` for accessible green/red/unchanged/unavailable labels, mock/live partial/stale/unavailable status, timestamps and asynchronous selection changes.

### Implementation

- [ ] T089 [US4] Implement shared selected/prior rank comparison in `backend/src/domain/rank-movement.ts` and integrate `backend/src/domain/club-ranking.ts` and `backend/src/domain/association-ranking.ts`; return null when either rank is missing or unresolved.
- [ ] T090 [US4] Implement `frontend/src/components/RankMovement.tsx` and integrate it immediately after rank in both ranking components; show `+N` green for improvement, `-N` red for decline, `0` unchanged, and an accessible non-color unavailable state.
- [ ] T091 [US4] Complete source-status and request-state handling in `frontend/src/components/DataStatus.tsx`, `frontend/src/components/ClubRanking.tsx`, and `frontend/src/components/AssociationRanking.tsx` for mock/live, partial/stale/unavailable, timestamps, explicit failures and cancellation/ignoring stale responses.

## Phase 7: Cross-cutting validation and migration

- [ ] T092 [P] Add Playwright journey in `frontend/tests/rankings.e2e.spec.ts` covering both tabs, five labelled seasons, historical selection, floor, expansion, transfers, sorting, movement, keyboard access, missing inputs and API error states; update `frontend/tests/smoke.e2e.spec.ts` to the new UI.
- [ ] T093 [P] Add fixture/contract validation in `backend/tests/mock-fixtures.test.ts` and `packages/contracts/tests/contracts.test.ts` for deterministic outputs, supported-rule references, pre-2022 inputs, both windows, complete-detail reconciliation and distinct association calculations.
- [ ] T094 Migrate/remove obsolete interim country-only routes and UI only after all callers and tests are migrated; update `backend/src/api/app.ts`, `frontend/src/components/SeasonRanking.tsx`, and affected tests without removing unrelated functionality.
- [ ] T095 Run `npm run build`, `npm test`, `npm run test:e2e` and the scenarios in `docs/001-uefa-ranking/quickstart.md`; update `docs/001-uefa-ranking/testing.md` with results and any unsupported-rule/data limitations, and reconcile `docs/001-uefa-ranking/contracts/api.md` with implemented responses.
- [ ] T096 Review `docs/001-uefa-ranking/spec.md`, `docs/001-uefa-ranking/plan.md`, `docs/constitution.md` and implemented core behavior for FR-001–FR-024/SC-001–SC-011; record remaining gaps in `docs/001-uefa-ranking/testing.md` rather than claiming completion.

## Phase 8: User Story 5 — Clear, responsive ranking experience (P1)

**Goal**: Replace the plain, dense presentation with a coherent, readable visual system that adapts to mobile, defaults to dark mode with a persistent light/dark choice, and works in Brave and Firefox.

**Design basis**: Apply the core UI/UX Pro Max guidance from [nextlevelbuilder/ui-ux-pro-max-skill](https://github.com/nextlevelbuilder/ui-ux-pro-max-skill): mobile-first layouts, clear hierarchy, semantic design tokens, WCAG AA contrast, visible interaction states, keyboard support, and appropriately sized touch targets. Do not install its optional CLI or add runtime dependencies solely for styling.

**Independent test**: At 320, 375, 768, 1024, and 1440 CSS-pixel widths, confirm ranking and detail data is readable and operable without page-level horizontal scrolling. Verify dark-first and persistent theme selection, contrast and focus in both themes, and season selection, sorting, expansion, and missing/pending states in current stable Brave and Firefox.

### Tests

- [ ] T103 [P] [US5] Add theme, responsive layout, keyboard/touch, and contrast acceptance tests in `frontend/tests/ui-ux.e2e.spec.ts` for FR-025–FR-027 and SC-012–SC-014; cover first-visit dark mode, persisted theme choice, all required viewport widths, page overflow, and retained access to every ranking value.

### Implementation

- [ ] T104 [P] [US5] Define the product visual direction, typography and spacing scales, semantic status colors, component hierarchy, and responsive presentation rules in `docs/001-uefa-ranking/ui-design.md` using the stated UI/UX Pro Max design basis.
- [ ] T105 [US5] Implement semantic light/dark design tokens and accessible dark-first defaults in `frontend/src/index.css`; verify at least 4.5:1 normal-text contrast and applicable WCAG AA contrast for large text and non-text controls in both themes.
- [ ] T106 [US5] Add an accessible visible theme control in `frontend/src/components/ThemeToggle.tsx` and integrate it in `frontend/src/App.tsx`; default to dark without a saved choice and persist the user's light/dark selection across reloads.
- [ ] T107 [US5] Rework `frontend/src/components/ClubRanking.tsx`, `frontend/src/components/AssociationRanking.tsx`, `frontend/src/components/ClubDetails.tsx`, and `frontend/src/components/AssociationDetails.tsx` into mobile-first layouts that show rank, identity, coefficient, status, all five contributions, and detail access without page-level horizontal scrolling while retaining a high-density desktop table.
- [ ] T108 [US5] Apply the visual system in `frontend/src/components/ClubRanking.tsx`, `frontend/src/components/AssociationRanking.tsx`, `frontend/src/components/ClubDetails.tsx`, `frontend/src/components/AssociationDetails.tsx`, `frontend/src/components/DataStatus.tsx`, and `frontend/src/components/RankingTabs.tsx`; establish readable type hierarchy, row/card separation, semantic status treatments, visible focus/pressed states, 44px touch targets where practical, and reduced-motion behavior.
- [ ] T109 [US5] Extend `frontend/playwright.config.ts` and `.github/workflows/ui-browser.yml` to run the core ranking and `frontend/tests/ui-ux.e2e.spec.ts` journeys in current stable Firefox and Brave; install/use the actual Brave browser binary and fail clearly rather than silently skipping a missing target browser.
- [ ] T110 [US5] Run visual and accessibility acceptance at the viewport sizes, 200% zoom, keyboard-only operation, and both themes; verify the Firefox/Brave browser matrix, then record results and known limitations in `docs/001-uefa-ranking/testing.md`.

## Real-data reconstruction and reference verification

- [ ] T097 Establish an accessible, authorized match-results source with qualifying, results and stages for the target seasons and competitions; establish complete participant, membership, advancement, placement and divisor-exception coverage. FBref returned HTTP 403 here; do not bypass restrictions or assume its coverage.
- [ ] T098 Obtain readable official UEFA club and association coefficients with explicit season, period, snapshot and entity identity; establish coverage and provenance independently of the reconstructed inputs.
- [ ] T099 Build and test a source adapter and rule-based reconstruction using the shared provider and period-specific scoring engines, preserving attribution and unknown/partial states. Do not label synthetic fixtures as historical data.
- [ ] T100 Compare every reconstructed entity and period designated verified against the corresponding official value at UEFA precision; report missing values, missing entities and differences without success-shaped fallbacks. Include regression cases for qualifying, bonuses, guarantees, transfers and divisor exceptions.
- [ ] T101 Archive permitted historical source HTML and convert it into locally retained, provenance-bearing CSV; test completeness and parsing, and load archived seasons without depending on external requests. Do not retain error pages as data; verify data retention and reuse rights.
- [ ] T102 Add comparison states to contracts and both ranking views: italicize and accessibly label coefficients differing from a comparable UEFA value; remove the mismatch indicator on exact agreement at applicable precision; disclose unavailable/incomparable references separately. Preserve independent rule and rank ambiguity; test matching, mismatch, missing reference, mismatched period/snapshot and recalculation.

## Dependencies and Execution Order

- T056 and T057 can start independently. T058 follows T057; T059 follows T056 and T058; T060 precedes T061. T062 and T063 follow T058; T063 follows T061 for arithmetic invariants.
- US1 tests T064–T066 are complete. T067–T070 deliver the synthetic club MVP with disclosed fixture assumptions. Its club movement is calculated from independent prior-window ranks in `club-ranking.ts`; T089–T090 remain open for the shared implementation and association view.
- US2 tests T071–T073 are independent after the foundation. T074 follows T056/T058; T075 follows T074; T076 follows T063/T075; T077 follows T070/T076.
- US3 tests T078–T080 can be authored in parallel after the foundation. T081 follows T056/T058/T061; T082 follows T081; T083 follows T074/T081; T084 follows T063/T082/T083; T085 follows T084; T086 follows T070/T085.
- US4 tests T087–T088 can be authored independently after the foundational schemas. T089 follows T068/T082; T090 follows T070/T085/T089; T091 follows T070/T085. Implement the movement helper as a shared dependency or integrate it as soon as both engines exist; no US1/US3 checkpoint claims complete movement before T089–T090.
- T092/T093 may be authored independently after the relevant contracts and fixtures exist; T094 follows T070/T077/T085/T086; T095 follows US1–US4 and T092–T094; T096 follows T095.
- US5 (T103–T110) follows the US1–US4 ranking surfaces and T094 so the visual system is applied once to the complete interface. T103 and T104 are independent; T105 depends on T104; T106 depends on T104/T105; T107 follows T105/T106; T108 follows T107; T109 follows T103 and T106–T108; T110 follows T109 and all US5 implementation tasks. T095/T096 validate the core feature; T110 is the final post-redesign validation against FR-025–FR-027/SC-012–SC-014.
- T097 and T098 can proceed independently; T101 follows T097; T099 follows T101 and the relevant scoring engines; T100 follows T098 and T099. T102 follows the comparison logic in T100 and the ranking contracts/views. Reference comparison requires matching the official season, period and snapshot.
- Avoid concurrent edits to `packages/contracts/src/api.ts`, `backend/src/api/app.ts`, `frontend/src/api/client.ts`, or `frontend/src/App.tsx`; story tasks sharing those files must be integrated sequentially.

## Parallel Opportunities and Delivery Strategy

- Foundation: T056 and T057 independently; after their prerequisites, T060 and schema-specific tests can proceed separately.
- US1: T064, T065 and T066 target separate test files. US2: T071, T072 and T073 do likewise. US3: T078, T079 and T080 do likewise. US4: T087 and T088 target separate files.
- US5: T103 acceptance tests and T104 design specification can be prepared independently. Token/theme work precedes responsive component changes, which precede cross-browser acceptance and final contrast/zoom review.
- The global club ranking MVP includes its own prior-window movement calculation; shared US4 movement across both club and association views remains future work. This is an internal milestone, not a complete release. Add expandable club details, then association ranking and tabs, then finish reliability and cross-cutting validation.
- The Phase 3 synthetic MVP is implemented; its remaining validation gates are recorded in `mvp-completion.md`. Its result remains explicitly mock and assumption-dependent. T056 and real-data verification remain open.
- Visual redesign is a separate P1 increment after the complete ranking views are implemented. The dark theme is the first-visit default; a persistent user control also provides light mode. Mobile must preserve the information rather than hide the five contributions behind page-level horizontal scrolling.
- Real-data reconstruction and official verification are now tracked separately in T097–T100; live updates, cache deployment and MongoDB remain outside this task list. Native workflow execution is not assumed; follow project-local skill instructions and explicitly report whether native commands were actually invoked.
