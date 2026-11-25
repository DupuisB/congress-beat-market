# Final Delivery Report — Does Congress Actually Beat the Market?

## 1. Central Thesis & Key Counterintuitive Finding

Popular financial media treats Capitol Hill as Wall Street's most reliable alpha engine. Real STOCK Act financial disclosure records across **24,442 priced stock purchases by 127 unique active U.S. lawmakers (2013–2026)** demonstrate the exact opposite:

- **Nearly 7 in 10 lawmakers trail the S&P 500:** **88 of 127 active traders (69.3%)** underperformed the S&P 500 (`SPY`) over the identical calendar holding windows (cumulative buy-to-latest-close, non-annualized). Only **39 (30.7%)** beat the index. The median lawmaker lags by **-11.2 percentage points** (overall mean **-3.7%**, dollar-weighted mean **-2.2%**, dollar-weighted median **-10.0%**).
- **The illusion is engineered by two nested layers of right-tail skew:**
  1. **Across lawmakers:** Just **3 outliers (2.4% of Congress)** — Roger Marshall (`+565.0%`), Sheldon Whitehouse (`+472.8%` raw tracker feed), and Barbara Comstock (`+227.6%`) — account for **47.4%** of all positive excess-return points in Congress. Removing those 3 collapses the Congressional mean by **10.3 percentage points** (from `-3.7%` to `-14.0%`, right beside the `-12.4%` trimmed median). Removing **one single Senator** (Sheldon Whitehouse) flips the entire **Senate mean from `+9.0%` to `-16.8%`** (only 5 of 19 Senators beat SPY; median `-21.0%`) and flips **Democrats from `+2.9%` to `-6.1%`**, leaving House Democrats (`-5.8%`) virtually identical to House Republicans (`-6.0%`).
  2. **Inside the "superstars'" own portfolios (after deduplicating amended filings):** Even the most celebrated winners are powered by a few decade-old tech lottery tickets rather than consistent trade-by-trade alpha. After removing identical rows duplicated across original and amended PTR filings, **Sheldon Whitehouse** averages **`+337.5%`** across 324 unique buys (inflated to `+472.8%` in raw tracker feeds by amended-filing duplicates), yet **65.4% of his buys lost to the S&P 500** (median trade **`-90.0%`**; 10 unique `NVDA` buys lift him from `+20.9%` ex-NVDA). **Nancy Pelosi** averages **`+109.1%`** across 100 unique buys, yet won on just **53.0%** of her trades (median trade **`+4.6%`**), lifted by 2014 `AVGO` (`+3,355%`) and 2016 `AAPL` (`+1,158%`) purchases.
- **Volume buys zero edge & fixed-horizon cross-check confirms it:** Trade count and excess return have near-zero correlation (`r = +0.03`), with only **8 of 29 prolific traders (`≥ 200` buys; `27.6%`)** beating the S&P 500. An independent buy-only fixed 120-day forward event-study cross-check (Hugging Face STOCK Act dataset, `n = 270` priced buys) confirms dead-flat short/medium-term performance (**`-0.72%` mean**, **`+0.07%` median**, **`50.7%` beat rate**).

---

## 2. Winning Dataset & Real-Data Provenance

All raw data files were downloaded directly from open, keyless public sources, preserved unmodified under `pipeline/data/raw/`, and locked with exact URLs, UTC fetch timestamps, licenses, dimensions, and SHA-256 hashes in [`SOURCES.md`](SOURCES.md).

- **Phase 0 Tournament Winner (99.0/100):** **Kadoa Congress Trading Monitor** (`kadoa-org/congress-trading-monitor`, MIT License), aggregating U.S. House Clerk PTRs and U.S. Senate eFD STOCK Act disclosures (2011–2026) with direct SPY excess-return benchmarking (`kadoa_returns.json`, `kadoa_filers.json`, `kadoa_alpha_index.json`, `kadoa_stats.json`, plus 4 individual outlier trade logs).
- **Phase 1 Data Integrity Cleaning (documented in `SOURCES.md` & essay methodology):** Merged duplicate House Clerk name variants for Rep. C. Scott Franklin (Bioguide `F000472`, reducing 128 raw rows to **127 unique lawmakers**), stripped trailing punctuation (`Jerry Moran,`), and deduplicated amended-filing rows inside Beat 6's individual superstar trade logs.
- **Runner-Up Robustness Cross-Check (65.2/100):** **Hugging Face STOCK Act Event-Study Dataset** (`williamTLmiller/congress-stock-trades-stock-act-news-patterns`, CC BY-NC 4.0) — buy-only 120-day forward excess return validation.
- **Runner-Up #2 Evaluated (74.0/100):** **Capitol Stock Watch Open Data** (`MichaelBMiner/capitol-stock-watch-open-data`, CC BY 4.0).

---

## 3. Visual Critic Score Progression & Ratchet History

Every round was verified by deterministic Playwright Tier A (`npm run audit:tier-a` across desktop `1280×800` and mobile `390×844`) followed by a **fresh-context Tier B VLM Critic subagent** (zero Builder history) scoring `docs/CRITIC_RUBRIC.md` across both contact sheets and all 16 full-resolution PNGs.

| Round | Phase / Action | Legibility | Hierarchy | Editorial | Variety | Mobile | Total | Blockers | Ratchet Outcome |
| :---: | --- | :---: | :---: | :---: | :---: | :---: | :---: | :---: | --- |
| 0 | Phase 2 Baseline (`3791272`) | 12 | 15 | 17 | 18 | 12 | **74** | 5 | Baseline (blockers present) |
| 1 | Escape #1 + Polish Round 1 | 14 | 17 | 19 | 18 | 14 | **82** | 4 | Held (4 blockers remaining) |
| 2 | Escape #2 + Polish Round 2 (`9312c8a`) | 17 | 18 | 19 | 19 | 17 | **90** | **0** | **Promoted → `best-essay`** |
| 3 | Polish Round 3 (presentation) | 17 | 18 | 18 | 19 | 17 | **89** | 0 | **Rolled back** to `best-essay` (`90`) |
| 4 | Polish Round 4 (presentation) | 17 | 19 | 19 | 19 | 17 | **91** | 1 | Held (1 mobile Beat 7 blocker) |
| 5 | Polish Round 5 (`9082706`) | 18 | 18 | 19 | 19 | 17 | **91** | **0** | **Promoted → `best-essay` (`bestScore: 91`)** |
| 6 | Polish Round 6 (presentation) | 17 | 18 | 18 | 19 | 16 | **88** | 1 | **Rolled back** to `best-essay` (`91`) |

- **Final Verified Best Score:** **`91/100`** with **0 blockers** (`legibility: 18/20`, `hierarchy: 18/20`, `editorialCraft: 19/20`, `visualVariety: 19/20`, `mobileFit: 17/20`).
- **Best Git Tag:** `best-essay` (final commit on branch `essay/congress-beat-market-20261124`).

---

## 4. Data Escapes & Rollbacks Performed

- **Phase 1 Editorial Revision (1 mandatory pass):** Fresh-context Editorial Critic caught the C. Scott Franklin duplicate (`128 → 127` unique lawmakers), Beat 5 headline overstatement, Whitehouse's 4 amended-filing NVDA duplicates (`14 → 10` unique buys), mixed buy/sell rows in the HF 120-day cross-check, upfront non-annualized caveat placement, and Beat 6 label spacing — all resolved prior to Phase 2.
- **Autonomous Data Escape Cycles (2/2 cap):**
  1. **Escape #1:** Added `mobileChartSubtitle` to `Beat` schema (eliminating all mobile ellipsis truncation), unified Beat 1/2 color discipline, and relocated Beat 5/7 annotations into verified open whitespace.
  2. **Escape #2:** Re-ordered Beat 1 winner grid column-by-column so focal outliers sit on the outer right edge, removed cobalt color overload on Beat 3 trailing marks, tightened mobile Beat 4 House beeswarm lanes, unified Beat 6 row headers, and shifted Beat 7 desktop `McCaul` and mobile `Marshall`/`Whitehouse` labels into clear open space.
- **Monotonic Ratchet Rollbacks (2):**
  1. **Round 3 (`89 < 90`):** Rolled back via `git reset --hard best-essay` after Beat 3's widened tray left an inner dashed line crossing the header and Beat 2's mean line rendered beneath context dots.
  2. **Round 6 (`88 < 91`):** Rolled back via `git reset --hard best-essay` after lifting mobile Beat 7's `S&P 500` label collided with a vermilion mark and desaturating trailing marks broke Beat 7's cobalt prose highlight coordination.

---

## 5. Final Verification & Local Preview

All four release gates exit `0` on the final `best-essay` build:

- `npm run web:typecheck` — **PASS** (`tsc --noEmit` in `web/` and `audit/`)
- `npm run web:build` — **PASS** (production Vite bundle)
- `cd pipeline && uv run ruff check . && uv run ruff format --check . && uv run ty check` — **PASS**
- `npm run audit:tier-a` — **PASS** (`0 errors, 0 label collisions, 0 skipped steps`, desktop `1280×800` + mobile `390×844`, `SOURCES.md` provenance verified, 9 desktop / 9 mobile interactive finale controls verified, contact sheets stitched)

### Preview Locally

```bash
npm run web:dev
```

Or serve the production bundle directly:

```bash
npm --prefix web run preview
```
