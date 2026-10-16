# DESIGN.md — Chácaras à venda até 15 km de Itapetininga — out/2026

Spec for the implementer (Sonnet 2). Build exactly this. Where it says "must", treat it as acceptance criteria. Stack: `index.html` + `styles.css` + `app.js` (vanilla JS, no framework, no build step) + `data.json`.

---

## 0. Process note (impeccable)

- Mode: **Operate.** The visitor wants to narrow ~226 listings to a shortlist and open the original ad. Being able to scan the page matters more than expression. The brand shows up in the details: the green band, the km plate, numerals, and how "não informado" is handled.
- No PRODUCT.md, DESIGN.md or UI code existed. This is a non-interactive pipeline, so the direction was inferred from the brief alone. The `concept-seed.mjs` roll ran and printed nothing, so it assigned no direction. The direction below is the design lead's own call, and that substitution is disclosed here.
- Run `node .claude/skills/impeccable/scripts/detect.mjs --json index.html styles.css app.js` once after building. Fix mechanical findings.

## 1. Direction / POV — "Placa de estrada"

**Scene.** Someone in Itapetininga, mostly on a phone, often outdoors or in a car in daylight. They share links on WhatsApp with family ("olha essa, 4 km, tem piscina"). They compare price, distance and whether the place has a pool and enough bathrooms.

**World.** Roads in the interior of São Paulo, which is how you actually reach a chácara. Think green road-sign plates, km markers, Barlow-style sign lettering, and the contour lines of an IBGE topographic sheet. The page should read as a **clear, sunlit road sign and a well-kept field ledger**. That rules out a real-estate portal, and it rules out the cream-and-serif "boutique" look.

**What it is not.** No hero photo, no marketing tone, no gradients, no glassmorphism, no eyebrow labels above headings, no emoji icons, no cards-inside-cards.

**Memorable moments.**
1. The **deep road-green header band** with faint contour lines and the title in condensed sign lettering.
2. The **km plate** on every listing: a small green rectangular plate reading `≈ 4 km` in white condensed numerals. Distance is the core promise of the page.
3. **Honest gaps.** Missing data reads as "não informado" in the same place every time. It is never a blank, never a zero, never a guess. When a minimum filter (quartos/banheiros/piscina) hides listings because of missing data, the page says how many it hid and offers to show them.

**Color strategy.** Restrained. Neutral green-grey paper and white surfaces. Road green is the single brand color, used for the header band, the primary button and the km plate. Water blue is reserved semantically for piscina/água data. Light theme only. Rationale: daylight phone use.

---

## 2. Data contract and formatting

Input is `data.json`, an array of objects (produced by the data-prep agent):

| field | type | display |
|---|---|---|
| `id` | string/number | key only |
| `preco` | number | `R$ 850.000` via `Intl.NumberFormat('pt-BR',{style:'currency',currency:'BRL',maximumFractionDigits:0})` |
| `area_terreno_m2` | number\|null | `1.925 m²` (`Intl.NumberFormat('pt-BR',{maximumFractionDigits:0})` + ` m²`). If ≥ 24.200, add a secondary line on cards: `≈ 2,4 alqueires` (value / 24 200, 1 decimal, pt-BR). The alqueire paulista is the unit locals use. |
| `area_construida_m2` | number\|null | same m² format |
| `quartos`, `banheiros`, `suites` | int\|null | integer |
| `piscina` | `"sim"`\|`"não"`\|`"não informado"`\|null | chip, see §8 (null is treated as "não informado") |
| `agua` | string\|null | sentence-case it (`poço artesiano` → `Poço artesiano`); `"não informado"`/null is treated as missing |
| `local` | string | as given |
| `dist_km` | number | `≈ 4 km` (1 decimal only if not an integer: `≈ 1,5 km`) |
| `dist_ref` (optional) | string | if present and equals `"U"` (the location is only known at city/neighbourhood level), the km plate gets the "approximate" variant (§7) |
| `imobiliaria` | string | as given |
| `titulo`, `obs` | string\|null | `obs` shown as a note line when non-empty |
| `url` | string | "Ver anúncio" link |

Rules:
- **Never invent, never coerce.** `null` must never render as `0`, `—` alone, or an empty cell. See §9.
- Numbers use `font-variant-numeric: tabular-nums` everywhere they appear in columns or specs.
- Build all formatters once (module-level `Intl.NumberFormat` instances).

Known data quirks for the implementer. Do not "fix" these in the UI. Just render them faithfully:
- One listing has `preco` = 2.500.000.000 (likely a source typo). The price filter must use free numeric inputs, **not** a slider bounded by max(preco).
- A few `area_terreno_m2` are tiny (2, 3, 8 m²), likely alqueire/ha values mis-parsed upstream. Report these to DATA_NOTES; the UI shows the value as is.
- In the current data, `piscina` has no `"não"` values (only `sim` / `não informado`). The UI still supports `"não"`.

---

## 3. Tokens

Put these in `:root` in `styles.css`. Use hex as the value and keep oklch as the comment (or use oklch with a hex fallback; either is fine). Contrast ratios were measured.

### 3.1 Color

| token | hex | oklch | use |
|---|---|---|---|
| `--paper` | `#F3F5F0` | `oklch(96.7% 0.007 124)` | page background |
| `--surface` | `#FFFFFF` | `oklch(100% 0 0)` | cards, table, sheet, inputs |
| `--ink` | `#17211B` | `oklch(23.6% 0.018 158)` | primary text (16.5:1 on white) |
| `--ink-2` | `#47544C` | `oklch(43.2% 0.021 158)` | labels, secondary text (7.9:1 on white, 7.2:1 on paper) |
| `--ink-3` | `#5F6B63` | `oklch(51.5% 0.019 156)` | **"não informado"**, placeholders (5.6:1 on white, 5.1:1 on paper) |
| `--line` | `#D3DBD4` | `oklch(88.3% 0.013 149)` | dividers, card borders (decorative) |
| `--line-strong` | `#7D8A81` | `oklch(62.0% 0.020 156)` | input/checkbox borders (3.6:1 on white, meets 3:1 for UI) |
| `--road` | `#0B5A3A` | `oklch(41.5% 0.090 160)` | header band, primary button, km plate, active chips, links (8.3:1 white text on it) |
| `--road-strong` | `#074630` | `oklch(35.1% 0.071 163)` | hover/pressed of road |
| `--road-tint` | `#E2EEE6` | `oklch(93.8% 0.017 157)` | selected-chip bg alternative, row hover, active filter chips |
| `--on-road` | `#FFFFFF` | — | text on road |
| `--on-road-2` | `#E9F2EC` | `oklch(95.3% 0.012 157)` | secondary text in header band (7.2:1) |
| `--water` | `#1D5F91` | `oklch(47.0% 0.104 246)` | piscina "sim" text/icon, água icon (6.8:1 on white) |
| `--water-tint` | `#E3EEF6` | `oklch(94.3% 0.016 239)` | piscina "sim" chip bg (water on it: 5.75:1) |
| `--sign` | `#F4C431` | `oklch(84.0% 0.159 89)` | focus ring only (ink on sign 10:1; sign on road 5:1) |
| `--alert` | `#9E3220` | `oklch(47.6% 0.147 32)` | error state text/icon |
| `--alert-tint` | `#F8E6E1` | `oklch(93.8% 0.021 36)` | error banner bg (alert on it 5.9:1) |

No other colors. No gradients. Shadows are tinted from ink (below).

### 3.2 Typography

Google Fonts, one request, `display=swap`:

```html
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Barlow:wght@400;500;600&family=Barlow+Semi+Condensed:wght@600;700&display=swap" rel="stylesheet">
```

- `--font-ui: "Barlow", system-ui, -apple-system, "Segoe UI", Roboto, sans-serif;` body, labels, controls, table.
- `--font-sign: "Barlow Semi Condensed", "Barlow", system-ui, sans-serif;` h1, prices, km plate, result count. These are the road-sign voice.
- Global: `font-variant-numeric: tabular-nums` on `.num`, prices, table cells and specs. `-webkit-font-smoothing: antialiased`. `text-wrap: balance` on h1, `text-wrap: pretty` on paragraphs.

Type scale (rem, root 16px):

| token | size / line-height | weight / family | use |
|---|---|---|---|
| `--t-h1` | `clamp(1.625rem, 1.15rem + 2.1vw, 2.5rem)` / 1.08, letter-spacing -0.01em | 700 sign | page title |
| `--t-price` | 1.625rem (26px) / 1 | 700 sign | card price |
| `--t-count` | 1.25rem / 1.2 | 600 sign | "143 chácaras" |
| `--t-lead` | 1rem / 1.45 | 400 ui | header subtitle |
| `--t-body` | 1rem / 1.5 | 400 ui | body, local name (600) |
| `--t-value` | 1rem / 1.25 | 600 ui | spec values |
| `--t-table` | 0.9375rem (15px) / 1.35 | 400 ui (price 600 sign 1.0625rem) | table |
| `--t-label` | 0.8125rem (13px) / 1.3 | 500 ui, sentence case, no tracking | spec labels, field labels, imobiliária line, notes |
| `--t-plate` | 0.9375rem / 1 | 700 sign | km plate |

No uppercase tracked labels. No monospace.

### 3.3 Spacing, radius, elevation, motion

- Spacing scale (4-pt): `--s-1:4px --s-2:8px --s-3:12px --s-4:16px --s-5:20px --s-6:24px --s-8:32px --s-10:40px --s-14:56px`.
- Page gutter: 16px (<600), 24px (600–1199), 32px (≥1200). Max content width **1320px**, centered.
- Radius: `--r-1: 4px` (km plate, chips' inner), `--r-2: 8px` (inputs, buttons, cards), `--r-sheet: 16px` (sheet top corners). Chips are pill `999px`.
- Elevation: cards are **flat** (1px `--line` border, no shadow). Sticky bar: `0 1px 0 var(--line), 0 4px 12px -6px rgb(23 33 27 / .18)`. Sheet: `0 -8px 32px -8px rgb(23 33 27 / .28)`. Backdrop: `rgb(23 33 27 / .45)`.
- Motion: one authored moment, which is the **bottom sheet**. It opens with `transform: translateY(100%) → 0` in 280ms `cubic-bezier(.22,1,.36,1)` and the backdrop fades over 200ms. It closes in 200ms ease-in. Nothing else animates except 120ms color/background transitions on controls. Under `prefers-reduced-motion: reduce`, all durations are 0ms.
- Focus (`:focus-visible` only): `outline: 3px solid var(--road); outline-offset: 2px` on light surfaces; `outline: 3px solid var(--sign); outline-offset: 2px` on road-colored elements (primary buttons, selected segments, pressed chips, the Filtros button).

### 3.4 Icons

Inline SVG `<symbol>` sprite at the top of `<body>`, `aria-hidden="true"`. Grid 20×20, `stroke="currentColor"`, `stroke-width="1.75"`, round caps/joins, `fill="none"`. Author these (Lucide geometry is fine to copy): `i-search`, `i-sliders` (filtros), `i-x`, `i-external` (arrow out of box), `i-waves` (piscina), `i-drop` (água), `i-pin` (local), `i-chevron-down`, `i-alert`. No emoji, no unicode glyphs as icons.

---

## 4. Page structure and breakpoints

```
<body>
  svg sprite
  <header class="band">             road-green band, scrolls away
  <div class="filterbar">            mobile: sticky search + Filtros button
  <main>
    <section class="filters">        ≥900: inline panel; <900: lives inside <dialog class="sheet">
    <div class="toolbar">            count + active chips + sort
    <div id="results">               cards (<900) OR table (≥900)
  </main>
  <footer>
```

Breakpoints (min-width, mobile-first):
- **base (<600):** single-column cards.
- **600px:** cards in a 2-column grid, gap 16px.
- **900px:** switch to the **table**. Filters become an inline panel above the table. The sticky mobile filterbar is hidden. The `<dialog>` is never opened.
- **1200px:** filter panel fits on one row where possible (see §6.2).

Use a `matchMedia('(min-width: 900px)')` listener to render either cards or table. Render only one of them, and re-render on change.

---

## 5. Header (band)

- Full-bleed `--road` background. Padding: 28px top / 24px bottom (mobile), 48px / 36px (≥900). Content aligned to the 1320px container.
- Background motif: inline SVG of 6–8 smooth, irregular **contour lines** (topographic), stroke `#FFFFFF` at `opacity .10`, stroke-width 1.25, absolutely positioned right side. It covers ~60% of the band width on desktop and 100% on mobile. Use `aria-hidden`, `pointer-events:none`, and keep the SVG under 2 KB.
- `<h1>`: **"Chácaras à venda até 15 km de Itapetininga — out/2026"**. `--t-h1`, `--on-road`, max-width 22ch.
- Below (12px gap), `<p>` in `--t-lead` `--on-road-2`, max 60ch:
  **"226 anúncios de 8 imobiliárias, do mais barato ao mais caro. Distâncias estimadas em linha reta a partir do centro de Itapetininga — o trajeto de carro é maior."**
  The counts are computed from data (`${total} anúncios de ${nAgencies} imobiliárias`). *Confirm the reference point ("centro de Itapetininga") against DATA_NOTES.md. If prep used a different origin, say that origin.*
- No logo, no nav, no buttons in the band.

---

## 6. Filters

### 6.1 Controls (same set on mobile sheet and desktop panel)

Filters apply **live** (no "Aplicar" step). Text input is debounced by 150 ms. Every change updates results, count, active chips and URL.

| # | label (pt-BR) | control | default | logic |
|---|---|---|---|---|
| 1 | **Buscar** | `<input type="search">`, icon `i-search` inside left, placeholder **"Bairro, estrada, imobiliária…"** | empty | case- and accent-insensitive (`normalize('NFD').replace(/\p{Diacritic}/gu,'')`), all whitespace-separated terms must match in `local + titulo + imobiliaria + agua + obs` |
| 2 | **Preço** | two inputs side by side: **"Mín."** / **"Máx."**, `inputmode="numeric"`, prefix `R$` rendered inside field. Below them are 3 quick chips: **"até 500 mil" · "até 1 mi" · "até 2 mi"** (these set Máx.; the active chip is pressed) | empty | parse digits only. On blur, reformat as `850.000`. If mín > máx, swap silently on blur |
| 3 | **Distância máxima** | `<input type="range" min="2" max="15" step="1">` with `<output>` showing **"até 15 km"** | 15 | `dist_km <= value` |
| 4 | **Piscina** | single checkbox-switch: **"Só com piscina"** | off | `piscina === "sim"` |
| 5 | **Quartos** | segmented radio group: **Qualquer · 1+ · 2+ · 3+ · 4+** | Qualquer | `quartos >= n` |
| 6 | **Banheiros** | segmented radio group: **Qualquer · 1+ · 2+ · 3+ · 4+** | Qualquer | `banheiros >= n` |
| 7 | **Imobiliária** | multi-select toggle chips (`<button aria-pressed>`), one per agency, sorted A–Z, label `Chitolina 50` with the count in `--ink-2`/lighter weight. No chip pressed = all | none pressed | `selected.has(imobiliaria)` |

**Missing-data rule (important).** Filters 4, 5 and 6 compare against fields that can be null. With a filter active, items whose field is null or `"não informado"` are **excluded** by default. The number excluded *only because of missing data* (they pass every other filter) is computed and surfaced in the toolbar (§7) as a one-tap reveal: **"+ 37 sem essa informação — mostrar"**. Toggling it sets `incluirSemInfo = true`. Those items then appear, interleaved in sort order, and their missing field shows the "não informado" treatment. The link text becomes **"Ocultar os 37 sem informação"**. The toggle is also in the filter UI, as a checkbox under Banheiros: **"Incluir anúncios sem informação de piscina, quartos ou banheiros"**.

Controls: height 44px (inputs, segmented, chips 36px tall but with ≥44px hit area via padding/margins), 1px `--line-strong` border, `--r-2`. Segmented: connected buttons, the selected one is `--road` bg with white text. Unselected is surface with `--ink`. Pressed agency chip: `--road` bg, white text, a check icon is not needed. Field labels: `--t-label` `--ink-2`, 6px above the control. Group spacing: 20px.

**"Limpar filtros"** resets all to defaults (including `incluirSemInfo=false` and the search). It does not reset sort.

### 6.2 Desktop (≥900px)

- The panel sits directly under the header in `--surface` with a 1px `--line` border and `--r-2`, padding 20px, margin-top `-24px` so it overlaps the band edge by 24px. That overlap is the one compositional gesture, a sign plate mounted on the band.
- Grid: `grid-template-columns: 2fr 2fr 1.4fr 1fr` at 900–1199. Row 1: Buscar | Preço | Distância | Piscina. Row 2: Quartos | Banheiros | Imobiliária (spans 2). At ≥1200: `2fr 2fr 1.5fr 1.2fr`, same arrangement. Don't attempt a single row; it cramps.
- The "Limpar filtros" text button sits top-right of the panel (`--road`, 600, underline on hover). Show it only when any filter differs from its default.
- Not sticky. The table header is sticky instead.

### 6.3 Mobile (<900px): sticky bar + bottom sheet

**Sticky filterbar** (`position: sticky; top: 0; z-index: 20`), `--surface` background, padding 8px 16px, elevation per §3.3. It has one row, height 60px:
- Search input (flex 1), the same control as filter 1, kept in sync with the one in the sheet. Better: there is only one search input, and it lives here on mobile and is moved into the panel at ≥900. Just ensure a single source of truth.
- **"Filtros"** button: 44px tall, `--road` bg, white, `i-sliders` + "Filtros". When filters 2–7 are active, it shows a badge: a 20px circle in `--sign` with `--ink` numerals (the count of active filters, search excluded). Accessible name: "Filtros, 3 ativos".

**Bottom sheet** = native `<dialog class="sheet">` opened with `showModal()` (built-in focus trap, Esc closes, `::backdrop`).
- Anchored bottom, full width, `max-height: 88dvh`, `--r-sheet` top corners, `--surface`.
- Grab handle: 36×4px `--line-strong` pill centered, 8px from the top (decorative; drag-to-close is optional, not required).
- Header row (sticky inside sheet, 56px): **"Filtros"** (1.125rem 600) left. On the right, **"Limpar"** text button and a close icon button `i-x` (`aria-label="Fechar filtros"`).
- Body: scrollable (`overflow-y:auto; overscroll-behavior: contain`), padding 16px, controls in the order of §6.1, rows 2–7 (search stays in the sticky bar).
- Footer (sticky bottom inside sheet, padding 12px 16px + `env(safe-area-inset-bottom)`, top border `--line`): full-width primary button **"Mostrar 143 chácaras"**. It updates live, and at 0 it reads **"Nenhuma chácara — ajuste os filtros"** and stays enabled but only closes. Tap closes the sheet and scrolls to the results top.
- Clicking the backdrop closes. On close, focus returns to the "Filtros" button.
- Lock body scroll while open (`document.documentElement.style.overflow='hidden'`).

---

## 7. Toolbar (count, active chips, sort)

Sits between filters and results, `margin: 20px 0 12px`.

Row 1 (flex, space-between, wraps):
- Count, `role="status" aria-live="polite"`: **"143 chácaras"** in `--t-count` sign. When filtered, append in `--t-label --ink-2`: **"de 226"**. Singular: **"1 chácara"**. Zero: **"Nenhuma chácara"**.
- Sort, `<label>` **"Ordenar por"** (visually hidden on <600) + `<select>`:
  - **Menor preço** (default, `preco` asc)
  - **Maior preço** (`preco` desc)
  - **Mais perto** (`dist_km` asc, tie-breaker preço asc)
  - **Maior terreno** (`area_terreno_m2` desc)
  - **Maior área construída** (`area_construida_m2` desc)
  
  Nulls always sort **last**, regardless of direction. Tie-breaker everywhere: `preco` asc, then `id`.

Row 2 (only when something is active), active filter chips, wrapping, gap 8px. Pills with `--road-tint` bg, `--ink`, 32px tall, label + `i-x` (button, `aria-label="Remover filtro: Até R$ 1 mi"`). Labels:
`"Busca: piscina"`, `"Até R$ 1 mi"` / `"A partir de R$ 300 mil"` / `"R$ 300 mil – 1 mi"`, `"Até 8 km"`, `"Com piscina"`, `"2+ quartos"`, `"3+ banheiros"`, `"Chitolina, Albor"` (1 chip for the agency set). Last item: text button **"Limpar filtros"**.
Compact money format for chips: `< 1 mi` → `"850 mil"`, `≥ 1 mi` → `"1,4 mi"` (pt-BR decimal comma).

Row 3 (only when > 0): missing-data reveal link (§6.1), `--t-label`, `--road`, underlined.

---

## 8. Card anatomy (<900px)

`<article class="card">` as `<li>` inside `<ol id="results" class="cards">` (ordered list, because order is meaningful). `--surface`, 1px `--line` border, `--r-2`, padding 16px, gap between cards 12px (1 col) / 16px (2 col). No shadow. The whole card is **not** a link; only the button is.

```
┌─────────────────────────────────────────┐
│ R$ 850.000                   [≈ 4 km]   │  price (t-price) · km plate (right)
│ Bairro Cercadinho / Alambari            │  local: t-body 600, 2-line clamp
│ Chitolina                               │  imobiliária: t-label ink-2
│─────────────────────────────────────────│  1px line, 12px margins
│ Terreno       Construída     Quartos    │  3-col spec grid, labels t-label ink-2
│ 1.925 m²      180 m²         3          │  values t-value, tabular
│                                          │
│ Banheiros     Suítes         Piscina    │
│ 2             1              (≋ Sim)    │  piscina chip
│─────────────────────────────────────────│
│ ◌ Água: Poço artesiano                  │  i-drop water, t-label; value ink
│ Obs.: terreno sem casa                  │  only if obs; t-label ink-2, 2-line clamp
│                                          │
│ [   Ver anúncio  ↗   ]                  │  full-width primary button, 48px
└─────────────────────────────────────────┘
```

Details:
- **Price row:** flex, baseline-aligned; the price never wraps (`white-space: nowrap`).
- **km plate:** inline-flex, height 28px, padding 0 8px, `--road` bg, `--on-road` text, `--t-plate`, `--r-1`, plus an inset 1px border `rgb(255 255 255 / .35)` at 2px inset (`box-shadow: inset 0 0 0 2px var(--road), inset 0 0 0 3px rgb(255 255 255 / .35)`), which gives the double rule of a road plate. Text: `≈ 4 km`. `aria-label="aproximadamente 4 quilômetros em linha reta"`. **Approximate variant** (`dist_ref === "U"`): `--surface` bg, `--road` text, 1.5px dashed `--road` border, `title="Localização aproximada (só bairro/cidade informados)"`.
- **Terreno** ≥ 24.200 m² gets a second line: `≈ 2,4 alqueires` in `--t-label --ink-2`.
- **Piscina chip:** `sim` is a `--water-tint` bg, `--water` text, `i-waves` 16px, label **"Sim"**, pill 28px. `não` is plain text **"Não"** in `--ink`. Missing is the "não informado" treatment (§9).
- **Água:** if missing, the line reads **"Água: não informado"** with the value in the §9 style. Never hide the line, since its absence would look like a layout bug.
- **Ver anúncio:** `<a class="btn btn-primary" href="{url}" target="_blank" rel="noopener noreferrer">Ver anúncio <svg i-external/></a>`. 48px, full width, `--road`, white 600 1rem, `--r-2`, hover `--road-strong`. The accessible name is set with a visually hidden span: `Ver anúncio<span class="vh"> de {local}, {preço}, na {imobiliaria} (abre em nova aba)</span>`.
- Spec grid: `grid-template-columns: repeat(3, minmax(0,1fr))`, row gap 12px, column gap 12px. Labels sit above values with a 2px gap. Use `<dl>` with `<div>` wrappers (`<dt>` label, `<dd>` value).

---

## 9. "Não informado" treatment (one rule everywhere)

- Text: **"não informado"** (lower case) in cards. In the table, the abbreviated **"não inf."** wrapped in `<abbr title="não informado">`.
- Style: `--ink-3`, weight 400 (vs 600 for real values), `font-style: normal`. Add a 1px dotted underline in `--ink-3` with offset 3px so it reads as "a missing value", not as content. Class `.ni`.
- Applies to every nullable field: terreno, construída, quartos, banheiros, suítes, piscina, água.
- **Never** `0`, `-`, `?`, an empty cell, or omitting the row.
- Footer legend (§12) explains: *"'não informado' = o anúncio não traz esse dado."*

---

## 10. Desktop table (≥900px)

`<table>` inside `<div class="table-wrap">` (`overflow-x:auto`, `--surface`, 1px `--line` border, `--r-2`). `<caption class="vh">Chácaras à venda, ordenadas por {critério}</caption>`.

Columns, in order:

| # | header (pt-BR) | content | align | width |
|---|---|---|---|---|
| 1 | **Preço** | `R$ 850.000`, 600 sign 1.0625rem | right | 128px, **sticky left** (`position:sticky; left:0; background: inherit`) with a right `--line` border |
| 2 | **Local** | local, 600 `--ink`, 2-line clamp, `max-width: 260px`; `title` = full text | left | min 220px |
| 3 | **Dist.** | km plate (small: height 24px, same styles) | left | 84px |
| 4 | **Terreno** | `1.925 m²` | right | 112px |
| 5 | **Constr.** | `180 m²` | right | 96px |
| 6 | **Quartos** | `3` | right | 72px |
| 7 | **Banh.** (`<abbr title="Banheiros">`) | `2` | right | 64px |
| 8 | **Suítes** | `1` | right | 64px |
| 9 | **Piscina** | chip (small, 24px) / Não / não inf. | left | 96px |
| 10 | **Água** | sentence-cased value, 1-line ellipsis with `title` | left | 140px |
| 11 | **Imobiliária** | name | left | 140px |
| 12 | *(vh "Link")* | `Ver anúncio ↗` secondary button: 36px, `--surface`, 1px `--road` border, `--road` text 600; hover fills `--road` + white | right | 132px |

- Header: `position: sticky; top: 0; z-index: 2`, `--paper` bg, `--t-label` 600 `--ink-2`, height 44px, bottom 1px `--line-strong`.
- **Sortable headers:** Preço, Dist., Terreno, Constr. are `<button>` inside `<th>` with `aria-sort` on the `<th>` (`ascending`/`descending`/`none`) and a chevron icon showing the direction. Clicking cycles through that column's natural direction (preço asc → desc; dist asc → desc; terreno desc → asc; constr desc → asc). It stays in sync with the sort `<select>` (add "Maior preço"-style equivalents; if a header combination isn't in the select, e.g. terreno asc, add a hidden-until-used option **"Menor terreno"** / **"Menor área construída"** / **"Mais longe"** to the select).
- Rows: height ≥ 56px, padding 10px 12px, divider 1px `--line`. Hover: `--road-tint` bg (and the sticky price cell follows). No zebra.
- Below the table is nothing extra. The footer comes next.

---

## 11. States

| state | spec |
|---|---|
| **Loading** (fetch in flight) | Count shows **"Carregando anúncios…"**. Results area shows 6 skeleton cards (mobile) / 8 skeleton rows (desktop): `--line` blocks at 60% opacity, no shimmer animation. `aria-busy="true"` on results. |
| **Error** (fetch fails / bad JSON) | Banner in place of results: `--alert-tint` bg, `--alert` 1px border, `--r-2`, padding 16px, `i-alert` + **"Não foi possível carregar os anúncios."** / *"Verifique a conexão e tente de novo."* + secondary button **"Tentar de novo"** (refetches). |
| **Empty** (0 matches) | In place of results, centered, max-width 40ch, padding 40px 16px: title **"Nenhuma chácara com esses filtros"** (1.25rem 600 sign), text *"Tente aumentar a distância ou o preço máximo, ou remover algum filtro."*, then the active chips row repeated (each removable), then primary button **"Limpar filtros"**. If the missing-data reveal would yield results, show it here as the first action: **"Mostrar 12 anúncios sem essa informação"**. No illustration. |
| **No JS** | `<noscript>` box: *"Esta página precisa de JavaScript para listar e filtrar os anúncios."* |
| **Hover** | buttons → `--road-strong`; secondary → filled; chips → `--road-tint`; rows → `--road-tint`. |
| **Focus** | §3.3 outline, never removed. |
| **Disabled** | not used (no control is ever disabled). |
| **Visited link** | "Ver anúncio" keeps the same color when visited; no visited marker. |

---

## 12. Footer

`--paper`, top border `--line`, padding 32px 16px 48px, `--t-label --ink-2`, max 70ch:
- **"Dados coletados dos sites das imobiliárias em outubro de 2026. Preços e disponibilidade podem ter mudado — confirme sempre no anúncio original."**
- **"Distância: estimativa em linha reta a partir do centro de Itapetininga; o percurso real por estrada é maior."**
- **"'não informado' = o anúncio não traz esse dado."**
- **"Fontes: Albor, Chitolina, Conceito Imóveis, Franciosi, JJ Gomes, Lopes Nobre, Sedna, Seven Negócios Imobiliários."** (generated from data, A–Z)
- No "made by" line.

---

## 13. Behavior

- **URL state:** mirror filters + sort to the query string with `history.replaceState`, so a WhatsApp link reproduces the view. Keys: `q`, `pmin`, `pmax`, `km`, `pisc=1`, `qt`, `bh`, `imob` (comma-separated, URL-encoded names), `inc=1`, `ord` (`preco`, `-preco`, `dist`, `-terreno`, `-construida`, …). Read on load, ignore invalid values.
- **Render strategy:** after fetch, build each item's DOM node **once** (card or row) and keep it in a `Map(id → node)`. Every filter/sort change computes the filtered and sorted id list, then appends the nodes into a `DocumentFragment` and replaces the children of `#results` in one operation. 226 items → no virtualization, no pagination, no "carregar mais".
- **Search index:** precompute `item._hay = normalize(local+titulo+imobiliaria+agua+obs)` once.
- On breakpoint change (900px), rebuild the node map for the other view.
- After applying filters from the sheet's "Mostrar" button, `results.scrollIntoView({block:'start'})` (respect reduced motion: `behavior:'auto'`), offset for the sticky bar via `scroll-margin-top: 76px` on `#results`.

---

## 14. Accessibility (must)

- `<html lang="pt-BR">`, one `<h1>`. Each card's local name is an `<h2 class="card-title">` (styled as body 600). Landmarks: `header`, `main`, `footer`. The filters are a `<form role="search" aria-label="Filtros">`, with submit prevented.
- Every control has a visible `<label>` (or `<fieldset><legend>` for segmented groups, price pair, and agency chips). The range has `aria-valuetext="até 8 quilômetros"`.
- Segmented groups are real radio inputs (`<input type="radio">` visually styled), arrow-key navigable natively.
- Agency chips are `<button type="button" aria-pressed="true|false">`.
- Count is `role="status"` (polite). Don't announce on every keystroke: update the live region's text after the 150 ms debounce only.
- Color is never the only signal. The piscina chip has text, and the km plate has text.
- Touch targets ≥ 44×44 px.
- Contrast is verified (§3.1): all text ≥ 4.5:1 and UI borders ≥ 3:1.
- External links: the visually hidden "(abre em nova aba)" in the accessible name.
- `.vh` utility: standard visually-hidden clip pattern.
- `prefers-reduced-motion` honored (§3.3).
- Zoom to 200% without horizontal page scroll (only the table wrapper scrolls).

---

## 15. Performance (must)

- No framework, no libraries, no build. `app.js` loaded with `<script type="module" src="app.js">` (deferred by default).
- Budgets (gzip): HTML ≤ 6 KB, CSS ≤ 8 KB, JS ≤ 12 KB, data.json ≤ 70 KB. Fonts: 5 faces via Google Fonts (Barlow 400/500/600 + Barlow Semi Condensed 600/700, latin subset ≈ 15 KB each). `display=swap`. Preconnect as in §3.2.
- `fetch('data.json')` (relative path, so it works on GitHub Pages subpath). Optional: `<link rel="preload" href="data.json" as="fetch" crossorigin>`.
- No images. Icons are an inline sprite. The header contour SVG is inline.
- `content-visibility: auto; contain-intrinsic-size: 320px` on cards; rows don't need it.
- Lighthouse mobile targets: Performance ≥ 95, Accessibility 100, CLS < 0.05 (reserve skeleton heights; the header height does not depend on the font load).

---

## 16. Microcopy (pt-BR, exact)

| key | text |
|---|---|
| title / h1 | Chácaras à venda até 15 km de Itapetininga — out/2026 |
| `<title>` | Chácaras à venda até 15 km de Itapetininga — out/2026 |
| meta description | 226 chácaras à venda num raio de 15 km de Itapetininga, com filtros por preço, piscina, quartos, banheiros e distância. |
| subtitle | {N} anúncios de {M} imobiliárias, do mais barato ao mais caro. Distâncias estimadas em linha reta a partir do centro de Itapetininga — o trajeto de carro é maior. |
| search label / placeholder | Buscar / Bairro, estrada, imobiliária… |
| filters button | Filtros |
| sheet title | Filtros |
| sheet clear | Limpar |
| sheet close (aria) | Fechar filtros |
| sheet footer | Mostrar {n} chácaras · Mostrar 1 chácara · Nenhuma chácara — ajuste os filtros |
| price | Preço · Mín. · Máx. · até 500 mil · até 1 mi · até 2 mi |
| distance | Distância máxima · até {n} km |
| distance hint (under slider, t-label ink-2) | Em linha reta, a partir do centro. |
| pool | Piscina · Só com piscina |
| rooms | Quartos · Qualquer · 1+ · 2+ · 3+ · 4+ |
| baths | Banheiros · Qualquer · 1+ · 2+ · 3+ · 4+ |
| include missing | Incluir anúncios sem informação de piscina, quartos ou banheiros |
| agency | Imobiliária |
| clear all | Limpar filtros |
| count | {n} chácaras · 1 chácara · Nenhuma chácara · de {total} |
| missing reveal | + {n} sem essa informação — mostrar · Ocultar os {n} sem informação |
| sort | Ordenar por · Menor preço · Maior preço · Mais perto · Mais longe · Maior terreno · Menor terreno · Maior área construída · Menor área construída |
| card labels | Terreno · Construída · Quartos · Banheiros · Suítes · Piscina · Água · Obs. |
| piscina values | Sim · Não · não informado |
| missing | não informado (cards) · não inf. (table) |
| alqueire | ≈ {x} alqueires (≈ 1 alqueire when 0,95–1,05) |
| CTA | Ver anúncio |
| loading | Carregando anúncios… |
| error | Não foi possível carregar os anúncios. / Verifique a conexão e tente de novo. / Tentar de novo |
| empty | Nenhuma chácara com esses filtros / Tente aumentar a distância ou o preço máximo, ou remover algum filtro. |
| noscript | Esta página precisa de JavaScript para listar e filtrar os anúncios. |

Tone: direct and plain, "você" implied, no exclamation marks, no salesy words ("imperdível", "oportunidade").

---

## 17. Acceptance checklist

- [ ] Default view: all 226 listed, sorted by menor preço; count reads "226 chácaras".
- [ ] Every listing shows all 11 fields plus "Ver anúncio" (cards and table). Missing values read "não informado"/"não inf." in `--ink-3` with a dotted underline. There is no 0, no blank and no dash.
- [ ] Straight-line disclosure appears in 3 places: subtitle, slider hint, footer. Every distance is prefixed with "≈".
- [ ] All 7 filters work, combine with AND, update live, and are reflected in the URL. "Limpar filtros" restores defaults.
- [ ] Missing-data reveal shows the correct count and toggles.
- [ ] <900px: sticky search + Filtros bar, `<dialog>` bottom sheet with live "Mostrar {n}" footer, Esc/backdrop close, focus returns.
- [ ] ≥900px: inline filter panel overlapping the band, table with sticky header and sticky Preço column, sortable headers synced with the select.
- [ ] Empty, loading and error states as in §11.
- [ ] Keyboard-only run through every control. Focus is visible everywhere.
- [ ] No horizontal page scroll at 320px wide.
- [ ] `detect.mjs` run once, mechanical findings fixed.
