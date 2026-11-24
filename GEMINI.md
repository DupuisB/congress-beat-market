# Pudding Visual Essay Factory — Agent Instructions

@./docs/WORKFLOW.md
@./docs/DESIGN_SYSTEM.md
@./docs/AUTONOMOUS.md

## Mission
This repository is a reusable, production-grade factory for *The Pudding*-style interactive scrollytelling visual essays. Python (`pipeline/`) owns all exploratory data analysis, data cleaning, complex layout precomputation, and contract emission. TypeScript/React (`web/`) owns pure-projection editorial rendering. Playwright (`audit/`) and a fresh-context VLM critic (`docs/CRITIC_RUBRIC.md`) own verification.

## Non-Negotiable Engineering Rules

1. **Surgical Changes:** Modify only files scoped to the active phase. Never rewrite unrelated modules, reformat untouched files, or refactor outside the current task boundary.
2. **Python Discipline (`pipeline/`):**
   - Always invoke Python tools via `uv run` from `pipeline/` (never global `python` or `pip`).
   - Lint and format cleanly with `uv run ruff check .` and `uv run ruff format --check .`.
   - Typecheck cleanly with `uv run ty check`.
   - Validate every emitted dataset with Pydantic models before writing to `web/public/data/`.
3. **TypeScript Discipline (`web/` & `audit/`):**
   - Strict TypeScript (`strict: true`, `noUncheckedIndexedAccess: true`).
   - **Zero `any`**, **zero `@ts-ignore` / `@ts-expect-error`**, **zero data wrangling or physics/force simulations in the browser**.
   - Validate `story.json` against the Zod schema (`web/src/schema/story.ts`) at load time in dev and audit modes.
   - Components must be pure projections of `activeStep` — never incrementally mutate state or filters inside `onStepEnter`/`onStepExit`.
4. **Git Discipline:**
   - Use atomic Conventional Commits (`chore:`, `feat:`, `data:`, `fix:`, `audit:`).
   - Keep `ARCHITECTURE.md` synchronized whenever directory structure, data contracts, or commands change.
5. **Hard Phase Gates (Manual vs. Autonomous Mode):**
   - **Manual Mode (default):** Never cross from **Phase 1 → Phase 2** without explicit human review and sign-off on `STORYBOARD.md`, `web/public/data/story.json`, `web/public/data/story.schema.json`, and `web/public/data/manifest.json`. Never trigger a **Phase 4** data escape hatch without explicit human approval.
   - **Autonomous Essay Mode (`/goal` or `autonomous-essay` skill):** Follow `docs/AUTONOMOUS.md` strictly — zero stalls, no human approval prompts, real-data tournament with `SOURCES.md` provenance, fresh-context Editorial & Visual Critic gates, monotonic `best-essay` git ratchet, and max 2 autonomous data escape cycles.
   - **Always (both modes):** Never drop entities or outliers silently to fix a layout collision; `manifest.json` locks entity counts per beat.
