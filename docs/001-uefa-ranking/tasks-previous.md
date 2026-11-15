# Historical Tasks: UEFA Club Rankings (superseded)

> **Historical record only:** These tasks were superseded by the 2026-11-07 specification. Completed Phase 1–3 checkmarks describe the earlier interim implementation, not compliance with the revised [specification](spec.md). Unchecked tasks and convergence entries are not an active implementation backlog; see [tasks.md](tasks.md).

**Input**: [spec.md](spec.md), [plan.md](plan.md), [research.md](research.md), [data-model.md](data-model.md), [contracts/api.md](contracts/api.md), and [quickstart.md](quickstart.md).

**Format**: `- [ ] Tnnn [P] [USn] action and paths`. `[P]` identifies tasks that can run concurrently once their stated prerequisites are complete and their files do not overlap. Story labels refer to the numbered stories in the specification. Tests are included because the constitution, specification, and plan require them.

## Phase 1: Setup

**Purpose**: Create the application workspaces and repeatable tooling; no implementation is performed in the tasks phase.

- [x] T001 Create the npm workspace manifests and scripts in `package.json`, `frontend/package.json`, `backend/package.json`, and `packages/contracts/package.json`; pin compatible Node/npm and dependency versions and generate `package-lock.json`.
- [x] T002 [P] Configure shared and workspace TypeScript settings in `tsconfig.json`, `frontend/tsconfig.json`, `backend/tsconfig.json`, and `packages/contracts/tsconfig.json`.
- [x] T003 [P] Scaffold Vite, React, Tailwind, and the `/api` development proxy in `frontend/index.html`, `frontend/vite.config.ts`, and `frontend/src/index.css`.
- [x] T004 [P] Configure Vitest, React Testing Library, Supertest, and Playwright in `frontend/vitest.config.ts`, `backend/vitest.config.ts`, and `frontend/playwright.config.ts`; wire `npm test` and `npm run test:e2e` through `package.json` after T001.

## Phase 2: Foundational prerequisites

**Purpose**: Establish verified scoring inputs, shared types, providers, and error handling before story implementation.

- [x] T005 Verify the official regulations for every season and competition represented in mock scoring, including the league-phase position bonus schedule and applicable minimums, precision, and tie-breaks; record exact primary citations and worked examples in `docs/001-uefa-ranking/research.md`. The 2022/23–2023/24 group-stage and 2024/25–2026/27 league-phase rule eras are documented with annual UEFA Annex D citations; the Wikipedia coefficient table is used only as a complementary cross-check.
- [x] T006 Define runtime schemas and inferred types for IDs, season (`YYYY-YY`), associations, optional league, club, competition, stage, game status, and point entries in `packages/contracts/src/domain.ts`: one active season per dataset; stable IDs; at most one entry per club/game; only ratified results yield settled match points; point entries have a unique rule/source identity.
- [x] T007 Define shared response, decimal-string, source-status, and error schemas in `packages/contracts/src/api.ts`: mode `mock | live`, quality `current | stale | partial | unavailable`, nullable last successful update, and nullable unknown point values; export them through `packages/contracts/src/index.ts`.
- [x] T008 Create exact decimal arithmetic and explicit rule-boundary truncation to thousandths in `backend/src/domain/decimal.ts`, with tests for 20% floors and precision boundaries in `backend/tests/decimal.test.ts`.
- [x] T009 Define and validate a typed provider boundary and active-season snapshot in `backend/src/providers/provider.ts`; reject missing, inconsistent, or duplicate source records explicitly instead of substituting zero.
- [x] T010 Implement a deterministic mock provider in `backend/src/providers/mock-provider.ts` and fixtures in `backend/src/providers/fixtures/`: at least two associations, all three competitions, varied stage lengths, five consecutive seasons, a historical-only club, both floor outcomes, incomplete inputs, and a fixed explicitly declared active season. Historical contribution and association-coefficient examples are labelled synthetic; current match entries are derived from fixed ratified fixture scores.
- [x] T011 Set up the Express app and structured logging/error middleware in `backend/src/api/app.ts` and `backend/src/api/errors.ts`: 400 for invalid input, 404 for unknown entities, 503 for unavailable sources, and sanitized 500 responses; add error tests in `backend/tests/errors.test.ts`.
- [x] T012 Create the frontend bootstrap, typed request client, and loading/error/status presentation in `frontend/src/main.tsx`, `frontend/src/api/client.ts`, and `frontend/src/components/DataStatus.tsx`; mock data must be labelled and never represented as live.
- [x] T013 Extend `docs/001-uefa-ranking/contracts/api.md` with a season-scoped association-list endpoint supplying stable IDs and names for the country dropdown, including empty, unknown-season, and source-error behavior; keep the seasons and ranking responses unchanged unless needed for consistency.

**Checkpoint**: Phase 2 foundational contracts, verified rule research, deterministic fixture provider, API error handling, and frontend status handling are implemented. The fixture provider is offline, fixed to 2026/27, explicitly marked mock/partial, and includes synthetic historical inputs and missing values.

## Phase 3: User Story 1 — Browse a country's club ranking (P1)

**Goal**: Select a season and country and see participating clubs in descending season-points order.

**Independent test**: Using deterministic data from multiple associations, select a country and season; only its clubs appear, ordered by season total. Select another available season and confirm its clubs and points replace the previous view.

### Tests

- [x] T014 [P] [US1] Add endpoint tests in `backend/tests/seasons-and-associations.test.ts` for active/available seasons, country options, unknown seasons, and source errors.
- [x] T015 [P] [US1] Add ranking and API tests in `backend/tests/season-ranking.test.ts` for country membership, descending total order, selected season, missing league, empty country, and invalid or unknown parameters.
- [x] T016 [P] [US1] Add component tests in `frontend/tests/country-ranking.test.tsx` for default active season, country dropdown, season changes, loading, empty and error states, and no more than two selections to reach a country ranking.

### Implementation

- [x] T017 [US1] Implement season and association-list services and routes in `backend/src/api/seasons.ts` and `backend/src/api/associations.ts` using the contract from T013.
- [x] T018 [US1] Implement selected-season/country ranking and the `GET /api/v1/season-rankings` route in `backend/src/domain/season-ranking.ts` and `backend/src/api/season-rankings.ts`; return opaque IDs and complete or partial totals without inventing unknown values.
- [x] T019 [US1] Implement the initial current-season view, accessible country dropdown, season selector, and ranked club table in `frontend/src/components/SeasonRanking.tsx` and `frontend/src/App.tsx`, consuming the routes from T017–T018.

**Checkpoint**: US1 is demonstrable using the fixture provider, although the full release still requires all other stories.

## Phase 4: User Story 2 — Understand each club's points (P1)

**Goal**: Explain per-game points, bonuses, minimum adjustments, and aligned stages.

**Independent test**: Feed a known fixture with game results, pre-awarded and earned bonuses, a minimum adjustment, and different competition formats; verify each entry, alignment, and club sum.

### Tests

- [ ] T020 [P] [US2] Add versioned scoring tests in `backend/tests/scoring.test.ts` using T005's cited worked examples, covering eligible games, unratified results, pre-awarded and earned bonuses, minimum adjustments, duplicate awards, and unknown rules.
- [ ] T021 [P] [US2] Add stage-alignment and API tests in `backend/tests/stage-alignment.test.ts` for varying matchday counts, equivalent knockout columns, multiple entries per cell, pending results, absent cells, and confirmed zero-point losses.
- [ ] T022 [P] [US2] Add table rendering tests in `frontend/tests/points-breakdown.test.tsx` for labelled match/bonus/adjustment entries, column alignment, pending/unknown states, and a total equal to displayed entries.

### Implementation

- [ ] T023 [US2] Implement only the verified season/competition rules from T005 in `backend/src/domain/rules/`, including referenced rule IDs, eligible match outcomes, qualification/position bonuses, and scoped minimum adjustments; unsupported or unverifiable rules must produce an explicit incomplete/error state.
- [ ] T024 [US2] Implement idempotent point-entry calculation in `backend/src/domain/scoring.ts`: `match | bonus | adjustment`, unique rule/source identity, distinct bonus reasons, non-duplicated minimum difference, and no settled points for unratified games.
- [ ] T025 [US2] Implement ordered semantic stage/slot mapping in `backend/src/domain/stage-columns.ts` and extend `backend/src/api/season-rankings.ts` to return shared columns and distinct awarded, pending, unknown, and inapplicable cells.
- [ ] T026 [US2] Render semantic headers, aligned cells, labelled bonus types and adjustments, and responsive overflow in `frontend/src/components/PointsTable.tsx`; integrate it into `frontend/src/components/SeasonRanking.tsx`.

**Checkpoint**: Each complete season total is auditable to its displayed entries; no unsupported rules are presented as verified.

## Phase 5: User Story 5 — Rolling five-season coefficient (P1)

**Goal**: Compare clubs globally over the active season and preceding four seasons, with the provisional coefficient and association floor.

**Independent test**: Use synthetic records on both sides of the floor, a historical-only club, a missing input, and tied clubs; verify the five-season breakdown, ordering, floor, incomplete states, and provisional label.

### Tests

- [ ] T027 [P] [US5] Add coefficient unit tests in `backend/tests/five-season-coefficient.test.ts` for exact five-season windows, rollover, both association-floor outcomes, thousandth truncation, confirmed zero versus unknown, and the full applicable tie-break chain including unresolved ties.
- [ ] T028 [P] [US5] Add API tests in `backend/tests/five-season-api.test.ts` for five ordered season labels, global ranking, historical-only clubs, incomplete unranked records, source status, and provider failures.
- [ ] T029 [P] [US5] Add component tests in `frontend/tests/five-season-ranking.test.tsx` for the provisional explanation, five contributions, club sum, applied floor, ordering, unresolved ties, and incomplete records.
- [ ] T030 [P] [US5] Add keyboard interaction tests in `frontend/tests/tabs.test.tsx` for initial current-season tab, tab/panel relationships, focus, arrow-key navigation, and switching between panels.

### Implementation

- [ ] T031 [US5] Implement rolling period selection, exact coefficient floor, incomplete-state handling, and ordered UEFA tie-breaks in `backend/src/domain/five-season.ts`; use an association coefficient for the same rolling window, never the country-row club sum.
- [ ] T032 [US5] Implement `GET /api/v1/five-season-rankings` in `backend/src/api/five-season-rankings.ts`, including `rankedClubs`, separate `incompleteClubs`, five season contributions, explicit tie state, and mock source status.
- [ ] T033 [US5] Implement the global five-season table in `frontend/src/components/FiveSeasonRanking.tsx` with the period, provisional explanation, contributions, sum, floor, final coefficient, and incomplete/tie states.
- [ ] T034 [US5] Implement the accessible tablist and panel integration in `frontend/src/components/RankingTabs.tsx` and `frontend/src/App.tsx`, using the WAI-ARIA tabs pattern and keeping the current-season view as the initial panel.

**Checkpoint**: The rolling view is explicitly provisional and cannot be mistaken for UEFA's fixed current-season seeding coefficient.

## Phase 6: User Story 3 — Compare country totals (P2)

**Goal**: Show the sum of visible country clubs with an accurate scope label.

**Independent test**: Select a country with several clubs, compare the aggregate with its displayed club totals, and filter to a subset; verify the sum and filtered label change.

### Tests

- [ ] T035 [P] [US3] Add aggregate unit/API tests in `backend/tests/country-aggregate.test.ts` for full country, filtered subset, no visible clubs, and partial totals.
- [ ] T036 [P] [US3] Add component tests in `frontend/tests/country-aggregate.test.tsx` for bottom-row placement, filtered/full labels, exact totals, and partial or empty states.

### Implementation

- [ ] T037 [US3] Calculate the visible-club aggregate in `backend/src/domain/country-aggregate.ts` and expose it via `backend/src/api/season-rankings.ts`: `country | filtered` scope, club count, nullable points, and `complete | partial` status; return null when no clubs are visible.
- [ ] T038 [US3] Render the aggregate as the final semantic table row in `frontend/src/components/CountryAggregate.tsx` and integrate it into `frontend/src/components/PointsTable.tsx`, clearly distinguishing it from UEFA's association coefficient.

**Checkpoint**: Country aggregate equals visible club points and is never represented as the association coefficient.

## Phase 7: User Story 4 — Filter, sort, and check data status (P2)

**Goal**: Filter by league and competition, sort the selected-country ranking, and disclose data reliability.

**Independent test**: Apply each filter and sort direction to fixtures; verify displayed rows, aggregate scope, and mock/partial/stale/error labels without relying on a live provider.

### Tests

- [ ] T039 [P] [US4] Add filter/sort API tests in `backend/tests/ranking-filters.test.ts` for both filters, both directions, unknown leagues, invalid values, and filtered aggregate scope.
- [ ] T040 [P] [US4] Add frontend tests in `frontend/tests/ranking-controls.test.tsx` for league/competition filters, name/points sorting, keyboard labels, reset on season or country change, and filtered aggregate updates.
- [ ] T041 [P] [US4] Add source-status tests in `frontend/tests/data-status.test.tsx` and `backend/tests/provider-status.test.ts` for mock, partial, stale, unavailable, timestamp disclosure, and explicit source failures.

### Implementation

- [ ] T042 [US4] Extend validation and ranking/filter services in `backend/src/api/season-rankings.ts` and `backend/src/domain/season-ranking.ts` for `leagueId`, `competitionId`, `sort`, and `direction`; preserve unknown-league clubs in unfiltered results.
- [ ] T043 [US4] Implement labelled league/competition and name/points sort controls in `frontend/src/components/RankingControls.tsx`; integrate their state into `frontend/src/components/SeasonRanking.tsx` and keep the aggregate synchronized.
- [ ] T044 [US4] Complete source-status and error presentation in `frontend/src/components/DataStatus.tsx` and `frontend/src/api/client.ts` for both tabs, distinguishing mock from live and stale, partial, or unavailable responses.

**Checkpoint**: Controls preserve correct totals and no view describes mock data as live.

## Phase 8: Cross-cutting validation and documentation

- [ ] T045 [P] Add an end-to-end browser journey in `frontend/tests/rankings.e2e.spec.ts` covering both tabs, country selection, aligned stages, filters, aggregate, association floor, missing data, keyboard interaction, and mocked API errors.
- [ ] T046 [P] Add shared-contract and fixture validation tests in `packages/contracts/tests/contracts.test.ts` and `backend/tests/mock-fixtures.test.ts` for schema constraints, unique IDs, five consecutive seasons, valid rule references, deterministic outputs, and no silent defaults.
- [ ] T047 Run the commands and scenarios in `docs/001-uefa-ranking/quickstart.md` after implementation; correct the guide and `package.json` scripts to match the actual setup, including browser prerequisites, and record any limitations in `docs/001-uefa-ranking/testing.md`.
- [ ] T048 Review the completed implementation against `docs/001-uefa-ranking/spec.md`, `docs/001-uefa-ranking/plan.md`, and `docs/constitution.md`; document unresolved gaps in `docs/001-uefa-ranking/testing.md` rather than claiming completion.

## Dependencies & Execution Order

### Phase dependencies

- Phase 1 precedes Phase 2. Within Phase 1, T004's root-script wiring follows T001; its separate configuration files can otherwise be prepared concurrently with T002–T003.
- Phase 2 is the common foundation. T006 precedes T007 and T009; T009 and T005 precede T010; T007 and T009 precede T011–T012; T013 can proceed independently. T005 blocks T010 and all claims of verified scoring.
- US1 follows the foundation. US2 builds on US1's season-ranking service/table and T005's verified rules. US5 follows the foundation and can develop in parallel with US1/US2 in separate files; T034 integrates with `App.tsx` only after T019. US3 builds on US1 and US2's table and consumes filtering semantics delivered by US4. US4 builds on US1's ranking; integrate with US3 once both are ready.
- Phase 8 follows all story implementation; T045 and T046 can be written in parallel after the relevant contracts and fixtures exist. T047 follows the test and build setup plus all stories; T048 follows validation.

### Story and task dependencies

- **US1**: T014–T016 can be authored in parallel after the foundation; T017–T018 precede T019.
- **US2**: T020–T022 can be authored in parallel after T005 and US1's interfaces; T023 precedes T024, T024 precedes T025, and T025 precedes T026.
- **US5**: T027–T030 can be authored in parallel after the foundation; T031 precedes T032, T032 precedes T033, and T034 integrates T019 and T033.
- **US3**: T035–T036 can be authored in parallel after US1/US2 interfaces; T037 precedes T038. Verify filtered-scope behavior after T042–T043.
- **US4**: T039–T041 can be authored in parallel after foundation and US1 interfaces; T042 precedes T043. T044 can be prepared separately but must integrate with both completed panels.
- Write the story tests before their implementations where feasible; verify the relevant checks fail for the intended missing behavior, then pass after implementation. Avoid concurrent edits to shared files even when their stories are otherwise independent.

### Parallel examples

- US1: T014 API option tests, T015 ranking tests, and T016 frontend tests target separate files.
- US2: T020 scoring tests, T021 stage tests, and T022 rendering tests target separate files.
- US5: T027 coefficient tests, T028 API tests, T029 table tests, and T030 tab tests target separate files.
- US3: T035 aggregate service tests and T036 aggregate display tests target separate files.
- US4: T039 filter API tests, T040 control tests, and T041 status tests target separate files.

## Implementation Strategy

1. Complete setup and foundational tasks, resolving the official-rule research gate before constructing season-specific scoring or validated fixtures.
2. Deliver US1 as an internal first vertical slice; add US2 and US5 next to complete both P1 experiences. This is not a full release until the remaining required stories and validation are complete.
3. Add US3 and US4, integrating the shared country table and filtered aggregate without concurrent edits to the same files.
4. Execute the cross-cutting validation and record results. Deployment is a later project phase; no live provider, MongoDB cache, or deployment automation is included in this mock-release task list.

## Phase 9: Convergence

The following gaps were found after the setup-only increment. They are traceability checkpoints for existing tasks, not replacements or permission to skip their prerequisites. Complete the linked tasks first; close each item only after verifying the resulting behavior.

- [ ] T049 Implement and verify the current-season country ranking, season selection, and descending points order in `backend/src/api/season-rankings.ts` and `frontend/src/components/SeasonRanking.tsx` via T005–T019 per FR-001–FR-004, US1/AC1–AC4, and SC-001 (missing; CRITICAL).
- [ ] T050 Implement and verify the five-season provisional ranking, association floor, complete/incomplete distinctions, UEFA tie-breaks, and accessible two-tab navigation in `backend/src/domain/five-season.ts` and `frontend/src/components/RankingTabs.tsx` via T027–T034 per FR-014–FR-019, US5/AC1–AC6, and SC-006–SC-008 (missing; CRITICAL).
- [ ] T051 Implement and verify season-appropriate scoring, separately labelled match/bonus/adjustment entries, and stage-aligned display in `backend/src/domain/scoring.ts` and `frontend/src/components/PointsTable.tsx` via T005 and T020–T026 per FR-006–FR-010, US2/AC1–AC5, and SC-002/SC-004 (missing; CRITICAL).
- [ ] T052 Provide deterministic, validated, replaceable mock data and shared typed contracts in `backend/src/providers/mock-provider.ts` and `packages/contracts/src/` via T006–T010 and T046 per FR-013/FR-020 and plan: provider and contract boundaries (missing; HIGH).
- [ ] T053 Implement and verify visible-club country aggregates and filtered-scope labels in `backend/src/domain/country-aggregate.ts` and `frontend/src/components/CountryAggregate.tsx` via T035–T038 and T042–T043 per FR-011, US3/AC1–AC2, and SC-003 (missing; HIGH).
- [ ] T054 Implement and verify league/competition filters, name/points sorting, and mock/live, partial, stale, and unavailable status/error presentation in `frontend/src/components/RankingControls.tsx` and `frontend/src/components/DataStatus.tsx` via T039–T044 per FR-005/FR-012, US4/AC1–AC4, and SC-005 (missing; HIGH).
- [ ] T055 Replace or update the temporary placeholder expectation in `frontend/tests/smoke.e2e.spec.ts` as the real UI is introduced, and complete the feature-level automated and quickstart validation in `frontend/tests/rankings.e2e.spec.ts` and `docs/001-uefa-ranking/testing.md` via T045–T048 per plan: verification and Constitution 6 (partial; HIGH).
