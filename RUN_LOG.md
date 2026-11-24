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

---

## Phase 1 — Autonomous Editorial Gate & Revision Pass (`2026-11-24T23:26:00Z`)

### Fresh-Context Editorial Critic Verdict: `revise` (6 blockers, 5 polish notes)
The fresh-context Editorial Critic audited `STORYBOARD.md`, `web/public/data/story.json`, `web/public/data/manifest.json`, and all raw files under `pipeline/data/raw/`. It rated the central thesis **`strong`**, verified arithmetic on the raw table, and caught 6 critical data/framing defects that were fixed in our mandatory revision pass:

1. **Deduplicated Rep. C. Scott Franklin (`F000472`):** Merged duplicate House Clerk variants (`house_cscott_franklin` + `house_scottscott_franklin`) into a single canonical entity (111 buys, buy-weighted `-15.20%` excess) and stripped the trailing comma from `Jerry Moran,`. Updated all aggregate statistics across **127 unique lawmakers** (`88/127 = 69.3%` trailed SPY, `39/127 = 30.7%` beat SPY; mean `-3.69%`, median `-11.19%`; ex-top-3 mean `-13.98%`, a `-10.29 pp` drop; House D `-5.83%` vs House R `-5.98%`).
2. **Corrected Beat 5 (`beat-05-activity`) headline & claim:** Replaced overstated "fare even worse" headline with `"Trading hundreds of times buys zero market-beating edge."` to match the true flat relationship (`r = +0.03`, `27.6%` vs `31.6%` beat rate).
3. **Deduplicated amended filings in Beat 6 (`beat-06-superstars`):** Removed identical rows duplicated across original and amended Senate/House PTR filings in raw superstar logs. Sheldon Whitehouse drops from 409 raw rows (`+472.8%`, 14 NVDA rows) to **324 unique buys** (`+337.5%` mean, `-90.0%` median, `34.6%` win rate, **10 unique NVDA buys**, ex-NVDA mean `+20.9%`); Nancy Pelosi moves to **100 unique buys** (`+109.1%` mean, `+4.6%` median, `53.0%` win rate). Disclosed raw-feed amendment inflation transparently in Beat 6 prose and `methodologyNote`.
4. **Fixed HF 120-day cross-check to buys only (`direction == "buy"`):** Filtered out sales (`n = 270` priced buys: `-0.72%` mean, `+0.07%` median, `50.7%` beat rate) for a strict apples-to-apples check in both `tournament.py` and `emit_congress_story.py`.
5. **Upfront methodology disclosure:** Stated cumulative buy-to-latest-close vs. SPY (non-annualized) directly in Beat 1 body prose, and documented unpriced/delisted exclusions, underlying-stock option pricing, and deduplication in `methodologyNote` and `SOURCES.md`.
6. **Resolved precomputed label clearances & strengthened visual variety:** Moved Beat 6 lane headers cleanly above each barbell (`y - 22` desktop / `y - 20` mobile), grouped Sen. Angus King (`I-ME`) into `SENATE D/I · 7` by caucus, added a mean-shift bridge callout on Beat 3, and differentiated Beat 7 (`explorer`) onto a distinct **Estimated Dollar Volume (log USD) X-axis** vs. Beat 5's Priced Buy Count X-axis.
