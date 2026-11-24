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

export const textSegmentSchema = z
  .object({
    text: z.string().min(1),
    tone: highlightToneSchema.nullable().optional(),
  })
  .strict();
export type TextSegment = z.infer<typeof textSegmentSchema>;

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
  })
  .strict();
export type EntityState = z.infer<typeof entityStateSchema>;

export const annotationSchema = z
  .object({
    id: z.string().min(1),
    entityId: z.string().min(1),
    text: z.string().min(1),
    priority: annotationPrioritySchema,
    desktop: pointPositionSchema,
    mobile: pointPositionSchema,
    anchor: labelAnchorSchema,
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
    viewBoxes: z
      .object({
        desktop: viewBoxSchema,
        mobile: viewBoxSchema,
      })
      .strict(),
    beats: z.array(beatSchema).min(1),
  })
  .strict();
export type StoryData = z.infer<typeof storyDataSchema>;

export function parseStoryData(raw: unknown): StoryData {
  return storyDataSchema.parse(raw);
}
