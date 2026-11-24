import type { ReactNode } from "react";
import type { HighlightTone } from "../schema/story";
import { HIGHLIGHT_STYLES } from "../styles/tokens";

interface HighlightProps {
  tone: HighlightTone;
  children: ReactNode;
}

export function Highlight({ tone, children }: HighlightProps) {
  const style = HIGHLIGHT_STYLES[tone];
  return (
    <span
      className="inline-block rounded-[2px] px-1 font-medium"
      style={{
        backgroundColor: style.background,
        color: style.text,
        borderBottom: `2px solid ${style.border}`,
      }}
    >
      {children}
    </span>
  );
}
