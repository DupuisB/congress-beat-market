# Autonomous Overnight Essay Runbook

This runbook activates whenever a prompt requests **Autonomous Essay Mode**, starts with `/goal`, or invokes the `autonomous-essay` skill with a theme. All standard engineering rules in `GEMINI.md`, `docs/WORKFLOW.md`, and `docs/DESIGN_SYSTEM.md` remain strictly in force, with human phase gates replaced by autonomous quality gates and a monotonic git ratchet.

---

## 1. Zero-Stall Rule (CRITICAL)

- **NEVER** ask clarifying questions, **NEVER** present multiple-choice menus, and **NEVER** pause for human sign-off between phases.
- Make decisive editorial, data, and engineering calls yourself. Log every non-obvious decision (dataset choice, thesis pivot, scale override, rollback reason) in `RUN_LOG.md` and keep moving.
- **Branch isolation:** Before creating or modifying data, storyboard, or app files, isolate the run on a dedicated branch:
  ```bash
  git checkout -b essay/<slug>-<YYYYMMDD>
  ```
  (If resuming an existing `STATE.json` branch, verify you are checked out on that branch rather than creating a second one.)

---

## 2. Disk-Backed Resume State (`STATE.json`)

Maintain a root `STATE.json` file with this exact schema so a restarted or compacted session can resume cleanly without redoing completed work:

```json
{
  "theme": "string",
  "slug": "kebab-case-slug",
  "currentPhase": "phase-0 | phase-1 | phase-2 | phase-3 | phase-4 | complete",
  "bestScore": 0,
  "bestTag": "best-essay",
  "escapeCount": 0,
  "polishRound": 0,
  "status": "in_progress | complete | halted",
  "updatedAt": "ISO-8601 UTC timestamp"
}
```

- **On session start:** Check for `STATE.json`. If present and `status === "in_progress"`, read `STATE.json` and `RUN_LOG.md` and resume from `currentPhase`.
- **At every milestone:** Update `STATE.json` (`updatedAt` in UTC) and commit it alongside the milestone work.

---

## 3. Phase 0 — Real-Data Tournament & Provenance Lock (`pipeline/`)

1. **Fetch 2–3 real, publicly downloadable candidate datasets** relevant to the theme:
   - Prefer open CSV, Parquet, or JSON from GitHub, Our World in Data, OpenAlex, Wikidata, municipal/government open data portals, or unauthenticated public APIs requiring no private keys.
   - **Hard Anti-Mocking Rule:** NEVER fabricate, synthesize, extrapolate, or hardcode fake datasets if a download fails. If a source returns `403`, `404`, HTML captcha/paywall, or truncated data, discard it and fetch a different real public source.
2. **Preserve raw downloads & lock provenance:**
   - Save every downloaded raw dataset under `pipeline/data/raw/<filename>`.
   - Emit root `SOURCES.md` listing, for every retained raw file:
     - Exact source URL
     - UTC fetch timestamp
     - License and attribution
     - Row and column counts
     - Local path (`pipeline/data/raw/<filename>`)
     - SHA-256 hash (`sha256sum`)
3. **Run the data tournament (`pipeline/src/tournament.py`):**
   - Write and run `uv run python -m src.tournament` to evaluate all 2–3 candidates quantitatively on:
     1. **Non-obvious statistical surprise / outlier** (counterintuitive correlation, divergence, or structural break).
     2. **Entity granularity** suitable for object-constancy transitions (30–500 trackable entities or clear hierarchical groups).
     3. **Data completeness** (low missingness on key dimensions, reliable temporal/categorical coverage).
   - Record the tournament table, winning dataset, and rationale in `RUN_LOG.md`, update `STATE.json` (`currentPhase: "phase-1"`), and commit.

---

## 4. Phase 1 — Autonomous Editorial Gate (`pipeline/`)

1. Build the reproducible Python pipeline (`uv run`) emitting:
   - `STORYBOARD.md`
   - `web/public/data/story.json`
   - `web/public/data/story.schema.json`
   - `web/public/data/manifest.json`
2. Ensure Python passes `uv run ruff check .`, `uv run ruff format --check .`, and `uv run ty check`.
3. **Fresh-Context Editorial Critic Gate:**
   - Spawn a fresh-context subagent (no Builder history) to audit `STORYBOARD.md` + `web/public/data/story.json` against *The Pudding* editorial bar:
     - Reject generic summary or encyclopedia arcs; require **one genuinely counterintuitive thesis**.
     - Verify every factual claim and inline number in `STORYBOARD.md` and `story.json` matches exact computed values from the pipeline.
     - Verify clear visual delta and variety across beats (no repetitive identical frames).
   - If the Editorial Critic identifies any editorial `blocker`, execute **1 mandatory revision pass** on the storyboard and data contract, re-validate with Pydantic, and log the revision in `RUN_LOG.md`.
4. Update `STATE.json` (`currentPhase: "phase-2"`) and commit.

---

## 5. Phase 2 & 3 — Build + Ratcheted Multi-Hour Craft Loop (`web/` + `audit/`)

### Initial Build (Phase 2)
- Implement the pure-projection scrollytelling app in `web/` adhering strictly to `docs/DESIGN_SYSTEM.md`:
  - 1–2 ID-keyed hero motion components (`transform` and `opacity` only).
  - Inline color-matched `<Highlight tone="...">` prose tied directly to chart marks.
  - An interactive "explore it yourself" final beat exposing `[data-viz-interactive]` controls (filters, search, and/or hover details) with zero console errors.
  - All mandatory audit hooks (`?audit=1`, `window.__VIZ_READY__`, `[data-viz-stage]`, `[data-viz-label]`, `[data-active-step]`, `[data-viz-interactive]`).
- Confirm `npm run web:typecheck` and `npm run web:build` exit 0. Update `STATE.json` (`currentPhase: "phase-3"`).

### Monotonic Git Ratchet (Phase 3 — Max 6 Polish Rounds)
Establish baseline tag `best-essay` after the first passing Tier A run, then iterate up to **6 polish rounds**:

1. **Tier A Mechanical Gate (`npm run audit:tier-a`):**
   - Runs desktop (`1280×800`) and mobile (`390×844`) checks, `SOURCES.md` provenance check, scroll checks (`0→N`, `N→0`, `0→N→0`), visible-label collision/bounds checks, interactive finale check, and contact-sheet stitching.
   - Fix mechanical failures before calling the Visual Critic (**max 3 retries**; if the exact same assertion fails twice consecutively, trigger the repeat-failure circuit breaker and stop retrying that approach).
2. **Tier B Fresh-Context Visual Critic:**
   - Spawn a fresh-context subagent using `docs/CRITIC_RUBRIC.md` inspecting:
     - Pass 1: `audit/artifacts/contact-sheet-desktop.png` and `audit/artifacts/contact-sheet-mobile.png`.
     - Pass 2: Full-resolution beat PNGs in batches of 4–5 (always including canvas/map beats plus `final-interactive-desktop.png` and `final-interactive-mobile.png`).
   - Collect the strict JSON response containing `scores` (`legibility`, `hierarchy`, `editorialCraft`, `visualVariety`, `mobileFit`, `total` out of 100) and `defects`.
3. **Ratchet Decision:**
   - **Promote:** If `scores.total > STATE.json.bestScore` AND zero `blocker` defects remain:
     - Commit the changes (`fix:` or `feat:`), move the tag with `git tag -f best-essay HEAD`, update `STATE.json` (`bestScore`, `polishRound`, `updatedAt`), and log the score jump in `RUN_LOG.md`.
   - **Rollback:** If `scores.total` regresses OR Tier A fails after 3 retries:
     - Run `git reset --hard best-essay` (never lose a previously verified best state).
     - Record what failed and why in `RUN_LOG.md`, update `STATE.json` (`polishRound`), and attempt a different targeted fix next round.
   - **Early Stop:** Exit the ratchet early if `scores.total >= 92` with zero `blocker` and zero high-impact `polish` items for **2 consecutive checks**.

---

## 6. Autonomous Data Escape Hatch (Max 2 Cycles)

If Tier A or Tier B surfaces a root data-shape defect that cannot be cleanly solved in CSS/SVG presentation (e.g., an extreme outlier crushing a scale, overlong labels, or an unresolvable dense cluster):

- While `STATE.json.escapeCount < 2`:
  1. Set `STATE.json.currentPhase = "phase-4"` and increment `escapeCount`.
  2. Reopen `pipeline/` and adjust only pre-declared data knobs (`scaleType`, `domain`, `shortLabel`, `priority`, binning, or explicitly documented `excludedOutliers`).
  3. Re-validate with Pydantic (`story.json`, `story.schema.json`, `manifest.json`) and re-run `uv run ruff check . && uv run ty check`.
  4. Log the exact data adjustment in `RUN_LOG.md`, commit, and re-enter Phase 3.
- Hard cap: **maximum 2 escape cycles** per autonomous run.

---

## 7. Final Deliverable & Verification

Before concluding the run:

1. Ensure the working tree is on the `best-essay` tagged commit and all four verification commands exit `0`:
   - `npm run web:typecheck`
   - `npm run web:build`
   - `cd pipeline && uv run ruff check . && uv run ruff format --check . && uv run ty check`
   - `npm run audit:tier-a`
2. Write root `FINAL_REPORT.md` containing:
   - Central thesis & key counterintuitive finding
   - Winning dataset(s) and attribution (referencing `SOURCES.md`)
   - Visual Critic score progression across polish rounds (`bestScore` & `bestTag`)
   - Any data escapes or rollbacks performed
   - Exact command to preview the finished essay locally (`npm run web:dev` or `npm --prefix web run preview`)
3. Update `STATE.json` (`currentPhase: "complete"`, `status: "complete"`, `updatedAt`), commit `FINAL_REPORT.md` + `STATE.json`, move `git tag -f best-essay HEAD`, and stop.
