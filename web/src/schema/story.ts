import { z } from "zod";

export const toneSchema = z.enum(["neutral", "accent", "secondary", "tertiary"]);
export type Tone = z.infer<typeof toneSchema>;

export const highlightToneSchema = z.enum(["accent", "secondary", "tertiary"]);
export type HighlightTone = z.infer<typeof highlightToneSchema>;

export const annotationPrioritySchema = z.union([
  z.literal(1),
  z.literal(2),
  z.literal(3),
]);
export type AnnotationPriority = z.infer<typeof annotationPrioritySchema>;

export const labelAnchorSchema = z.enum(["start", "middle", "end"]);
export type LabelAnchor = z.infer<typeof labelAnchorSchema>;

export const partyCodeSchema = z.enum(["D", "R", "I"]);
export type PartyCode = z.infer<typeof partyCodeSchema>;

export const chamberCodeSchema = z.enum(["house", "senate"]);
export type ChamberCode = z.infer<typeof chamberCodeSchema>;

export const layoutTypeSchema = z.enum([
  "default",
  "waffle-split",
  "beeswarm-skew",
  "trimmed-drop",
  "chamber-party",
  "activity-scatter",
  "superstar-anatomy",
  "explorer",
]);
export type LayoutType = z.infer<typeof layoutTypeSchema>;

export const viewBoxSchema = z
  .object({
    width: z.number().int().positive(),
    height: z.number().int().positive(),
  })
  .strict();

export const pointPositionSchema = z
  .object({
    x: z.number().finite(),
    y: z.number().finite(),
  })
  .strict();
export type PointPosition = z.infer<typeof pointPositionSchema>;

export const textSegmentSchema = z
  .object({
    text: z.string().min(1),
    tone: highlightToneSchema.nullable().optional(),
  })
  .strict();
export type TextSegment = z.infer<typeof textSegmentSchema>;

export const guideLineSchema = z
  .object({
    id: z.string().min(1),
    orientation: z.enum(["vertical", "horizontal"]),
    style: z.enum(["zero", "median", "mean", "muted"]).default("muted"),
    desktopStart: pointPositionSchema,
    desktopEnd: pointPositionSchema,
    mobileStart: pointPositionSchema,
    mobileEnd: pointPositionSchema,
    label: z.string().nullable().optional(),
    mobileLabel: z.string().nullable().optional(),
    desktopLabelPos: pointPositionSchema.nullable().optional(),
    mobileLabelPos: pointPositionSchema.nullable().optional(),
    labelAnchor: labelAnchorSchema.default("middle"),
  })
  .strict();
export type GuideLine = z.infer<typeof guideLineSchema>;

export const axisTickSchema = z
  .object({
    id: z.string().min(1),
    text: z.string().min(1),
    mobileText: z.string().nullable().optional(),
    desktop: pointPositionSchema,
    mobile: pointPositionSchema,
    anchor: labelAnchorSchema.default("middle"),
    showOnMobile: z.boolean().default(true),
  })
  .strict();
export type AxisTick = z.infer<typeof axisTickSchema>;

export const laneHeaderSchema = z
  .object({
    id: z.string().min(1),
    text: z.string().min(1),
    mobileText: z.string().nullable().optional(),
    desktop: pointPositionSchema,
    mobile: pointPositionSchema,
    anchor: labelAnchorSchema.default("start"),
    tone: toneSchema.default("neutral"),
  })
  .strict();
export type LaneHeader = z.infer<typeof laneHeaderSchema>;

export const superstarProfileSchema = z
  .object({
    entityId: z.string().min(1),
    name: z.string().min(1),
    party: partyCodeSchema,
    state: z.string().min(1),
    scoredBuys: z.number().int().positive(),
    meanExcess: z.number().finite(),
    medianTradeExcess: z.number().finite(),
    tradeWinRatePct: z.number().finite(),
    topDriver: z.string().min(1),
    desktopMean: pointPositionSchema,
    desktopMedian: pointPositionSchema,
    mobileMean: pointPositionSchema,
    mobileMedian: pointPositionSchema,
  })
  .strict();
export type SuperstarProfile = z.infer<typeof superstarProfileSchema>;

export const entityStateSchema = z
  .object({
    id: z.string().min(1),
    label: z.string().min(1),
    category: z.string().min(1),
    value: z.number().finite(),
    radius: z.number().positive(),
    tone: toneSchema,
    opacity: z.number().min(0).max(1),
    desktop: pointPositionSchema,
    mobile: pointPositionSchema,
    party: partyCodeSchema.nullable().optional(),
    chamber: chamberCodeSchema.nullable().optional(),
    state: z.string().nullable().optional(),
    scoredBuys: z.number().int().nonnegative().nullable().optional(),
    avgExcess: z.number().finite().nullable().optional(),
    weightedExcess: z.number().finite().nullable().optional(),
    avgRet: z.number().finite().nullable().optional(),
    estVolumeUsd: z.number().nonnegative().nullable().optional(),
    desktopAlt: pointPositionSchema.nullable().optional(),
    mobileAlt: pointPositionSchema.nullable().optional(),
  })
  .strict();
export type EntityState = z.infer<typeof entityStateSchema>;

export const annotationSchema = z
  .object({
    id: z.string().min(1),
    entityId: z.string().min(1),
    text: z.string().min(1),
    mobileText: z.string().nullable().optional(),
    priority: annotationPrioritySchema,
    desktop: pointPositionSchema,
    mobile: pointPositionSchema,
    anchor: labelAnchorSchema,
    mobileAnchor: labelAnchorSchema.nullable().optional(),
  })
  .strict();
export type Annotation = z.infer<typeof annotationSchema>;

export const beatSchema = z
  .object({
    id: z.string().min(1),
    index: z.number().int().nonnegative(),
    kicker: z.string().min(1),
    headline: z.string().min(1),
    bodySegments: z.array(textSegmentSchema).min(1),
    takeaway: z.string().min(1),
    chartSubtitle: z.string().min(1),
    mobileChartSubtitle: z.string().nullable().optional(),
    layoutType: layoutTypeSchema.default("default"),
    guides: z.array(guideLineSchema).default([]),
    axisTicks: z.array(axisTickSchema).default([]),
    laneHeaders: z.array(laneHeaderSchema).default([]),
    entities: z.array(entityStateSchema).min(1),
    annotations: z.array(annotationSchema),
  })
  .strict();
export type Beat = z.infer<typeof beatSchema>;

export const storyDataSchema = z
  .object({
    schemaVersion: z.literal("1.0.0"),
    slug: z.string().min(1),
    title: z.string().min(1),
    dek: z.string().min(1),
    byline: z.string().min(1),
    methodologyNote: z.string().nullable().optional(),
    viewBoxes: z
      .object({
        desktop: viewBoxSchema,
        mobile: viewBoxSchema,
      })
      .strict(),
    superstarProfiles: z.array(superstarProfileSchema).default([]),
    beats: z.array(beatSchema).min(1),
  })
  .strict();
export type StoryData = z.infer<typeof storyDataSchema>;

export function parseStoryData(raw: unknown): StoryData {
  return storyDataSchema.parse(raw);
}
