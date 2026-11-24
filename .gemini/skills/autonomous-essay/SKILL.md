---
name: autonomous-essay
description: Run a fully unattended, multi-hour Pudding-style visual essay from a single theme prompt through Phase 0 real-data tournament, Phase 1 editorial critic gate, Phase 2 pure-projection build, Phase 3 monotonic git-ratchet visual verification (up to 6 rounds), autonomous data escape hatch (max 2 cycles), and FINAL_REPORT.md delivery.
---

# Autonomous Visual Essay Skill

Execute a complete, unattended, *The Pudding*-style interactive scrollytelling visual essay in this repository given only a theme.

## Required Operating Specs

Before taking any action, follow all rules in:
- `GEMINI.md`
- `docs/WORKFLOW.md`
- `docs/DESIGN_SYSTEM.md`
- `docs/AUTONOMOUS.md`
- `docs/CRITIC_RUBRIC.md`

## Core Guardrails

1. **Zero-Stall Execution:** Never ask clarifying questions, never present option menus, and never pause for human approval between phases. Make decisive calls and log every non-obvious decision in `RUN_LOG.md`.
2. **Hard Anti-Mocking Rule:** Never fabricate, synthesize, or hardcode datasets. Every dataset must be genuinely downloaded from a public, keyless source, saved under `pipeline/data/raw/`, and logged in `SOURCES.md` with exact URL, UTC fetch timestamp, license/attribution, row/column counts, and SHA-256 hash.
3. **Branch & Resume Discipline:**
   - Check for an existing root `STATE.json`. If `status === "in_progress"`, resume from `currentPhase` on the existing essay branch.
   - Otherwise create a fresh branch `git checkout -b essay/<slug>-<YYYYMMDD>` and initialize `STATE.json` (`{ theme, slug, currentPhase, bestScore, bestTag, escapeCount, polishRound, status, updatedAt }`).
   - Update and commit `STATE.json` at every phase transition and ratchet promotion.

## Execution Sequence

### Phase 0 — Real-Data Tournament & Provenance Lock (`pipeline/`)
1. Search and download **2–3 real public datasets** relevant to the theme into `pipeline/data/raw/`. Drop any source that 403s/404s or requires auth/paywalls and replace it with another real source.
2. Emit `SOURCES.md` with exact URLs, fetch timestamps, licenses, row/column counts, local paths, and SHA-256 hashes.
3. Write and run `cd pipeline && uv run python -m src.tournament` scoring each candidate on (a) non-obvious statistical surprise/outlier, (b) entity granularity (30–500 trackable entities or clear hierarchical groups), and (c) data completeness.
4. Record the winner and rationale in `RUN_LOG.md`, set `STATE.json.currentPhase = "phase-1"`, and commit.

### Phase 1 — Autonomous Editorial Gate (`pipeline/`)
1. Build a reproducible Pydantic-validated pipeline script (`uv run`) emitting `STORYBOARD.md`, `web/public/data/story.json`, `web/public/data/story.schema.json`, and `web/public/data/manifest.json`.
2. Verify `cd pipeline && uv run ruff check . && uv run ruff format --check . && uv run ty check`.
3. Spawn a **fresh-context Editorial Critic subagent** (zero Builder history) to audit `STORYBOARD.md` + `story.json` for: one counterintuitive thesis (reject generic summaries), exact numerical accuracy against computed data, and visual variety across beats.
4. If any editorial blocker is flagged, complete **1 mandatory revision pass**, re-validate, log in `RUN_LOG.md`, update `STATE.json.currentPhase = "phase-2"`, and commit.

### Phase 2 — Pure-Projection Motion Scaffold (`web/`)
1. Implement pure-projection components keyed by persistent entity `id` (`transform` and `opacity` only), inline color-matched `<Highlight>` prose, and an interactive explore-it-yourself final beat with `[data-viz-interactive]` controls.
2. Preserve all verification hooks (`?audit=1`, `window.__VIZ_READY__`, `[data-viz-stage]`, `[data-viz-label]`, `[data-active-step]`, `[data-viz-interactive]`).
3. Confirm `npm run web:typecheck` and `npm run web:build` pass. Update `STATE.json.currentPhase = "phase-3"` and commit.

### Phase 3 — Monotonic Git-Ratchet Craft Loop (Max 6 Rounds)
1. Run `npm run audit:tier-a` (full mode, verifying `SOURCES.md`, scroll passes, label bounds/collisions, interactive finale, and contact sheets). Fix mechanical failures first (max 3 retries; repeat-failure circuit breaker halts identical failing loops).
2. Spawn a **fresh-context Visual Critic subagent** using `docs/CRITIC_RUBRIC.md` on both contact sheets plus 4–5 full-res beat batches (always including canvas/map beats and `final-interactive-*.png`). Parse strict JSON `{ scores, defects }`.
3. **Ratchet rule:**
   - If `scores.total > STATE.json.bestScore` and zero `blocker` defects remain: commit, run `git tag -f best-essay HEAD`, update `STATE.json`, and log in `RUN_LOG.md`.
   - If `scores.total` regresses or Tier A fails after 3 retries: run `git reset --hard best-essay`, log the failure in `RUN_LOG.md`, and try a different targeted fix next round.
   - Stop early if `scores.total >= 92` with zero `blocker` and zero high-impact `polish` defects for **2 consecutive checks**.

### Phase 4 — Autonomous Data Escape Hatch (Max 2 Cycles)
If Tier A or Tier B reveals a root data-shape issue (scale-crushing outlier, overlong labels, dense cluster) and `STATE.json.escapeCount < 2`:
1. Reopen `pipeline/`, adjust pre-declared schema/layout knobs (`scaleType`, `domain`, `shortLabel`, `priority`, binning, or documented `excludedOutliers`), re-validate against `story.schema.json` + `manifest.json`, and pass `ruff` + `ty`.
2. Increment `STATE.json.escapeCount`, log in `RUN_LOG.md`, commit, and re-enter Phase 3.

### Final Verification & Delivery
1. Confirm on the `best-essay` tagged commit that `npm run web:typecheck`, `npm run web:build`, `cd pipeline && uv run ruff check . && uv run ruff format --check . && uv run ty check`, and `npm run audit:tier-a` all exit `0`.
2. Write `FINAL_REPORT.md` summarizing the thesis, data sources, score progression across rounds, any escapes/rollbacks, and exact local preview command.
3. Update `STATE.json` (`currentPhase: "complete"`, `status: "complete"`), commit, move `git tag -f best-essay HEAD`, and finish.
