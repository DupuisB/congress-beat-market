# Autonomous Essay Run Log

**Theme:** Do U.S. Congress members actually beat the market, or do a few outliers create that illusion?
**Branch:** `essay/congress-beat-market-20261124`

---

## Phase 0 — Real-Data Tournament & Provenance Lock (`2026-11-24T23:07:00Z`)

### Candidate Evaluation (`uv run python -m src.tournament`)

| Rank | Candidate | Entities | Records | Surprise (40) | Granularity (30) | Completeness (30) | Total (100) |
| ---: | --- | ---: | ---: | ---: | ---: | ---: | ---: |
| 1 | **Kadoa Congress Trading Monitor (MIT)** | 128 | 24,442 priced buys | 39.0 | 30.0 | 30.0 | **99.0** |
| 2 | Capitol Stock Watch Open Data (CC BY 4.0) | 297 | 6,411 recent trades | 24.0 | 28.0 | 22.0 | 74.0 |
| 3 | HF STOCK Act Event-Study Trades (CC BY-NC 4.0) | 109 | 1,000 sampled trades | 30.0 | 20.0 | 15.2 | 65.2 |

### Decisions & Rationale
- **Discarded Stooq (`stooq.com`):** Returned an automated proof-of-work JS gate; discarded immediately under zero-bypass rules.
- **Selected Winner — Kadoa Congress Trading Monitor (`kadoa_returns.json` + `kadoa_filers.json` + outlier filer trade logs):**
  - Tracks **128 active U.S. Representatives & Senators** (each with >= 20 priced stock purchases across **24,442 total scored buys** from 2013–2026) with zero missing fields (`party`, `state`, `chamber`, `avg_excess`, `weighted_excess`, `avg_ret`, `scored_buys`, `est_volume`).
  - Directly benchmarks every purchase against `SPY` (S&P 500) over the identical holding window.
  - Uncovers a striking two-layer statistical illusion:
    1. **Across lawmakers:** 89 of 128 lawmakers (**69.5%**) trail the S&P 500; the median lawmaker lags by **-11.8 percentage points**. Yet removing just **3 lawmakers** (Roger W. Marshall `+565.0%`, Sheldon Whitehouse `+472.8%`, Barbara J. Comstock `+227.6%`) collapses the Congressional mean by **10.2 points** (from `-3.8%` to `-14.0%`). Removing **one single Senator** (Sheldon Whitehouse) flips the entire Senate average from **+9.0%** to **-16.8%** and flips Democrats from **+2.9%** to **-6.1%** (even though a smaller share of Democrats beat the S&P — 28.3% — than Republicans at 32.4%).
    2. **Inside the outliers' own portfolios:** Even headline "superstars" are powered by lottery-ticket tech buys rather than consistent trade-by-trade alpha. Whitehouse beats the S&P on only **36.9%** of his 409 buys (median trade: **-88.0%** excess), hoisted by January–April 2016 `$1K–$15K` `NVDA` purchases (`+19,159%` excess). Nancy Pelosi (`+93.4%` mean excess) beats the S&P on just **50.5%** of her 109 buys (median trade: **+1.0%** excess), lifted by decade-old `AVGO` (`+3,355%`) and `AAPL` (`+1,158%`) buys.
- **Robustness Cross-Check (HF Event-Study Dataset):** Confirms zero short/medium-term alpha across fixed horizons (`excess_fwd_5d` mean `-0.39%`, `20d` `-0.07%`, `60d` `+0.69%`, `120d` `-0.78%` with `46.9%` beat rate), proving the lack of broad Congressional outperformance is not an artifact of cumulative buy-to-present return windows.
- **Provenance Locked:** All 12 retained raw files recorded in `SOURCES.md` with exact URLs, UTC timestamps, licenses, dimensions, and SHA-256 hashes.
