# Data Sources & Provenance Lock

Every raw dataset retained for this essay was downloaded directly from an open, unauthenticated public source and preserved unmodified under `pipeline/data/raw/`. No synthetic, mocked, or extrapolated records were used.

## Primary Winning Dataset — Kadoa Congress Trading Monitor

- **Attribution:** Kadoa (`kadoa-org/congress-trading-monitor`), aggregated from U.S. House Clerk Financial Disclosure PTRs and U.S. Senate eFD STOCK Act filings (2011–2026).
- **License:** MIT License (`https://raw.githubusercontent.com/kadoa-org/congress-trading-monitor/main/LICENSE`).
- **Return Methodology:** Trade-level buy-to-latest-close cumulative return minus S&P 500 (`SPY`) return over the identical calendar holding window (`avg_excess` = equal-weighted across a filer's priced stock buys; `weighted_excess` = midpoint-dollar-weighted; minimum 20 priced buys per filer).

| Local Path | Exact Source URL | UTC Fetch Timestamp | Rows / Records | Columns / Keys | SHA-256 |
| --- | --- | --- | ---: | ---: | --- |
| `pipeline/data/raw/kadoa_returns.json` | https://raw.githubusercontent.com/kadoa-org/congress-trading-monitor/main/public/data/returns.json | 2026-11-24T23:04:17Z | 143 | 12 | `61e10b73e983dc2b60226652c9029f6650a4c99bf928fc7662f79dffd3fda592` |
| `pipeline/data/raw/kadoa_filers.json` | https://raw.githubusercontent.com/kadoa-org/congress-trading-monitor/main/public/data/filers.json | 2026-11-24T23:04:17Z | 454 | 15 | `001f6c77158559ed55ccbc228813e2b53aa49af622a627c0357a91c4b72fef61` |
| `pipeline/data/raw/kadoa_alpha_index.json` | https://raw.githubusercontent.com/kadoa-org/congress-trading-monitor/main/public/data/alpha-index.json | 2026-11-24T23:04:01Z | 5 series | 3 | `7f9dcf65e86126dfda315bfc9854cf27d6a14fb1230974d3700ecfcaaae43370` |
| `pipeline/data/raw/kadoa_stats.json` | https://raw.githubusercontent.com/kadoa-org/congress-trading-monitor/main/public/data/stats.json | 2026-11-24T23:04:17Z | 11 keys | 11 | `7fdf01deaa92233a2344b6e063cec577841272c54f8bc3629ecb92c56d007afb` |
| `pipeline/data/raw/kadoa_filer_house_rogerw_marshall.json` | https://raw.githubusercontent.com/kadoa-org/congress-trading-monitor/main/public/data/filer/house_rogerw_marshall.json | 2026-11-24T23:05:34Z | 83 trades | 27 | `282042d3afe4dc65d2ef3c803e0dfa8129e37dec042a96006b2d45eac3cb0ad6` |
| `pipeline/data/raw/kadoa_filer_senate_sheldon_whitehouse.json` | https://raw.githubusercontent.com/kadoa-org/congress-trading-monitor/main/public/data/filer/senate_sheldon_whitehouse.json | 2026-11-24T23:05:34Z | 1,037 trades | 27 | `7f7de5cf2d246fe07ba0cf85fd77081b61950fe7abe9e17f3a0a7940b1ef1438` |
| `pipeline/data/raw/kadoa_filer_house_barbarajhonorable_comstock.json` | https://raw.githubusercontent.com/kadoa-org/congress-trading-monitor/main/public/data/filer/house_barbarajhonorable_comstock.json | 2026-11-24T23:06:14Z | 34 trades | 27 | `ffd88ec558182d1af4a857a51a2d080c04458e7e902b09220ed3bc32178aa336` |
| `pipeline/data/raw/kadoa_filer_house_nancy_pelosi.json` | https://raw.githubusercontent.com/kadoa-org/congress-trading-monitor/main/public/data/filer/house_nancy_pelosi.json | 2026-11-24T23:05:34Z | 187 trades | 27 | `6b49a1dde660b792229e9bd79ad7eb6b330e1fc6a37abbcd0906ada02bde0d8c` |

## Tournament Runner-Up #2 — Capitol Stock Watch Open Data

- **Attribution:** CapitolStockWatch Research Desk (`MichaelBMiner/capitol-stock-watch-open-data`), parsed from House Clerk PTRs & Senate eFD filings.
- **License:** Creative Commons Attribution 4.0 International (CC BY 4.0).

| Local Path | Exact Source URL | UTC Fetch Timestamp | Rows | Columns | SHA-256 |
| --- | --- | --- | ---: | ---: | --- |
| `pipeline/data/raw/capitol_politicians_directory.csv` | https://www.capitolstockwatch.com/data/open-data/politicians_directory.csv | 2026-11-24T23:04:00Z | 453 | 13 | `581a58d1bc75632e701efb7b3bbaa336b97551e9f637a04dad9eaca48293a2c1` |
| `pipeline/data/raw/capitol_congress_trades_latest.csv` | https://www.capitolstockwatch.com/data/open-data/congress_trades_latest.csv | 2026-11-24T23:04:00Z | 6,411 | 16 | `6340599b0fd3cd79733494b219643a51fcdf12c9a4d42ee09c38b73a4fcbc0e3` |

## Tournament Runner-Up #3 (Fixed-Horizon Robustness Cross-Check) — Hugging Face STOCK Act Event-Study Dataset

- **Attribution:** William T. L. Miller (`williamTLmiller/congress-stock-trades-stock-act-news-patterns` on Hugging Face).
- **License:** Creative Commons Attribution-NonCommercial 4.0 (CC BY-NC 4.0).

| Local Path | Exact Source URL | UTC Fetch Timestamp | Rows | Columns | SHA-256 |
| --- | --- | --- | ---: | ---: | --- |
| `pipeline/data/raw/hf_congress_trades.csv` | https://huggingface.co/datasets/williamTLmiller/congress-stock-trades-stock-act-news-patterns/resolve/main/csv/congress_trades.csv | 2026-11-24T23:04:02Z | 1,000 | 52 | `a8d30ac6e64c922f436300b6fd1c7aff6f972e220d3d9e82372ac91b85c27eec` |
| `pipeline/data/raw/hf_congress_members.csv` | https://huggingface.co/datasets/williamTLmiller/congress-stock-trades-stock-act-news-patterns/resolve/main/csv/congress_members.csv | 2026-11-24T23:04:02Z | 109 | 8 | `e0019873c5642ceacc3b4e84605f580e6fb4c9f1ca30787aa7a65bddd6079656` |
