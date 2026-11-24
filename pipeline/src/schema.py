"""Pydantic contracts for story.json, story.schema.json, and manifest.json."""

from __future__ import annotations

from typing import Literal

from pydantic import BaseModel, ConfigDict, Field, model_validator

Tone = Literal["neutral", "accent", "secondary", "tertiary"]
HighlightTone = Literal["accent", "secondary", "tertiary"]
AnnotationPriority = Literal[1, 2, 3]
LabelAnchor = Literal["start", "middle", "end"]


class StrictModel(BaseModel):
    model_config = ConfigDict(extra="forbid")


class ViewBox(StrictModel):
    width: int = Field(gt=0)
    height: int = Field(gt=0)


class ViewBoxes(StrictModel):
    desktop: ViewBox
    mobile: ViewBox


class PointPosition(StrictModel):
    x: float
    y: float


class TextSegment(StrictModel):
    text: str = Field(min_length=1)
    tone: HighlightTone | None = None


class EntityState(StrictModel):
    id: str = Field(min_length=1)
    label: str = Field(min_length=1)
    category: str = Field(min_length=1)
    value: float
    radius: float = Field(gt=0)
    tone: Tone
    opacity: float = Field(ge=0.0, le=1.0)
    desktop: PointPosition
    mobile: PointPosition


class Annotation(StrictModel):
    id: str = Field(min_length=1)
    entityId: str = Field(min_length=1)
    text: str = Field(min_length=1)
    priority: AnnotationPriority
    desktop: PointPosition
    mobile: PointPosition
    anchor: LabelAnchor = "middle"


class Beat(StrictModel):
    id: str = Field(min_length=1)
    index: int = Field(ge=0)
    kicker: str = Field(min_length=1)
    headline: str = Field(min_length=1)
    bodySegments: list[TextSegment] = Field(min_length=1)
    takeaway: str = Field(min_length=1)
    chartSubtitle: str = Field(min_length=1)
    entities: list[EntityState] = Field(min_length=1)
    annotations: list[Annotation]

    @model_validator(mode="after")
    def validate_beat_integrity(self) -> Beat:
        entity_ids = [entity.id for entity in self.entities]
        if len(entity_ids) != len(set(entity_ids)):
            raise ValueError(f"Beat '{self.id}' contains duplicate entity IDs.")

        entity_id_set = set(entity_ids)
        for annotation in self.annotations:
            if annotation.entityId not in entity_id_set:
                raise ValueError(
                    f"Annotation '{annotation.id}' in beat '{self.id}' references "
                    f"unknown entityId '{annotation.entityId}'."
                )

        priority_1_count = sum(1 for a in self.annotations if a.priority == 1)
        if priority_1_count > 3:
            raise ValueError(
                f"Beat '{self.id}' has {priority_1_count} priority-1 annotations (mobile max is 3)."
            )
        if len(self.annotations) > 8:
            raise ValueError(
                f"Beat '{self.id}' has {len(self.annotations)} annotations (desktop max is 8)."
            )
        return self


class StoryData(StrictModel):
    schemaVersion: Literal["1.0.0"] = "1.0.0"
    slug: str = Field(min_length=1)
    title: str = Field(min_length=1)
    dek: str = Field(min_length=1)
    byline: str = Field(min_length=1)
    viewBoxes: ViewBoxes
    beats: list[Beat] = Field(min_length=1)

    @model_validator(mode="after")
    def validate_story_integrity(self) -> StoryData:
        desktop_vb = self.viewBoxes.desktop
        mobile_vb = self.viewBoxes.mobile

        baseline_ids: set[str] | None = None
        for expected_idx, beat in enumerate(self.beats):
            if beat.index != expected_idx:
                raise ValueError(
                    f"Beat '{beat.id}' has index {beat.index}, expected {expected_idx}."
                )

            current_ids = {entity.id for entity in beat.entities}
            if baseline_ids is None:
                baseline_ids = current_ids
            elif current_ids != baseline_ids:
                raise ValueError(
                    f"Beat '{beat.id}' entity IDs do not match beat 0 for object constancy."
                )

            for entity in beat.entities:
                if not (0 <= entity.desktop.x <= desktop_vb.width):
                    raise ValueError(f"Entity '{entity.id}' desktop.x out of viewBox bounds.")
                if not (0 <= entity.desktop.y <= desktop_vb.height):
                    raise ValueError(f"Entity '{entity.id}' desktop.y out of viewBox bounds.")
                if not (0 <= entity.mobile.x <= mobile_vb.width):
                    raise ValueError(f"Entity '{entity.id}' mobile.x out of viewBox bounds.")
                if not (0 <= entity.mobile.y <= mobile_vb.height):
                    raise ValueError(f"Entity '{entity.id}' mobile.y out of viewBox bounds.")

            for ann in beat.annotations:
                if not (0 <= ann.desktop.x <= desktop_vb.width):
                    raise ValueError(f"Annotation '{ann.id}' desktop.x out of viewBox bounds.")
                if not (0 <= ann.desktop.y <= desktop_vb.height):
                    raise ValueError(f"Annotation '{ann.id}' desktop.y out of viewBox bounds.")
                if not (0 <= ann.mobile.x <= mobile_vb.width):
                    raise ValueError(f"Annotation '{ann.id}' mobile.x out of viewBox bounds.")
                if not (0 <= ann.mobile.y <= mobile_vb.height):
                    raise ValueError(f"Annotation '{ann.id}' mobile.y out of viewBox bounds.")

        return self


class AnnotationPriorityCounts(StrictModel):
    priority1: int = Field(ge=0)
    priority2: int = Field(ge=0)
    priority3: int = Field(ge=0)


class ManifestBeat(StrictModel):
    beatId: str
    index: int = Field(ge=0)
    entityCount: int = Field(gt=0)
    entityIds: list[str] = Field(min_length=1)
    annotationCounts: AnnotationPriorityCounts


class StoryManifest(StrictModel):
    schemaVersion: Literal["1.0.0"] = "1.0.0"
    slug: str
    beatCount: int = Field(gt=0)
    totalUniqueEntities: int = Field(gt=0)
    beats: list[ManifestBeat] = Field(min_length=1)


def build_manifest(story: StoryData) -> StoryManifest:
    unique_ids: set[str] = set()
    manifest_beats: list[ManifestBeat] = []

    for beat in story.beats:
        ids = [entity.id for entity in beat.entities]
        unique_ids.update(ids)
        manifest_beats.append(
            ManifestBeat(
                beatId=beat.id,
                index=beat.index,
                entityCount=len(ids),
                entityIds=ids,
                annotationCounts=AnnotationPriorityCounts(
                    priority1=sum(1 for a in beat.annotations if a.priority == 1),
                    priority2=sum(1 for a in beat.annotations if a.priority == 2),
                    priority3=sum(1 for a in beat.annotations if a.priority == 3),
                ),
            )
        )

    return StoryManifest(
        schemaVersion=story.schemaVersion,
        slug=story.slug,
        beatCount=len(story.beats),
        totalUniqueEntities=len(unique_ids),
        beats=manifest_beats,
    )
