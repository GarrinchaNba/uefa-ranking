# Visual Design Direction

## Direction

Use a calm, editorial sports-data dashboard: a deep ink canvas, restrained blue accents, and compact but clearly separated ranking cards. The interface should feel reliable and information-dense rather than promotional. Use one consistent visual hierarchy across global club and association rankings, with the coefficient and rank visually prominent while keeping all five annual contributions equally available.

## Tokens

The page uses a system sans-serif stack for legible numerical data and avoids downloading fonts. Body text is 16px minimum; ranking titles use a 24px/1.2 scale, page title 32px/1.15, and labels 13–14px. Spacing follows a 4px base: 4, 8, 12, 16, 24, 32, and 48px.

| Token | Dark | Light | Use |
|---|---|---|---|
| Canvas | `#101820` | `#f3f6f9` | Page background |
| Surface | `#1b2833` | `#ffffff` | Cards, controls, detail panels |
| Elevated surface | `#243541` | `#e8eef4` | Hover, selected tabs, table headings |
| Primary text | `#f5f7f8` | `#15212b` | Headings, names, values |
| Muted text | `#bdc9d1` | `#52616e` | Explanations, labels |
| Accent | `#8bc8ff` | `#075ea8` | Links, focus and selected controls |
| Positive | `#7be0ad` | `#087344` | Improvement |
| Negative | `#ff9b96` | `#b42318` | Decline and error |
| Border | `#40515e` | `#c6d1db` | Card, table and control boundaries |

Use semantic text and labels alongside status colors. Primary and muted foregrounds must meet 4.5:1 contrast on their surfaces. Focus rings and essential controls must remain clearly visible in both themes.

## Layout and interaction

- At 768px and wider, preserve a dense semantic table with sortable season headers inside a horizontally scrollable table region; scrolling that region must never widen the page.
- Below 768px, use stacked ranking cards. Each card exposes rank, movement, entity, association when applicable, all five labelled season contributions, total/coefficient, status/reason, and the same detail disclosure. Do not rely on hover or hide annual values behind a carousel.
- Details use wrapping text and full-width bordered panels; no fixed minimum width is permitted on mobile.
- Use 44px minimum control height, visible hover/pressed/focus states, and a 2px focus indicator with offset.
- Respect `prefers-reduced-motion`; transitions are brief and nonessential.
- The first visit is dark. A labelled, persistent theme toggle switches to light or dark and updates the document color scheme.

## Component hierarchy

The application header contains the product title and theme control. Ranking tabs and the shared season selector follow. Each ranking section has a heading, concise explanation, source status, provisional notice where applicable, then either a desktop table or mobile cards. Expandable details remain associated with their row/card and preserve the existing competition and attribution labels.
