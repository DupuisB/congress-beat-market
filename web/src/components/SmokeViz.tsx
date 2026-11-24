import { motion } from "framer-motion";
import type { StoryData } from "../schema/story";
import { MOTION, PALETTE, TONE_COLORS } from "../styles/tokens";

interface SmokeVizProps {
  story: StoryData;
  activeStep: number;
  isDesktop: boolean;
}

export function SmokeViz({ story, activeStep, isDesktop }: SmokeVizProps) {
  const safeIndex = Math.max(0, Math.min(activeStep, story.beats.length - 1));
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
              return (
                <motion.g
                  key={entity.id}
                  data-entity-id={entity.id}
                  initial={false}
                  animate={{
                    x: pos.x,
                    y: pos.y,
                    opacity: entity.opacity,
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

      <div className="hidden items-center justify-between border-t border-[#DDD7CC] pt-2 text-xs text-[#5C5852] lg:flex">
        <span>{beat.takeaway}</span>
        <span className="font-mono tabular-nums">
          {beat.entities.length} marks · {visibleAnnotations.length} labels
        </span>
      </div>
    </div>
  );
}
