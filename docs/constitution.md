# Project Constitution

## Purpose

Build a user-friendly application that presents global UEFA club and association rankings for a selected season, with transparent five-season coefficients and clear per-match, per-stage, and competition details. Development follows the project sequence in `project.md`: constitution, specification, plan, tasks, implementation, testing, and deployment.

## Principles

### 1. Correctness and traceability

- Ranking and points calculations must follow documented, competition- and season-appropriate rules.
- Data and calculations must be distinguishable: show match points separately from bonus points, and make the source and freshness of external data visible when available.
- Never present mocked, stale, or unavailable data as live or verified data.

### 2. Competition-aware data

- Represent clubs, countries, competitions, seasons, matches, stages, and points explicitly rather than relying on display labels as identifiers.
- Support different competition formats and stage lengths. Align comparable stages consistently without implying that every club plays the same number of matches.
- Keep the points breakdown auditable so users can understand how each club and country total was obtained.

### 3. Incremental delivery with replaceable data sources

- Begin with deterministic mock data and a working end-to-end experience.
- Isolate external data providers behind backend interfaces so API integrations can replace mocks without changing ranking or presentation logic.
- Treat provider failures, missing fields, and update delays as normal conditions and communicate them clearly.

### 4. Clear and accessible experience

- Make country selection, ranking, sorting, and filtering understandable and usable on common screen sizes.
- Use text or labels as well as color to distinguish regular points from bonus points.
- Ensure tables, dropdowns, and status messages are keyboard accessible and have appropriate semantic structure.

### 5. Maintainable, typed architecture

- Use TypeScript for frontend and backend application code, with clear contracts at the API boundary.
- Keep ranking calculations independent of UI rendering and external provider details.
- Use MongoDB for persistence and caching only where it supports defined freshness and reliability requirements.

### 6. Verified changes

- Add focused tests for points calculations, stage alignment, country totals, and data transformations as those behaviors are implemented.
- Validate the smallest relevant test/build checks for each change and record any limitations.
- Do not claim real-time behavior until a live data source and its update behavior have been integrated and verified.
- At the end of each implementation phase, commit that phase's validated changes in a dedicated commit and push it to the configured upstream branch; do not combine separate phases.
- Never amend an existing commit or force-push. If a safe push is blocked by repository configuration, authentication, or network availability, retain the dedicated local commit when possible and report the blocker.

## Technology direction

- Frontend: React, Vite, TypeScript, and Tailwind CSS.
- Backend: Node.js, Express, and TypeScript.
- Persistence/cache: MongoDB.
- Initial data mode: mocked backend data; external APIs are a later integration.

## Decision process

The specification and plan must resolve details not fixed by this constitution, including the exact meaning of “UEFA club ranking,” applicable points rules and seasons, data providers, update cadence, and cache freshness. If a decision changes the ranking’s meaning or user-visible data, document it before implementation.

## Change control

Amend this constitution when a project-wide principle or technology commitment changes. Keep later specification, plan, tasks, implementation, tests, and deployment documentation consistent with the accepted principles above.
