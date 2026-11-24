"""Emit the minimal 3-beat, 12-entity smoke fixture for factory verification."""

from __future__ import annotations

import json
from pathlib import Path

from src.schema import (
    Annotation,
    Beat,
    EntityState,
    PointPosition,
    StoryData,
    TextSegment,
    Tone,
    ViewBox,
    ViewBoxes,
    build_manifest,
)

REPO_ROOT = Path(__file__).resolve().parents[2]
DATA_OUTPUT_DIR = REPO_ROOT / "web" / "public" / "data"

SMOKE_ENTITIES: list[tuple[str, str, str, float]] = [
    ("pt-01", "Node A1", "cohort-a", 92.4),
    ("pt-02", "Node A2", "cohort-a", 84.1),
    ("pt-03", "Node A3", "cohort-a", 73.8),
    ("pt-04", "Node A4", "cohort-a", 65.2),
    ("pt-05", "Node B1", "cohort-b", 61.0),
    ("pt-06", "Node B2", "cohort-b", 55.4),
    ("pt-07", "Node B3", "cohort-b", 48.9),
    ("pt-08", "Node B4", "cohort-b", 44.3),
    ("pt-09", "Node C1", "cohort-c", 38.7),
    ("pt-10", "Node C2", "cohort-c", 31.5),
    ("pt-11", "Node C3", "cohort-c", 24.0),
    ("pt-12", "Node C4", "cohort-c", 18.6),
]


def _make_entities(
    coords_desktop: list[tuple[float, float]],
    coords_mobile: list[tuple[float, float]],
    tones: dict[str, Tone],
    radii: dict[str, float],
    opacities: dict[str, float],
) -> list[EntityState]:
    entities: list[EntityState] = []
    for idx, (entity_id, label, category, value) in enumerate(SMOKE_ENTITIES):
        dx, dy = coords_desktop[idx]
        mx, my = coords_mobile[idx]
        entities.append(
            EntityState(
                id=entity_id,
                label=label,
                category=category,
                value=value,
                radius=radii.get(entity_id, 9.0),
                tone=tones.get(entity_id, "neutral"),
                opacity=opacities.get(entity_id, 0.85),
                desktop=PointPosition(x=dx, y=dy),
                mobile=PointPosition(x=mx, y=my),
            )
        )
    return entities


def build_smoke_story() -> StoryData:
    # Beat 0: Unified baseline distribution (precomputed beeswarm-style cluster)
    beat0_desktop = [
        (360.0, 145.0),
        (435.0, 155.0),
        (320.0, 205.0),
        (395.0, 215.0),
        (470.0, 210.0),
        (285.0, 265.0),
        (355.0, 275.0),
        (430.0, 270.0),
        (510.0, 265.0),
        (325.0, 335.0),
        (405.0, 345.0),
        (475.0, 335.0),
    ]
    beat0_mobile = [
        (155.0, 105.0),
        (205.0, 110.0),
        (125.0, 148.0),
        (178.0, 152.0),
        (232.0, 150.0),
        (108.0, 194.0),
        (156.0, 198.0),
        (206.0, 196.0),
        (254.0, 192.0),
        (134.0, 244.0),
        (184.0, 250.0),
        (232.0, 242.0),
    ]

    beat0 = Beat(
        id="beat-01-baseline",
        index=0,
        kicker="Smoke Beat 01 / 03",
        headline="Twelve persistent marks establish the baseline stage",
        bodySegments=[
            TextSegment(text="This smoke fixture verifies the factory end-to-end with "),
            TextSegment(text="12 persistent-ID entities", tone="accent"),
            TextSegment(
                text=" precomputed in Python for fixed desktop and mobile viewBoxes. "
                "Context marks remain warm neutral gray while focal annotations test "
                "priority-tier filtering across viewports."
            ),
        ],
        takeaway="Baseline object-constancy fixture loaded and validated.",
        chartSubtitle="Fixed-viewBox precomputed layout · 12 entities · neutral baseline",
        entities=_make_entities(
            beat0_desktop,
            beat0_mobile,
            tones={"pt-01": "accent", "pt-12": "secondary"},
            radii={"pt-01": 13.0, "pt-12": 11.5},
            opacities={"pt-01": 1.0, "pt-12": 1.0},
        ),
        annotations=[
            Annotation(
                id="b0-ann-1",
                entityId="pt-01",
                text="Upper benchmark · 92.4",
                priority=1,
                desktop=PointPosition(x=360.0, y=104.0),
                mobile=PointPosition(x=155.0, y=68.0),
                anchor="middle",
            ),
            Annotation(
                id="b0-ann-2",
                entityId="pt-12",
                text="Lower floor · 18.6",
                priority=1,
                desktop=PointPosition(x=475.0, y=384.0),
                mobile=PointPosition(x=232.0, y=288.0),
                anchor="middle",
            ),
            Annotation(
                id="b0-ann-3",
                entityId="pt-06",
                text="Left median edge",
                priority=2,
                desktop=PointPosition(x=195.0, y=268.0),
                mobile=PointPosition(x=80.0, y=194.0),
                anchor="end",
            ),
            Annotation(
                id="b0-ann-4",
                entityId="pt-09",
                text="Right median edge",
                priority=2,
                desktop=PointPosition(x=598.0, y=268.0),
                mobile=PointPosition(x=285.0, y=192.0),
                anchor="start",
            ),
            Annotation(
                id="b0-ann-5",
                entityId="pt-02",
                text="Peer A2 · 84.1",
                priority=3,
                desktop=PointPosition(x=545.0, y=155.0),
                mobile=PointPosition(x=250.0, y=110.0),
                anchor="start",
            ),
        ],
    )

    # Beat 1: Cohort divergence (vermilion vs cobalt split)
    beat1_desktop = [
        (215.0, 145.0),
        (260.0, 185.0),
        (190.0, 225.0),
        (240.0, 265.0),
        (395.0, 245.0),
        (415.0, 295.0),
        (385.0, 345.0),
        (430.0, 385.0),
        (565.0, 165.0),
        (615.0, 210.0),
        (555.0, 255.0),
        (605.0, 300.0),
    ]
    beat1_mobile = [
        (82.0, 112.0),
        (106.0, 152.0),
        (76.0, 194.0),
        (104.0, 234.0),
        (178.0, 178.0),
        (188.0, 218.0),
        (172.0, 256.0),
        (194.0, 292.0),
        (258.0, 118.0),
        (282.0, 160.0),
        (252.0, 202.0),
        (278.0, 244.0),
    ]

    beat1 = Beat(
        id="beat-02-divergence",
        index=1,
        kicker="Smoke Beat 02 / 03",
        headline="Cohorts separate while preserving identity",
        bodySegments=[
            TextSegment(text="Scrolling transitions the same 12 keys into "),
            TextSegment(text="Cohort A (vermilion)", tone="accent"),
            TextSegment(text=" on the left and "),
            TextSegment(text="Cohort C (cobalt)", tone="secondary"),
            TextSegment(
                text=" on the right. Every visual state is computed purely from the "
                "active step index so backward scrolling and jumps self-heal."
            ),
        ],
        takeaway="Pure-projection transitions keep object constancy intact.",
        chartSubtitle="Split-cohort projection · colorblind-safe vermilion vs. cobalt",
        entities=_make_entities(
            beat1_desktop,
            beat1_mobile,
            tones={
                "pt-01": "accent",
                "pt-02": "accent",
                "pt-03": "accent",
                "pt-04": "accent",
                "pt-09": "secondary",
                "pt-10": "secondary",
                "pt-11": "secondary",
                "pt-12": "secondary",
            },
            radii={
                "pt-01": 13.0,
                "pt-02": 11.5,
                "pt-03": 11.0,
                "pt-04": 10.5,
                "pt-09": 11.5,
                "pt-10": 11.0,
                "pt-11": 10.5,
                "pt-12": 11.5,
            },
            opacities={
                "pt-01": 1.0,
                "pt-02": 0.95,
                "pt-03": 0.9,
                "pt-04": 0.9,
                "pt-05": 0.55,
                "pt-06": 0.55,
                "pt-07": 0.55,
                "pt-08": 0.55,
                "pt-09": 1.0,
                "pt-10": 0.95,
                "pt-11": 0.9,
                "pt-12": 0.95,
            },
        ),
        annotations=[
            Annotation(
                id="b1-ann-1",
                entityId="pt-01",
                text="Cohort A · High band",
                priority=1,
                desktop=PointPosition(x=220.0, y=98.0),
                mobile=PointPosition(x=102.0, y=68.0),
                anchor="middle",
            ),
            Annotation(
                id="b1-ann-2",
                entityId="pt-09",
                text="Cohort C · Low band",
                priority=1,
                desktop=PointPosition(x=590.0, y=118.0),
                mobile=PointPosition(x=258.0, y=76.0),
                anchor="middle",
            ),
            Annotation(
                id="b1-ann-3",
                entityId="pt-05",
                text="Middle context · Cohort B",
                priority=2,
                desktop=PointPosition(x=405.0, y=200.0),
                mobile=PointPosition(x=180.0, y=145.0),
                anchor="middle",
            ),
            Annotation(
                id="b1-ann-4",
                entityId="pt-04",
                text="A4 · 65.2",
                priority=3,
                desktop=PointPosition(x=240.0, y=312.0),
                mobile=PointPosition(x=104.0, y=270.0),
                anchor="middle",
            ),
            Annotation(
                id="b1-ann-5",
                entityId="pt-12",
                text="C4 · 18.6",
                priority=3,
                desktop=PointPosition(x=605.0, y=348.0),
                mobile=PointPosition(x=278.0, y=282.0),
                anchor="middle",
            ),
        ],
    )

    # Beat 2: Ranked trajectory highlighting top standouts
    beat2_desktop = [
        (670.0, 112.0),
        (610.0, 152.0),
        (555.0, 198.0),
        (505.0, 232.0),
        (460.0, 255.0),
        (415.0, 278.0),
        (370.0, 300.0),
        (330.0, 320.0),
        (290.0, 340.0),
        (245.0, 362.0),
        (195.0, 382.0),
        (145.0, 402.0),
    ]
    beat2_mobile = [
        (292.0, 88.0),
        (264.0, 114.0),
        (238.0, 140.0),
        (216.0, 162.0),
        (196.0, 180.0),
        (178.0, 198.0),
        (160.0, 214.0),
        (144.0, 230.0),
        (126.0, 246.0),
        (108.0, 262.0),
        (88.0, 278.0),
        (68.0, 294.0),
    ]

    beat2 = Beat(
        id="beat-03-outliers",
        index=2,
        kicker="Smoke Beat 03 / 03",
        headline="Focal outliers anchor the final ranked slope",
        bodySegments=[
            TextSegment(text="The final beat highlights "),
            TextSegment(text="Node A1 (92.4)", tone="accent"),
            TextSegment(text=" against the trailing floor at "),
            TextSegment(text="Node C4 (18.6)", tone="secondary"),
            TextSegment(
                text=". All 12 entities remain rendered and accounted for in manifest.json "
                "so zero points are silently dropped."
            ),
        ],
        takeaway="Factory ready for Phase 1 editorial EDA.",
        chartSubtitle="Ranked progression · all 12 manifest entities retained",
        entities=_make_entities(
            beat2_desktop,
            beat2_mobile,
            tones={"pt-01": "accent", "pt-02": "accent", "pt-12": "secondary"},
            radii={"pt-01": 14.0, "pt-02": 11.5, "pt-12": 12.0},
            opacities={
                "pt-01": 1.0,
                "pt-02": 0.95,
                "pt-03": 0.55,
                "pt-04": 0.55,
                "pt-05": 0.55,
                "pt-06": 0.55,
                "pt-07": 0.55,
                "pt-08": 0.55,
                "pt-09": 0.55,
                "pt-10": 0.55,
                "pt-11": 0.55,
                "pt-12": 1.0,
            },
        ),
        annotations=[
            Annotation(
                id="b2-ann-1",
                entityId="pt-01",
                text="Peak · A1 (92.4)",
                priority=1,
                desktop=PointPosition(x=630.0, y=72.0),
                mobile=PointPosition(x=240.0, y=54.0),
                anchor="middle",
            ),
            Annotation(
                id="b2-ann-2",
                entityId="pt-12",
                text="Floor · C4 (18.6)",
                priority=1,
                desktop=PointPosition(x=185.0, y=444.0),
                mobile=PointPosition(x=122.0, y=332.0),
                anchor="middle",
            ),
            Annotation(
                id="b2-ann-3",
                entityId="pt-02",
                text="Runner-up · A2 (84.1)",
                priority=2,
                desktop=PointPosition(x=468.0, y=148.0),
                mobile=PointPosition(x=180.0, y=114.0),
                anchor="end",
            ),
            Annotation(
                id="b2-ann-4",
                entityId="pt-06",
                text="Midpoint · B2 (55.4)",
                priority=2,
                desktop=PointPosition(x=545.0, y=282.0),
                mobile=PointPosition(x=235.0, y=198.0),
                anchor="start",
            ),
            Annotation(
                id="b2-ann-5",
                entityId="pt-10",
                text="Tail · C2 (31.5)",
                priority=3,
                desktop=PointPosition(x=378.0, y=366.0),
                mobile=PointPosition(x=165.0, y=262.0),
                anchor="start",
            ),
        ],
    )

    return StoryData(
        slug="factory-smoke-fixture",
        title="Scrollytelling Factory Smoke Test",
        dek=(
            "A minimal 3-beat, 12-entity verification fixture confirming Pydantic contracts, "
            "pure-projection motion, responsive sticky layout, and Tier A Playwright audits."
        ),
        byline="Visual Essay Factory · Smoke Harness",
        viewBoxes=ViewBoxes(
            desktop=ViewBox(width=800, height=500),
            mobile=ViewBox(width=360, height=360),
        ),
        beats=[beat0, beat1, beat2],
    )


def main() -> None:
    story = build_smoke_story()
    manifest = build_manifest(story)
    json_schema = StoryData.model_json_schema()

    DATA_OUTPUT_DIR.mkdir(parents=True, exist_ok=True)

    story_path = DATA_OUTPUT_DIR / "story.json"
    schema_path = DATA_OUTPUT_DIR / "story.schema.json"
    manifest_path = DATA_OUTPUT_DIR / "manifest.json"

    story_path.write_text(json.dumps(story.model_dump(), indent=2) + "\n", encoding="utf-8")
    schema_path.write_text(json.dumps(json_schema, indent=2) + "\n", encoding="utf-8")
    manifest_path.write_text(json.dumps(manifest.model_dump(), indent=2) + "\n", encoding="utf-8")

    print(
        f"Emitted smoke fixture ({manifest.beatCount} beats, "
        f"{manifest.totalUniqueEntities} entities) -> {DATA_OUTPUT_DIR}"
    )


if __name__ == "__main__":
    main()
