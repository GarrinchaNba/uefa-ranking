# Feature Specification: UEFA Club and Association Rankings

**Feature**: `001-uefa-ranking` (documentation path; no Git branch created)

**Created**: 2026-11-06 | **Updated**: 2026-11-07 | **Status**: Draft

**Input**: `project.md` and the user's revised requirements for global club and association rankings, selectable seasons, expandable details, and rank movement.

## User Scenarios & Testing

### User Story 1 - Browse the global club ranking (Priority: P1)

A football follower selects a season and sees clubs ranked globally by their rolling five-season UEFA sporting coefficient. The main row displays the club's global rank, rank change, five season contributions, and final coefficient.

**Independent test**: Load fixtures with clubs from multiple associations, including one absent in the selected season, and verify the period, values, ranking, association floor, and rank movements for the selected and previous seasons.

1. **Given** complete club data, **When** the club tab opens, **Then** the active season is selected and clubs are globally ordered by their five-season coefficient descending, including eligible clubs absent from that season.
2. **Given** a selected season, **When** the ranking is displayed, **Then** each club row shows rank, rank movement, club and association, five labelled consecutive season contributions ending in the selected season, and the final coefficient.
3. **Given** the association minimum exceeds the five-season club sum, **When** the final coefficient is shown, **Then** the minimum is applied and identified separately from the five contributions.
4. **Given** another supported season, **When** it is selected, **Then** the five-season period, scores, ranks, previous-season comparison, and details correspond to that season.
5. **Given** a user sorts by one season's column, **When** the rows reorder by that season's contribution, **Then** the displayed rank remains the global coefficient rank, not the row position.

### User Story 2 - Expand a club's season details (Priority: P1)

A user expands a club row to understand the points earned in the selected season, including the competition, games, rounds, bonuses, adjustments, and season total.

**Independent test**: Expand clubs with match points and bonuses, with no participation, and with missing data in both the active and an older selectable season; verify their details and states.

1. **Given** a participating club, **When** its row is expanded, **Then** the selected-season competition or competitions, game and round entries, separately identified bonuses and adjustments, and selected-season total are shown.
2. **Given** a club did not participate in any European competition in the selected season, **When** its row is expanded, **Then** it shows a score of zero and an explanation of the confirmed non-participation.
3. **Given** a game, result, bonus, participation, or contribution is unknown, **When** details are shown, **Then** the unknown is not presented as a confirmed zero.
4. **Given** a selectable historical season, **When** a club row is expanded, **Then** the application provides that season's game and round details with the same distinctions as the active season; any unavailable data is disclosed explicitly rather than invented.
5. **Given** different competition formats, **When** their details are displayed, **Then** comparable stages are consistently identified and unplayed or inapplicable entries remain distinct from zero-point results.

### User Story 3 - Browse global association rankings (Priority: P1)

A user switches to a country tab and compares UEFA associations globally, using the same five-season columns, total, rank, movement, and expansion pattern as the club ranking.

**Independent test**: Load associations with known association-specific points and multiple clubs across competitions; verify global order, per-season coefficients, movement, and each expansion's competition groups and subtotals.

1. **Given** complete association data, **When** the country tab is selected, **Then** associations are ranked globally by their five-season association coefficient, with rank, rank movement, five labelled season coefficients, and final coefficient.
2. **Given** a user expands an association, **When** participating clubs are shown, **Then** they are grouped by their selected-season competitions and each group has a clearly labelled subtotal.
3. **Given** association calculations, **When** the season and five-season association coefficients are displayed, **Then** they use UEFA's association-specific rules and participating-club divisor, not a division of displayed club coefficients or the competition subtotals.
4. **Given** a user sorts a season column, **When** rows reorder, **Then** each association retains its global coefficient rank.
5. **Given** a club participates in more than one competition during the selected season, **When** it appears in the expansion, **Then** each competition subtotal counts only the club's points attributable to that competition; no points are double-counted.

### User Story 4 - Understand rank movements and reliability (Priority: P1)

A user compares each entity's current global rank with its prior-season global rank and can tell whether data is mocked, incomplete, stale, or unavailable.

**Independent test**: Exercise upward, downward, unchanged, missing, and unresolved prior ranks alongside mock and unavailable data.

1. **Given** a club or association rises from rank 5 to rank 3, **When** its movement is shown immediately after the rank, **Then** it displays `+2` in green and conveys improvement in text or an accessible label.
2. **Given** an entity falls from rank 3 to rank 4, **When** its movement is shown, **Then** it displays `-1` in red and conveys decline without relying on color alone.
3. **Given** an unchanged rank, **When** movement is shown, **Then** it displays `0` with an accessible unchanged label.
4. **Given** either rank is unavailable or unresolved, **When** movement is shown, **Then** it is unavailable rather than a fabricated change.
5. **Given** mock data, **When** either ranking is displayed, **Then** it is labelled mock and never presented as live or verified.
6. **Given** a live source is stale, partial, or unavailable, **When** results are shown, **Then** the state and last successful update when known are disclosed.
7. **Given** a calculated coefficient differs from its comparable official UEFA value, **When** it is displayed, **Then** it is italicized and labelled as ambiguous; an exact match removes that coefficient's mismatch indicator.

### User Story 5 - Use a clear, responsive ranking experience (Priority: P1)

A user can comfortably read and operate the rankings on a phone, tablet, or desktop, choose a dark or light appearance, and use the core ranking flows in Brave and Firefox.

**Independent test**: At narrow mobile, tablet, and desktop viewport sizes, verify that ranking information remains readable without page-level horizontal scrolling, controls remain touch- and keyboard-operable, dark mode is the first-visit default, a chosen theme persists, and the core journeys work in Brave and Firefox.

1. **Given** a first visit with no saved preference, **When** the application opens, **Then** it uses the dark theme; a visible control lets the user switch to light or dark and remembers the selection on subsequent visits.
2. **Given** a phone-sized viewport, **When** either ranking is displayed, **Then** the global rank, entity, association where relevant, coefficient, status, and access to all five contributions and details remain readable without page-level horizontal scrolling or requiring hover.
3. **Given** a touch device, **When** a user operates selectors, sort controls, tabs, theme controls, and detail disclosures, **Then** targets are comfortably sized and spaced, provide clear pressed/focus feedback, and retain keyboard access.
4. **Given** either theme or a supported browser, **When** ranking states and controls are displayed, **Then** text, status, focus, and controls remain distinguishable with sufficient contrast and without relying on color alone.

## Edge Cases

- Rank movement is `previous-season global rank - selected-season global rank`; the previous rank uses the immediately preceding season's own five-season window and applicable tie rules. Sorting does not change rank or movement.
- A new or previously unranked entity, or an unresolved tie affecting either rank, has unavailable movement; it is not shown as zero.
- The prior-season comparison requires an additional older season beyond the five displayed columns; historical coefficients and inputs must extend far enough to calculate it.
- A confirmed season without participation is zero; missing participation, points, or competition information is unknown and must not be silently turned into zero.
- Pending, postponed, abandoned, corrected, or unratified results do not become settled match points.
- Missing required historical data or a required association coefficient prevents a verified final club coefficient or rank; association records with missing required inputs are likewise incomplete.
- A club's association, competition, or domestic league may change across seasons; use the relevant season's classification, disclose unknowns, and do not silently substitute the current classification.
- If an association has no participating clubs in the selected season, show an explanatory empty breakdown rather than a fabricated subtotal or a division by zero.
- Country competition subtotals are explanatory club contributions and must be clearly distinguished from the official association coefficient, which uses association-specific scoring and the participating-club divisor.
- Current-season rolling rankings include the ongoing season and are provisional; do not describe them as UEFA's fixed current-season seeding ranking or as live when backed by mocks.
- Comparison requires the same entity, measure, season, period and snapshot. An unavailable or incomparable UEFA reference is unverified, not an exact match or a demonstrated difference. An exact coefficient match does not establish that an independently ambiguous rule or rank is resolved.

## Requirements

### Functional Requirements

- **FR-001**: The application MUST provide keyboard-accessible global club and country ranking tabs, with the club tab initially selected.
- **FR-002**: Both rankings MUST default to the active UEFA season and permit selection of any season for which the required dataset is available.
- **FR-003**: The club ranking MUST include eligible clubs with participation in the selected five-season period, including clubs absent from the selected season, and rank complete records globally by coefficient descending by default.
- **FR-004**: Each club row MUST display global rank, immediately adjacent rank movement, club and association, exactly five identified season contributions ending in the selected season, and a final coefficient.
- **FR-005**: The final club coefficient MUST use the higher of the five-season club contribution sum and 20% of the association's five-season association coefficient, applying applicable UEFA precision; an applied minimum MUST be identified.
- **FR-006**: Each club row MUST be keyboard-expandable to show selected-season competition participation, match and round points, separately labelled bonuses and adjustments, and the selected-season total.
- **FR-007**: Confirmed non-participation in the selected season MUST be shown as zero with an explanation; unknown or unavailable participation and points MUST NOT be shown as confirmed zero.
- **FR-008**: Game, round, bonus, and adjustment details MUST be retained for every selectable season, including historical seasons, and disclosed as unavailable if required source data is missing.
- **FR-009**: The system MUST retain enough older club and association season coefficients and rank inputs to compute the five-season windows and prior-season rank comparisons for every selectable season, including seasons before 2022.
- **FR-010**: Each association row MUST show global rank, immediately adjacent rank movement, association, exactly five identified season association coefficients ending in the selected season, and the five-season association coefficient.
- **FR-011**: The association ranking MUST use UEFA's association-specific scoring rules and applicable divisor, normally the participating-club count but including season-specific exceptions; it MUST NOT derive the association coefficient by dividing displayed club coefficients.
- **FR-012**: Each association row MUST be keyboard-expandable to show selected-season participating clubs grouped by competition, with labelled competition subtotals that do not double-count transferred clubs' points and are not represented as association coefficients.
- **FR-013**: Users MUST be able to sort either ranking by any displayed season contribution; coefficient rank and movement MUST remain based on the global coefficient ranking even when rows are sorted differently.
- **FR-014**: Rank movement MUST equal prior-season global rank minus selected-season global rank: positive improvements display `+N` in green, declines `-N` in red, and unchanged ranks `0`; all states MUST also be understandable without color.
- **FR-015**: If a rank comparison, tie-break, contribution, association coefficient, or other required input is missing or unresolved, the affected rank, coefficient, movement, or breakdown MUST be clearly marked incomplete or unavailable, not verified or fabricated.
- **FR-016**: Club and association scoring, eligibility, precision, and tie-breaks MUST follow the official UEFA rules applicable to each relevant season and competition; unsupported or unverified rules MUST be explicit rather than silently reused.
- **FR-017**: Match points, bonuses, and minimum adjustments MUST be separately attributable; a displayed complete season total MUST equal its applicable entries without duplicate awards.
- **FR-018**: Comparable stages MUST be consistently identifiable across competition formats; unplayed, pending, unknown, and inapplicable entries MUST be distinguishable from confirmed zero-point results.
- **FR-019**: Both views MUST identify their selected five-season period and label an ongoing-season view provisional, distinguishing it from UEFA's fixed seeding coefficient.
- **FR-020**: The application MUST disclose mock/live source, partial/stale/unavailable state, and last successful update for live data when known; mock data MUST NOT be called live or verified.
- **FR-021**: The first release MUST use deterministic mock data and include both association-floor outcomes, non-participation, missing data, rank movements, historical selection, and multiple clubs and competitions per association.
- **FR-022**: For real historical data, the system MUST reconstruct club and association points from attributed results and applicable season-specific rules, and independently compare calculated coefficients with UEFA reference values for the same season, period and snapshot. Missing coverage or a mismatch MUST be reported and MUST NOT be presented as verified.
- **FR-023**: Retain permitted historical source data locally, including source HTML and normalized CSV, with provenance; external source access is for the current season rather than required to load archived seasons. Missing historical data remains explicit.
- **FR-024**: Display calculated coefficients that differ from comparable official UEFA values in italics with an accessible ambiguity label. Remove this mismatch indicator when the value exactly matches the corresponding official value at applicable UEFA precision; disclose unavailable or incomparable references separately. A value match does not by itself resolve underlying rule or ranking ambiguities.
- **FR-025**: Ranking and detail views MUST use a mobile-first responsive layout that preserves all ranking information and interactions at 320 CSS pixels and above without page-level horizontal scrolling; users MUST be able to zoom and increase text size without clipping essential content.
- **FR-026**: The application MUST use dark mode by default on a first visit and provide a visible light/dark theme control whose user-selected preference persists across reloads; both themes MUST preserve semantic status distinctions, visible focus, and accessible contrast.
- **FR-027**: The core ranking journeys MUST work in current stable Brave and Firefox releases. Browser-specific behavior MUST be avoided or feature-detected, and the supported browser flows MUST be covered by repeatable tests.

### Key Entities

- **Season and competition**: The selected season, competition participation, and season-specific stages and rules.
- **Club and association**: Stable identities with season-specific membership and classification.
- **Game, round, and point entry**: Ratified results and separately attributable club or association-eligible match points, bonuses, and adjustments.
- **Season contribution**: A club's season points or an association's season coefficient, with provenance, completeness, and participation state.
- **Rolling coefficient and rank**: A five-season coefficient, global rank, applicable tie state, and prior-season rank comparison.
- **Competition subtotal**: The explicitly labelled sum of relevant club contributions within one association's selected-season competition group, distinct from the association coefficient.
- **Data status**: Mode, source, quality, and last successful update where applicable.

## Success Criteria

- **SC-001**: Both views show exactly five labelled seasons ending in the selected season for every complete ranking row.
- **SC-002**: In deterministic fixtures, 100% of complete club coefficients equal the higher of the five-season club sum and the applicable 20% association minimum; applied minima are visible.
- **SC-003**: For complete deterministic club season details, 100% of displayed totals equal their separately displayed eligible match, bonus, and adjustment entries.
- **SC-004**: For complete deterministic association examples, 100% of season coefficients follow applicable association-specific UEFA scoring and divisor rules; competition subtotals are identified separately.
- **SC-005**: Fixture movements for improved, declined, unchanged, and unavailable ranks display the correct value and an accessible non-color indication.
- **SC-006**: Sorting on each season column correctly changes row order without changing global ranks or movements.
- **SC-007**: An eligible non-participating club remains in the global ranking and its expanded selected-season detail shows zero with an explanation; missing data is not displayed as verified.
- **SC-008**: Selecting a supported older season displays its correct five-season window, previous-season comparison, and available game/round details.
- **SC-009**: Both ranking views visibly identify mock data and do not claim it is live; users can switch tabs and expand rows by keyboard.
- **SC-010**: For every real-data entity and period designated verified, the calculated coefficient exactly matches its comparable official UEFA value at the applicable precision; discrepancies and missing reference or input coverage remain explicit.
- **SC-011**: Matching, differing and unavailable/incomparable references produce distinct states; only a demonstrated coefficient difference is italicized and labelled ambiguous, and an exact match removes that mismatch indication.
- **SC-012**: At 320, 375, 768, 1024, and 1440 CSS-pixel viewport widths, ranking and details retain access to all displayed values without page-level horizontal scrolling; core touch targets are at least 44 by 44 CSS pixels where practical, with readable 16px mobile body text and usable 200% zoom.
- **SC-013**: A first visit renders in dark mode; switching to light or back to dark persists across reloads. Normal text meets at least 4.5:1 contrast and large text and essential non-text controls meet applicable WCAG AA contrast thresholds in both themes.
- **SC-014**: The core journey for selecting a season, sorting a ranking, expanding details, changing theme, and reading missing/pending states passes in current stable Brave and Firefox.

## Assumptions

- The first release covers senior men's Champions League, Europa League, and Conference League; earlier competition formats must follow the rules and supported competition scope of the relevant season.
- In the revised retention requirement, game and round details are kept for **every selectable season**, not only the latest five seasons. Older season coefficients are also retained as needed to calculate five-season windows and previous-season ranks; older seasons need not themselves be selectable merely because their coefficients are retained.
- Active-season rolling coefficients are provisional and differ from fixed current-season seeding coefficients; live external integrations remain a later release.
- Historical rules, applicable association-floor and tie-break treatment, and source availability must be verified for each supported period. Unsupported or incomplete data must remain explicit.
- The initial fixture dataset may be small but must demonstrate the specified behaviours without inventing verified historical results.
- No accounts, personalized ranking, or user-generated club data are included.
