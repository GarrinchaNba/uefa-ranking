# Implementation Plan: UEFA Club and Association Rankings

**Feature**: `001-uefa-ranking` (no Git branch) | **Revised**: 2026-11-07 | **Specification**: [spec.md](spec.md)

## Summary

Replace the Phase 3 country-filtered, single-season view with two accessible global rankings: clubs and associations. Each uses five seasons ending in the selected season, exposes a global coefficient rank and prior-season movement, permits sorting on season contributions without changing rank, and expands to show selected-season detail. The active-season view is provisional and mock-backed.

Club coefficients and association coefficients are separate calculations: club-specific minima are never treated as association points. Keep per-game details for every selectable season and additional older coefficient, membership and tie-break inputs to reconstruct both the selected and previous rankings. Missing inputs remain explicit and cannot produce verified ranks.

## Technical Context

**Language/runtime**: TypeScript, Node.js 22.22.1 and npm 9.2.0; existing workspace manifests and lockfile.

**Stack**: Express 5 backend; React, Vite, Tailwind frontend; Zod runtime schemas and shared TypeScript contracts.

**Storage/provider**: Checked-in deterministic synthetic snapshot through the existing replaceable provider. No credentials, network or MongoDB required at runtime; live integrations and caching are later work.

**Testing**: Vitest, Supertest, React Testing Library and Playwright. Test exact rule boundaries, contract and provider failures, historical periods, accessibility, and cross-tab browser journeys. The completed UI/UX work must also exercise the current stable Firefox and Brave browsers and representative mobile/tablet/desktop viewports.

**Scope**: Selectable `2023-24` and `2026-27` fixture seasons, with detailed synthetic events for both; retain season inputs from at least `2018-19` through `2026-27`, including the previous-ranking window for `2023-24`. Seasons needed solely as inputs need not be selectable. The supported season set can later expand only with complete provenance and appropriately verified rules. The dataset includes multiple associations, all three current competitions, transfers between competitions, missing inputs, and both floor outcomes.

**Constraints**: Exact decimal arithmetic, rule-defined truncation, no fabricated points or rank, no live claims, and no fabricated event histories or UEFA verification. An in-progress season may expose a provisional ranking from available confirmed data only if it is labelled partial/provisional; missing required inputs never become verified coefficients or ranks.

**Comparison behavior**: Track official coefficient comparison independently from unsupported rules and rank resolution. Italicize and accessibly label a demonstrated mismatch; remove the coefficient's mismatch indication upon an exact comparable UEFA match. Missing or incomparable references remain explicitly unverified. A matching value does not independently verify ambiguous rules or tie-breaks.

## Constitution Check

| Principle | Design gate |
|---|---|
| Correctness and traceability | Version club and association rules by season and competition, link each award to its source, verify historical tie-breaks and eligibility before use, and surface unsupported data. |
| Competition-aware data | Model season membership, transfers, competition-specific events and round ordering; group club points by their attributed competition. |
| Replaceable sources | Extend the typed snapshot/provider boundary; preserve explicit mock, partial, unavailable and error states. |
| Accessibility | Semantic tables, labelled tabs, keyboard-operable row expansion and sorting, accessible movement text and non-color status; responsive layouts, visible focus, adequate contrast and touch targets. |
| Typed architecture | Share and validate response/domain schemas; isolate rule, ranking and sorting logic from API and UI. |
| Verified changes | Domain, API, component and browser tests cover each requirement and uncertainty state. |

**Before and after design**: Pass subject to the research/implementation gate: a linked regulation is not proof it was read. Verify each supported season's club and association rules, floor, tie-breaks and precision from primary sources, or leave the affected calculation explicitly unavailable. No constitution exceptions.

## Existing State and Project Structure

Phase 1–3 delivered workspaces, fixtures, provider validation, exact decimals, error handling, a typed client, and a country-filtered single-season view. That view and its endpoint are an **interim implementation**, not the revised target; migrate or replace their callers and tests as the new API is implemented. Historical fixtures currently contain attributed totals, not detailed events, and current membership is not season-specific.

```text
backend/src/domain/       # versioned rules, scoring, periods, club/association ranks, movement
backend/src/providers/    # validated snapshot, deterministic fixtures
backend/src/api/          # seasons, global rankings, expandable details, structured errors
backend/tests/            # rule, ranking, provider and HTTP tests
frontend/src/components/  # tabs, season selector, rankings, expansion, status
frontend/src/api/         # shared-contract-validated client
frontend/tests/           # interaction and Playwright flows
packages/contracts/src/   # runtime domain/API schemas and inferred types
docs/001-uefa-ranking/    # specification and this design
```

## Delivery Design

1. **Foundation and research**: preserve Phase 1–3 history; verify primary regulations for fixture-supported periods. Extend snapshot contracts to distinguish selectable seasons from historical inputs; represent per-season membership and multiple competition participation, detail availability, club and association awards, participant counts and rule references. Expand synthetic fixtures without implying real UEFA history.
2. **Club ranking (US1)**: select two adjacent five-year windows; calculate exact club sums and eligible association floors; rank globally using period-specific tie-breaks, retaining unresolved groups and incomplete inputs. Compute prior-season movement from independently ranked populations, not row indices; expose globally ranked response and a sortable season-column UI.
3. **Club details (US2)**: use season/competition-specific scoring to attribute ratified match points, stage bonuses and non-additive minima; expose competition/round details and complete/partial/unavailable states for every selectable season. Show confirmed absence separately. Expand rows accessibly.
4. **Association ranking (US3)**: calculate association-eligible points and the applicable per-season divisor according to the verified season's rules, including the 2026/27 non-replacement exception; rank by five-season coefficient and applicable association tie-breaks. Expand rows into competition groups and per-competition club-point subtotals, preserving transfer attribution and distinguishing them from association coefficients.
5. **Movement and reliability (US4)**: share comparison/presentation logic across rankings; communicate improvement, decline, unchanged and unavailable with labels as well as color. Handle stale, unavailable, partial and mock status without exposing obsolete responses after a selection changes.
6. **Readable responsive experience (US5)**: apply a documented visual system based on the [UI/UX Pro Max skill's core guidance](https://github.com/nextlevelbuilder/ui-ux-pro-max-skill): mobile-first hierarchy, semantic design tokens, at least 4.5:1 normal-text contrast, clear interaction states, and appropriately sized touch controls. Dark is the first-visit default; a visible preference control switches and persists light/dark mode. Adapt ranking presentation to mobile without losing data or forcing page-level horizontal scroll, while retaining a high-density desktop table. Avoid browser-specific dependencies and test in current stable Brave and Firefox.
7. **Cross-cutting verification**: complete API schema/HTTP tests, accessible component tests and browser journeys for both seasons, themes, viewport classes and tabs. Update quickstart and test notes to distinguish implemented behaviour from targets.

## Dependencies and Tradeoffs

- Research and validated shared inputs precede any claim of calculated UEFA scoring. Synthetic fixtures may use independently attributed historical coefficient inputs for calculation windows, but selectable seasons must also have detailed events or an explicit unavailable state; a complete detailed total must reconcile to its entries.
- Club and association ranking engines may be tested independently with controlled attributed inputs, but club floors depend on correct association coefficients. The association ranking's final integration requires the shared rule engine and participant counts.
- Historical tie-break data and association scoring availability can limit which season/row is complete; do not extend a rule across seasons without verification. Provider status `partial` alone does not make missing per-entity inputs complete. An unknown competitor can also affect other entities' positions: do not call a global rank definite unless missing competitors are provably unable to change it; otherwise expose rank/movement as unresolved or unavailable.
- Preserve the current API temporarily while migrating, but do not claim its country-only response meets the revised contract. Remove obsolete routes only when callers and tests are migrated together.
- No extra database, provider, or deployment automation is introduced.
