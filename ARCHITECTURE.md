# Architecture Map

Live map of the Pudding visual essay factory: directories, data contracts, and verification commands. Keep this file updated whenever structure or contracts change.

## Directory Layout

```text
.
├── GEMINI.md                     # Root agent rules (imports docs/WORKFLOW.md & docs/DESIGN_SYSTEM.md)
├── ARCHITECTURE.md               # This file — live map of modules, contracts, and commands
├── Makefile                      # Convenience wrappers for pipeline, web, and audit commands
├── package.json                  # Root orchestration scripts
├── docs/
│   ├── WORKFLOW.md               # 5-phase scrollytelling production assembly line
│   ├── DESIGN_SYSTEM.md          # Editorial typography, palette, sticky layout, and anti-slop spec
│   └── CRITIC_RUBRIC.md          # Fresh-context Tier B VLM critic prompt and strict JSON schema
├── pipeline/                     # Python 3.12+ (uv) — EDA, precomputed layouts, contract emission
│   ├── pyproject.toml            # uv project config (pydantic, pillow, ruff, ty)
│   └── src/
│       ├── schema.py             # Pydantic models for story.json, story.schema.json, manifest.json
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
│       │   └── SmokeViz.tsx      # Pure-projection, ID-keyed SVG/Framer Motion smoke graphic
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

## Commands

Run from repository root:

- `npm run pipeline:smoke` (or `make pipeline-smoke`) — Generate the 3-beat smoke fixture into `web/public/data/`.
- `npm run pipeline:check` (or `make pipeline-check`) — Run `ruff check`, `ruff format --check`, and `ty check` in `pipeline/`.
- `npm run web:dev` (or `make web-dev`) — Start the Vite dev server.
- `npm run web:typecheck` (or `make web-typecheck`) — Run `tsc --noEmit` in `web/` and `audit/`.
- `npm run web:build` (or `make web-build`) — Build the production bundle in `web/`.
- `npm run audit:tier-a` (or `make audit-tier-a`) — Run Playwright Tier A checks (desktop + mobile) and stitch contact sheets into `audit/artifacts/`.
- `npm run verify` (or `make verify`) — Full pipeline check + smoke emit + web typecheck/build + Tier A audit.
