# The 5-Phase Scrollytelling Assembly Line

Every visual essay in this repository moves through five strict phases. Do not skip phases or cross gated boundaries without explicit human sign-off.

---

## Phase 1 — Guided Editorial EDA & Locked Data Contract (`pipeline/`)

**Goal:** Discover one genuinely counterintuitive editorial angle with the human before writing a single line of frontend code, then lock the data contract.

1. **Interactive EDA first:** Explore the dataset in `pipeline/` with the human, surface anomalies/distributions/surprises, and agree on the central thesis and beat arc.
2. **Reproducible emission:** Write a deterministic Python script (run via `uv run`) validated with Pydantic that emits three committed artifacts:
   - `STORYBOARD.md` — Beat-by-beat narrative copy, exact visual delta between beats, focal entities, and takeaway.
   - `web/public/data/story.json` + lean `web/public/data/story.schema.json`:
     - Persistent `id` per datum across all beats (enables object constancy during transitions).
     - Annotation `priority: 1 | 2 | 3`: desktop displays tiers 1–3 (max 6–8 labels per beat); mobile displays strictly `priority: 1` (max 2–3 labels per beat).
     - **Split geometry:** Python precomputes `(x, y)` inside fixed SVG `viewBox` dimensions (`800x500` desktop, `360x360` mobile) for non-Cartesian, beeswarm, packed, or force-directed layouts. TypeScript uses simple deterministic `d3-scale` projections only for standard Cartesian charts.
     - **Keep the schema lean on pass 1:** Do not add speculative override knobs (`scaleType`, `domain`, `shortLabel`, `excludedOutliers`) unless Phase 3 proves they are needed.
   - `web/public/data/manifest.json` — Locks `beatCount`, per-beat `entityCount`, `entityIds`, and annotation counts so outliers or crowded points can never be silently dropped to pass a layout check.
3. **Hard Gate:** Stop and wait for explicit human review and commit before entering Phase 2.

---

## Phase 2 — Pure-Projection Motion Scaffold (`web/`)

**Goal:** Render the locked contract as a responsive, self-healing scrollytelling experience.

1. **Pure projection of `activeStep`:** Every visual component must compute its entire state purely from `activeStep` and the loaded `story.json`. Never incrementally mutate filters, arrays, or transition states inside `onStepEnter` or `onStepExit`. This guarantees reverse scroll and fast scroll jumps self-heal instantly.
2. **Focused craft:** Invest animation craft in 1–2 ID-keyed hero motion components using Framer Motion or CSS `transform` transitions. Use `@observablehq/plot` only for secondary static charts and MapLibre `flyTo` for spatial beats.
3. **Mandatory audit hooks:** Preserve all three verification hooks in every essay:
   - `?audit=1` query mode (`<MotionConfig reducedMotion="always">` + `scroll-behavior: auto !important`).
   - `window.__VIZ_READY__` (set `true` only after schema validation, `document.fonts.ready`, decoded images, and settled canvas/animation frames).
   - DOM markers: `[data-viz-stage]`, `[data-viz-label]`, and `[data-active-step]`.

---

## Phase 3 — Two-Tier Verification (`audit/`)

**Goal:** Eliminate technical regressions deterministically before spending visual critic tokens, then audit aesthetics and editorial clarity with fresh eyes.

### Tier A — Deterministic Playwright Audit (0 LLM Tokens)
Run `npm run audit:tier-a`. Executes headless Chromium at desktop (`1280x800`) and mobile (`390x844`) against `/?audit=1` and asserts:
- Zero `console.error` and zero uncaught `pageerror` exceptions.
- Runtime Zod validation pass and exact `story.json` ↔ `manifest.json` integrity (`beatCount`, per-beat `entityCount`, and persistent `entityIds`).
- Deterministic scroll state transitions:
  - Forward scroll: `0 → N`
  - Backward scroll: `N → 0`
  - Rapid jump: `0 → N → 0`
- Bounding-box geometry checks strictly on **visible** `[data-viz-label]` elements (`opacity > 0.5`, `visibility !== 'hidden'`, non-zero `width` and `height`):
  - Zero pairwise label collisions (`getBoundingClientRect()` intersection).
  - Full containment inside `[data-viz-stage]` (zero clipping or overflow).
- Exports per-beat PNGs and stitches labeled desktop and mobile contact sheets into `audit/artifacts/`.
- **Repair cap:** Maximum **3** fast repair loops. **Hard-stop** and escalate to the human if the exact same assertion fails twice in a row.

### Tier B — Fresh-Context VLM Visual Critic
Run in a **separate session with zero Builder conversation history**, using `docs/CRITIC_RUBRIC.md`:
- **Pass 1:** Inspect both desktop and mobile stitched contact sheets (`audit/artifacts/contact-sheet-desktop.png`, `audit/artifacts/contact-sheet-mobile.png`) for macro pacing, visual variety, focal hierarchy, and palette discipline.
- **Pass 2:** Inspect full-resolution beat PNGs in batches of 4–5 (always including any canvas or MapLibre beats).
- Outputs strict JSON array: `{ stepId, viewport, severity: "blocker" | "polish" | "nit", defect, concreteFix }`.
- **Loop 1:** Fix all `blocker` items and re-run Tier A.
- **Loop 2:** Fix high-impact `polish` items and re-run Tier A. Always ignore `nit` items.
- **Loop cap:** Maximum **2** Critic-to-Builder loops.

---

## Phase 4 — Human-Triggered Schema-Locked Data Escape Hatch

**Trigger:** Only if Phase 3 uncovers a root data-shape issue that cannot be cleanly solved in presentation (e.g., an extreme outlier crushing a scale, overly long entity labels, or an unresolvable cluster overlap) **and the human explicitly approves** reopening `pipeline/`.

1. Introduce only the minimal justified schema knob (e.g., `scaleType`, `domain`, `shortLabel`, or documented `excludedOutliers` note).
2. Re-emit `story.json`, `story.schema.json`, and `manifest.json` via `uv run` with Pydantic validation.
3. Re-run Phase 3 verification.
4. **Cap:** Maximum **1** Phase 4 cycle.

---

## Phase 5 — Live Motion & Editorial Polish (1 Bounded Pass)

**Trigger:** After the human manually scrolls the live application (without `?audit=1`) and gives feedback.

Execute **one bounded polish pass** to:
1. Tighten transition easing, stagger timing, and visual choreography.
2. Enrich prose with inline color-matched `<Highlight tone="...">` spans tied directly to focal marks.
3. Unlock an interactive "explore it yourself" ending state (hover tooltips, filter controls, or entity search) once the narrative concludes.
