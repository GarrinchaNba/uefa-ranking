# Quickstart and Validation: UEFA Club Rankings

The application provides global club and association rankings for selectable seasons `2023-24` and `2026-27`, with expanded club and association details. Historical coefficient inputs are synthetic and not verified UEFA data; active-season values remain provisional and incomplete inputs are shown as partial or unavailable.

## Prerequisites

- Node.js 22.22.1 and npm 9.2.0, matching the versions pinned in `package-lock.json`.
- No MongoDB, provider credentials, or network access are needed after dependencies are installed. Dependency installation requires package-registry access.

## Install, build, and run

From the project root:

```sh
npm ci
npm run build
npm test
npm run dev
```

`npm run dev` starts the backend and Vite frontend together. The Vite server proxies `/api` requests to the backend. Mock data is fixed, synthetic where historical, and explicitly labelled; it is not live or verified UEFA data.

## Current validation scope

`npm run build` type-checks and builds the contracts, backend, and frontend. `npm test` runs shared contract, backend, and frontend tests, including club/association scoring, ranking, API and view. `npm run test:e2e` runs the smoke, cross-ranking, responsive, theme and accessibility journeys in Chromium, Firefox and Brave. Install Playwright's Chromium and Firefox with `npx playwright install chromium firefox`, then install Brave; set `PLAYWRIGHT_BRAVE_PATH` if its executable is not at `/usr/bin/brave-browser` or `/usr/bin/brave`. Some Linux installations may additionally require Playwright's system dependencies.

The API response shapes and error conditions are specified in [contracts/api.md](contracts/api.md), the domain states in [data-model.md](data-model.md), and the visual direction in [ui-design.md](ui-design.md). Synthetic MVP acceptance journeys and responsive/theme behavior are covered by unit, API and browser tests; official-data verification remains open.

## Implemented MVP journey

1. Open the club ranking; confirm the active season, five labelled contributions, global rank, movement, mock/provisional status and synthetic-assumption disclosure.
2. Switch to Countries; confirm the selected season is retained, five association contributions are shown, and incomplete competitors prevent definitive active ranks.
3. Sort contribution columns; confirm row ordering can change without rewriting global rank.
4. Select `2023-24`; confirm its window is `2019-20`–`2023-24` and the historical view is not labelled as the active provisional ranking.
5. Expand club and association details; confirm competition groups contain attributed club points and subtotals are not presented as association coefficients.
6. Confirm exact ties remain unresolved, missing non-fixture competitors do not receive definite ranks, and API errors do not become successful empty rankings.

## Follow-on acceptance scenarios

Real-data reconstruction and official UEFA coefficient comparisons remain open in [tasks.md](tasks.md). Their exact evidence requirements are listed in [missing-requirements.md](missing-requirements.md).
