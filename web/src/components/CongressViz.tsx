import { motion } from "framer-motion";
import { useEffect, useMemo, useState } from "react";
import { isAuditMode } from "../lib/audit";
import type { EntityState, StoryData } from "../schema/story";
import { MOTION, PALETTE, TONE_COLORS } from "../styles/tokens";

interface CongressVizProps {
  story: StoryData;
  activeStep: number;
  isDesktop: boolean;
}

type ExplorerFilterId = "all" | "beat" | "trail" | "D" | "R" | "senate";
type WeightMode = "equal" | "dollar";

const EXPLORER_FILTERS: readonly { id: ExplorerFilterId; label: string; mobileLabel: string }[] = [
  { id: "all", label: "All (127)", mobileLabel: "All" },
  { id: "beat", label: "Beat S&P (39)", mobileLabel: "Beat" },
  { id: "trail", label: "Trailed (88)", mobileLabel: "Trailed" },
  { id: "D", label: "Democrats", mobileLabel: "Dem" },
  { id: "R", label: "Republicans", mobileLabel: "Rep" },
  { id: "senate", label: "Senate (19)", mobileLabel: "Senate" },
] as const;

function typographic(text: string): string {
  return text
    .replaceAll(">=", "≥")
    .replaceAll("->", "→")
    .replaceAll("S&P 500", "S&P\u00A0500");
}

function formatSignedPct(value: number | null | undefined): string {
  if (value === null || value === undefined) {
    return "—";
  }
  const sign = value > 0 ? "+" : "";
  return `${sign}${value.toFixed(1)}%`;
}

function formatUsdCompact(usd: number | null | undefined): string {
  if (usd === null || usd === undefined || usd <= 0) {
    return "—";
  }
  if (usd >= 1e6) {
    return `$${(usd / 1e6).toFixed(1)}M`;
  }
  return `$${Math.round(usd / 1e3)}K`;
}

function matchesExplorerFilter(
  entity: EntityState,
  filterId: ExplorerFilterId,
  query: string,
): boolean {
  const trimmed = query.trim().toLowerCase();
  if (trimmed.length > 0) {
    const haystack = `${entity.label} ${entity.state ?? ""} ${entity.party ?? ""}`.toLowerCase();
    if (!haystack.includes(trimmed)) {
      return false;
    }
  }
  if (filterId === "all") {
    return true;
  }
  if (filterId === "beat") {
    return entity.category === "beat";
  }
  if (filterId === "trail") {
    return entity.category === "trail";
  }
  if (filterId === "D" || filterId === "R") {
    return entity.party === filterId;
  }
  if (filterId === "senate") {
    return entity.chamber === "senate";
  }
  return true;
}

export function CongressViz({ story, activeStep, isDesktop }: CongressVizProps) {
  const safeIndex = Math.max(0, Math.min(activeStep, story.beats.length - 1));
  const beat = story.beats[safeIndex];
  const isExplorer = beat?.layoutType === "explorer";
  const auditMode = isAuditMode();

  const [selectedFilter, setSelectedFilter] = useState<ExplorerFilterId>("all");
  const [weightMode, setWeightMode] = useState<WeightMode>("equal");
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [inspectedId, setInspectedId] = useState<string | null>(null);

  useEffect(() => {
    if (!isExplorer) {
      setSelectedFilter("all");
      setWeightMode("equal");
      setSearchQuery("");
      setInspectedId(null);
    }
  }, [isExplorer]);

  const entityMap = useMemo(() => {
    if (!beat) {
      return new Map<string, EntityState>();
    }
    return new Map(beat.entities.map((e) => [e.id, e]));
  }, [beat]);

  if (!beat) {
    return null;
  }

  const viewBox = isDesktop ? story.viewBoxes.desktop : story.viewBoxes.mobile;
  const visibleAnnotations = beat.annotations.filter((ann) =>
    isDesktop ? ann.priority <= 3 : ann.priority === 1,
  );
  const annotatedEntityIds = new Set(visibleAnnotations.map((a) => a.entityId));
  const visibleTicks = beat.axisTicks.filter((tick) => isDesktop || tick.showOnMobile);

  const isFilterActive =
    isExplorer && (selectedFilter !== "all" || searchQuery.trim().length > 0);
  const inspectedEntity = inspectedId ? entityMap.get(inspectedId) ?? null : null;

  const matchedCount = isExplorer
    ? beat.entities.filter((e) => matchesExplorerFilter(e, selectedFilter, searchQuery)).length
    : beat.entities.length;

  const oldMeanGuide = beat.guides.find((g) => g.id === "b2-old-mean");
  const newMeanGuide = beat.guides.find((g) => g.id === "b2-new-mean");
  const subtitleText = typographic(
    isDesktop ? beat.chartSubtitle : (beat.mobileChartSubtitle ?? beat.chartSubtitle),
  );
  const transitionDuration = auditMode ? 0 : MOTION.durationSec;

  return (
    <div
      data-viz-stage="true"
      data-beat-id={beat.id}
      className="flex h-full w-full flex-col justify-between px-3 py-2 sm:px-5 lg:px-10 lg:py-7"
      style={{ backgroundColor: PALETTE.paper }}
    >
      {/* Top hairline graphic header */}
      <div className="flex items-baseline justify-between gap-2 border-b border-[#DDD7CC] pb-1.5 lg:pb-2">
        <p className="shrink-0 whitespace-nowrap font-mono text-[11px] uppercase tracking-[0.07em] text-[#5C5852] tabular-nums">
          {beat.kicker}
        </p>
        <p className="text-right text-[11px] text-[#5C5852] lg:text-xs">{subtitleText}</p>
      </div>

      {/* Main SVG canvas */}
      <div
        className={`relative flex min-h-0 flex-1 items-center justify-center ${
          isExplorer && !isDesktop ? "py-0" : "py-1 lg:py-3"
        }`}
      >
        <svg
          viewBox={`0 0 ${viewBox.width} ${viewBox.height}`}
          preserveAspectRatio="xMidYMid meet"
          role="img"
          aria-label={beat.headline}
          className="h-full max-h-full w-full max-w-full overflow-visible"
        >
          {/* Beat 2: dashed warm-tinted bay behind the 3 set-aside outliers (replaces inner divider) */}
          {beat.layoutType === "trimmed-drop" && (
            <rect
              aria-hidden="true"
              x={isDesktop ? 646 : 292}
              y={isDesktop ? 114 : 98}
              width={isDesktop ? 136 : 64}
              height={isDesktop ? 302 : 202}
              rx={4}
              fill={PALETTE.surface}
              fillOpacity={0.85}
              stroke={PALETTE.rule}
              strokeWidth={1.25}
              strokeDasharray="3 4"
            />
          )}

          {/* Beat-specific hairline guides */}
          <g aria-hidden="true">
            {beat.guides
              .filter((guide) => guide.id !== "b2-outlier-divider")
              .map((guide) => {
                const start = isDesktop ? guide.desktopStart : guide.mobileStart;
                const end = isDesktop ? guide.desktopEnd : guide.mobileEnd;
                const rawLabelPos = isDesktop ? guide.desktopLabelPos : guide.mobileLabelPos;
                const labelPos =
                  !isDesktop && guide.id === "b6-zero-y" && rawLabelPos
                    ? { x: 56, y: rawLabelPos.y - 1 }
                    : rawLabelPos;
                const labelAnchor =
                  !isDesktop && guide.id === "b6-zero-y" ? "start" : guide.labelAnchor;
                const rawLabel = isDesktop
                  ? guide.label
                  : guide.id === "b6-zero-y"
                    ? "S&P\u00A0500"
                    : guide.mobileLabel;
                const labelText = rawLabel ? typographic(rawLabel) : null;

                const stroke =
                  guide.style === "zero"
                    ? PALETTE.ink
                    : guide.style === "median"
                      ? PALETTE.secondary
                      : PALETTE.rule;
                const strokeWidth =
                  guide.style === "zero" ? 1.5 : guide.style === "median" ? 1.6 : 1;
                const strokeDasharray =
                  guide.style === "zero" ? undefined : guide.style === "median" ? "5 4" : "3 4";
                const opacity =
                  guide.style === "zero" ? 0.55 : guide.style === "median" ? 0.85 : 0.8;

                return (
                  <g key={guide.id}>
                    <line
                      x1={start.x}
                      y1={start.y}
                      x2={end.x}
                      y2={end.y}
                      stroke={stroke}
                      strokeWidth={strokeWidth}
                      strokeDasharray={strokeDasharray}
                      opacity={opacity}
                    />
                    {labelText && labelPos && (
                      <text
                        x={labelPos.x}
                        y={labelPos.y}
                        textAnchor={labelAnchor}
                        dominantBaseline="central"
                        fill={guide.style === "median" ? PALETTE.secondary : PALETTE.inkMuted}
                        fontFamily="var(--font-mono)"
                        fontSize={isDesktop ? 11.5 : 12.5}
                        fontWeight={guide.style === "zero" || guide.style === "median" ? 600 : 500}
                        stroke={PALETTE.paper}
                        strokeWidth={4.5}
                        strokeLinejoin="round"
                        paintOrder="stroke"
                        style={{ fontVariantNumeric: "tabular-nums" }}
                      >
                        {labelText}
                      </text>
                    )}
                  </g>
                );
              })}

            {/* Beat 2: visual delta bridge showing mean plunging -3.7% → -14.0% */}
            {beat.layoutType === "trimmed-drop" && oldMeanGuide && newMeanGuide && (
              <g>
                {(() => {
                  const x1 = isDesktop
                    ? oldMeanGuide.desktopStart.x
                    : oldMeanGuide.mobileStart.x;
                  const x2 = isDesktop
                    ? newMeanGuide.desktopStart.x
                    : newMeanGuide.mobileStart.x;
                  const y = isDesktop ? 124 : 98;
                  return (
                    <>
                      <line
                        x1={x1}
                        y1={y}
                        x2={x2 + 4}
                        y2={y}
                        stroke={PALETTE.secondary}
                        strokeWidth={2}
                      />
                      <polygon
                        points={`${x2},${y} ${x2 + 6},${y - 3.5} ${x2 + 6},${y + 3.5}`}
                        fill={PALETTE.secondary}
                      />
                    </>
                  );
                })()}
              </g>
            )}

            {/* Beat 3: subtle chamber mean ticks + Senate ex-Whitehouse (-16.8%) → full (+9.0%) shift */}
            {beat.layoutType === "chamber-party" && (
              <g>
                {(() => {
                  const senExX = isDesktop ? 354.5 : 124.7;
                  const senAllX = isDesktop ? 398.1 : 148.5;
                  const houseDX = isDesktop ? 373.1 : 134.8;
                  const houseRX = isDesktop ? 372.8 : 134.7;
                  const sepY = isDesktop ? 158 : 126;
                  return (
                    <>
                      {/* House D & House R mean ticks */}
                      <line
                        x1={houseDX}
                        x2={houseDX}
                        y1={isDesktop ? 268 : 216}
                        y2={isDesktop ? 320 : 244}
                        stroke={PALETTE.inkMuted}
                        strokeWidth={1.5}
                        strokeDasharray="3 3"
                        opacity={0.7}
                      />
                      <line
                        x1={houseRX}
                        x2={houseRX}
                        y1={isDesktop ? 362 : 284}
                        y2={isDesktop ? 414 : 312}
                        stroke={PALETTE.inkMuted}
                        strokeWidth={1.5}
                        strokeDasharray="3 3"
                        opacity={0.7}
                      />
                      {/* Senate ex-Whitehouse mean tick (-16.8%) & full Senate mean tick (+9.0%) */}
                      <line
                        x1={senExX}
                        x2={senExX}
                        y1={isDesktop ? 146 : 117}
                        y2={isDesktop ? 170 : 135}
                        stroke={PALETTE.secondary}
                        strokeWidth={2}
                      />
                      <line
                        x1={senAllX}
                        x2={senAllX}
                        y1={isDesktop ? 146 : 117}
                        y2={isDesktop ? 170 : 135}
                        stroke={PALETTE.accent}
                        strokeWidth={2}
                      />
                      <line
                        x1={senExX}
                        x2={senAllX - 5}
                        y1={sepY}
                        y2={sepY}
                        stroke={PALETTE.accent}
                        strokeWidth={2}
                      />
                      <polygon
                        points={`${senAllX},${sepY} ${senAllX - 6},${sepY - 3.5} ${senAllX - 6},${sepY + 3.5}`}
                        fill={PALETTE.accent}
                      />
                      <text
                        x={isDesktop ? 410 : 158}
                        y={sepY}
                        textAnchor="start"
                        dominantBaseline="central"
                        fill={PALETTE.accent}
                        fontFamily="var(--font-mono)"
                        fontSize={isDesktop ? 11 : 11.5}
                        fontWeight={600}
                        stroke={PALETTE.paper}
                        strokeWidth={5}
                        strokeLinejoin="round"
                        paintOrder="stroke"
                        style={{ fontVariantNumeric: "tabular-nums" }}
                      >
                        {isDesktop ? "Senate avg: -16.8% → +9.0%" : "Sen avg -17% → +9%"}
                      </text>
                    </>
                  );
                })()}
              </g>
            )}
          </g>

          {/* Beat 5: Mean vs. Median trade barbell tracks & cobalt median rings */}
          {beat.layoutType === "superstar-anatomy" && (
            <g aria-hidden="true">
              {isDesktop ? (
                <g transform="translate(522, 62)">
                  <circle
                    cx={0}
                    cy={0}
                    r={5}
                    fill={PALETTE.paper}
                    stroke={PALETTE.secondary}
                    strokeWidth={2.2}
                  />
                  <text
                    x={11}
                    y={0}
                    dominantBaseline="central"
                    fill={PALETTE.inkMuted}
                    fontFamily="var(--font-mono)"
                    fontSize={11}
                  >
                    Median trade
                  </text>
                  <circle cx={124} cy={0} r={5} fill={PALETTE.accent} />
                  <text
                    x={135}
                    y={0}
                    dominantBaseline="central"
                    fill={PALETTE.inkMuted}
                    fontFamily="var(--font-mono)"
                    fontSize={11}
                  >
                    Mean excess
                  </text>
                </g>
              ) : (
                <g transform="translate(184, 46)">
                  <circle
                    cx={0}
                    cy={0}
                    r={4.2}
                    fill={PALETTE.paper}
                    stroke={PALETTE.secondary}
                    strokeWidth={2}
                  />
                  <text
                    x={9}
                    y={0}
                    dominantBaseline="central"
                    fill={PALETTE.inkMuted}
                    fontFamily="var(--font-mono)"
                    fontSize={12}
                  >
                    Median
                  </text>
                  <circle cx={84} cy={0} r={4.2} fill={PALETTE.accent} />
                  <text
                    x={93}
                    y={0}
                    dominantBaseline="central"
                    fill={PALETTE.inkMuted}
                    fontFamily="var(--font-mono)"
                    fontSize={12}
                  >
                    Mean
                  </text>
                </g>
              )}

              {story.superstarProfiles.map((prof) => {
                const meanPos = isDesktop ? prof.desktopMean : prof.mobileMean;
                const medPos = isDesktop ? prof.desktopMedian : prof.mobileMedian;
                return (
                  <g key={`bb-${prof.entityId}`}>
                    <line
                      x1={isDesktop ? 84 : 24}
                      x2={isDesktop ? 732 : 336}
                      y1={meanPos.y}
                      y2={meanPos.y}
                      stroke={PALETTE.rule}
                      strokeWidth={1}
                      opacity={0.7}
                    />
                    <line
                      x1={medPos.x}
                      y1={medPos.y}
                      x2={meanPos.x}
                      y2={meanPos.y}
                      stroke={PALETTE.accent}
                      strokeWidth={isDesktop ? 3.5 : 2.8}
                      strokeLinecap="round"
                      opacity={0.55}
                    />
                    <circle
                      cx={medPos.x}
                      cy={medPos.y}
                      r={isDesktop ? 7.5 : 5.5}
                      fill={PALETTE.paper}
                      stroke={PALETTE.secondary}
                      strokeWidth={2.5}
                    />
                  </g>
                );
              })}
            </g>
          )}

          {/* Beat 5: opaque paper header strips cleanly break the vertical 0% rule behind text */}
          {beat.layoutType === "superstar-anatomy" && (
            <g aria-hidden="true">
              {beat.laneHeaders
                .filter((lh) => lh.id !== "b5-lh-rest")
                .map((lh) => {
                  const pos = isDesktop ? lh.desktop : lh.mobile;
                  return (
                    <rect
                      key={`mask-${lh.id}`}
                      x={isDesktop ? 76 : 16}
                      y={pos.y - (isDesktop ? 11 : 10)}
                      width={isDesktop ? 664 : 328}
                      height={isDesktop ? 22 : 20}
                      fill={PALETTE.paper}
                    />
                  );
                })}
              {/* Crisp hairline separating the barbell % axis from the ranked 123-lawmaker strip */}
              <line
                x1={isDesktop ? 64 : 24}
                x2={isDesktop ? 736 : 336}
                y1={isDesktop ? 396 : 301}
                y2={isDesktop ? 396 : 301}
                stroke={PALETTE.rule}
                strokeWidth={1}
                strokeDasharray="3 3"
              />
            </g>
          )}

          {/* Lane / group headers rendered above guides with crisp warm-paper halo */}
          <g aria-hidden="true">
            {beat.laneHeaders.map((lh) => {
              const pos = isDesktop ? lh.desktop : lh.mobile;
              const rawText = isDesktop ? lh.text : (lh.mobileText ?? lh.text);
              const text = typographic(
                lh.id === "b5-lh-rest"
                  ? isDesktop
                    ? "OTHER 123 LAWMAKERS · RANKED LOW TO HIGH"
                    : "OTHER 123 · RANKED LOW TO HIGH"
                  : !isDesktop && beat.layoutType === "superstar-anatomy"
                    ? rawText.replace(" win)", ")")
                    : rawText,
              );
              const isSuperstarRow =
                beat.layoutType === "superstar-anatomy" && lh.id !== "b5-lh-rest";
              const fill = isSuperstarRow
                ? PALETTE.ink
                : lh.tone === "accent"
                  ? PALETTE.accent
                  : lh.tone === "secondary"
                    ? PALETTE.secondary
                    : PALETTE.inkMuted;
              return (
                <text
                  key={lh.id}
                  x={pos.x}
                  y={pos.y}
                  textAnchor={lh.anchor}
                  dominantBaseline="central"
                  fill={fill}
                  fontFamily="var(--font-mono)"
                  fontSize={
                    lh.id === "b2-parked-hdr"
                      ? isDesktop
                        ? 11
                        : 11.5
                      : isDesktop
                        ? 11.5
                        : 12
                  }
                  fontWeight={600}
                  letterSpacing={lh.id === "b2-parked-hdr" ? "0.02em" : "0.03em"}
                  stroke={PALETTE.paper}
                  strokeWidth={5.5}
                  strokeLinejoin="round"
                  paintOrder="stroke"
                  style={{ fontVariantNumeric: "tabular-nums" }}
                >
                  {text}
                </text>
              );
            })}
          </g>

          {/* Clean axis ticks */}
          <g aria-hidden="true">
            {visibleTicks.map((tick) => {
              const pos = isDesktop ? tick.desktop : tick.mobile;
              const text = isDesktop ? tick.text : (tick.mobileText ?? tick.text);
              return (
                <text
                  key={tick.id}
                  x={pos.x}
                  y={pos.y}
                  textAnchor={tick.anchor}
                  dominantBaseline="central"
                  fill={PALETTE.inkMuted}
                  fontFamily="var(--font-mono)"
                  fontSize={isDesktop ? 11.5 : isExplorer ? 13.5 : 12.5}
                  style={{ fontVariantNumeric: "tabular-nums" }}
                >
                  {text}
                </text>
              );
            })}
          </g>

          {/* Subtle leader lines from focal marks to visible direct labels */}
          {beat.layoutType !== "superstar-anatomy" && (
            <g aria-hidden="true">
              {visibleAnnotations.map((ann) => {
                const entity = entityMap.get(ann.entityId);
                if (!entity) {
                  return null;
                }
                const annMatchesFilter =
                  !isFilterActive || matchesExplorerFilter(entity, selectedFilter, searchQuery);
                if (!annMatchesFilter || ann.id === "b2-ann-parked") {
                  return null;
                }
                const rawEPos =
                  isExplorer && weightMode === "dollar"
                    ? (isDesktop
                        ? (entity.desktopAlt ?? entity.desktop)
                        : (entity.mobileAlt ?? entity.mobile))
                    : isDesktop
                      ? entity.desktop
                      : entity.mobile;
                const ePos =
                  !isDesktop && beat.layoutType === "waffle-split"
                    ? { x: rawEPos.x, y: rawEPos.y + 10 }
                    : rawEPos;
                const rawAPos = isDesktop ? ann.desktop : ann.mobile;
                const aPos =
                  !isDesktop && ann.id === "b0-ann-marshall"
                    ? { x: rawAPos.x, y: rawAPos.y - 4 }
                    : !isDesktop && ann.id === "b2-ann-pelosi"
                      ? { x: rawAPos.x - 16, y: rawAPos.y }
                      : isDesktop && ann.id === "b4-ann-tuberville"
                        ? { x: 356, y: 408 }
                        : rawAPos;

                // Beat 4 desktop: route Tuberville leader cleanly below swarm left of 200-buy line
                if (isDesktop && ann.id === "b4-ann-tuberville") {
                  const startY = ePos.y + entity.radius + 4;
                  return (
                    <path
                      key={`leader-${ann.id}`}
                      d={`M ${ePos.x} ${startY} L ${ePos.x} 388 L ${aPos.x + 8} ${aPos.y}`}
                      fill="none"
                      stroke={PALETTE.inkMuted}
                      strokeWidth={1}
                      strokeDasharray="2 2"
                      opacity={0.55}
                    />
                  );
                }

                // Beat 6 mobile: anchor Marshall/Whitehouse leaders from bottom-center of each label
                const targetAPos =
                  !isDesktop && ann.id === "b6-ann-marshall"
                    ? { x: 104, y: aPos.y + 8 }
                    : !isDesktop && ann.id === "b6-ann-whitehouse"
                      ? { x: 278, y: aPos.y + 8 }
                      : aPos;

                const dx = targetAPos.x - ePos.x;
                const dy = targetAPos.y - ePos.y;
                const dist = Math.hypot(dx, dy);
                if (dist < 1) {
                  return null;
                }
                const startPad = (isDesktop ? entity.radius : entity.radius * 0.72) + 4;
                const endPad =
                  !isDesktop && (ann.id === "b6-ann-marshall" || ann.id === "b6-ann-whitehouse")
                    ? 2
                    : isDesktop
                      ? 12
                      : 8;
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
                    x2={targetAPos.x - ux * endPad}
                    y2={targetAPos.y - uy * endPad}
                    stroke={PALETTE.inkMuted}
                    strokeWidth={1}
                    strokeDasharray="2 2"
                    opacity={0.52}
                  />
                );
              })}
            </g>
          )}

          {/* 127 Persistent-ID lawmaker marks animated strictly via GPU transform & opacity */}
          <g>
            {beat.entities.map((entity) => {
              const rawPos =
                isExplorer && weightMode === "dollar"
                  ? (isDesktop
                      ? (entity.desktopAlt ?? entity.desktop)
                      : (entity.mobileAlt ?? entity.mobile))
                  : isDesktop
                    ? entity.desktop
                    : entity.mobile;
              const pos =
                !isDesktop && beat.layoutType === "waffle-split"
                  ? { x: rawPos.x, y: rawPos.y + 10 }
                  : rawPos;
              const isMatched =
                !isExplorer || matchesExplorerFilter(entity, selectedFilter, searchQuery);
              const isInspected = isExplorer && inspectedId === entity.id;
              const isFocal = entity.tone !== "neutral";
              const isAnnotated = annotatedEntityIds.has(entity.id);
              const isParkedOutlier =
                beat.layoutType === "trimmed-drop" &&
                entity.id === "house_barbarajhonorable_comstock";
              const showDarkRing =
                isInspected ||
                (!isParkedOutlier &&
                  ((beat.layoutType === "waffle-split" ||
                    beat.layoutType === "trimmed-drop" ||
                    beat.layoutType === "activity-scatter") &&
                    isAnnotated)) ||
                (!isFocal && isAnnotated && !isParkedOutlier);

              const fill =
                isFilterActive && !isMatched ? PALETTE.neutralMark : TONE_COLORS[entity.tone];
              const radius = isDesktop ? entity.radius : Math.max(3.2, entity.radius * 0.68);

              const computedOpacity = isExplorer
                ? isInspected
                  ? 1
                  : isMatched
                    ? isFilterActive
                      ? 0.94
                      : entity.opacity
                    : 0.14
                : entity.opacity;

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
                    duration: transitionDuration,
                    ease: MOTION.easeOut,
                  }}
                  style={{ cursor: isExplorer ? "pointer" : "default" }}
                  onClick={
                    isExplorer
                      ? () => setInspectedId((prev) => (prev === entity.id ? null : entity.id))
                      : undefined
                  }
                  onMouseEnter={isExplorer ? () => setInspectedId(entity.id) : undefined}
                >
                  <circle
                    cx={0}
                    cy={0}
                    r={isInspected ? radius + 2.5 : radius}
                    fill={fill}
                    stroke={
                      showDarkRing
                        ? PALETTE.ink
                        : isFilterActive && !isMatched
                          ? PALETTE.inkMuted
                          : isFocal
                            ? PALETTE.paper
                            : PALETTE.inkMuted
                    }
                    strokeWidth={
                      isInspected
                        ? 2.2
                        : showDarkRing
                          ? 1.75
                          : isFocal
                            ? 1.5
                            : 0.75
                    }
                    strokeOpacity={
                      isInspected || showDarkRing || isFocal
                        ? 1
                        : isFilterActive && !isMatched
                          ? 0.2
                          : 0.35
                    }
                  />
                </motion.g>
              );
            })}
          </g>

          {/* Beat 1: Mean (-3.7%) overlay drawn ABOVE dots with arrow & label cleanly below swarm */}
          {beat.layoutType === "beeswarm-skew" && (
            <g aria-hidden="true">
              {(() => {
                const mx = isDesktop ? 202.2 : 90.5;
                const yTop = isDesktop ? 390 : 292;
                const yBot = isDesktop ? 426 : 313;
                const lx = isDesktop ? 222 : 106;
                const ly = isDesktop ? 420 : 310;
                return (
                  <>
                    <line
                      x1={mx}
                      y1={yTop}
                      x2={mx}
                      y2={yBot}
                      stroke={PALETTE.accent}
                      strokeWidth={1.8}
                      strokeDasharray="3 2"
                    />
                    <polygon
                      points={`${mx},${yBot} ${mx - 3.5},${yBot - 6} ${mx + 3.5},${yBot - 6}`}
                      fill={PALETTE.accent}
                    />
                    <line
                      x1={mx + 3}
                      y1={ly}
                      x2={lx - 4}
                      y2={ly}
                      stroke={PALETTE.accent}
                      strokeWidth={1}
                      opacity={0.75}
                    />
                    <text
                      x={lx}
                      y={ly}
                      textAnchor="start"
                      dominantBaseline="central"
                      fill={PALETTE.accent}
                      fontFamily="var(--font-mono)"
                      fontSize={isDesktop ? 11.5 : 12}
                      fontWeight={600}
                      stroke={PALETTE.paper}
                      strokeWidth={4.5}
                      strokeLinejoin="round"
                      paintOrder="stroke"
                      style={{ fontVariantNumeric: "tabular-nums" }}
                    >
                      Mean -3.7%
                    </text>
                  </>
                );
              })()}
            </g>
          )}

          {/* Direct priority-filtered annotations checked by Tier A */}
          <g>
            {visibleAnnotations.map((ann) => {
              const rawPos = isDesktop ? ann.desktop : ann.mobile;
              const pos =
                !isDesktop && ann.id === "b0-ann-marshall"
                  ? { x: rawPos.x, y: rawPos.y - 4 }
                  : !isDesktop && ann.id === "b2-ann-pelosi"
                    ? { x: rawPos.x - 16, y: rawPos.y }
                    : isDesktop && ann.id === "b2-ann-parked"
                      ? { x: 714, y: 372 }
                      : isDesktop && ann.id === "b4-ann-tuberville"
                        ? { x: 356, y: 408 }
                        : rawPos;
              const rawText = isDesktop ? ann.text : (ann.mobileText ?? ann.text);
              const text = typographic(
                !isDesktop && beat.layoutType === "superstar-anatomy"
                  ? rawText
                      .replace("Med ", "")
                      .replace(" vs ", " → ")
                      .replace("+337.5%", "+338%")
                  : rawText,
              );
              const anchor =
                isDesktop && ann.id === "b2-ann-parked"
                  ? "middle"
                  : isDesktop && ann.id === "b4-ann-tuberville"
                    ? "end"
                    : isDesktop
                      ? ann.anchor
                      : (ann.mobileAnchor ?? ann.anchor);
              const entity = entityMap.get(ann.entityId);
              const annMatchesFilter =
                !isFilterActive ||
                (entity ? matchesExplorerFilter(entity, selectedFilter, searchQuery) : true);
              if (!annMatchesFilter) {
                return null;
              }
              const isPrimary = ann.priority === 1;
              const fill =
                entity && entity.tone !== "neutral" && isPrimary
                  ? PALETTE.ink
                  : PALETTE.inkMuted;
              const isParkedTwoLine = isDesktop && ann.id === "b2-ann-parked";
              return (
                <text
                  key={ann.id}
                  x={pos.x}
                  y={pos.y}
                  textAnchor={anchor}
                  dominantBaseline="central"
                  data-viz-label="true"
                  data-annotation-id={ann.id}
                  data-priority={ann.priority}
                  fill={fill}
                  fontFamily="var(--font-mono)"
                  fontSize={
                    isParkedTwoLine ? 10.5 : isDesktop ? (isPrimary ? 12.5 : 11.5) : 13
                  }
                  fontWeight={isPrimary ? 600 : 500}
                  stroke={PALETTE.paper}
                  strokeWidth={5}
                  strokeLinejoin="round"
                  paintOrder="stroke"
                  style={{ fontVariantNumeric: "tabular-nums" }}
                >
                  {isParkedTwoLine ? (
                    <>
                      <tspan x={pos.x} dy="-0.55em">
                        3 outliers
                      </tspan>
                      <tspan x={pos.x} dy="1.3em">
                        +228% to +565%
                      </tspan>
                    </>
                  ) : (
                    text
                  )}
                </text>
              );
            })}
          </g>
        </svg>
      </div>

      {/* Bottom strip: interactive explorer controls on Beat 6, concise takeaway on Beats 0–5 */}
      {isExplorer ? (
        <div
          data-viz-interactive="true"
          className="flex flex-col gap-1 border-t border-[#DDD7CC] pt-1.5 text-xs lg:gap-1.5 lg:pt-2"
        >
          <div className="flex flex-wrap items-center justify-between gap-1.5">
            <div
              className="flex flex-wrap items-center gap-1"
              role="group"
              aria-label="Filter lawmakers"
            >
              {EXPLORER_FILTERS.map((flt) => {
                const active = selectedFilter === flt.id;
                return (
                  <button
                    key={flt.id}
                    type="button"
                    data-interactive-control="filter"
                    aria-pressed={active}
                    onClick={() => setSelectedFilter(flt.id)}
                    className={`min-h-[28px] cursor-pointer border px-2 py-1 font-mono text-[11px] tabular-nums transition-colors lg:min-h-0 lg:py-0.5 ${
                      active
                        ? "border-[#171614] bg-[#171614] text-[#FAF8F5]"
                        : "border-[#DDD7CC] bg-[#F1EDE6] text-[#171614] hover:border-[#171614]/50"
                    }`}
                  >
                    {isDesktop ? flt.label : flt.mobileLabel}
                  </button>
                );
              })}
            </div>

            <div className="flex w-full items-center gap-1.5 lg:w-auto">
              <div
                className="inline-flex shrink-0 border border-[#DDD7CC]"
                role="group"
                aria-label="Return weighting"
              >
                <button
                  type="button"
                  data-interactive-control="weight-equal"
                  aria-pressed={weightMode === "equal"}
                  onClick={() => setWeightMode("equal")}
                  className={`min-h-[28px] cursor-pointer px-2 py-1 font-mono text-[11px] tabular-nums transition-colors lg:min-h-0 lg:py-0.5 ${
                    weightMode === "equal"
                      ? "bg-[#171614] text-[#FAF8F5]"
                      : "bg-[#F1EDE6] text-[#5C5852] hover:text-[#171614]"
                  }`}
                >
                  Equal-Wt
                </button>
                <button
                  type="button"
                  data-interactive-control="weight-dollar"
                  aria-pressed={weightMode === "dollar"}
                  onClick={() => setWeightMode("dollar")}
                  className={`min-h-[28px] cursor-pointer border-l border-[#DDD7CC] px-2 py-1 font-mono text-[11px] tabular-nums transition-colors lg:min-h-0 lg:py-0.5 ${
                    weightMode === "dollar"
                      ? "bg-[#1E5AA8] text-[#FAF8F5]"
                      : "bg-[#F1EDE6] text-[#5C5852] hover:text-[#171614]"
                  }`}
                >
                  $-Wt
                </button>
              </div>

              <input
                type="search"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder={isDesktop ? "Find member or state…" : "Find member…"}
                aria-label="Filter lawmakers by name or state"
                className="min-h-[28px] min-w-[110px] flex-1 border border-[#DDD7CC] bg-[#FAF8F5] px-2 py-1 font-mono text-[11px] text-[#171614] placeholder:text-[#5C5852] focus:border-[#171614] focus:outline-none lg:min-h-0 lg:w-[168px] lg:flex-none lg:py-0.5"
              />
            </div>
          </div>

          <div className="flex items-center justify-between gap-2 text-[11px] text-[#5C5852] tabular-nums">
            {inspectedEntity ? (
              <span className="truncate font-mono text-[#171614]">
                <strong>{inspectedEntity.label}</strong> ({inspectedEntity.party}-
                {inspectedEntity.state}) · {inspectedEntity.scoredBuys} buys · Eq{" "}
                {formatSignedPct(inspectedEntity.avgExcess)} · $Wt{" "}
                {formatSignedPct(inspectedEntity.weightedExcess)} · Vol{" "}
                {formatUsdCompact(inspectedEntity.estVolumeUsd)}
              </span>
            ) : (
              <span>
                Showing{" "}
                <strong className="font-mono text-[#171614]">
                  {matchedCount}/{beat.entities.length}
                </strong>{" "}
                ({weightMode === "equal" ? "equal-wt" : "$-weighted"}) ·{" "}
                {isDesktop ? "Click any dot" : "Tap dot"}
              </span>
            )}
            {isDesktop && inspectedEntity && (
              <button
                type="button"
                onClick={() => setInspectedId(null)}
                className="shrink-0 cursor-pointer font-mono text-[11px] text-[#5C5852] underline hover:text-[#171614]"
              >
                Clear
              </button>
            )}
          </div>
        </div>
      ) : (
        <div className="hidden items-center justify-between border-t border-[#DDD7CC] pt-2 text-xs text-[#5C5852] lg:flex">
          <span className="truncate pr-4">{typographic(beat.takeaway)}</span>
          <span className="shrink-0 font-mono text-[11px] tabular-nums">
            {beat.index + 1} / {story.beats.length}
          </span>
        </div>
      )}
    </div>
  );
}
