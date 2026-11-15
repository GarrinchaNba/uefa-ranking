# Global Club Ranking MVP Completion Tasks

**Scope**: Close Phase 3 (US1) with deterministic synthetic data and club rank movement. This milestone does not claim complete club details, association ranking, or UEFA-verified results. See [missing-requirements.md](missing-requirements.md) for exact evidence required to remove fixture/rule assumptions.

| ID | Task | Status |
|---|---|---|
| MVP-01 | Calculate five chronological club contributions, exact five-season sum, association floor and both floor branches; preserve missing inputs and synthetic assumptions. | Complete |
| MVP-02 | Rank the global club population, include historical-only/selected-season-absent clubs, leave exact unresolved ties unranked, and calculate movement from an independently ranked prior window. | Complete |
| MVP-03 | Expose the validated `/api/v1/club-rankings` route, period selection and sort parameters; preserve rank/movement when sorting and surface structured errors. | Complete |
| MVP-04 | Replace the application’s interim country-filtered screen with a keyboard-operable global club table, season selector, five labelled sortable contributions, rank movement, coefficient/floor explanation, mock/provisional status and explicit assumptions. | Complete |
| MVP-05 | Add focused coefficient, API, component and browser coverage for both selectable periods, floor behavior, invalid inputs, provider failure, missing competitor, movement, ties, sorting and stale selection. | Complete |
| MVP-06 | Run build, complete unit suites and the Playwright smoke journey; record results and known limitations in `testing.md`. | Complete |
| MVP-07 | Review the remaining Phase 4–7 and real-data tasks against the user story; keep them separate from Phase 3 completion and document their exact evidence dependencies. | Complete |

## Follow-on tasks outside this MVP

- Implement full expandable club match/round details (US2).
- Implement independently calculated global association rankings and competition subtotals (US3).
- Share movement/reliability behavior across both ranking views (US4).
- Replace synthetic fixture assumptions with complete sourced inputs and independently compare against official UEFA values.

The above work is not implied by an MVP-05 or MVP-06 checkmark.
