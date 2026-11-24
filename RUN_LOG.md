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

---

## Phase 3 & 4 — Monotonic Git-Ratchet Polish Rounds

### Baseline Visual Critic (Round 0 — `3791272`): `74/100` (5 blockers, 5 polish, 1 nit)
- Scores: `legibility: 12`, `hierarchy: 15`, `editorialCraft: 17`, `visualVariety: 18`, `mobileFit: 12`.
- Key blockers: Beat 6 desktop row-header/annotation collision on Whitehouse; Beat 5 mobile dot occlusion (`Whitehouse`, `Gottheimer`, `0%`); Beat 5 desktop `Tuberville` crossing scatter cloud; Beat 7 mobile `Whitehouse` dot occlusion; final-interactive dimmed opacity + residual saturation on excluded marks.
- Action: Did not promote (blockers present). Triggered **Phase 4 Escape Cycle #1** + **Polish Round 1**.

### Escape Cycle #1 + Polish Round 1 (`2026-11-24T23:35:00Z`): `82/100` (4 blockers, 5 polish)
- Scores: `legibility: 14`, `hierarchy: 17`, `editorialCraft: 19`, `visualVariety: 18`, `mobileFit: 14`.
- Data/schema adjustments: Added `mobileChartSubtitle` to `Beat` (eliminating all mobile ellipsis truncation); unified Beat 1/2 color discipline (neutral gray context marks so accents have single meanings); relocated Beat 5/7 annotations into verified open whitespace; shortened Beat 6 row labels.
- Web fixes: Switched `Highlight` to `display: inline` with `box-decoration-break: clone`; fixed Framer Motion `?audit=1` zero-duration transitions so opacity settles immediately; added mobile Beat 6 inline legend.
- Remaining blockers: Beat 6 vertical `0%` rule cutting through row headers; Beat 7 desktop `McCaul` overlapping a blue dot; Beat 7 mobile `Marshall`/`Whitehouse` label placement; final-interactive faint excluded labels.
- Action: Did not promote (blockers present). Triggered **Phase 4 Escape Cycle #2** + **Polish Round 2**.

### Escape Cycle #2 + Polish Round 2 (`2026-11-24T23:43:00Z`): `90/100` (0 blockers, 6 polish) — **PROMOTED (`best-essay`)**
- Scores: `legibility: 17`, `hierarchy: 18`, `editorialCraft: 19`, `visualVariety: 19`, `mobileFit: 17`.
- Data/layout adjustments: Re-ordered Beat 1 winner grid column-by-column so Marshall, Whitehouse, and Pelosi sit on the outer right column with unobstructed leader lines; removed cobalt color overload on Beat 3 trailing dots; tightened mobile Beat 4 House beeswarm height; unified Beat 6 row headers to primary ink and matched `+337.5%` precision; moved Beat 7 desktop `McCaul` to open lower-right whitespace and mobile `Marshall`/`Whitehouse` cleanly above their marks.
- Web fixes: Added opaque warm-paper backing strips behind Beat 6 row headers so the `0%` rule breaks cleanly; hid excluded annotations & leader lines when Beat 7 filters are active; added crisp dark focal rings on Beat 1 annotated marks; upgraded Beat 7 weighting button to an explicit `Equal-Wt | $-Wt` segmented toggle.
- Ratchet decision: `90 > 0` with **0 blockers** → **Committed & tagged `best-essay`**. Proceeding to Polish Round 3 (presentation-only `web/` fixes targeting `>= 92/100`).

### Polish Round 3 (`2026-11-24T23:47:30Z`): `89/100` (0 blockers, 6 polish) — **ROLLED BACK to `best-essay` (`90/100`)**
- Scores: `legibility: 17`, `hierarchy: 18`, `editorialCraft: 18`, `visualVariety: 19`, `mobileFit: 17`.
- Why it regressed (-1 pt): Widening the Beat 3 shaded tray left the existing vertical dashed separator sitting inside the box behind "TOP 3 SET ASIDE", and the Beat 2 `Mean -3.7%` dashed line drew underneath the gray swarm dots.
- Ratchet decision: `89 < 90` → Executed `git reset --hard best-essay` (`9312c8a`) and pivoted cleanly into Polish Round 4.

### Polish Round 4 (`2026-11-24T23:52:30Z`): `91/100` (1 blocker, 4 polish)
- Scores: `legibility: 17`, `hierarchy: 19`, `editorialCraft: 19`, `visualVariety: 19`, `mobileFit: 17`.
- Wins: Removed inner dashed line from Beat 3 shaded tray; moved Beat 2 `Mean -3.7%` above swarm dots; added Beat 4 Senate mean-shift (`-16.8% → +9.0%`) & House mean ticks; routed Beat 5 Tuberville leader cleanly left of 200-buy line; added typographic `≥`, `→`, and `S&P\u00A0500` non-breaking space.
- Single blocker: Mobile Beat 7 right-side `S&P 500` label collided with `$100M–$300M` bubbles. Not promoted yet; fixed immediately in Round 5.

### Polish Round 5 (`2026-11-24T23:56:40Z`): `91/100` (0 blockers, 4 polish, 1 nit) — **PROMOTED (`best-essay`)**
- Scores: `legibility: 18`, `hierarchy: 18`, `editorialCraft: 19`, `visualVariety: 19`, `mobileFit: 17`.
- Fixes: Moved mobile Beat 7 `S&P 500` label to open left space (`x = 56`); wrapped Beat 3 desktop `'3 outliers / +228% to +565%'` cleanly inside the shaded tray and removed single-dot leader/ring; added Pelosi focus ring & shifted mobile Pelosi label left; added mobile search input + `>= 28px` touch targets; replaced `"click any circle"` with `"select any circle"`.
- Ratchet decision: `91 > 90` with **0 blockers** → **Committed & tagged `best-essay`**. Proceeding to final Polish Round 6 targeting `>= 92/100`.
