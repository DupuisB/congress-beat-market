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
  const subtitleText = isDesktop
    ? beat.chartSubtitle
    : (beat.mobileChartSubtitle ?? beat.chartSubtitle);
  const transitionDuration = auditMode ? 0 : MOTION.durationSec;

  return (
    <div
      data-viz-stage="true"
      data-beat-id={beat.id}
      className="flex h-full w-full flex-col justify-between px-3 py-2.5 sm:px-5 lg:px-10 lg:py-7"
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
      <div className="relative flex min-h-0 flex-1 items-center justify-center py-1 lg:py-3">
        <svg
          viewBox={`0 0 ${viewBox.width} ${viewBox.height}`}
          preserveAspectRatio="xMidYMid meet"
          role="img"
          aria-label={beat.headline}
          className="h-full max-h-full w-full max-w-full overflow-visible"
        >
          {/* Beat 2: subtle warm tint bay behind the 3 set-aside outliers */}
          {beat.layoutType === "trimmed-drop" && (
            <rect
              aria-hidden="true"
              x={isDesktop ? 660 : 306}
              y={isDesktop ? 114 : 98}
              width={isDesktop ? 110 : 42}
              height={isDesktop ? 302 : 202}
              rx={4}
              fill={PALETTE.surface}
              opacity={0.8}
            />
          )}

          {/* Beat-specific hairline guides */}
          <g aria-hidden="true">
            {beat.guides.map((guide) => {
              const start = isDesktop ? guide.desktopStart : guide.mobileStart;
              const end = isDesktop ? guide.desktopEnd : guide.mobileEnd;
              const labelPos = isDesktop ? guide.desktopLabelPos : guide.mobileLabelPos;
              const labelText = isDesktop ? guide.label : guide.mobileLabel;

              const stroke =
                guide.style === "zero"
                  ? PALETTE.ink
                  : guide.style === "median"
                    ? PALETTE.secondary
                    : PALETTE.rule;
              const strokeWidth = guide.style === "zero" ? 1.5 : guide.style === "median" ? 1.6 : 1;
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
                      textAnchor={guide.labelAnchor}
                      dominantBaseline="central"
                      fill={guide.style === "median" ? PALETTE.secondary : PALETTE.inkMuted}
                      fontFamily="var(--font-mono)"
                      fontSize={isDesktop ? 11.5 : 12}
                      fontWeight={guide.style === "zero" || guide.style === "median" ? 600 : 500}
                      style={{
                        fontVariantNumeric: "tabular-nums",
                        paintOrder: "stroke",
                        stroke: PALETTE.paper,
                        strokeWidth: 4.5,
                        strokeLinejoin: "round",
                      }}
                    >
                      {labelText}
                    </text>
                  )}
                </g>
              );
            })}

            {/* Beat 2: visual delta bridge showing mean plunging -3.7% -> -14.0% */}
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
          </g>

          {/* Beat 5: Mean vs. Median trade barbell tracks & cobalt median rings */}
          {beat.layoutType === "superstar-anatomy" && (
            <g aria-hidden="true">
              {/* Compact inline key on both desktop and mobile */}
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
                    fontSize={11.5}
                  >
                    Median
                  </text>
                  <circle cx={82} cy={0} r={4.2} fill={PALETTE.accent} />
                  <text
                    x={91}
                    y={0}
                    dominantBaseline="central"
                    fill={PALETTE.inkMuted}
                    fontFamily="var(--font-mono)"
                    fontSize={11.5}
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
            </g>
          )}

          {/* Lane / group headers rendered above guides with crisp warm-paper halo */}
          <g aria-hidden="true">
            {beat.laneHeaders.map((lh) => {
              const pos = isDesktop ? lh.desktop : lh.mobile;
              const text = isDesktop ? lh.text : (lh.mobileText ?? lh.text);
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
                  fontSize={isDesktop ? 11.5 : 12}
                  fontWeight={600}
                  letterSpacing="0.03em"
                  style={{
                    fontVariantNumeric: "tabular-nums",
                    paintOrder: "stroke",
                    stroke: PALETTE.paper,
                    strokeWidth: 5.5,
                    strokeLinejoin: "round",
                  }}
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
                  fontSize={isDesktop ? 11.5 : 12}
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
                if (!annMatchesFilter) {
                  return null;
                }
                const ePos =
                  isExplorer && weightMode === "dollar"
                    ? (isDesktop
                        ? (entity.desktopAlt ?? entity.desktop)
                        : (entity.mobileAlt ?? entity.mobile))
                    : isDesktop
                      ? entity.desktop
                      : entity.mobile;
                const aPos = isDesktop ? ann.desktop : ann.mobile;
                const dx = aPos.x - ePos.x;
                const dy = aPos.y - ePos.y;
                const dist = Math.hypot(dx, dy);
                if (dist < 1) {
                  return null;
                }
                const startPad = (isDesktop ? entity.radius : entity.radius * 0.72) + 4;
                const endPad = isDesktop ? 12 : 8;
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
                    opacity={0.52}
                  />
                );
              })}
            </g>
          )}

          {/* 127 Persistent-ID lawmaker marks animated strictly via GPU transform & opacity */}
          <g>
            {beat.entities.map((entity) => {
              const pos =
                isExplorer && weightMode === "dollar"
                  ? (isDesktop
                      ? (entity.desktopAlt ?? entity.desktop)
                      : (entity.mobileAlt ?? entity.mobile))
                  : isDesktop
                    ? entity.desktop
                    : entity.mobile;
              const isMatched =
                !isExplorer || matchesExplorerFilter(entity, selectedFilter, searchQuery);
              const isInspected = isExplorer && inspectedId === entity.id;
              const isFocal = entity.tone !== "neutral";
              const isAnnotated = annotatedEntityIds.has(entity.id);
              const showDarkRing =
                isInspected ||
                (beat.layoutType === "waffle-split" && isAnnotated) ||
                (!isFocal && isAnnotated);

              // Desaturate excluded marks to quiet warm neutral gray when explorer filter is active
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

          {/* Direct priority-filtered annotations checked by Tier A */}
          <g>
            {visibleAnnotations.map((ann) => {
              const pos = isDesktop ? ann.desktop : ann.mobile;
              const text = isDesktop ? ann.text : (ann.mobileText ?? ann.text);
              const anchor = isDesktop ? ann.anchor : (ann.mobileAnchor ?? ann.anchor);
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
                  fontSize={isDesktop ? (isPrimary ? 12.5 : 11.5) : 13}
                  fontWeight={isPrimary ? 600 : 500}
                  style={{
                    fontVariantNumeric: "tabular-nums",
                    paintOrder: "stroke",
                    stroke: PALETTE.paper,
                    strokeWidth: 4.5,
                    strokeLinejoin: "round",
                  }}
                >
                  {text}
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
          className="flex flex-col gap-1.5 border-t border-[#DDD7CC] pt-2 text-xs"
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
                    className={`cursor-pointer border px-2 py-0.5 font-mono text-[11px] tabular-nums transition-colors ${
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

            <div className="flex items-center gap-1.5">
              <div
                className="inline-flex border border-[#DDD7CC]"
                role="group"
                aria-label="Return weighting"
              >
                <button
                  type="button"
                  data-interactive-control="weight-equal"
                  aria-pressed={weightMode === "equal"}
                  onClick={() => setWeightMode("equal")}
                  className={`cursor-pointer px-2 py-0.5 font-mono text-[11px] tabular-nums transition-colors ${
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
                  className={`cursor-pointer border-l border-[#DDD7CC] px-2 py-0.5 font-mono text-[11px] tabular-nums transition-colors ${
                    weightMode === "dollar"
                      ? "bg-[#1E5AA8] text-[#FAF8F5]"
                      : "bg-[#F1EDE6] text-[#5C5852] hover:text-[#171614]"
                  }`}
                >
                  $-Wt
                </button>
              </div>

              {isDesktop && (
                <input
                  type="search"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Find member or state…"
                  aria-label="Filter lawmakers by name or state"
                  className="w-[168px] border border-[#DDD7CC] bg-[#FAF8F5] px-2 py-0.5 font-mono text-[11px] text-[#171614] placeholder:text-[#5C5852] focus:border-[#171614] focus:outline-none"
                />
              )}
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
          <span className="truncate pr-4">{beat.takeaway}</span>
          <span className="shrink-0 font-mono text-[11px] tabular-nums">
            {beat.index + 1} / {story.beats.length}
          </span>
        </div>
      )}
    </div>
  );
}
