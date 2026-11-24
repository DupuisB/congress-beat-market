# Architecture Map

Live map of the Pudding visual essay factory: directories, data contracts, and verification commands. Keep this file updated whenever structure or contracts change.

## Directory Layout

```text
.
├── GEMINI.md                     # Root agent rules (imports WORKFLOW, DESIGN_SYSTEM, AUTONOMOUS)
├── ARCHITECTURE.md               # This file — live map of modules, contracts, and commands
├── Makefile                      # Convenience wrappers for pipeline, web, and audit commands
├── package.json                  # Root orchestration scripts
├── .gemini/skills/autonomous-essay/
│   └── SKILL.md                  # Reusable Antigravity skill for unattended Phase 0->5 essay runs
├── docs/
│   ├── WORKFLOW.md               # 5-phase scrollytelling production assembly line
│   ├── DESIGN_SYSTEM.md          # Editorial typography, palette, sticky layout, and anti-slop spec
│   ├── AUTONOMOUS.md             # Unattended overnight runbook (Phase 0 tournament + git ratchet)
│   └── CRITIC_RUBRIC.md          # Fresh-context Tier B VLM critic prompt (scores + defects JSON)
├── pipeline/                     # Python 3.12+ (uv) — EDA, precomputed layouts, contract emission
│   ├── pyproject.toml            # uv project config (pydantic, pillow, ruff, ty)
│   └── src/
│       ├── schema.py             # Pydantic models for story.json, story.schema.json, manifest.json
│       ├── tournament.py         # Phase 0 real-data tournament evaluator
│       ├── emit_congress_story.py # Reproducible 7-beat essay emitter (127 unique lawmakers)
│       ├── emit_smoke.py         # 3-beat / 12-entity smoke fixture emitter
│       └── stitch_contact_sheet.py # Pillow contact-sheet generator for desktop & mobile PNGs
├── web/                          # Vite + React + TypeScript + Tailwind — pure-projection renderer
│   ├── package.json
│   ├── tsconfig.json             # strict: true, noUncheckedIndexedAccess: true
│   ├── vite.config.ts
│   ├── public/data/
│   │   ├── story.json            # Emitted story payload (committed per essay)
│   │   ├── story.schema.json     # Emitted JSON Schema from Pydantic
│   │   └── manifest.json         # Locked beatCount + entity counts/IDs per beat
│   └── src/
│       ├── index.css             # Editorial typography, warm paper theme, overflow-x: clip
│       ├── styles/tokens.ts      # Colorblind-safe editorial palette & motion constants
│       ├── schema/story.ts       # Runtime Zod validator matching story.schema.json
│       ├── lib/audit.ts          # ?audit=1 detection, scroll-behavior override, __VIZ_READY__
│       ├── components/
│       │   ├── Highlight.tsx     # Color-matched inline prose highlight span
│       │   ├── ScrollyLayout.tsx # Responsive sticky stage + react-scrollama + 2px progress bar
│       │   ├── CongressViz.tsx   # Pure-projection, ID-keyed 7-beat editorial visualization
│       │   └── SmokeViz.tsx      # Pure-projection smoke graphic (for --smoke verification)
│       └── App.tsx               # Data loader, Zod validation, and editorial page shell
└── audit/                        # Deterministic Tier A Playwright verifier
    ├── package.json
    ├── tsconfig.json
    ├── run_tier_a.ts             # Desktop + mobile scroll, manifest, collision, and PNG audit
    └── artifacts/                # Gitignored per-beat PNGs and stitched contact sheets
```

## Data Contracts (`web/public/data/`)

| Artifact | Producer | Consumer | Guarantee |
| --- | --- | --- | --- |
| `story.json` | `pipeline/` (Pydantic) | `web/` (Zod) | Persistent `id` per entity across beats, precomputed fixed-`viewBox` coordinates (`800x500` desktop, `360x360` mobile), `priority: 1 \| 2 \| 3` annotations. |
| `story.schema.json` | `pipeline/` (`model_json_schema()`) | `web/` & `audit/` | Canonical JSON Schema snapshot locked at the Phase 1 gate. |
| `manifest.json` | `pipeline/` (Pydantic) | `audit/run_tier_a.ts` | Locks `beatCount`, per-beat `entityCount`, `entityIds`, and annotation priority counts so outliers cannot be silently dropped. |

## Verification Hooks (`web/` ↔ `audit/`)

- `?audit=1`: Forces instant zero-duration transitions (`<MotionConfig reducedMotion="always">`) and injects `scroll-behavior: auto !important`.
- `window.__VIZ_READY__`: Set to `true` only after `story.json` is validated, `document.fonts.ready` resolves, images decode, and optional canvas/animation frames settle.
- `[data-viz-stage]`: Marks the bounding visual stage container for clipping/containment checks.
- `[data-viz-label]`: Marks every chart annotation label checked for overlap and stage containment (strictly on visible elements: `opacity > 0.5`, `visibility !== 'hidden'`, non-zero rect).
- `[data-active-step]`: Exposes the current active beat index on the scrolly container for deterministic scroll-state verification.
- `[data-viz-interactive]`: Marks the interactive "explore it yourself" finale controls verified and captured (`final-interactive-desktop.png`, `final-interactive-mobile.png`) by Tier A.

## Autonomous Run Artifacts (Per Essay Branch)

Created on `essay/<slug>-<YYYYMMDD>` branches during Autonomous Essay Mode (`docs/AUTONOMOUS.md`):

- `STATE.json` — Disk-backed resume cursor (`theme`, `slug`, `currentPhase`, `bestScore`, `bestTag`, `escapeCount`, `polishRound`, `status`, `updatedAt`).
- `RUN_LOG.md` — Chronological record of tournament scoring, editorial decisions, ratchet promotions, rollbacks, and data escapes.
- `SOURCES.md` — Verified provenance log (exact public URLs, UTC fetch timestamps, licenses, row/column counts, SHA-256 hashes, and `pipeline/data/raw/` paths) checked by Tier A in non-smoke mode.
- `FINAL_REPORT.md` — Concise delivery report with thesis, sources, visual score progression, and preview command.

## Commands

Run from repository root:

- `npm run pipeline:smoke` (or `make pipeline-smoke`) — Generate the 3-beat smoke fixture into `web/public/data/`.
- `npm run pipeline:check` (or `make pipeline-check`) — Run `ruff check`, `ruff format --check`, and `ty check` in `pipeline/`.
- `npm run web:dev` (or `make web-dev`) — Start the Vite dev server.
- `npm run web:typecheck` (or `make web-typecheck`) — Run `tsc --noEmit` in `web/` and `audit/`.
- `npm run web:build` (or `make web-build`) — Build the production bundle in `web/`.
- `npm run audit:tier-a` (or `make audit-tier-a`) — Run full Playwright Tier A checks (including `SOURCES.md` provenance + interactive finale + contact sheets).
- `npm run audit:tier-a -- --smoke` (or `npm run audit:tier-a --smoke` / `make audit-tier-a-smoke`) — Run Tier A against the smoke fixture (skips `SOURCES.md` provenance check).
- `npm run verify` (or `make verify`) — Full pipeline check + smoke emit + web typecheck/build + Tier A smoke audit.
