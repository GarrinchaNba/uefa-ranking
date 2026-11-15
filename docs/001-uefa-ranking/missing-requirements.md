# Exact Remaining Requirements

This file lists the evidence and values needed to replace MVP assumptions and complete the remaining ranking work. It does not block the synthetic club-ranking MVP. Do not remove the corresponding `FIXME` markers or describe these outputs as UEFA-verified until the applicable entries below are resolved.

## Values currently assumed by the MVP

The deterministic fixture is not historical UEFA data. The implementation uses explicitly labelled assumptions only when every club-season and association-season record is tagged with source ID `synthetic-fixture`. The implementation must not apply these fallbacks to imported/source data.

| Fixture gap | Current placeholder | Exact replacement needed |
|---|---|---|
| `unverified-united`, `2023-24` club contribution | Null points provisionally contribute `0` to its synthetic five-season sum. | The club's official annual coefficient for 2023/24 at UEFA precision, or complete competition-by-competition ratified results plus the applicable awards, membership and rule attribution needed to reconstruct it. |
| Albion and Caledonia, `2026-27` association contributions | Null season coefficients provisionally contribute `0`; the active season is partial. | Complete association-eligible points by competition, participating-club divisor and any entitlement/non-replacement evidence, after the season is complete. For a live provisional ranking, provide a dated snapshot containing all settled awards and current participants instead. |
| Caledonia, `2024-25` association contribution | Null coefficient provisionally contributes `0`. | Official association coefficient for the 2024/25 season and its source/snapshot, or the association-eligible points and divisor needed to reconstruct it. |
| Historical club contributions (`2018-19`–`2025-26`) | Fixture values are synthetic annual totals; they are not derived from the archived match pages. | Correctly identified club annual coefficients for each required club/season, or complete ratified match, qualifying, award, placement, transfer, membership and rule data from which to reconstruct them. |
| Historical association contributions (`2018-19`–`2025-26`) | Fixture values are synthetic; some are merely attributed inputs. | Association annual coefficient or eligible points and the applicable season divisor for each association/season, including any D.3 entitlement exception and supporting evidence. |
| Club and association tie-breaks | The mock ranks by newest annual contributions; exact remaining ties are shown unresolved. | The applicable official ranking tie-break order and inputs for each ranking snapshot: annual contributions, association coefficient where applicable, domestic league position, and any final draw/lot outcome if a unique order is required. |

## Primary regulation evidence

For T056 and any value called rule-verified, provide readable, season-specific official UEFA regulation text for each relevant competition (Champions League, Europa League and Conference League) and season. The text must cover:

- Club match eligibility and qualifying-elimination awards; association match points; bonuses, floors/minimums and non-duplicated adjustments.
- Participant and association-divisor rules, including refusal/exclusion/non-admission and replacement cases.
- Precision, truncation boundaries and special single-leg/exceptional match treatment.
- Club and association ranking tie-break order, with the exact season and period to which each provision applies.
- The different group-stage and league-phase bonus schedules and any season transition.

The user supplied copies for 2021/22, 2023/24 and 2024/25, linked official 2026/27 rules, and stated that 2022/23 matches 2023/24 and 2025/26 matches 2026/27. The unresolved evidence is independent primary-source verification of those two mappings and the exact fixed-ranking/tie-break application to the requested rolling snapshots. Do not infer the old/new format schedule from the words “group stage” or “league phase” alone.

The selectable 2023/24 ranking and its preceding ranking need 2018/19–2023/24 contributions. The selectable 2026/27 ranking and its preceding ranking need 2021/22–2026/27 contributions. For coefficient-only historical years, official annual values with exact season/entity/source provenance are sufficient for ranking arithmetic; event-level reconstruction is required when the season's details or reconstructed values are claimed.

## Official comparison data

To close T098/T100/T102, obtain a readable official UEFA reference export (not just a rendered ranking page) containing:

1. Stable or reconcilable club/association identity and the source display name.
2. The exact coefficient measure: annual club points, annual association coefficient, five-season club coefficient, or five-season association coefficient.
3. The season or five-season period start/end, the snapshot/as-of date, and whether it is fixed seeding or the requested rolling ranking.
4. The official value and published precision for every entity in scope, plus the source URL/document and retrieval date.
5. Explicit coverage for entities absent from the returned table; absence must not be interpreted as zero.

The existing UEFA country-season page fetch did not expose values in retrieved HTML. No official values are currently imported, so no coefficient is classified as matched or different.

## Source data and identity reconciliation

For T097/T101 and real-data reconstruction:

- Convert the retained RSSSF season pages into one documented match CSV schema for all seasons required by the selected and previous ranking windows; record page completeness and source attribution.
- Complete the 2025/26 and 2026/27 match/result data with settled versus scheduled/unratified status, legs, scores before shoot-outs, stage, competition, progression/elimination and applicable bonuses.
- Reconcile RSSSF, Kassies and UEFA club names to stable club IDs using documented aliases. Resolve association labels and transfers by season; ambiguous identities must remain unresolved rather than be guessed.
- Record each association's participating clubs, eligible awards and divisor for every association-season. Preserve non-replacement entitlement/reason evidence.
- Confirm each retained source's reuse/archival terms before using it as a redistributable fixture or input.

## Remaining work by task group

| Tasks | Exact outstanding element |
|---|---|
| T056 | Primary-source rule verification and explicit rolling-rank/tie-break mapping described above. |
| T064–T070 | Synthetic MVP work is implemented; replacing FIXME assumptions requires the values and rule evidence above. |
| T071–T077 | Full event-level rules and detail inputs for each selectable season, including confirmed non-participation, ordered stages, settled results and separately attributable awards. |
| T078–T086 | Association-eligible event awards, distinct participating-club counts, divisor exceptions and verified association tie-break inputs; these cannot be derived from club totals. |
| T087–T091 | Official or complete inputs for independently computed current and previous five-season populations; finish common stale/error handling and movement integration for the association view. Club movement is present in the MVP only. |
| T092–T096 | Browser journey, full validation, route migration decision and testing documentation; these are implementation/verification tasks and do not require new external facts for the mock MVP. |
| T097/T101 | Authorized, complete match/participant data and CSV conversion described above. |
| T098/T100/T102 | Comparable official UEFA values, complete identity mapping and exact period/snapshot metadata described above. |

## Assumption removal rule

Replace each `FIXME(mvp-...)` assumption with evidence-backed logic and regression tests. Keep missing or non-comparable data explicit. A matching total may clear that coefficient's mismatch indicator, but it does not prove event attribution, rule interpretation or rank tie-breaks independently.
