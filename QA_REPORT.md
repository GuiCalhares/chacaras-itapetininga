# QA_REPORT — Chácaras à venda até 15 km de Itapetininga

Final review of `index.html`, `styles.css`, `app.js` and `data.json`, checked against DESIGN.md, the impeccable craft floor and audit guidance, and the brief. Screenshots were taken with headless Chrome against the live site (https://guicalhares.github.io/chacaras-itapetininga/). Behaviour was exercised with a harness page served locally and checked with `--dump-dom`.

## Verified OK

- **Data integrity.** `data.json` has 226 items with 226 unique ids. `preco`, `url` and `dist_km` match `data_raw.json` (excluding `excluido`) item by item, with 0 mismatches. Unknown values stay `null` or "não informado". Nothing is inferred. Every `dist_km` is ≤ 15.
- **Default view.** All 226 are listed and the count reads "226 chácaras". Sort is menor preço (first item R$ 160.000).
- **Filters.** Results match the same logic computed independently in Python:
  - preço ≥ 300k, ≤ 8 km, piscina, 2+ quartos, 2+ banheiros → 67 shown, plus 55 hidden for missing data. Reveal shows 122. Toggle text and URL (`?pmin=300000&km=8&pisc=1&qt=2&bh=2`) are correct.
  - Imobiliária chip, "Limpar filtros" (back to 226) and search all work. Search is accent- and case-insensitive: "rio" → 41, the same as Python.
  - A query with no matches shows the empty state.
- **Sort.** Maior preço, Mais perto (first item ≈ 1,5 km), Maior terreno, and header clicks (terreno → asc, `aria-sort` updated, hidden "Menor terreno" option revealed) all work. Nulls sort last.
- **Formatting.** pt-BR formatting is correct: `R$ 160.000`, `1.060 m²`, `≈ 4,6 km`, alqueires.
- **Straight-line disclaimer.** It appears in the subtitle, the slider hint and the footer. Every distance has the "≈" prefix.
- **Responsive views.** Mobile shows cards with a sticky search + Filtros bar and a `<dialog>` bottom sheet with a live "Mostrar N chácaras". Desktop shows a table with a sticky header and a sticky Preço column.
- **No horizontal page scroll at 320 px.** Checked via a 320 px iframe: scrollWidth equals clientWidth.
- **detect.mjs.** No findings.

## Defects found and fixed

| # | Defect | Fix |
|---|---|---|
| 1 | At 1440 px the desktop table was 1357 px wide inside a 1239 px wrapper, so the "Ver anúncio" column was cut off and could only be reached by scrolling. | Cell padding 12→10 px, Local min-width 220→150 px, Água ellipsis 140→120 px, tighter link button. The table is now 1239/1239 at 1440. Narrower desktops still scroll inside the wrapper, with Preço sticky, as the spec allows. |
| 2 | The live count's text was "168 chácarasde 226": no space before "de", so screen readers ran the words together. | Added a space before `<small>`. |
| 3 | Agency chips had accessible names like "Albor21". | The name is now "Albor 21 anúncios" (visually unchanged). |
| 4 | The km plate relied on `aria-label` on a generic `<span>`, which is not reliably announced. | The visible "≈ 4 km" is `aria-hidden`, with visually hidden text "aproximadamente 4 quilômetros em linha reta". |
| 5 | Search and price inputs only wrote state inside the 150 ms debounce. A render triggered by another control in that window (e.g. the other price field) overwrote the pending typed value with the old state (reproduced: typing Mín. then Máx. quickly lost Máx.). | State updates on every keystroke. Only rendering and the live-region update are debounced. |
| 6 | Desktop filter panel: the "Incluir anúncios sem informação…" checkbox sat below the three-line Imobiliária block, leaving a large empty area under Quartos and Banheiros. The spec puts it under Banheiros. | Imobiliária spans grid rows 2–3, and the checkbox sits in row 3 under Quartos and Banheiros. |
| 7 | The "Qualquer" segment was cramped: its text touched the borders on desktop. | The first segment gets a larger flex share. |
| 8 | Opening the mobile sheet auto-focused "Limpar" and showed a focus ring on it, as if "Limpar" were the suggested action. | The sheet title (`tabindex="-1" autofocus`) takes initial focus, so Tab goes into the controls. |

## Noted, not changed

- The subtitle, hint and footer say "a partir de Itapetininga" rather than DESIGN's "centro de Itapetininga". DATA_NOTES does not document the exact origin point, so the vaguer wording avoids inventing a claim.
- Known source quirks are rendered faithfully and flagged in the UI as "Valores conforme o anúncio":
  - one listing at R$ 2.500.000.000;
  - 7 terreno values under 20 m² (sedna-10423 = 3 m², franciosi-66104 = 2 m², …).
- On a 390 px phone the search placeholder is truncated ("Bairro, estrada, imobiliária…" does not fit next to Filtros). The label is still exposed to assistive tech, so this was accepted.
- The live count also updates while the distance slider is dragged (only text input is debounced). This is minor and was left as is.

## Post-deploy check

After the push (commit 17382e2), Pages redeployed and `desktop.png` / `mobile.png` were retaken against the live URL:

- At 1440 px the whole table, including the "Ver anúncio" column, fits without scrolling.
- The include-missing checkbox now sits under Quartos and Banheiros.
- The mobile cards are unchanged and correct.
