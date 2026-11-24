"""Phase 0 real-data tournament evaluating public U.S. Congress trading datasets."""

from __future__ import annotations

import csv
import json
import statistics
from dataclasses import dataclass
from pathlib import Path

RAW_DIR = Path(__file__).resolve().parent.parent / "data" / "raw"


@dataclass(frozen=True)
class CandidateScore:
    name: str
    entities: int
    records: int
    surprise_score: float
    granularity_score: float
    completeness_score: float
    key_finding: str

    @property
    def total(self) -> float:
        return round(self.surprise_score + self.granularity_score + self.completeness_score, 1)


def score_capitol_stock_watch() -> CandidateScore:
    with (RAW_DIR / "capitol_politicians_directory.csv").open(newline="", encoding="utf-8") as f:
        pol_rows = list(csv.DictReader(f))
    with (RAW_DIR / "capitol_congress_trades_latest.csv").open(newline="", encoding="utf-8") as f:
        trade_rows = list(csv.DictReader(f))

    congress_rows = [
        r
        for r in pol_rows
        if r.get("chamber") in ("house", "senate") and r.get("avg_return_pct") not in ("", None)
    ]
    returns = [float(r["avg_return_pct"]) for r in congress_rows]
    mean_ret = statistics.mean(returns)
    median_ret = statistics.median(returns)
    missing_party = sum(1 for r in congress_rows if not r.get("party"))
    completeness_ratio = 1.0 - (missing_party / max(1, len(congress_rows)))

    # Strong skew, 297 entities, but lacks direct per-lawmaker S&P 500 excess return benchmark.
    return CandidateScore(
        name="Capitol Stock Watch Open Data (CC BY 4.0)",
        entities=len(congress_rows),
        records=len(trade_rows),
        surprise_score=24.0,  # out of 40: raw return skew only, no S&P 500 excess column
        granularity_score=28.0,  # out of 30: 297 House/Senate lawmakers
        completeness_score=round(22.0 * completeness_ratio, 1),  # out of 30: no SPY alpha
        key_finding=(
            f"{len(congress_rows)} lawmakers; raw avg return {mean_ret:.1f}% vs median "
            f"{median_ret:.1f}%, but no S&P 500 excess-return benchmark column."
        ),
    )


def score_kadoa_congress_monitor() -> CandidateScore:
    returns_data = json.loads((RAW_DIR / "kadoa_returns.json").read_text(encoding="utf-8"))
    filers_data = json.loads((RAW_DIR / "kadoa_filers.json").read_text(encoding="utf-8"))
    filer_map = {f["id"]: f for f in filers_data}

    congress = [r for r in returns_data if r.get("branch") == "congress"]
    excess = [float(r["avg_excess"]) for r in congress]
    total_scored_buys = sum(int(r["scored_buys"]) for r in congress)
    beat_count = sum(1 for x in excess if x > 0)
    beat_pct = 100.0 * beat_count / len(excess)
    mean_ex = statistics.mean(excess)
    median_ex = statistics.median(excess)

    sorted_ex = sorted(excess, reverse=True)
    mean_ex_top3 = statistics.mean(sorted_ex[3:])

    complete_rows = sum(
        1
        for r in congress
        if r.get("party")
        and r.get("state")
        and r.get("chamber")
        and r.get("avg_excess") is not None
        and r.get("weighted_excess") is not None
        and r["id"] in filer_map
    )
    completeness_ratio = complete_rows / len(congress)

    return CandidateScore(
        name="Kadoa Congress Trading Monitor (MIT)",
        entities=len(congress),
        records=total_scored_buys,
        surprise_score=39.0,  # out of 40: direct SPY excess return + extreme outlier reversal
        granularity_score=30.0,  # out of 30: 128 persistent lawmakers (>=20 priced buys each)
        completeness_score=round(30.0 * completeness_ratio, 1),  # out of 30: 100% complete
        key_finding=(
            f"{len(congress)} lawmakers ({total_scored_buys:,} priced buys, 2013-2026): only "
            f"{beat_count}/{len(congress)} ({beat_pct:.1f}%) beat S&P 500; mean {mean_ex:+.2f}% "
            f"vs median {median_ex:+.2f}%; dropping top 3 cuts mean to {mean_ex_top3:+.2f}%."
        ),
    )


def score_hf_stock_act_returns() -> CandidateScore:
    with (RAW_DIR / "hf_congress_trades.csv").open(newline="", encoding="utf-8") as f:
        trade_rows = list(csv.DictReader(f))
    with (RAW_DIR / "hf_congress_members.csv").open(newline="", encoding="utf-8") as f:
        member_rows = list(csv.DictReader(f))

    fwd120 = [
        float(r["excess_fwd_120d"]) * 100.0
        for r in trade_rows
        if r.get("direction") == "buy" and r.get("excess_fwd_120d") not in ("", None)
    ]
    mean_120 = statistics.mean(fwd120)
    median_120 = statistics.median(fwd120)
    buy_rows = sum(1 for r in trade_rows if r.get("direction") == "buy")
    completeness_ratio = len(fwd120) / max(1, buy_rows)

    return CandidateScore(
        name="HF STOCK Act Event-Study Trades (CC BY-NC 4.0)",
        entities=len(member_rows),
        records=len(trade_rows),
        surprise_score=30.0,  # out of 40: confirms zero fixed-horizon buy alpha (-0.72% at 120d)
        granularity_score=20.0,  # out of 30: only 1,000 sampled trades across 109 members
        completeness_score=round(30.0 * completeness_ratio, 1),  # ~49.8% of buys have 120d excess
        key_finding=(
            f"{buy_rows} buys ({len(fwd120)} priced at 120d): mean {mean_120:+.2f}%, "
            f"median {median_120:+.2f}%; valuable buy-only robustness cross-check."
        ),
    )


def main() -> None:
    candidates = [
        score_capitol_stock_watch(),
        score_kadoa_congress_monitor(),
        score_hf_stock_act_returns(),
    ]
    ranked = sorted(candidates, key=lambda c: c.total, reverse=True)

    print("=== Phase 0 Real-Data Tournament Results ===")
    header = (
        f"{'Rank':<5} {'Candidate':<46} {'Ent':>5} {'Recs':>8} "
        f"{'Surp':>5} {'Gran':>5} {'Comp':>5} {'Total':>6}"
    )
    print(header)
    print("-" * len(header))
    for idx, c in enumerate(ranked, start=1):
        print(
            f"{idx:<5} {c.name:<46} {c.entities:>5} {c.records:>8,} "
            f"{c.surprise_score:>5.1f} {c.granularity_score:>5.1f} "
            f"{c.completeness_score:>5.1f} {c.total:>6.1f}"
        )
        print(f"      Finding: {c.key_finding}")

    winner = ranked[0]
    print(f"\nWINNER: {winner.name} ({winner.total:.1f}/100)")


if __name__ == "__main__":
    main()
