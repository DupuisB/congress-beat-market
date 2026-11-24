"""Emit STORYBOARD.md, story.json, story.schema.json, and manifest.json from real STOCK Act data."""

from __future__ import annotations

import csv
import json
import math
import statistics
from dataclasses import dataclass
from pathlib import Path

from src.schema import (
    Annotation,
    AxisTick,
    Beat,
    ChamberCode,
    EntityState,
    GuideLine,
    LaneHeader,
    PartyCode,
    PointPosition,
    StoryData,
    SuperstarProfile,
    TextSegment,
    Tone,
    ViewBox,
    ViewBoxes,
    build_manifest,
)

REPO_ROOT = Path(__file__).resolve().parent.parent.parent
RAW_DIR = REPO_ROOT / "pipeline" / "data" / "raw"
DATA_DIR = REPO_ROOT / "web" / "public" / "data"
STORYBOARD_PATH = REPO_ROOT / "STORYBOARD.md"

DESKTOP_W, DESKTOP_H = 800, 500
MOBILE_W, MOBILE_H = 360, 360

# Rep. C. Scott Franklin (Bioguide F000472) appears twice in raw kadoa_returns.json under
# two House Clerk name variants; merge into his canonical ID before analysis.
DUPLICATE_ID_MERGE: dict[str, str] = {
    "house_scottscott_franklin": "house_cscott_franklin",
}

CLEAN_NAME_OVERRIDES: dict[str, str] = {
    "house_cscott_franklin": "C. Scott Franklin",
    "senate_jerry_moran": "Jerry Moran",
    "house_nealpatrickmdfacs_dunn": "Neal P. Dunn",
    "house_barbarajhonorable_comstock": "Barbara Comstock",
    "house_rogerw_marshall": "Roger Marshall",
    "senate_sheldon_whitehouse": "Sheldon Whitehouse",
    "house_nancy_pelosi": "Nancy Pelosi",
    "house_rohit_khanna": "Ro Khanna",
    "house_josh_gottheimer": "Josh Gottheimer",
    "house_michaelt_mccaul": "Michael McCaul",
    "senate_thomash_tuberville": "Tommy Tuberville",
    "house_suzank_delbene": "Suzan DelBene",
    "senate_ronl_wyden": "Ron Wyden",
    "senate_johnf_reed": "Jack Reed",
    "house_thomas_suozzi": "Tom Suozzi",
    "house_mo_brooks": "Mo Brooks",
    "house_brian_mast": "Brian Mast",
    "house_virginia_foxx": "Virginia Foxx",
    "senate_anguss_kingjr": "Angus King",
    "house_rubn_hinojosa": "Rubén Hinojosa",
    "house_marjorietaylor_greene": "Marjorie Taylor Greene",
    "house_markdr_green": "Mark Green",
    "house_thomasj_rooney": "Thomas Rooney",
}


@dataclass(frozen=True)
class Lawmaker:
    id: str
    full_name: str
    display_name: str
    party: PartyCode
    chamber: ChamberCode
    state: str
    scored_buys: int
    avg_excess: float
    weighted_excess: float
    avg_ret: float
    est_volume_usd: float
    late_filings: int


def load_lawmakers() -> list[Lawmaker]:
    returns_raw = json.loads((RAW_DIR / "kadoa_returns.json").read_text(encoding="utf-8"))
    filers_raw = json.loads((RAW_DIR / "kadoa_filers.json").read_text(encoding="utf-8"))
    filer_map = {str(f["id"]): f for f in filers_raw}

    grouped: dict[str, list[dict[str, object]]] = {}
    for row in returns_raw:
        if row.get("branch") != "congress":
            continue
        raw_id = str(row["id"])
        canonical_id = DUPLICATE_ID_MERGE.get(raw_id, raw_id)
        grouped.setdefault(canonical_id, []).append(row)

    lawmakers: list[Lawmaker] = []
    for lid, rows in grouped.items():
        primary = next((r for r in rows if str(r["id"]) == lid), rows[0])
        party_str = str(primary["party"])
        chamber_str = str(primary["chamber"])
        party: PartyCode = "D" if party_str == "D" else ("R" if party_str == "R" else "I")
        chamber: ChamberCode = "senate" if chamber_str == "senate" else "house"

        total_buys = sum(int(str(r["scored_buys"])) for r in rows)
        avg_excess = (
            sum(float(str(r["avg_excess"])) * int(str(r["scored_buys"])) for r in rows) / total_buys
        )
        avg_ret = (
            sum(float(str(r["avg_ret"])) * int(str(r["scored_buys"])) for r in rows) / total_buys
        )
        est_vol_total = sum(float(filer_map[str(r["id"])].get("est_volume") or 0.0) for r in rows)
        if est_vol_total > 0.0:
            weighted_excess = (
                sum(
                    float(str(r["weighted_excess"]))
                    * float(filer_map[str(r["id"])].get("est_volume") or 0.0)
                    for r in rows
                )
                / est_vol_total
            )
        else:
            weighted_excess = (
                sum(float(str(r["weighted_excess"])) * int(str(r["scored_buys"])) for r in rows)
                / total_buys
            )
        late_total = sum(int(filer_map[str(r["id"])].get("late_filings") or 0) for r in rows)
        full_name = str(primary["full_name"]).strip().rstrip(",")
        display_name = CLEAN_NAME_OVERRIDES.get(lid, full_name)

        lawmakers.append(
            Lawmaker(
                id=lid,
                full_name=full_name,
                display_name=display_name,
                party=party,
                chamber=chamber,
                state=str(primary["state"]),
                scored_buys=total_buys,
                avg_excess=avg_excess,
                weighted_excess=weighted_excess,
                avg_ret=avg_ret,
                est_volume_usd=est_vol_total,
                late_filings=late_total,
            )
        )

    lawmakers.sort(key=lambda m: m.avg_excess)
    return lawmakers


@dataclass(frozen=True)
class SuperstarAudit:
    unique_buys: int
    raw_buys: int
    dedup_mean: float
    raw_mean: float
    dedup_median: float
    dedup_win_rate: float
    unique_nvda: int
    raw_nvda: int
    ex_nvda_mean: float
    driver: str


def load_superstar_stats(entity_id: str) -> SuperstarAudit:
    file_map = {
        "house_rogerw_marshall": (
            "kadoa_filer_house_rogerw_marshall.json",
            "2017 NVDA (+6,000%) & AMD (+3,173%) buys",
        ),
        "senate_sheldon_whitehouse": (
            "kadoa_filer_senate_sheldon_whitehouse.json",
            "10 unique NVDA buys (duped to 14 in raw feed)",
        ),
        "house_barbarajhonorable_comstock": (
            "kadoa_filer_house_barbarajhonorable_comstock.json",
            "2016–18 MU (+942%), AAPL (+888%) & PANW buys",
        ),
        "house_nancy_pelosi": (
            "kadoa_filer_house_nancy_pelosi.json",
            "2014 AVGO (+3,355%) & 2016 AAPL (+1,158%) buys",
        ),
    }
    filename, driver = file_map[entity_id]
    payload = json.loads((RAW_DIR / filename).read_text(encoding="utf-8"))
    raw_buys = [
        t
        for t in payload["trades"]
        if "purchase" in str(t.get("transaction_type") or "").lower()
        and t.get("excess_since") is not None
    ]

    # Deduplicate identical trades re-reported across original & amended filings.
    dedup: dict[tuple[object, ...], dict[str, object]] = {}
    for t in raw_buys:
        key = (
            t.get("transaction_date"),
            t.get("owner"),
            t.get("ticker"),
            t.get("transaction_type"),
            t.get("amount_range_low"),
            t.get("amount_range_high"),
        )
        if key not in dedup or str(t.get("filing_date") or "") >= str(
            dedup[key].get("filing_date") or ""
        ):
            dedup[key] = t

    unique_list = list(dedup.values())
    raw_vals = [float(t["excess_since"]) for t in raw_buys]
    uniq_vals = [float(str(t["excess_since"])) for t in unique_list]
    no_nvda = [float(str(t["excess_since"])) for t in unique_list if t.get("ticker") != "NVDA"]
    win_rate = 100.0 * sum(1 for v in uniq_vals if v > 0.0) / len(uniq_vals)

    return SuperstarAudit(
        unique_buys=len(unique_list),
        raw_buys=len(raw_buys),
        dedup_mean=statistics.mean(uniq_vals),
        raw_mean=statistics.mean(raw_vals),
        dedup_median=statistics.median(uniq_vals),
        dedup_win_rate=win_rate,
        unique_nvda=sum(1 for t in unique_list if t.get("ticker") == "NVDA"),
        raw_nvda=sum(1 for t in raw_buys if t.get("ticker") == "NVDA"),
        ex_nvda_mean=statistics.mean(no_nvda) if no_nvda else 0.0,
        driver=driver,
    )


def load_hf_buy_robustness() -> tuple[int, float, float, float]:
    """Buy-only fixed 120-day forward excess return from HF STOCK Act event study."""
    with (RAW_DIR / "hf_congress_trades.csv").open(newline="", encoding="utf-8") as f:
        rows = list(csv.DictReader(f))
    vals = [
        float(r["excess_fwd_120d"]) * 100.0
        for r in rows
        if r.get("direction") == "buy" and r.get("excess_fwd_120d") not in ("", None)
    ]
    beat_pct = 100.0 * sum(1 for v in vals if v > 0.0) / len(vals)
    return len(vals), statistics.mean(vals), statistics.median(vals), beat_pct


def lin_scale(v: float, d0: float, d1: float, r0: float, r1: float) -> float:
    clamped = max(d0, min(d1, v))
    t = (clamped - d0) / (d1 - d0)
    return r0 + t * (r1 - r0)


def symlog_transform(v: float, linthresh: float = 55.0) -> float:
    return math.asinh(v / linthresh)


def symlog_scale(
    v: float,
    d0: float,
    d1: float,
    r0: float,
    r1: float,
    linthresh: float = 55.0,
) -> float:
    t0 = symlog_transform(d0, linthresh)
    t1 = symlog_transform(d1, linthresh)
    tv = symlog_transform(max(d0, min(d1, v)), linthresh)
    return r0 + ((tv - t0) / (t1 - t0)) * (r1 - r0)


def log_scale(v: float, d0: float, d1: float, r0: float, r1: float) -> float:
    clamped = max(d0, min(d1, v))
    t = (math.log10(clamped) - math.log10(d0)) / (math.log10(d1) - math.log10(d0))
    return r0 + t * (r1 - r0)


def beeswarm_1d(
    items: list[tuple[str, float, float]],
    center_y: float,
    y_min: float,
    y_max: float,
    pad: float = 1.4,
) -> dict[str, PointPosition]:
    """Deterministic greedy beeswarm placing circles along exact x with minimal y offset."""
    placed: list[tuple[float, float, float]] = []
    positions: dict[str, PointPosition] = {}
    ordered = sorted(items, key=lambda it: (it[1], it[0]))

    for item_id, x, radius in ordered:
        best_y = center_y
        candidates = [center_y]
        for px, py, pr in placed:
            min_dist = radius + pr + pad
            dx = x - px
            if abs(dx) < min_dist:
                dy = math.sqrt(max(0.0, min_dist * min_dist - dx * dx))
                candidates.append(py - dy - 0.05)
                candidates.append(py + dy + 0.05)

        candidates.sort(key=lambda cy: abs(cy - center_y))
        chosen = None
        for cy in candidates:
            if cy < y_min or cy > y_max:
                continue
            collides = False
            for px, py, pr in placed:
                min_dist = radius + pr + pad
                if (x - px) ** 2 + (cy - py) ** 2 < (min_dist - 0.05) ** 2:
                    collides = True
                    break
            if not collides:
                chosen = cy
                break

        if chosen is None:
            steps = 40
            best_score = float("inf")
            for s in range(steps + 1):
                cy = y_min + (y_max - y_min) * (s / steps)
                overlap = 0.0
                for px, py, pr in placed:
                    min_dist = radius + pr + pad
                    d = math.hypot(x - px, cy - py)
                    if d < min_dist:
                        overlap += min_dist - d
                score = overlap * 1000.0 + abs(cy - center_y)
                if score < best_score:
                    best_score = score
                    best_y = cy
            chosen = best_y

        placed.append((x, chosen, radius))
        positions[item_id] = PointPosition(x=round(x, 1), y=round(chosen, 1))

    return positions


def make_entity(
    m: Lawmaker,
    radius: float,
    tone: Tone,
    opacity: float,
    desktop: PointPosition,
    mobile: PointPosition,
    desktop_alt: PointPosition | None = None,
    mobile_alt: PointPosition | None = None,
) -> EntityState:
    category = "beat" if m.avg_excess > 0.0 else "trail"
    return EntityState(
        id=m.id,
        label=m.display_name,
        category=category,
        value=round(m.avg_excess, 2),
        radius=radius,
        tone=tone,
        opacity=opacity,
        desktop=desktop,
        mobile=mobile,
        party=m.party,
        chamber=m.chamber,
        state=m.state,
        scoredBuys=m.scored_buys,
        avgExcess=round(m.avg_excess, 2),
        weightedExcess=round(m.weighted_excess, 2),
        avgRet=round(m.avg_ret, 2),
        estVolumeUsd=round(m.est_volume_usd, 0),
        desktopAlt=desktop_alt,
        mobileAlt=mobile_alt,
    )


def build_story() -> tuple[StoryData, dict[str, object]]:
    lawmakers = load_lawmakers()
    by_id = {m.id: m for m in lawmakers}
    n_total = len(lawmakers)
    total_buys = sum(m.scored_buys for m in lawmakers)

    beat_list = [m for m in lawmakers if m.avg_excess > 0.0]
    trail_list = [m for m in lawmakers if m.avg_excess <= 0.0]
    n_beat = len(beat_list)
    n_trail = len(trail_list)
    beat_pct = 100.0 * n_beat / n_total
    trail_pct = 100.0 * n_trail / n_total

    mean_all = statistics.mean(m.avg_excess for m in lawmakers)
    median_all = statistics.median(m.avg_excess for m in lawmakers)
    mean_weighted = statistics.mean(m.weighted_excess for m in lawmakers)
    median_weighted = statistics.median(m.weighted_excess for m in lawmakers)

    sorted_desc = sorted(lawmakers, key=lambda m: m.avg_excess, reverse=True)
    top3_ids = {m.id for m in sorted_desc[:3]}
    rest_n = sorted_desc[3:]
    mean_ex_top3 = statistics.mean(m.avg_excess for m in rest_n)
    median_ex_top3 = statistics.median(m.avg_excess for m in rest_n)
    mean_drop_pp = mean_all - mean_ex_top3
    pos_sum = sum(m.avg_excess for m in beat_list)
    top3_pos_share = 100.0 * sum(m.avg_excess for m in sorted_desc[:3]) / pos_sum

    senators = [m for m in lawmakers if m.chamber == "senate"]
    house = [m for m in lawmakers if m.chamber == "house"]
    dems = [m for m in lawmakers if m.party == "D"]
    reps = [m for m in lawmakers if m.party == "R"]
    sen_beat = sum(1 for m in senators if m.avg_excess > 0.0)
    sen_mean = statistics.mean(m.avg_excess for m in senators)
    sen_median = statistics.median(m.avg_excess for m in senators)
    sen_no_wh = [m for m in senators if m.id != "senate_sheldon_whitehouse"]
    sen_no_wh_mean = statistics.mean(m.avg_excess for m in sen_no_wh)

    dem_beat = sum(1 for m in dems if m.avg_excess > 0.0)
    rep_beat = sum(1 for m in reps if m.avg_excess > 0.0)
    dem_mean = statistics.mean(m.avg_excess for m in dems)
    rep_mean = statistics.mean(m.avg_excess for m in reps)
    dem_median = statistics.median(m.avg_excess for m in dems)
    rep_median = statistics.median(m.avg_excess for m in reps)
    dem_no_wh_mean = statistics.mean(
        m.avg_excess for m in dems if m.id != "senate_sheldon_whitehouse"
    )
    house_d = [m for m in house if m.party == "D"]
    house_r = [m for m in house if m.party == "R"]
    house_d_mean = statistics.mean(m.avg_excess for m in house_d)
    house_r_mean = statistics.mean(m.avg_excess for m in house_r)

    heavy = [m for m in lawmakers if m.scored_buys >= 200]
    light = [m for m in lawmakers if m.scored_buys < 200]
    heavy_beat = sum(1 for m in heavy if m.avg_excess > 0.0)
    heavy_beat_pct = 100.0 * heavy_beat / len(heavy)
    light_beat = sum(1 for m in light if m.avg_excess > 0.0)
    light_beat_pct = 100.0 * light_beat / len(light)
    xs_log = [math.log10(m.scored_buys) for m in lawmakers]
    ys_ex = [m.avg_excess for m in lawmakers]
    mx, my = statistics.mean(xs_log), statistics.mean(ys_ex)
    pearson_r = sum((x - mx) * (y - my) for x, y in zip(xs_log, ys_ex, strict=True)) / math.sqrt(
        sum((x - mx) ** 2 for x in xs_log) * sum((y - my) ** 2 for y in ys_ex)
    )

    hf_n, hf_mean, hf_med, hf_beat = load_hf_buy_robustness()

    superstar_order = [
        "house_rogerw_marshall",
        "senate_sheldon_whitehouse",
        "house_barbarajhonorable_comstock",
        "house_nancy_pelosi",
    ]
    superstar_audits: dict[str, SuperstarAudit] = {
        eid: load_superstar_stats(eid) for eid in superstar_order
    }
    wh = superstar_audits["senate_sheldon_whitehouse"]
    pel = superstar_audits["house_nancy_pelosi"]
    mar = superstar_audits["house_rogerw_marshall"]
    com = superstar_audits["house_barbarajhonorable_comstock"]

    # =========================================================================
    # BEAT 0 — The 7-in-10 Verdict (Ordered Waffle Grid Split)
    # =========================================================================
    trail_sorted = sorted(trail_list, key=lambda m: m.avg_excess)
    beat_sorted = sorted(beat_list, key=lambda m: m.avg_excess)

    b0_entities: list[EntityState] = []
    # Left grid: 88 trailed S&P (9 cols x 10 rows)
    for idx, m in enumerate(trail_sorted):
        col = idx % 9
        row = idx // 9
        dx = 96.0 + col * 30.0
        dy = 398.0 - row * 28.0
        mx_pos = 34.0 + col * 18.0
        my_pos = 292.0 - row * 18.0
        is_mo = m.id == "house_mo_brooks"
        b0_entities.append(
            make_entity(
                m=m,
                radius=8.5 if not is_mo else 9.5,
                tone="secondary" if is_mo else "neutral",
                opacity=0.95 if is_mo else 0.78,
                desktop=PointPosition(x=dx, y=dy),
                mobile=PointPosition(x=mx_pos, y=my_pos),
            )
        )
    # Right grid: 39 beat S&P (4 cols x 10 rows, highest outliers at top)
    for idx, m in enumerate(beat_sorted):
        col = idx % 4
        row = idx // 4
        dx = 478.0 + col * 32.0
        dy = 398.0 - row * 28.0
        mx_pos = 236.0 + col * 20.0
        my_pos = 292.0 - row * 18.0
        is_top3 = m.id in top3_ids
        b0_entities.append(
            make_entity(
                m=m,
                radius=9.5 if is_top3 else 8.5,
                tone="accent",
                opacity=1.0 if is_top3 else 0.85,
                desktop=PointPosition(x=dx, y=dy),
                mobile=PointPosition(x=mx_pos, y=my_pos),
            )
        )
    b0_map = {e.id: e for e in b0_entities}
    b0_entities_ordered = [b0_map[m.id] for m in lawmakers]

    beat0 = Beat(
        id="beat-01-scorecard",
        index=0,
        kicker="01 / The Scorecard",
        headline="Nearly 7 in 10 trading lawmakers lost to the S&P 500.",
        bodySegments=[
            TextSegment(
                text=(
                    f"Across {total_buys:,} priced stock purchases by {n_total} unique active "
                    "lawmakers (2013–2026), each buy is scored cumulatively from trade date "
                    "to latest close minus the S&P 500 (non-annualized). By that yardstick, "
                )
            ),
            TextSegment(
                text=f"{n_trail} lawmakers ({trail_pct:.1f}%) trailed the S&P 500",
                tone="secondary",
            ),
            TextSegment(text=", while only "),
            TextSegment(
                text=f"{n_beat} ({beat_pct:.1f}%) beat it",
                tone="accent",
            ),
            TextSegment(
                text=(
                    f" — leaving the median trading member {abs(median_all):.1f} "
                    "percentage points behind a boring index fund."
                )
            ),
        ],
        takeaway=(
            f"Of {n_total} lawmakers, {n_trail} ({trail_pct:.1f}%) trailed SPY; "
            f"median cumulative excess is {median_all:+.1f}%."
        ),
        chartSubtitle="Each circle = 1 lawmaker (>=20 priced stock buys, 2013–2026)",
        layoutType="waffle-split",
        guides=[
            GuideLine(
                id="b0-divider",
                orientation="vertical",
                style="zero",
                desktopStart=PointPosition(x=410, y=94),
                desktopEnd=PointPosition(x=410, y=424),
                mobileStart=PointPosition(x=208, y=72),
                mobileEnd=PointPosition(x=208, y=312),
                label="S&P 500 (0%)",
                mobileLabel="S&P 500",
                desktopLabelPos=PointPosition(x=410, y=78),
                mobileLabelPos=PointPosition(x=208, y=54),
                labelAnchor="middle",
            ),
        ],
        laneHeaders=[
            LaneHeader(
                id="b0-hdr-trail",
                text=f"TRAILED S&P 500 · {n_trail} ({trail_pct:.1f}%)",
                mobileText=f"TRAILED · {n_trail} (69%)",
                desktop=PointPosition(x=96, y=106),
                mobile=PointPosition(x=28, y=82),
                anchor="start",
                tone="neutral",
            ),
            LaneHeader(
                id="b0-hdr-beat",
                text=f"BEAT S&P 500 · {n_beat} ({beat_pct:.1f}%)",
                mobileText=f"BEAT · {n_beat} (31%)",
                desktop=PointPosition(x=478, y=106),
                mobile=PointPosition(x=226, y=82),
                anchor="start",
                tone="accent",
            ),
        ],
        entities=b0_entities_ordered,
        annotations=[
            Annotation(
                id="b0-ann-marshall",
                entityId="house_rogerw_marshall",
                text=f"Marshall ({by_id['house_rogerw_marshall'].avg_excess:+.0f}%)",
                mobileText="Marshall +565%",
                priority=1,
                desktop=PointPosition(x=622, y=132),
                mobile=PointPosition(x=340, y=106),
                anchor="start",
                mobileAnchor="end",
            ),
            Annotation(
                id="b0-ann-whitehouse",
                entityId="senate_sheldon_whitehouse",
                text=f"Whitehouse ({by_id['senate_sheldon_whitehouse'].avg_excess:+.0f}%)",
                priority=2,
                desktop=PointPosition(x=622, y=170),
                mobile=PointPosition(x=340, y=140),
                anchor="start",
            ),
            Annotation(
                id="b0-ann-pelosi",
                entityId="house_nancy_pelosi",
                text=f"Pelosi ({by_id['house_nancy_pelosi'].avg_excess:+.0f}%)",
                priority=2,
                desktop=PointPosition(x=622, y=224),
                mobile=PointPosition(x=340, y=180),
                anchor="start",
            ),
            Annotation(
                id="b0-ann-brooks",
                entityId="house_mo_brooks",
                text=f"Mo Brooks ({by_id['house_mo_brooks'].avg_excess:+.0f}%)",
                mobileText="Brooks -150%",
                priority=1,
                desktop=PointPosition(x=96, y=444),
                mobile=PointPosition(x=30, y=332),
                anchor="start",
                mobileAnchor="start",
            ),
        ],
    )

    # =========================================================================
    # BEAT 1 — The Long Right Tail (Full-Scale Linear Beeswarm: -160% to +600%)
    # =========================================================================
    b1_d_items: list[tuple[str, float, float]] = []
    b1_m_items: list[tuple[str, float, float]] = []
    for m in lawmakers:
        r_d = 7.5 if m.id in top3_ids else (6.5 if m.id == "house_nancy_pelosi" else 5.0)
        r_m = 5.5 if m.id in top3_ids else 3.6
        b1_d_items.append((m.id, lin_scale(m.avg_excess, -160.0, 600.0, 64.0, 736.0), r_d))
        b1_m_items.append((m.id, lin_scale(m.avg_excess, -160.0, 600.0, 28.0, 332.0), r_m))

    b1_d_pos = beeswarm_1d(b1_d_items, center_y=265.0, y_min=118.0, y_max=405.0, pad=1.3)
    b1_m_pos = beeswarm_1d(b1_m_items, center_y=192.0, y_min=95.0, y_max=292.0, pad=1.0)

    b1_entities = [
        make_entity(
            m=m,
            radius=7.5 if m.id in top3_ids else (6.0 if m.id == "house_nancy_pelosi" else 5.0),
            tone=(
                "accent"
                if m.id in top3_ids
                else ("secondary" if m.id == "house_nancy_pelosi" else "neutral")
            ),
            opacity=1.0 if (m.id in top3_ids or m.id == "house_nancy_pelosi") else 0.72,
            desktop=b1_d_pos[m.id],
            mobile=b1_m_pos[m.id],
        )
        for m in lawmakers
    ]

    b1_zero_d = round(lin_scale(0.0, -160.0, 600.0, 64.0, 736.0), 1)
    b1_zero_m = round(lin_scale(0.0, -160.0, 600.0, 28.0, 332.0), 1)
    b1_med_d = round(lin_scale(median_all, -160.0, 600.0, 64.0, 736.0), 1)
    b1_med_m = round(lin_scale(median_all, -160.0, 600.0, 28.0, 332.0), 1)

    beat1 = Beat(
        id="beat-02-skew",
        index=1,
        kicker="02 / The Skew",
        headline="Three extreme outliers stretch the entire distribution to the right.",
        bodySegments=[
            TextSegment(
                text=(
                    f"Line all {n_total} lawmakers up on a true linear scale of cumulative "
                    "excess return and the distortion jumps off the page. Nearly every member "
                    "sits packed near zero or below, while "
                )
            ),
            TextSegment(
                text="just three outliers (Marshall, Whitehouse, and Comstock)",
                tone="accent",
            ),
            TextSegment(
                text=(
                    f" account for {top3_pos_share:.1f}% of all positive excess-return points "
                    f"in Congress — pulling the mean ({mean_all:+.1f}%) far above the "
                    f"median ({median_all:+.1f}%)."
                )
            ),
        ],
        takeaway=(
            f"Top 3 outliers (2.4% of Congress) hold {top3_pos_share:.1f}% of all positive "
            "excess-return points."
        ),
        chartSubtitle="Average cumulative excess return vs. S&P 500 (linear scale, %)",
        layoutType="beeswarm-skew",
        guides=[
            GuideLine(
                id="b1-zero",
                orientation="vertical",
                style="zero",
                desktopStart=PointPosition(x=b1_zero_d, y=94),
                desktopEnd=PointPosition(x=b1_zero_d, y=424),
                mobileStart=PointPosition(x=b1_zero_m, y=74),
                mobileEnd=PointPosition(x=b1_zero_m, y=306),
                label="S&P 500 (0%)",
                mobileLabel="0%",
                desktopLabelPos=PointPosition(x=b1_zero_d + 6, y=82),
                mobileLabelPos=PointPosition(x=b1_zero_m + 6, y=62),
                labelAnchor="start",
            ),
            GuideLine(
                id="b1-median",
                orientation="vertical",
                style="median",
                desktopStart=PointPosition(x=b1_med_d, y=108),
                desktopEnd=PointPosition(x=b1_med_d, y=424),
                mobileStart=PointPosition(x=b1_med_m, y=86),
                mobileEnd=PointPosition(x=b1_med_m, y=306),
                label=f"Median {median_all:+.1f}%",
                mobileLabel=f"Med {median_all:+.0f}%",
                desktopLabelPos=PointPosition(x=b1_med_d - 6, y=104),
                mobileLabelPos=PointPosition(x=b1_med_m - 4, y=82),
                labelAnchor="end",
            ),
        ],
        axisTicks=[
            AxisTick(
                id=f"b1-t-{val}",
                text=f"{val:+d}%" if val != 0 else "0%",
                mobileText=f"{val:+d}%" if val != 0 else "0%",
                desktop=PointPosition(
                    x=round(lin_scale(float(val), -160.0, 600.0, 64.0, 736.0), 1),
                    y=446.0,
                ),
                mobile=PointPosition(
                    x=round(lin_scale(float(val), -160.0, 600.0, 28.0, 332.0), 1),
                    y=328.0,
                ),
                showOnMobile=val in (-150, 0, 300, 600),
            )
            for val in (-150, 0, 150, 300, 450, 600)
        ],
        entities=b1_entities,
        annotations=[
            Annotation(
                id="b1-ann-marshall",
                entityId="house_rogerw_marshall",
                text=f"Marshall {by_id['house_rogerw_marshall'].avg_excess:+.0f}%",
                mobileText="Marshall +565%",
                priority=1,
                desktop=PointPosition(x=736, y=184),
                mobile=PointPosition(x=340, y=118),
                anchor="end",
                mobileAnchor="end",
            ),
            Annotation(
                id="b1-ann-whitehouse",
                entityId="senate_sheldon_whitehouse",
                text=f"Whitehouse {by_id['senate_sheldon_whitehouse'].avg_excess:+.0f}%",
                mobileText="Whitehouse +473%",
                priority=1,
                desktop=PointPosition(x=622, y=346),
                mobile=PointPosition(x=320, y=268),
                anchor="middle",
                mobileAnchor="end",
            ),
            Annotation(
                id="b1-ann-comstock",
                entityId="house_barbarajhonorable_comstock",
                text=f"Comstock {by_id['house_barbarajhonorable_comstock'].avg_excess:+.0f}%",
                priority=2,
                desktop=PointPosition(x=408, y=186),
                mobile=PointPosition(x=200, y=132),
                anchor="middle",
            ),
            Annotation(
                id="b1-ann-pelosi",
                entityId="house_nancy_pelosi",
                text=f"Pelosi {by_id['house_nancy_pelosi'].avg_excess:+.0f}%",
                priority=2,
                desktop=PointPosition(x=312, y=132),
                mobile=PointPosition(x=160, y=110),
                anchor="start",
            ),
            Annotation(
                id="b1-ann-brooks",
                entityId="house_mo_brooks",
                text=f"Mo Brooks {by_id['house_mo_brooks'].avg_excess:+.0f}%",
                priority=3,
                desktop=PointPosition(x=68, y=378),
                mobile=PointPosition(x=30, y=282),
                anchor="start",
            ),
        ],
    )

    # =========================================================================
    # BEAT 2 — Pull 3 Pins, Watch the Average Plunge (Trimmed Zoom: -160% to +160%)
    # =========================================================================
    b2_d_items: list[tuple[str, float, float]] = []
    b2_m_items: list[tuple[str, float, float]] = []
    for m in rest_n:
        r_d = 6.5 if m.id in ("house_nancy_pelosi", "house_thomas_suozzi") else 5.2
        r_m = 4.6 if m.id == "house_nancy_pelosi" else 3.8
        b2_d_items.append((m.id, lin_scale(m.avg_excess, -160.0, 160.0, 64.0, 628.0), r_d))
        b2_m_items.append((m.id, lin_scale(m.avg_excess, -160.0, 160.0, 28.0, 290.0), r_m))

    b2_d_pos = beeswarm_1d(b2_d_items, center_y=272.0, y_min=132.0, y_max=408.0, pad=1.6)
    b2_m_pos = beeswarm_1d(b2_m_items, center_y=198.0, y_min=104.0, y_max=290.0, pad=1.2)

    parked_order = [
        "house_rogerw_marshall",
        "senate_sheldon_whitehouse",
        "house_barbarajhonorable_comstock",
    ]
    for idx, pid in enumerate(parked_order):
        b2_d_pos[pid] = PointPosition(x=714.0, y=195.0 + idx * 54.0)
        b2_m_pos[pid] = PointPosition(x=326.0, y=156.0 + idx * 36.0)

    b2_entities = [
        make_entity(
            m=m,
            radius=7.5 if m.id in top3_ids else (6.5 if m.id == "house_nancy_pelosi" else 5.2),
            tone=(
                "neutral"
                if m.id in top3_ids
                else (
                    "accent"
                    if m.avg_excess > 0.0
                    else ("secondary" if m.avg_excess < -50.0 else "neutral")
                )
            ),
            opacity=0.28 if m.id in top3_ids else (0.95 if m.avg_excess > 0.0 else 0.72),
            desktop=b2_d_pos[m.id],
            mobile=b2_m_pos[m.id],
        )
        for m in lawmakers
    ]

    b2_zero_d = round(lin_scale(0.0, -160.0, 160.0, 64.0, 628.0), 1)
    b2_zero_m = round(lin_scale(0.0, -160.0, 160.0, 28.0, 290.0), 1)
    b2_old_mean_d = round(lin_scale(mean_all, -160.0, 160.0, 64.0, 628.0), 1)
    b2_old_mean_m = round(lin_scale(mean_all, -160.0, 160.0, 28.0, 290.0), 1)
    b2_new_mean_d = round(lin_scale(mean_ex_top3, -160.0, 160.0, 64.0, 628.0), 1)
    b2_new_mean_m = round(lin_scale(mean_ex_top3, -160.0, 160.0, 28.0, 290.0), 1)

    beat2 = Beat(
        id="beat-03-collapse",
        index=2,
        kicker="03 / Removing 3 Lawmakers",
        headline=(
            f"Set aside 3 outliers and the Congressional average drops {mean_drop_pp:.1f} points."
        ),
        bodySegments=[
            TextSegment(
                text=(
                    f"Set aside just the top three performers (2.4% of our {n_total}-member "
                    f"sample) and zoom into the remaining {len(rest_n)} lawmakers: the headline "
                    f"mean plunges from {mean_all:+.1f}% to "
                )
            ),
            TextSegment(text=f"{mean_ex_top3:+.1f}%", tone="secondary"),
            TextSegment(
                text=(
                    f" — right beside the {median_ex_top3:+.1f}% median. Even high-profile "
                    "winners like "
                )
            ),
            TextSegment(
                text=f"Nancy Pelosi ({by_id['house_nancy_pelosi'].avg_excess:+.1f}%)",
                tone="accent",
            ),
            TextSegment(
                text=" sit in a thin right-hand tail outweighed by dozens of steep laggards."
            ),
        ],
        takeaway=(
            f"Dropping 3 of {n_total} lawmakers cuts the mean from {mean_all:+.1f}% "
            f"to {mean_ex_top3:+.1f}% (-{mean_drop_pp:.1f} pp)."
        ),
        chartSubtitle=(
            "Zoomed distribution (-160% to +160%) with mean-shift bridge & top 3 set aside"
        ),
        layoutType="trimmed-drop",
        guides=[
            GuideLine(
                id="b2-zero",
                orientation="vertical",
                style="zero",
                desktopStart=PointPosition(x=b2_zero_d, y=94),
                desktopEnd=PointPosition(x=b2_zero_d, y=424),
                mobileStart=PointPosition(x=b2_zero_m, y=72),
                mobileEnd=PointPosition(x=b2_zero_m, y=306),
                label="S&P 500 (0%)",
                mobileLabel="0%",
                desktopLabelPos=PointPosition(x=b2_zero_d + 8, y=84),
                mobileLabelPos=PointPosition(x=b2_zero_m + 6, y=60),
                labelAnchor="start",
            ),
            GuideLine(
                id="b2-old-mean",
                orientation="vertical",
                style="muted",
                desktopStart=PointPosition(x=b2_old_mean_d, y=104),
                desktopEnd=PointPosition(x=b2_old_mean_d, y=424),
                mobileStart=PointPosition(x=b2_old_mean_m, y=86),
                mobileEnd=PointPosition(x=b2_old_mean_m, y=306),
            ),
            GuideLine(
                id="b2-new-mean",
                orientation="vertical",
                style="median",
                desktopStart=PointPosition(x=b2_new_mean_d, y=104),
                desktopEnd=PointPosition(x=b2_new_mean_d, y=424),
                mobileStart=PointPosition(x=b2_new_mean_m, y=86),
                mobileEnd=PointPosition(x=b2_new_mean_m, y=306),
                label=f"Mean shift: {mean_all:+.1f}% -> {mean_ex_top3:+.1f}%",
                mobileLabel=f"{mean_all:+.0f}% -> {mean_ex_top3:+.0f}%",
                desktopLabelPos=PointPosition(x=b2_new_mean_d - 8, y=106),
                mobileLabelPos=PointPosition(x=b2_new_mean_m - 4, y=84),
                labelAnchor="end",
            ),
            GuideLine(
                id="b2-outlier-divider",
                orientation="vertical",
                style="muted",
                desktopStart=PointPosition(x=668, y=110),
                desktopEnd=PointPosition(x=668, y=420),
                mobileStart=PointPosition(x=305, y=94),
                mobileEnd=PointPosition(x=305, y=304),
            ),
        ],
        laneHeaders=[
            LaneHeader(
                id="b2-parked-hdr",
                text="TOP 3 SET ASIDE",
                mobileText="TOP 3",
                desktop=PointPosition(x=714, y=132),
                mobile=PointPosition(x=326, y=118),
                anchor="middle",
                tone="neutral",
            ),
        ],
        axisTicks=[
            AxisTick(
                id=f"b2-t-{val}",
                text=f"{val:+d}%" if val != 0 else "0%",
                desktop=PointPosition(
                    x=round(lin_scale(float(val), -160.0, 160.0, 64.0, 628.0), 1),
                    y=446.0,
                ),
                mobile=PointPosition(
                    x=round(lin_scale(float(val), -160.0, 160.0, 28.0, 290.0), 1),
                    y=328.0,
                ),
                showOnMobile=val in (-150, -50, 0, 50, 150),
            )
            for val in (-150, -100, -50, 0, 50, 100, 150)
        ],
        entities=b2_entities,
        annotations=[
            Annotation(
                id="b2-ann-pelosi",
                entityId="house_nancy_pelosi",
                text=f"Pelosi {by_id['house_nancy_pelosi'].avg_excess:+.0f}%",
                mobileText="Pelosi +93%",
                priority=1,
                desktop=PointPosition(x=512, y=148),
                mobile=PointPosition(x=242, y=126),
                anchor="middle",
                mobileAnchor="middle",
            ),
            Annotation(
                id="b2-ann-suozzi",
                entityId="house_thomas_suozzi",
                text=f"Suozzi {by_id['house_thomas_suozzi'].avg_excess:+.0f}%",
                priority=2,
                desktop=PointPosition(x=598, y=362),
                mobile=PointPosition(x=265, y=268),
                anchor="middle",
            ),
            Annotation(
                id="b2-ann-brooks",
                entityId="house_mo_brooks",
                text=f"Mo Brooks {by_id['house_mo_brooks'].avg_excess:+.0f}%",
                mobileText="Brooks -150%",
                priority=1,
                desktop=PointPosition(x=74, y=384),
                mobile=PointPosition(x=32, y=276),
                anchor="start",
                mobileAnchor="start",
            ),
            Annotation(
                id="b2-ann-parked",
                entityId="house_barbarajhonorable_comstock",
                text="Marshall, Whitehouse, Comstock",
                priority=3,
                desktop=PointPosition(x=742, y=348),
                mobile=PointPosition(x=332, y=262),
                anchor="end",
            ),
        ],
    )

    # =========================================================================
    # BEAT 3 — One Senator Flips Both Averages (4-Lane Chamber x Caucus Strip)
    # Sen. Angus King (I-ME) caucuses with Senate Democrats -> SENATE D/I · 7
    # =========================================================================
    def lane_key(m: Lawmaker) -> str:
        if m.chamber == "senate" and m.party in ("D", "I"):
            return "senate_di"
        if m.chamber == "senate":
            return "senate_r"
        if m.party == "D":
            return "house_d"
        return "house_r"

    lane_y_d = {"senate_di": 116.0, "senate_r": 200.0, "house_d": 294.0, "house_r": 388.0}
    lane_y_m = {"senate_di": 100.0, "senate_r": 162.0, "house_d": 228.0, "house_r": 294.0}
    lane_half_d = {"senate_di": 22.0, "senate_r": 24.0, "house_d": 32.0, "house_r": 34.0}
    lane_half_m = {"senate_di": 12.0, "senate_r": 14.0, "house_d": 18.0, "house_r": 18.0}

    b3_d_pos: dict[str, PointPosition] = {}
    b3_m_pos: dict[str, PointPosition] = {}
    for lk in ("senate_di", "senate_r", "house_d", "house_r"):
        grp = [m for m in lawmakers if lane_key(m) == lk]
        d_items = [
            (
                m.id,
                symlog_scale(m.avg_excess, -160.0, 600.0, 184.0, 736.0, 55.0),
                7.5 if m.id == "senate_sheldon_whitehouse" else 4.8,
            )
            for m in grp
        ]
        m_items = [
            (
                m.id,
                symlog_scale(m.avg_excess, -160.0, 600.0, 32.0, 332.0, 55.0),
                5.4 if m.id == "senate_sheldon_whitehouse" else 3.4,
            )
            for m in grp
        ]
        b3_d_pos.update(
            beeswarm_1d(
                d_items,
                lane_y_d[lk],
                lane_y_d[lk] - lane_half_d[lk],
                lane_y_d[lk] + lane_half_d[lk],
                pad=1.2,
            )
        )
        b3_m_pos.update(
            beeswarm_1d(
                m_items,
                lane_y_m[lk],
                lane_y_m[lk] - lane_half_m[lk],
                lane_y_m[lk] + lane_half_m[lk],
                pad=0.9,
            )
        )

    b3_entities = [
        make_entity(
            m=m,
            radius=(
                8.0
                if m.id == "senate_sheldon_whitehouse"
                else (5.8 if m.chamber == "senate" else 4.8)
            ),
            tone=(
                "accent"
                if m.id == "senate_sheldon_whitehouse"
                else ("secondary" if m.chamber == "senate" else "neutral")
            ),
            opacity=(
                1.0
                if m.id == "senate_sheldon_whitehouse"
                else (0.85 if m.chamber == "senate" else 0.58)
            ),
            desktop=b3_d_pos[m.id],
            mobile=b3_m_pos[m.id],
        )
        for m in lawmakers
    ]

    b3_zero_d = round(symlog_scale(0.0, -160.0, 600.0, 184.0, 736.0, 55.0), 1)
    b3_zero_m = round(symlog_scale(0.0, -160.0, 600.0, 32.0, 332.0, 55.0), 1)
    sen_di_count = sum(1 for m in lawmakers if lane_key(m) == "senate_di")
    sen_r_count = sum(1 for m in lawmakers if lane_key(m) == "senate_r")
    house_d_count = sum(1 for m in lawmakers if lane_key(m) == "house_d")
    house_r_count = sum(1 for m in lawmakers if lane_key(m) == "house_r")

    beat3 = Beat(
        id="beat-04-illusion",
        index=3,
        kicker="04 / The One-Senator Mirage",
        headline="One Senator flips both the Senate and Democratic averages positive.",
        bodySegments=[
            TextSegment(
                text=(
                    f"Headline summaries suggest Senators ({sen_mean:+.1f}% mean) and "
                    f"Democrats ({dem_mean:+.1f}%) beat the market while the House and "
                    "Republicans trail. Yet only "
                )
            ),
            TextSegment(
                text=(
                    f"{sen_beat} of {len(senators)} Senators "
                    f"({100 * sen_beat / len(senators):.1f}%)"
                ),
                tone="secondary",
            ),
            TextSegment(text=" beat the S&P 500 (median "),
            TextSegment(text=f"{sen_median:+.1f}%", tone="secondary"),
            TextSegment(text="). Remove "),
            TextSegment(text="Sheldon Whitehouse (+472.8%)", tone="accent"),
            TextSegment(
                text=(
                    f" alone and the Senate average crashes to {sen_no_wh_mean:+.1f}%, "
                    f"Democrats flip to {dem_no_wh_mean:+.1f}%, and House Democrats "
                    f"({house_d_mean:+.1f}%) mirror House Republicans ({house_r_mean:+.1f}%)."
                )
            ),
        ],
        takeaway=(
            f"Ex-Whitehouse, Senate mean flips {sen_mean:+.1f}% -> {sen_no_wh_mean:+.1f}% "
            f"and Democrats flip {dem_mean:+.1f}% -> {dem_no_wh_mean:+.1f}%."
        ),
        chartSubtitle="Excess return by chamber at filing × caucus (symlog axis, %)",
        layoutType="chamber-party",
        guides=[
            GuideLine(
                id="b3-zero",
                orientation="vertical",
                style="zero",
                desktopStart=PointPosition(x=b3_zero_d, y=76),
                desktopEnd=PointPosition(x=b3_zero_d, y=432),
                mobileStart=PointPosition(x=b3_zero_m, y=64),
                mobileEnd=PointPosition(x=b3_zero_m, y=320),
                label="S&P 500 (0%)",
                mobileLabel="0%",
                desktopLabelPos=PointPosition(x=b3_zero_d, y=64),
                mobileLabelPos=PointPosition(x=b3_zero_m, y=50),
                labelAnchor="middle",
            ),
            GuideLine(
                id="b3-sep-1",
                orientation="horizontal",
                style="muted",
                desktopStart=PointPosition(x=48, y=158),
                desktopEnd=PointPosition(x=748, y=158),
                mobileStart=PointPosition(x=24, y=126),
                mobileEnd=PointPosition(x=338, y=126),
            ),
            GuideLine(
                id="b3-sep-2",
                orientation="horizontal",
                style="muted",
                desktopStart=PointPosition(x=48, y=246),
                desktopEnd=PointPosition(x=748, y=246),
                mobileStart=PointPosition(x=24, y=190),
                mobileEnd=PointPosition(x=338, y=190),
            ),
            GuideLine(
                id="b3-sep-3",
                orientation="horizontal",
                style="muted",
                desktopStart=PointPosition(x=48, y=342),
                desktopEnd=PointPosition(x=748, y=342),
                mobileStart=PointPosition(x=24, y=258),
                mobileEnd=PointPosition(x=338, y=258),
            ),
        ],
        laneHeaders=[
            LaneHeader(
                id="b3-lh-sd",
                text=f"SENATE D/I · {sen_di_count}",
                mobileText=f"SEN D/I ({sen_di_count})",
                desktop=PointPosition(x=48, y=116),
                mobile=PointPosition(x=24, y=72),
                anchor="start",
                tone="secondary",
            ),
            LaneHeader(
                id="b3-lh-sr",
                text=f"SENATE R · {sen_r_count}",
                mobileText=f"SEN R ({sen_r_count})",
                desktop=PointPosition(x=48, y=200),
                mobile=PointPosition(x=24, y=138),
                anchor="start",
                tone="secondary",
            ),
            LaneHeader(
                id="b3-lh-hd",
                text=f"HOUSE D · {house_d_count}",
                mobileText=f"HOUSE D ({house_d_count})",
                desktop=PointPosition(x=48, y=294),
                mobile=PointPosition(x=24, y=202),
                anchor="start",
                tone="neutral",
            ),
            LaneHeader(
                id="b3-lh-hr",
                text=f"HOUSE R · {house_r_count}",
                mobileText=f"HOUSE R ({house_r_count})",
                desktop=PointPosition(x=48, y=388),
                mobile=PointPosition(x=24, y=270),
                anchor="start",
                tone="neutral",
            ),
        ],
        axisTicks=[
            AxisTick(
                id=f"b3-t-{val}",
                text=f"{val:+d}%" if val != 0 else "0%",
                desktop=PointPosition(
                    x=round(symlog_scale(float(val), -160.0, 600.0, 184.0, 736.0, 55.0), 1),
                    y=452.0,
                ),
                mobile=PointPosition(
                    x=round(symlog_scale(float(val), -160.0, 600.0, 32.0, 332.0, 55.0), 1),
                    y=338.0,
                ),
                showOnMobile=val in (-150, 0, 150, 500),
            )
            for val in (-150, -50, 0, 50, 150, 500)
        ],
        entities=b3_entities,
        annotations=[
            Annotation(
                id="b3-ann-whitehouse",
                entityId="senate_sheldon_whitehouse",
                text="Whitehouse +473% (flips Senate)",
                mobileText="Whitehouse +473%",
                priority=1,
                desktop=PointPosition(x=732, y=82),
                mobile=PointPosition(x=338, y=70),
                anchor="end",
                mobileAnchor="end",
            ),
            Annotation(
                id="b3-ann-tuberville",
                entityId="senate_thomash_tuberville",
                text="Tuberville -34%",
                priority=2,
                desktop=PointPosition(x=266, y=174),
                mobile=PointPosition(x=120, y=144),
                anchor="end",
            ),
            Annotation(
                id="b3-ann-pelosi",
                entityId="house_nancy_pelosi",
                text="Pelosi +93%",
                priority=2,
                desktop=PointPosition(x=590, y=266),
                mobile=PointPosition(x=250, y=214),
                anchor="start",
            ),
            Annotation(
                id="b3-ann-marshall",
                entityId="house_rogerw_marshall",
                text="Marshall +565% (House filings)",
                mobileText="Marshall +565%",
                priority=1,
                desktop=PointPosition(x=732, y=354),
                mobile=PointPosition(x=338, y=268),
                anchor="end",
                mobileAnchor="end",
            ),
        ],
    )

    # =========================================================================
    # BEAT 4 — Trading Frequency Myth (Log Priced Buys vs. Symlog Excess)
    # =========================================================================
    b4_entities: list[EntityState] = []
    for m in lawmakers:
        dx = round(log_scale(float(m.scored_buys), 18.0, 4200.0, 84.0, 732.0), 1)
        dy = round(symlog_scale(m.avg_excess, -165.0, 620.0, 412.0, 82.0, 55.0), 1)
        mx_pos = round(log_scale(float(m.scored_buys), 18.0, 4200.0, 56.0, 330.0), 1)
        my_pos = round(symlog_scale(m.avg_excess, -165.0, 620.0, 304.0, 62.0, 55.0), 1)
        is_heavy = m.scored_buys >= 200
        tone: Tone = ("accent" if m.avg_excess > 0.0 else "secondary") if is_heavy else "neutral"
        b4_entities.append(
            make_entity(
                m=m,
                radius=6.8 if is_heavy else 4.5,
                tone=tone,
                opacity=0.95 if is_heavy else 0.42,
                desktop=PointPosition(x=dx, y=dy),
                mobile=PointPosition(x=mx_pos, y=my_pos),
            )
        )

    b4_zero_y_d = round(symlog_scale(0.0, -165.0, 620.0, 412.0, 82.0, 55.0), 1)
    b4_zero_y_m = round(symlog_scale(0.0, -165.0, 620.0, 304.0, 62.0, 55.0), 1)
    b4_200_x_d = round(log_scale(200.0, 18.0, 4200.0, 84.0, 732.0), 1)
    b4_200_x_m = round(log_scale(200.0, 18.0, 4200.0, 56.0, 330.0), 1)

    beat4 = Beat(
        id="beat-05-activity",
        index=4,
        kicker="05 / The Frequency Myth",
        headline="Trading hundreds of times buys zero market-beating edge.",
        bodySegments=[
            TextSegment(
                text=(
                    "If Capitol Hill held a systematic trading edge, the most active members "
                    "should convert volume into alpha. Instead, trade count and excess return "
                    f"have virtually zero correlation (r = {pearson_r:+.2f}). Among the "
                    f"{len(heavy)} prolific traders with 200+ buys, "
                )
            ),
            TextSegment(
                text=f"{len(heavy) - heavy_beat} of {len(heavy)} trailed the S&P 500",
                tone="secondary",
            ),
            TextSegment(text=" — leaving just "),
            TextSegment(text=f"{heavy_beat} winners ({heavy_beat_pct:.1f}%)", tone="accent"),
            TextSegment(
                text=(
                    f", no better than occasional traders ({light_beat_pct:.1f}%), even as "
                    "Josh Gottheimer (1,343 buys, -8.1%) and Tommy Tuberville (456, -34.0%) "
                    "filed hundreds of tickets."
                )
            ),
        ],
        takeaway=(
            f"Log(buys) vs. excess return is flat (r = {pearson_r:+.2f}); "
            f"{heavy_beat}/{len(heavy)} hyper-traders ({heavy_beat_pct:.1f}%) beat SPY."
        ),
        chartSubtitle="Priced stock buys (log X) vs. average excess return (symlog Y)",
        layoutType="activity-scatter",
        guides=[
            GuideLine(
                id="b4-zero-y",
                orientation="horizontal",
                style="zero",
                desktopStart=PointPosition(x=74, y=b4_zero_y_d),
                desktopEnd=PointPosition(x=742, y=b4_zero_y_d),
                mobileStart=PointPosition(x=48, y=b4_zero_y_m),
                mobileEnd=PointPosition(x=338, y=b4_zero_y_m),
                label="S&P 500 (0%)",
                mobileLabel="0%",
                desktopLabelPos=PointPosition(x=84, y=b4_zero_y_d - 11),
                mobileLabelPos=PointPosition(x=62, y=b4_zero_y_m - 10),
                labelAnchor="start",
            ),
            GuideLine(
                id="b4-200-x",
                orientation="vertical",
                style="muted",
                desktopStart=PointPosition(x=b4_200_x_d, y=72),
                desktopEnd=PointPosition(x=b4_200_x_d, y=422),
                mobileStart=PointPosition(x=b4_200_x_m, y=54),
                mobileEnd=PointPosition(x=b4_200_x_m, y=312),
                label="200+ buys (29 prolific traders)",
                mobileLabel="200+ buys",
                desktopLabelPos=PointPosition(x=b4_200_x_d + 8, y=78),
                mobileLabelPos=PointPosition(x=b4_200_x_m + 6, y=54),
                labelAnchor="start",
            ),
        ],
        axisTicks=[
            *[
                AxisTick(
                    id=f"b4-tx-{val}",
                    text=f"{val:,}" if val < 3500 else "3,500 buys",
                    mobileText=f"{val:,}",
                    desktop=PointPosition(
                        x=round(log_scale(float(val), 18.0, 4200.0, 84.0, 732.0), 1),
                        y=446.0,
                    ),
                    mobile=PointPosition(
                        x=round(log_scale(float(val), 18.0, 4200.0, 56.0, 330.0), 1),
                        y=332.0,
                    ),
                    showOnMobile=val in (20, 200, 500, 3500),
                )
                for val in (20, 50, 200, 500, 1500, 3500)
            ],
            *[
                AxisTick(
                    id=f"b4-ty-{val}",
                    text=f"{val:+d}%" if val != 0 else "0%",
                    desktop=PointPosition(
                        x=64.0,
                        y=round(symlog_scale(float(val), -165.0, 620.0, 412.0, 82.0, 55.0), 1),
                    ),
                    mobile=PointPosition(
                        x=44.0,
                        y=round(symlog_scale(float(val), -165.0, 620.0, 304.0, 62.0, 55.0), 1),
                    ),
                    anchor="end",
                    showOnMobile=val in (-150, 0, 150, 500),
                )
                for val in (-150, -50, 0, 50, 150, 500)
            ],
        ],
        entities=b4_entities,
        annotations=[
            Annotation(
                id="b4-ann-khanna",
                entityId="house_rohit_khanna",
                text="Ro Khanna · 3,528 (+5%)",
                mobileText="Khanna +5%",
                priority=1,
                desktop=PointPosition(x=736, y=224),
                mobile=PointPosition(x=338, y=166),
                anchor="end",
                mobileAnchor="end",
            ),
            Annotation(
                id="b4-ann-gottheimer",
                entityId="house_josh_gottheimer",
                text="Gottheimer · 1,343 (-8%)",
                mobileText="Gottheimer -8%",
                priority=1,
                desktop=PointPosition(x=632, y=312),
                mobile=PointPosition(x=334, y=248),
                anchor="middle",
                mobileAnchor="end",
            ),
            Annotation(
                id="b4-ann-whitehouse",
                entityId="senate_sheldon_whitehouse",
                text="Whitehouse · 409 (+473%)",
                mobileText="Whitehouse +473%",
                priority=1,
                desktop=PointPosition(x=548, y=104),
                mobile=PointPosition(x=334, y=82),
                anchor="start",
                mobileAnchor="end",
            ),
            Annotation(
                id="b4-ann-tuberville",
                entityId="senate_thomash_tuberville",
                text="Tuberville · 456 (-34%)",
                priority=2,
                desktop=PointPosition(x=462, y=344),
                mobile=PointPosition(x=180, y=274),
                anchor="end",
            ),
            Annotation(
                id="b4-ann-foxx",
                entityId="house_virginia_foxx",
                text="Virginia Foxx · 555 (-74%)",
                priority=2,
                desktop=PointPosition(x=554, y=396),
                mobile=PointPosition(x=240, y=300),
                anchor="start",
            ),
        ],
    )

    # =========================================================================
    # BEAT 5 — Inside the "Superstars": Deduplicated Mean vs. Median Barbells
    # Lane headers sit cleanly ABOVE each barbell (y - 24 desktop, y - 20 mobile)
    # so zero label text can ever collide with cobalt median rings.
    # =========================================================================
    bb_y_d = {
        "house_rogerw_marshall": 124.0,
        "senate_sheldon_whitehouse": 194.0,
        "house_barbarajhonorable_comstock": 264.0,
        "house_nancy_pelosi": 334.0,
    }
    bb_y_m = {
        "house_rogerw_marshall": 96.0,
        "senate_sheldon_whitehouse": 150.0,
        "house_barbarajhonorable_comstock": 204.0,
        "house_nancy_pelosi": 258.0,
    }

    def bb_x_d(v: float) -> float:
        return round(lin_scale(v, -120.0, 600.0, 84.0, 732.0), 1)

    def bb_x_m(v: float) -> float:
        return round(lin_scale(v, -120.0, 600.0, 34.0, 332.0), 1)

    superstar_profiles: list[SuperstarProfile] = []
    for eid in superstar_order:
        m = by_id[eid]
        aud = superstar_audits[eid]
        superstar_profiles.append(
            SuperstarProfile(
                entityId=eid,
                name=m.display_name,
                party=m.party,
                state=m.state,
                scoredBuys=aud.unique_buys,
                meanExcess=round(aud.dedup_mean, 1),
                medianTradeExcess=round(aud.dedup_median, 1),
                tradeWinRatePct=round(aud.dedup_win_rate, 1),
                topDriver=aud.driver,
                desktopMean=PointPosition(x=bb_x_d(aud.dedup_mean), y=bb_y_d[eid]),
                desktopMedian=PointPosition(x=bb_x_d(aud.dedup_median), y=bb_y_d[eid]),
                mobileMean=PointPosition(x=bb_x_m(aud.dedup_mean), y=bb_y_m[eid]),
                mobileMedian=PointPosition(x=bb_x_m(aud.dedup_median), y=bb_y_m[eid]),
            )
        )

    b5_entities: list[EntityState] = []
    non_stars = [m for m in lawmakers if m.id not in bb_y_d]
    for idx, m in enumerate(non_stars):
        dx = round(lin_scale(float(idx), 0.0, float(len(non_stars) - 1), 64.0, 736.0), 1)
        dy = round(416.0 - lin_scale(m.avg_excess, -155.0, 155.0, -8.0, 10.0), 1)
        mx_pos = round(lin_scale(float(idx), 0.0, float(len(non_stars) - 1), 28.0, 332.0), 1)
        my_pos = round(312.0 - lin_scale(m.avg_excess, -155.0, 155.0, -5.0, 6.0), 1)
        b5_entities.append(
            make_entity(
                m=m,
                radius=3.5,
                tone="neutral",
                opacity=0.25,
                desktop=PointPosition(x=dx, y=dy),
                mobile=PointPosition(x=mx_pos, y=my_pos),
            )
        )
    for eid in superstar_order:
        m = by_id[eid]
        aud = superstar_audits[eid]
        b5_entities.append(
            make_entity(
                m=m,
                radius=8.5,
                tone="accent",
                opacity=1.0,
                desktop=PointPosition(x=bb_x_d(aud.dedup_mean), y=bb_y_d[eid]),
                mobile=PointPosition(x=bb_x_m(aud.dedup_mean), y=bb_y_m[eid]),
            )
        )
    b5_map = {e.id: e for e in b5_entities}
    b5_entities_ordered = [b5_map[m.id] for m in lawmakers]

    b5_zero_d = bb_x_d(0.0)
    b5_zero_m = bb_x_m(0.0)

    beat5 = Beat(
        id="beat-06-superstars",
        index=5,
        kicker="06 / Inside the Superstars",
        headline="Even the headline superstars are powered by a few tech lottery tickets.",
        bodySegments=[
            TextSegment(
                text=(
                    "Deduplicating amended filings inside the top winners' own trade logs "
                    "exposes the same skew. "
                )
            ),
            TextSegment(text="Sheldon Whitehouse", tone="accent"),
            TextSegment(
                text=(
                    f" averages {wh.dedup_mean:+.1f}% across {wh.unique_buys} unique buys "
                    f"(inflated to {wh.raw_mean:+.1f}% in raw feeds by amended duplicates), "
                    f"yet only {wh.dedup_win_rate:.1f}% beat SPY and his "
                )
            ),
            TextSegment(text=f"median trade lost by {wh.dedup_median:+.1f}%", tone="secondary"),
            TextSegment(
                text=(
                    f" — lifted by {wh.unique_nvda} NVDA buys (ex-NVDA: {wh.ex_nvda_mean:+.1f}%). "
                    f"Nancy Pelosi ({pel.dedup_mean:+.1f}% mean, {pel.unique_buys} unique buys) "
                    f"won on just {pel.dedup_win_rate:.1f}% (median {pel.dedup_median:+.1f}%)."
                )
            ),
        ],
        takeaway=(
            f"Deduplicated medians: Whitehouse {wh.dedup_median:+.1f}% ({wh.dedup_win_rate:.1f}% "
            f"win), Pelosi {pel.dedup_median:+.1f}% ({pel.dedup_win_rate:.1f}% win)."
        ),
        chartSubtitle="Deduplicated median trade (cobalt ring) vs. mean excess (vermilion dot)",
        layoutType="superstar-anatomy",
        guides=[
            GuideLine(
                id="b5-zero",
                orientation="vertical",
                style="zero",
                desktopStart=PointPosition(x=b5_zero_d, y=74),
                desktopEnd=PointPosition(x=b5_zero_d, y=362),
                mobileStart=PointPosition(x=b5_zero_m, y=60),
                mobileEnd=PointPosition(x=b5_zero_m, y=276),
                label="S&P 500 (0%)",
                mobileLabel="0%",
                desktopLabelPos=PointPosition(x=b5_zero_d, y=62),
                mobileLabelPos=PointPosition(x=b5_zero_m, y=46),
                labelAnchor="middle",
            ),
        ],
        laneHeaders=[
            LaneHeader(
                id="b5-lh-mar",
                text=(
                    f"Roger Marshall (R-KS) · {mar.unique_buys} buys · "
                    f"{mar.dedup_win_rate:.1f}% win"
                ),
                mobileText="Marshall (57% win)",
                desktop=PointPosition(x=84, y=102),
                mobile=PointPosition(x=24, y=76),
                anchor="start",
                tone="neutral",
            ),
            LaneHeader(
                id="b5-lh-wh",
                text=(
                    f"Sheldon Whitehouse (D-RI) · {wh.unique_buys} unique buys · "
                    f"{wh.dedup_win_rate:.1f}% win"
                ),
                mobileText="Whitehouse (35% win)",
                desktop=PointPosition(x=84, y=172),
                mobile=PointPosition(x=24, y=130),
                anchor="start",
                tone="accent",
            ),
            LaneHeader(
                id="b5-lh-com",
                text=(
                    f"Barbara Comstock (R-VA) · {com.unique_buys} buys · "
                    f"{com.dedup_win_rate:.1f}% win"
                ),
                mobileText="Comstock (68% win)",
                desktop=PointPosition(x=84, y=242),
                mobile=PointPosition(x=24, y=184),
                anchor="start",
                tone="neutral",
            ),
            LaneHeader(
                id="b5-lh-pel",
                text=(
                    f"Nancy Pelosi (D-CA) · {pel.unique_buys} unique buys · "
                    f"{pel.dedup_win_rate:.1f}% win"
                ),
                mobileText="Pelosi (53% win)",
                desktop=PointPosition(x=84, y=312),
                mobile=PointPosition(x=24, y=238),
                anchor="start",
                tone="secondary",
            ),
            LaneHeader(
                id="b5-lh-rest",
                text="OTHER 123 LAWMAKERS (SORTED BY EXCESS RETURN)",
                mobileText="OTHER 123 LAWMAKERS",
                desktop=PointPosition(x=400, y=446),
                mobile=PointPosition(x=180, y=336),
                anchor="middle",
                tone="neutral",
            ),
        ],
        axisTicks=[
            AxisTick(
                id=f"b5-t-{val}",
                text=f"{val:+d}%" if val != 0 else "0%",
                desktop=PointPosition(x=bb_x_d(float(val)), y=380.0),
                mobile=PointPosition(x=bb_x_m(float(val)), y=292.0),
                showOnMobile=val in (-100, 0, 200, 400, 600),
            )
            for val in (-100, 0, 150, 300, 450, 600)
        ],
        entities=b5_entities_ordered,
        annotations=[
            Annotation(
                id="b5-ann-mar",
                entityId="house_rogerw_marshall",
                text=f"Med {mar.dedup_median:+.0f}% -> Mean {mar.dedup_mean:+.0f}%",
                priority=2,
                desktop=PointPosition(x=732, y=102),
                mobile=PointPosition(x=336, y=76),
                anchor="end",
            ),
            Annotation(
                id="b5-ann-wh",
                entityId="senate_sheldon_whitehouse",
                text=(
                    f"Med {wh.dedup_median:+.0f}% -> Mean {wh.dedup_mean:+.0f}% "
                    f"({wh.unique_nvda} NVDA buys)"
                ),
                mobileText=f"Med {wh.dedup_median:+.0f}% vs {wh.dedup_mean:+.0f}%",
                priority=1,
                desktop=PointPosition(x=732, y=172),
                mobile=PointPosition(x=336, y=130),
                anchor="end",
                mobileAnchor="end",
            ),
            Annotation(
                id="b5-ann-com",
                entityId="house_barbarajhonorable_comstock",
                text=f"Med {com.dedup_median:+.0f}% -> Mean {com.dedup_mean:+.0f}%",
                priority=3,
                desktop=PointPosition(x=732, y=242),
                mobile=PointPosition(x=336, y=184),
                anchor="end",
            ),
            Annotation(
                id="b5-ann-pel",
                entityId="house_nancy_pelosi",
                text=f"Med {pel.dedup_median:+.1f}% -> Mean {pel.dedup_mean:+.0f}%",
                mobileText=f"Med {pel.dedup_median:+.1f}% vs {pel.dedup_mean:+.0f}%",
                priority=1,
                desktop=PointPosition(x=732, y=312),
                mobile=PointPosition(x=336, y=238),
                anchor="end",
                mobileAnchor="end",
            ),
        ],
    )

    # =========================================================================
    # BEAT 6 — Interactive Explorer (Est. Dollar Volume log X vs. Excess Return Y)
    # Distinct X-axis (USD volume) from Beat 4 (buy count) + Equal/Dollar toggle!
    # =========================================================================
    b6_entities: list[EntityState] = []
    for m in lawmakers:
        vol_clamped = max(1e5, min(6e8, m.est_volume_usd))
        dx = round(log_scale(vol_clamped, 1e5, 6e8, 84.0, 732.0), 1)
        dy_eq = round(symlog_scale(m.avg_excess, -210.0, 700.0, 412.0, 82.0, 55.0), 1)
        dy_wt = round(symlog_scale(m.weighted_excess, -210.0, 700.0, 412.0, 82.0, 55.0), 1)

        mx_pos = round(log_scale(vol_clamped, 1e5, 6e8, 56.0, 330.0), 1)
        my_eq = round(symlog_scale(m.avg_excess, -210.0, 700.0, 304.0, 62.0, 55.0), 1)
        my_wt = round(symlog_scale(m.weighted_excess, -210.0, 700.0, 304.0, 62.0, 55.0), 1)

        buys_r = 4.2 + 2.1 * max(0.0, math.log10(max(20.0, float(m.scored_buys))) - 1.3)
        radius = round(min(10.0, max(4.5, buys_r)), 1)
        tone_exp: Tone = "accent" if m.avg_excess > 0.0 else "secondary"

        b6_entities.append(
            make_entity(
                m=m,
                radius=radius,
                tone=tone_exp,
                opacity=0.82,
                desktop=PointPosition(x=dx, y=dy_eq),
                mobile=PointPosition(x=mx_pos, y=my_eq),
                desktop_alt=PointPosition(x=dx, y=dy_wt),
                mobile_alt=PointPosition(x=mx_pos, y=my_wt),
            )
        )

    b6_zero_d = round(symlog_scale(0.0, -210.0, 700.0, 412.0, 82.0, 55.0), 1)
    b6_zero_m = round(symlog_scale(0.0, -210.0, 700.0, 304.0, 62.0, 55.0), 1)

    beat6 = Beat(
        id="beat-07-explore",
        index=6,
        kicker="07 / Explore the Record",
        headline=f"Inspect all {n_total} lawmakers — by dollar volume and weighting.",
        bodySegments=[
            TextSegment(
                text=(
                    f"Whether you weight every buy equally (mean {mean_all:+.1f}%, median "
                    f"{median_all:+.1f}%), weight by disclosed dollar size (mean "
                    f"{mean_weighted:+.1f}%, median {median_weighted:+.1f}%), or test fixed "
                    f"120-day buy windows ({hf_mean:+.2f}% mean, {hf_med:+.2f}% median across "
                    f"{hf_n} STOCK Act buys), the verdict holds: "
                )
            ),
            TextSegment(text="most lawmakers trail an index fund", tone="secondary"),
            TextSegment(text=", while "),
            TextSegment(text="a tiny outlier tail", tone="accent"),
            TextSegment(
                text=(
                    " drives the myth. Filter by outcome, party, or chamber, switch to "
                    "dollar-weighted excess, or click any circle to inspect a lawmaker."
                )
            ),
        ],
        takeaway=f"Filter, search, toggle weighting, or click any of the {n_total} lawmakers.",
        chartSubtitle="Est. trading volume (log USD) vs. excess return · Size = buy count",
        layoutType="explorer",
        guides=[
            GuideLine(
                id="b6-zero-y",
                orientation="horizontal",
                style="zero",
                desktopStart=PointPosition(x=74, y=b6_zero_d),
                desktopEnd=PointPosition(x=742, y=b6_zero_d),
                mobileStart=PointPosition(x=48, y=b6_zero_m),
                mobileEnd=PointPosition(x=338, y=b6_zero_m),
                label="S&P 500 (0%)",
                mobileLabel="0%",
                desktopLabelPos=PointPosition(x=740, y=b6_zero_d - 11),
                mobileLabelPos=PointPosition(x=336, y=b6_zero_m - 10),
                labelAnchor="end",
            ),
        ],
        axisTicks=[
            *[
                AxisTick(
                    id=f"b6-tx-{label}",
                    text=label,
                    mobileText=label,
                    desktop=PointPosition(
                        x=round(log_scale(val, 1e5, 6e8, 84.0, 732.0), 1),
                        y=446.0,
                    ),
                    mobile=PointPosition(
                        x=round(log_scale(val, 1e5, 6e8, 56.0, 330.0), 1),
                        y=332.0,
                    ),
                    showOnMobile=label in ("$100K", "$1M", "$10M", "$300M"),
                )
                for val, label in (
                    (1e5, "$100K"),
                    (1e6, "$1M"),
                    (1e7, "$10M"),
                    (1e8, "$100M"),
                    (3e8, "$300M"),
                )
            ],
            *[
                AxisTick(
                    id=f"b6-ty-{val}",
                    text=f"{val:+d}%" if val != 0 else "0%",
                    desktop=PointPosition(
                        x=64.0,
                        y=round(symlog_scale(float(val), -210.0, 700.0, 412.0, 82.0, 55.0), 1),
                    ),
                    mobile=PointPosition(
                        x=44.0,
                        y=round(symlog_scale(float(val), -210.0, 700.0, 304.0, 62.0, 55.0), 1),
                    ),
                    anchor="end",
                    showOnMobile=val in (-150, 0, 150, 500),
                )
                for val in (-150, -50, 0, 50, 150, 500)
            ],
        ],
        entities=b6_entities,
        annotations=[
            Annotation(
                id="b6-ann-marshall",
                entityId="house_rogerw_marshall",
                text="Marshall +565% ($0.9M)",
                mobileText="Marshall +565%",
                priority=1,
                desktop=PointPosition(x=270, y=72),
                mobile=PointPosition(x=136, y=56),
                anchor="start",
                mobileAnchor="start",
            ),
            Annotation(
                id="b6-ann-whitehouse",
                entityId="senate_sheldon_whitehouse",
                text="Whitehouse +473% ($16M)",
                mobileText="Whitehouse +473%",
                priority=1,
                desktop=PointPosition(x=496, y=104),
                mobile=PointPosition(x=336, y=82),
                anchor="start",
                mobileAnchor="end",
            ),
            Annotation(
                id="b6-ann-pelosi",
                entityId="house_nancy_pelosi",
                text="Pelosi +93% ($217M)",
                priority=2,
                desktop=PointPosition(x=736, y=166),
                mobile=PointPosition(x=310, y=140),
                anchor="end",
            ),
            Annotation(
                id="b6-ann-mccaul",
                entityId="house_michaelt_mccaul",
                text="McCaul -3% ($331M)",
                priority=2,
                desktop=PointPosition(x=736, y=322),
                mobile=PointPosition(x=310, y=248),
                anchor="end",
            ),
            Annotation(
                id="b6-ann-brooks",
                entityId="house_mo_brooks",
                text="Mo Brooks -150%",
                priority=3,
                desktop=PointPosition(x=298, y=402),
                mobile=PointPosition(x=120, y=296),
                anchor="start",
            ),
        ],
    )

    story = StoryData(
        slug="congress-beat-market",
        title="Does Congress Actually Beat the Market?",
        dek=(
            f"Across {total_buys:,} disclosed stock purchases by {n_total} unique U.S. lawmakers "
            f"(2013–2026), {trail_pct:.1f}% trailed the S&P 500. The myth of universal Capitol "
            "Hill alpha is an optical illusion built by extreme right-tail outliers."
        ),
        byline="Visual Essay · STOCK Act Financial Disclosures (2013–2026)",
        methodologyNote=(
            "Primary data: Kadoa Congress Trading Monitor (MIT), parsing U.S. House Clerk PTRs "
            f"and Senate eFD filings (2013–2026) for all {n_total} unique congressional filers "
            "with >=20 priced stock buys (24,442 buys; duplicate House name variants for Rep. "
            "C. Scott Franklin merged). Excess return equals cumulative buy-to-latest-close "
            "return minus SPY over the identical window (non-annualized); unpriced/delisted "
            "tickers are excluded, and options are benchmarked on underlying stock moves. Beat 6 "
            "deduplicates amended filings in individual trade logs. Buy-only fixed 120-day "
            f"cross-check via Hugging Face STOCK Act event study ({hf_n} buys: {hf_mean:+.2f}% "
            f"mean, {hf_med:+.2f}% median, {hf_beat:.1f}% beat rate)."
        ),
        viewBoxes=ViewBoxes(
            desktop=ViewBox(width=DESKTOP_W, height=DESKTOP_H),
            mobile=ViewBox(width=MOBILE_W, height=MOBILE_H),
        ),
        superstarProfiles=superstar_profiles,
        beats=[beat0, beat1, beat2, beat3, beat4, beat5, beat6],
    )

    summary_stats: dict[str, object] = {
        "n_total": n_total,
        "total_buys": total_buys,
        "n_beat": n_beat,
        "n_trail": n_trail,
        "beat_pct": round(beat_pct, 1),
        "trail_pct": round(trail_pct, 1),
        "mean_all": round(mean_all, 2),
        "median_all": round(median_all, 2),
        "mean_weighted": round(mean_weighted, 2),
        "median_weighted": round(median_weighted, 2),
        "mean_ex_top3": round(mean_ex_top3, 2),
        "median_ex_top3": round(median_ex_top3, 2),
        "mean_drop_pp": round(mean_drop_pp, 2),
        "top3_pos_share": round(top3_pos_share, 1),
        "sen_mean": round(sen_mean, 2),
        "sen_median": round(sen_median, 2),
        "sen_no_wh_mean": round(sen_no_wh_mean, 2),
        "dem_mean": round(dem_mean, 2),
        "rep_mean": round(rep_mean, 2),
        "dem_median": round(dem_median, 2),
        "rep_median": round(rep_median, 2),
        "dem_beat_pct": round(100.0 * dem_beat / len(dems), 1),
        "rep_beat_pct": round(100.0 * rep_beat / len(reps), 1),
        "dem_no_wh_mean": round(dem_no_wh_mean, 2),
        "house_d_mean": round(house_d_mean, 2),
        "house_r_mean": round(house_r_mean, 2),
        "pearson_r": round(pearson_r, 3),
        "heavy_n": len(heavy),
        "heavy_beat": heavy_beat,
        "heavy_beat_pct": round(heavy_beat_pct, 1),
        "light_beat_pct": round(light_beat_pct, 1),
        "wh_unique_buys": wh.unique_buys,
        "wh_dedup_mean": round(wh.dedup_mean, 1),
        "wh_dedup_median": round(wh.dedup_median, 1),
        "wh_dedup_win_rate": round(wh.dedup_win_rate, 1),
        "wh_unique_nvda": wh.unique_nvda,
        "pel_unique_buys": pel.unique_buys,
        "pel_dedup_mean": round(pel.dedup_mean, 1),
        "pel_dedup_median": round(pel.dedup_median, 1),
        "pel_dedup_win_rate": round(pel.dedup_win_rate, 1),
        "hf_buy_n": hf_n,
        "hf_buy_mean": round(hf_mean, 2),
        "hf_buy_med": round(hf_med, 2),
        "hf_buy_beat": round(hf_beat, 1),
    }
    return story, summary_stats


def render_storyboard(story: StoryData, stats: dict[str, object]) -> str:
    lines = [
        f"# Storyboard — {story.title}",
        "",
        f"> {story.dek}",
        "",
        "## Central Counterintuitive Thesis",
        "",
        (
            "Popular finance lore insists members of Congress routinely beat the stock market. "
            f"Real STOCK Act data across **{stats['total_buys']:,} priced stock purchases** by "
            f"**{stats['n_total']} unique active lawmakers** (2013–2026, measured cumulatively "
            "from purchase date to latest close minus SPY, non-annualized) proves the opposite: "
            f"**{stats['n_trail']} of {stats['n_total']} ({stats['trail_pct']}%) trailed the "
            f"S&P 500**, with a median excess return of **{stats['median_all']:+.2f}%** and an "
            f"overall mean of **{stats['mean_all']:+.2f}%**. The myth survives because extreme "
            "right-tail skew operates at two nested levels: across lawmakers (3 outliers hold "
            f"**{stats['top3_pos_share']}%** of all positive excess-return points, and one "
            f"Senator — Sheldon Whitehouse — single-handedly flips both the Senate mean from "
            f"**{stats['sen_no_wh_mean']:+.2f}%** to **{stats['sen_mean']:+.2f}%** and the "
            f"Democratic mean from **{stats['dem_no_wh_mean']:+.2f}%** to "
            f"**{stats['dem_mean']:+.2f}%**), and inside the superstars' own deduplicated trade "
            f"logs (Whitehouse loses to SPY on 65.4% of his {stats['wh_unique_buys']} unique buys "
            f"with a {stats['wh_dedup_median']:+.1f}% median trade; Nancy Pelosi wins on "
            f"{stats['pel_dedup_win_rate']}% of her {stats['pel_unique_buys']} unique buys with a "
            f"{stats['pel_dedup_median']:+.1f}% median trade)."
        ),
        "",
        "## Beat-by-Beat Narrative & Visual Progression",
        "",
    ]
    for beat in story.beats:
        body = "".join(seg.text for seg in beat.bodySegments)
        focal = [a.text for a in beat.annotations]
        p1 = [a.mobileText or a.text for a in beat.annotations if a.priority == 1]
        lines.extend(
            [
                f"### Beat {beat.index + 1}: {beat.headline} (`{beat.id}` · `{beat.layoutType}`)",
                "",
                f"- **Kicker:** {beat.kicker}",
                f"- **Visual Delta:** {beat.chartSubtitle}",
                f"- **Copy:** {body}",
                f"- **Takeaway:** {beat.takeaway}",
                f"- **Desktop Labels ({len(focal)}):** {', '.join(focal)}",
                f"- **Mobile Priority-1 Labels ({len(p1)}):** {', '.join(p1)}",
                "",
            ]
        )

    lines.extend(
        [
            "## Methodology & Cross-Validation",
            "",
            story.methodologyNote or "",
            "",
        ]
    )
    return "\n".join(lines)


def main() -> None:
    DATA_DIR.mkdir(parents=True, exist_ok=True)
    story, stats = build_story()
    manifest = build_manifest(story)

    story_path = DATA_DIR / "story.json"
    schema_path = DATA_DIR / "story.schema.json"
    manifest_path = DATA_DIR / "manifest.json"

    story_path.write_text(
        json.dumps(story.model_dump(mode="json"), indent=2) + "\n", encoding="utf-8"
    )
    schema_path.write_text(
        json.dumps(StoryData.model_json_schema(), indent=2) + "\n", encoding="utf-8"
    )
    manifest_path.write_text(
        json.dumps(manifest.model_dump(mode="json"), indent=2) + "\n", encoding="utf-8"
    )
    STORYBOARD_PATH.write_text(render_storyboard(story, stats), encoding="utf-8")

    print(
        f"Emitted {story.slug}: {manifest.beatCount} beats, "
        f"{manifest.totalUniqueEntities} persistent lawmakers -> {DATA_DIR}"
    )
    print(f"Summary stats: {json.dumps(stats, indent=2)}")


if __name__ == "__main__":
    main()
