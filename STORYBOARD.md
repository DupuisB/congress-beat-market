# Storyboard — Does Congress Actually Beat the Market?

> Across 24,442 disclosed stock purchases by 127 unique U.S. lawmakers (2013–2026), 69.3% trailed the S&P 500. The myth of universal Capitol Hill alpha is an optical illusion built by extreme right-tail outliers.

## Central Counterintuitive Thesis

Popular finance lore insists members of Congress routinely beat the stock market. Real STOCK Act data across **24,442 priced stock purchases** by **127 unique active lawmakers** (2013–2026, measured cumulatively from purchase date to latest close minus SPY, non-annualized) proves the opposite: **88 of 127 (69.3%) trailed the S&P 500**, with a median excess return of **-11.19%** and an overall mean of **-3.69%**. The myth survives because extreme right-tail skew operates at two nested levels: across lawmakers (3 outliers hold **47.4%** of all positive excess-return points, and one Senator — Sheldon Whitehouse — single-handedly flips both the Senate mean from **-16.78%** to **+8.99%** and the Democratic mean from **-6.10%** to **+2.93%**), and inside the superstars' own deduplicated trade logs (Whitehouse loses to SPY on 65.4% of his 324 unique buys with a -90.0% median trade; Nancy Pelosi wins on 53.0% of her 100 unique buys with a +4.6% median trade).

## Beat-by-Beat Narrative & Visual Progression

### Beat 1: Nearly 7 in 10 trading lawmakers lost to the S&P 500. (`beat-01-scorecard` · `waffle-split`)

- **Kicker:** 01 / The Scorecard
- **Visual Delta:** Each circle = 1 lawmaker (>=20 priced stock buys, 2013–2026)
- **Copy:** Across 24,442 priced stock purchases by 127 unique active lawmakers (2013–2026), each buy is scored cumulatively from trade date to latest close minus the S&P 500 (non-annualized). By that yardstick, 88 lawmakers (69.3%) trailed the S&P 500, while only 39 (30.7%) beat it — leaving the median trading member 11.2 percentage points behind a boring index fund.
- **Takeaway:** Of 127 lawmakers, 88 (69.3%) trailed SPY; median cumulative excess is -11.2%.
- **Desktop Labels (4):** Marshall (+565%), Whitehouse (+473%), Pelosi (+93%), Mo Brooks (-150%)
- **Mobile Priority-1 Labels (2):** Marshall +565%, Brooks -150%

### Beat 2: Three extreme outliers stretch the entire distribution to the right. (`beat-02-skew` · `beeswarm-skew`)

- **Kicker:** 02 / The Skew
- **Visual Delta:** Average cumulative excess return vs. S&P 500 (linear scale, %)
- **Copy:** Line all 127 lawmakers up on a true linear scale of cumulative excess return and the distortion jumps off the page. Nearly every member sits packed near zero or below, while just three outliers (Marshall, Whitehouse, and Comstock) account for 47.4% of all positive excess-return points in Congress — pulling the mean (-3.7%) far above the median (-11.2%).
- **Takeaway:** Top 3 outliers (2.4% of Congress) hold 47.4% of all positive excess-return points.
- **Desktop Labels (5):** Marshall +565%, Whitehouse +473%, Comstock +228%, Pelosi +93%, Mo Brooks -150%
- **Mobile Priority-1 Labels (2):** Marshall +565%, Whitehouse +473%

### Beat 3: Set aside 3 outliers and the Congressional average drops 10.3 points. (`beat-03-collapse` · `trimmed-drop`)

- **Kicker:** 03 / Removing 3 Lawmakers
- **Visual Delta:** Zoomed distribution (-160% to +160%) with mean-shift bridge & top 3 set aside
- **Copy:** Set aside just the top three performers (2.4% of our 127-member sample) and zoom into the remaining 124 lawmakers: the headline mean plunges from -3.7% to -14.0% — right beside the -12.4% median. Even high-profile winners like Nancy Pelosi (+93.4%) sit in a thin right-hand tail outweighed by dozens of steep laggards.
- **Takeaway:** Dropping 3 of 127 lawmakers cuts the mean from -3.7% to -14.0% (-10.3 pp).
- **Desktop Labels (4):** Pelosi +93%, Suozzi +144%, Mo Brooks -150%, 3 outliers (+228% to +565%)
- **Mobile Priority-1 Labels (2):** Pelosi +93%, Brooks -150%

### Beat 4: One Senator flips both the Senate and Democratic averages positive. (`beat-04-illusion` · `chamber-party`)

- **Kicker:** 04 / The One-Senator Mirage
- **Visual Delta:** Excess return by chamber at filing × caucus (symlog axis, %)
- **Copy:** Headline summaries suggest Senators (+9.0% mean) and Democrats (+2.9%) beat the market while the House and Republicans trail. Yet only 5 of 19 Senators (26.3%) beat the S&P 500 (median -21.0%). Remove Sheldon Whitehouse (+472.8%) alone and the Senate average crashes to -16.8%, Democrats flip to -6.1%, and House Democrats (-5.8%) mirror House Republicans (-6.0%).
- **Takeaway:** Ex-Whitehouse, Senate mean flips +9.0% -> -16.8% and Democrats flip +2.9% -> -6.1%.
- **Desktop Labels (4):** Whitehouse +473% (flips Senate), Tuberville -34%, Pelosi +93%, Marshall +565% (House filings)
- **Mobile Priority-1 Labels (2):** Whitehouse +473%, Marshall +565%

### Beat 5: Trading hundreds of times buys zero market-beating edge. (`beat-05-activity` · `activity-scatter`)

- **Kicker:** 05 / The Frequency Myth
- **Visual Delta:** Priced stock buys (log X) vs. average excess return (symlog Y)
- **Copy:** If Capitol Hill held a systematic trading edge, the most active members should convert volume into alpha. Instead, trade count and excess return have virtually zero correlation (r = +0.03). Among the 29 prolific traders with 200+ buys, 21 of 29 trailed the S&P 500 — leaving just 8 winners (27.6%), no better than occasional traders (31.6%), even as Josh Gottheimer (1,343 buys, -8.1%) and Tommy Tuberville (456, -34.0%) filed hundreds of tickets.
- **Takeaway:** Log(buys) vs. excess return is flat (r = +0.03); 8/29 hyper-traders (27.6%) beat SPY.
- **Desktop Labels (5):** Ro Khanna · 3,528 (+5%), Gottheimer · 1,343 (-8%), Whitehouse · 409 (+473%), Tuberville · 456 (-34%), Virginia Foxx · 555 (-74%)
- **Mobile Priority-1 Labels (3):** Khanna +5%, Gottheimer -8%, Whitehouse +473%

### Beat 6: Even the headline superstars are powered by a few tech lottery tickets. (`beat-06-superstars` · `superstar-anatomy`)

- **Kicker:** 06 / Inside the Superstars
- **Visual Delta:** Deduplicated median trade (cobalt ring) vs. mean excess (vermilion dot)
- **Copy:** Deduplicating amended filings inside the top winners' own trade logs exposes the same skew. Sheldon Whitehouse averages +337.5% across 324 unique buys (inflated to +472.8% in raw feeds by amended duplicates), yet only 34.6% beat SPY and his median trade lost by -90.0% — lifted by 10 NVDA buys (ex-NVDA: +20.9%). Nancy Pelosi (+109.1% mean, 100 unique buys) won on just 53.0% (median +4.6%).
- **Takeaway:** Deduplicated medians: Whitehouse -90.0% (34.6% win), Pelosi +4.6% (53.0% win).
- **Desktop Labels (4):** Med +61% → Mean +565%, Med -90% → Mean +337.5% (10 NVDA), Med +65% → Mean +228%, Med +4.6% → Mean +109%
- **Mobile Priority-1 Labels (2):** Med -90% vs +337.5%, Med +4.6% vs +109%

### Beat 7: Inspect all 127 lawmakers — by dollar volume and weighting. (`beat-07-explore` · `explorer`)

- **Kicker:** 07 / Explore the Record
- **Visual Delta:** Est. trading volume (log USD) vs. excess return · Size = buy count
- **Copy:** Whether you weight every buy equally (mean -3.7%, median -11.2%), weight by disclosed dollar size (mean -2.2%, median -10.0%), or test fixed 120-day buy windows (-0.72% mean, +0.07% median across 270 STOCK Act buys), the verdict holds: most lawmakers trail an index fund, while a tiny outlier tail drives the myth. Filter by outcome, party, or chamber, switch to dollar-weighted excess, or click any circle to inspect a lawmaker.
- **Takeaway:** Filter, search, toggle weighting, or click any of the 127 lawmakers.
- **Desktop Labels (5):** Marshall +565% ($0.9M), Whitehouse +473% ($16M), Pelosi +93% ($217M), McCaul -3% ($331M), Mo Brooks -150%
- **Mobile Priority-1 Labels (2):** Marshall +565%, Whitehouse +473%

## Methodology & Cross-Validation

Primary data: Kadoa Congress Trading Monitor (MIT), parsing U.S. House Clerk PTRs and Senate eFD filings (2013–2026) for all 127 unique congressional filers with >=20 priced stock buys (24,442 buys; duplicate House name variants for Rep. C. Scott Franklin merged). Excess return equals cumulative buy-to-latest-close return minus SPY over the identical window (non-annualized); unpriced/delisted tickers are excluded, and options are benchmarked on underlying stock moves. Beat 6 deduplicates amended filings in individual trade logs. Buy-only fixed 120-day cross-check via Hugging Face STOCK Act event study (270 buys: -0.72% mean, +0.07% median, 50.7% beat rate).
