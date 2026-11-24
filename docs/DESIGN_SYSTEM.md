# Editorial Design System & Anti-Slop Contract

This specification enforces *The Pudding*-caliber visual journalism standards. Every frontend component in `web/` must adhere to these rules.

---

## 1. Anti-Slop Bans (Zero Tolerance)

Strictly forbidden across all essays and UI surfaces:
- **No default SaaS typography:** Never use `Inter`, `Roboto`, `Arial`, or system sans-serif as the primary editorial face.
- **No SaaS chrome:** Never use purple/indigo gradients, boxed multi-card KPI dashboard grids, heavy drop shadows, neon accents, or gratuitous glassmorphism.
- **No harsh pure contrast:** Never use pure `#FFFFFF` page backgrounds or pure `#000000` ink.
- **No scroll-jacking:** Never hijack wheel/touch scrolling or override native browser scroll physics.

---

## 2. Editorial Palette (`web/src/styles/tokens.ts`)

| Role | Token | Hex | Usage |
| --- | --- | --- | --- |
| Paper Ground | `paper` | `#FAF8F5` | Primary page & graphic background |
| Surface Tint | `surface` | `#F1EDE6` | Subtle callouts, mobile cards, quiet strips |
| Hairline Rule | `rule` | `#DDD7CC` | 1px dividers, gridlines, subtle borders |
| Primary Ink | `ink` | `#171614` | Headlines, body prose, focal labels |
| Secondary Ink | `inkMuted` | `#5C5852` | Kickers, captions, axis ticks, metadata |
| Inactive Mark | `neutralMark` | `#C9C4BA` | Gray-first background/context data marks |
| Focal Accent | `accent` | `#D94E2A` | Primary editorial highlight (vermilion) |
| Secondary Accent | `secondary` | `#1E5AA8` | Contrasting focal category (deep cobalt) |
| Tertiary Accent | `tertiary` | `#2B7A5B` | Optional third categorical accent (pine) |

### Hierarchy & Accessibility Rules
- **Gray-first data hierarchy:** Unhighlighted context marks stay warm neutral gray (`#C9C4BA`) so focal marks immediately command attention.
- **Colorblind-safe palette:** Pair vermilion (`#D94E2A`) vs. deep cobalt (`#1E5AA8`) — never red vs. green. Use at most 3 categorical accents per graphic.
- **WCAG AA Contrast:** Maintain `>= 4.5:1` contrast for all prose and labels, and `>= 3:1` for non-text graphic marks against `#FAF8F5`.

---

## 3. Editorial Typography

Load bundled fonts via `@fontsource/*` (never unverified CDN fallbacks) so `document.fonts.ready` resolves deterministically offline and in Playwright:
- **Headline / Story Title (Serif):** `Newsreader` (optical editorial serif).
- **Body / UI (Humanist Sans):** `Plus Jakarta Sans`.
- **Data Readouts / Ticks / Counters (Monospace):** `JetBrains Mono`.

### Typographic Rules
- **Tabular numerals:** Apply `font-variant-numeric: tabular-nums` (`tabular-nums`) to all axis ticks, data labels, beat counters, and morphing numbers so values never jitter horizontally.
- **Editorial measure:** Body prose must stay between `55ch` and `65ch` with `1.65` line-height.
- **Scannable scroll beats:** Keep each scroll beat to **2–4 crisp sentences** maximum. Let the graphic carry the comparison.

---

## 4. Scrollytelling Layout & Sticky Physics

- **CRITICAL (`overflow-x: clip`):** Never put `overflow: hidden` or `overflow-x: hidden` on `html`, `body`, or any ancestor of a sticky stage — it silently breaks `position: sticky`. Use `overflow-x: clip` exclusively.
- **Desktop (`>= 1024px`):** Asymmetric editorial split — prose rail (`380px–420px`) alongside a sticky `[data-viz-stage]` (`position: sticky; top: 0; height: 100dvh`).
- **Mobile (`< 1024px`):** Top sticky `[data-viz-stage]` occupying `46dvh–50dvh` with a crisp `1px` bottom hairline divider (`#DDD7CC`). Prose cards (`max-w-[92vw]`, warm paper `#FAF8F5` / `#F1EDE6` tint, subtle `1px` border, `min-h-[65dvh]` spacing) scroll cleanly underneath without obscuring the active focal point.
- **Reading progress:** A subtle `2px` top hairline bar (`#D94E2A`) tracks essay progress. No floating HUDs or persistent toolbars.

---

## 5. Motion Craft

- **GPU-composited properties only:** Animate exclusively `transform` and `opacity`. Never animate `top`, `left`, `width`, or `height`.
- **Editorial easing:** Default to crisp ease-out `[0.22, 1, 0.36, 1]` at `420ms`, or a damped Framer spring (`stiffness: 240, damping: 28`).
- **Reduced motion & audit mode:** Honor `prefers-reduced-motion` natively (`reducedMotion="user"`), and force instant zero-duration transitions (`reducedMotion="always"`) whenever `?audit=1` is present.

---

## 6. Data Visualization Craft

- **Direct labeling:** Label focal marks directly on the canvas/SVG instead of using detached legends whenever possible.
- **Annotation priority tiers:**
  - Desktop (`>= 1024px`): render priorities `1`, `2`, `3` (max 6–8 labels per beat).
  - Mobile (`< 1024px`): render strictly priority `1` (max 2–3 labels per beat).
- **Inline prose highlights:** Use `<Highlight tone="accent | secondary | tertiary">` spans whose color matches the exact chart mark color.
- **Zero chartjunk:** Whisper-quiet hairline gridlines (`1px`, `#DDD7CC`, subtle opacity), no outer chart box borders, and no redundant axis titles when the headline/subtitle already states the unit.
