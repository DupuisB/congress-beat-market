import { motion } from "framer-motion";
import { useEffect, useState } from "react";
import type { StoryData } from "../schema/story";
import { MOTION, PALETTE, TONE_COLORS } from "../styles/tokens";

interface SmokeVizProps {
  story: StoryData;
  activeStep: number;
  isDesktop: boolean;
}

const COHORT_FILTERS = [
  { id: "all", label: "All" },
  { id: "cohort-a", label: "Cohort A" },
  { id: "cohort-b", label: "Cohort B" },
  { id: "cohort-c", label: "Cohort C" },
] as const;

type CohortFilterId = (typeof COHORT_FILTERS)[number]["id"];

export function SmokeViz({ story, activeStep, isDesktop }: SmokeVizProps) {
  const safeIndex = Math.max(0, Math.min(activeStep, story.beats.length - 1));
  const isFinalBeat = safeIndex === story.beats.length - 1;
  const [selectedCohort, setSelectedCohort] = useState<CohortFilterId>("all");

  useEffect(() => {
    if (!isFinalBeat) {
      setSelectedCohort("all");
    }
  }, [isFinalBeat]);

  const beat = story.beats[safeIndex];
  if (!beat) {
    return null;
  }

  const viewBox = isDesktop ? story.viewBoxes.desktop : story.viewBoxes.mobile;
  const visibleAnnotations = beat.annotations.filter((ann) =>
    isDesktop ? ann.priority <= 3 : ann.priority === 1,
  );

  const entityMap = new Map(beat.entities.map((entity) => [entity.id, entity]));

  const horizontalGuides = [0.22, 0.5, 0.78].map((ratio) => Math.round(viewBox.height * ratio));
  const verticalGuides = [0.25, 0.5, 0.75].map((ratio) => Math.round(viewBox.width * ratio));

  return (
    <div
      data-viz-stage="true"
      data-beat-id={beat.id}
      className="flex h-full w-full flex-col justify-between px-4 py-3 sm:px-6 lg:px-10 lg:py-8"
      style={{ backgroundColor: PALETTE.paper }}
    >
      <div className="flex items-baseline justify-between gap-4 border-b border-[#DDD7CC] pb-2">
        <p className="shrink-0 whitespace-nowrap font-mono text-[11px] uppercase tracking-[0.08em] text-[#5C5852] tabular-nums">
          {beat.kicker}
        </p>
        <p className="truncate text-right text-xs text-[#5C5852]">{beat.chartSubtitle}</p>
      </div>

      <div className="relative flex min-h-0 flex-1 items-center justify-center py-2 lg:py-4">
        <svg
          viewBox={`0 0 ${viewBox.width} ${viewBox.height}`}
          preserveAspectRatio="xMidYMid meet"
          role="img"
          aria-label={beat.headline}
          className="h-full max-h-full w-full max-w-full overflow-visible"
        >
          {/* Whisper-quiet hairline reference guides */}
          <g aria-hidden="true">
            {horizontalGuides.map((y) => (
              <line
                key={`h-${y}`}
                x1={24}
                x2={viewBox.width - 24}
                y1={y}
                y2={y}
                stroke={PALETTE.rule}
                strokeWidth={1}
                strokeDasharray="3 4"
                opacity={0.75}
              />
            ))}
            {verticalGuides.map((x) => (
              <line
                key={`v-${x}`}
                x1={x}
                x2={x}
                y1={24}
                y2={viewBox.height - 24}
                stroke={PALETTE.rule}
                strokeWidth={1}
                opacity={0.45}
              />
            ))}
          </g>

          {/* Subtle leader lines from focal marks to visible direct labels */}
          <g aria-hidden="true">
            {visibleAnnotations.map((ann) => {
              const entity = entityMap.get(ann.entityId);
              if (!entity) {
                return null;
              }
              const ePos = isDesktop ? entity.desktop : entity.mobile;
              const aPos = isDesktop ? ann.desktop : ann.mobile;
              const dx = aPos.x - ePos.x;
              const dy = aPos.y - ePos.y;
              const dist = Math.hypot(dx, dy);
              if (dist < 1) {
                return null;
              }
              const startPad = entity.radius + 4;
              const endPad = 12;
              if (dist <= startPad + endPad) {
                return null;
              }
              const ux = dx / dist;
              const uy = dy / dist;
              return (
                <line
                  key={`leader-${ann.id}`}
                  x1={ePos.x + ux * startPad}
                  y1={ePos.y + uy * startPad}
                  x2={aPos.x - ux * endPad}
                  y2={aPos.y - uy * endPad}
                  stroke={PALETTE.inkMuted}
                  strokeWidth={1}
                  strokeDasharray="2 2"
                  opacity={0.55}
                />
              );
            })}
          </g>

          {/* Persistent-ID data marks animated via GPU-composited transforms */}
          <g>
            {beat.entities.map((entity) => {
              const pos = isDesktop ? entity.desktop : entity.mobile;
              const fill = TONE_COLORS[entity.tone];
              const isFocal = entity.tone !== "neutral";
              const radius = isDesktop ? entity.radius : Math.max(6, entity.radius * 0.72);
              const matchesFilter =
                !isFinalBeat || selectedCohort === "all" || entity.category === selectedCohort;
              const computedOpacity = matchesFilter
                ? isFinalBeat && selectedCohort !== "all"
                  ? 1
                  : entity.opacity
                : 0.16;
              return (
                <motion.g
                  key={entity.id}
                  data-entity-id={entity.id}
                  initial={false}
                  animate={{
                    x: pos.x,
                    y: pos.y,
                    opacity: computedOpacity,
                  }}
                  transition={{
                    duration: MOTION.durationSec,
                    ease: MOTION.easeOut,
                  }}
                >
                  <circle
                    cx={0}
                    cy={0}
                    r={radius}
                    fill={fill}
                    stroke={isFocal ? PALETTE.paper : PALETTE.inkMuted}
                    strokeWidth={isFocal ? 2 : 0.75}
                    strokeOpacity={isFocal ? 1 : 0.35}
                  />
                </motion.g>
              );
            })}
          </g>

          {/* Direct priority-filtered annotations */}
          <g>
            {visibleAnnotations.map((ann) => {
              const pos = isDesktop ? ann.desktop : ann.mobile;
              const entity = entityMap.get(ann.entityId);
              const isPrimary = ann.priority === 1;
              const fill =
                entity && entity.tone !== "neutral" && isPrimary
                  ? PALETTE.ink
                  : PALETTE.inkMuted;
              return (
                <text
                  key={ann.id}
                  x={pos.x}
                  y={pos.y}
                  textAnchor={ann.anchor}
                  dominantBaseline="central"
                  data-viz-label="true"
                  data-annotation-id={ann.id}
                  data-priority={ann.priority}
                  fill={fill}
                  fontFamily="var(--font-mono)"
                  fontSize={isDesktop ? (isPrimary ? 13 : 11.5) : 11}
                  fontWeight={isPrimary ? 600 : 500}
                  style={{
                    fontVariantNumeric: "tabular-nums",
                    paintOrder: "stroke",
                    stroke: PALETTE.paper,
                    strokeWidth: 4,
                    strokeLinejoin: "round",
                  }}
                >
                  {ann.text}
                </text>
              );
            })}
          </g>
        </svg>
      </div>

      {isFinalBeat ? (
        <div
          data-viz-interactive="true"
          className="flex flex-wrap items-center justify-between gap-2 border-t border-[#DDD7CC] pt-2 text-xs"
        >
          <span className="font-mono text-[11px] uppercase tracking-[0.06em] text-[#5C5852]">
            Explore cohort
          </span>
          <div className="flex flex-wrap items-center gap-1.5" role="group" aria-label="Filter cohorts">
            {COHORT_FILTERS.map((cohort) => {
              const active = selectedCohort === cohort.id;
              return (
                <button
                  key={cohort.id}
                  type="button"
                  data-interactive-control="filter"
                  aria-pressed={active}
                  onClick={() => setSelectedCohort(cohort.id)}
                  className={`cursor-pointer border px-2 py-0.5 font-mono text-[11px] tabular-nums ${
                    active
                      ? "border-[#171614] bg-[#171614] text-[#FAF8F5]"
                      : "border-[#DDD7CC] bg-[#F1EDE6] text-[#171614] hover:border-[#171614]/50"
                  }`}
                >
                  {cohort.label}
                </button>
              );
            })}
          </div>
        </div>
      ) : (
        <div className="hidden items-center justify-between border-t border-[#DDD7CC] pt-2 text-xs text-[#5C5852] lg:flex">
          <span>{beat.takeaway}</span>
          <span className="font-mono tabular-nums">
            {beat.entities.length} marks · {visibleAnnotations.length} labels
          </span>
        </div>
      )}
    </div>
  );
}
