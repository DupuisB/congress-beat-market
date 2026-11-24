import type { HighlightTone, Tone } from "../schema/story";

export const PALETTE = {
  paper: "#FAF8F5",
  surface: "#F1EDE6",
  rule: "#DDD7CC",
  ink: "#171614",
  inkMuted: "#5C5852",
  neutralMark: "#C9C4BA",
  accent: "#D94E2A",
  secondary: "#1E5AA8",
  tertiary: "#2B7A5B",
} as const;

export const TONE_COLORS: Record<Tone, string> = {
  neutral: PALETTE.neutralMark,
  accent: PALETTE.accent,
  secondary: PALETTE.secondary,
  tertiary: PALETTE.tertiary,
};

export const HIGHLIGHT_STYLES: Record<
  HighlightTone,
  { border: string; background: string; text: string }
> = {
  accent: {
    border: PALETTE.accent,
    background: "rgba(217, 78, 42, 0.12)",
    text: "#8F2D12",
  },
  secondary: {
    border: PALETTE.secondary,
    background: "rgba(30, 90, 168, 0.11)",
    text: "#143D75",
  },
  tertiary: {
    border: PALETTE.tertiary,
    background: "rgba(43, 122, 91, 0.12)",
    text: "#1B523C",
  },
};

export const MOTION = {
  easeOut: [0.22, 1, 0.36, 1] as const,
  durationSec: 0.42,
  spring: {
    type: "spring" as const,
    stiffness: 240,
    damping: 28,
  },
} as const;

export const BREAKPOINTS = {
  desktopPx: 1024,
} as const;
