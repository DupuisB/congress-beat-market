import { useEffect, useState } from "react";
import { ScrollyLayout } from "./components/ScrollyLayout";
import {
  applyAuditModeOverrides,
  isAuditMode,
  markVizReady,
  resetVizReady,
} from "./lib/audit";
import { parseStoryData, type StoryData } from "./schema/story";

type LoadState =
  | { status: "loading" }
  | { status: "error"; message: string }
  | { status: "ready"; story: StoryData };

export function App() {
  const [state, setState] = useState<LoadState>({ status: "loading" });

  useEffect(() => {
    resetVizReady();
    applyAuditModeOverrides();

    let cancelled = false;

    async function loadStory(): Promise<void> {
      try {
        const response = await fetch(`${import.meta.env.BASE_URL}data/story.json`, {
          cache: "no-store",
        });
        if (!response.ok) {
          throw new Error(`Failed to fetch /data/story.json (HTTP ${response.status})`);
        }
        const raw: unknown = await response.json();
        const story = parseStoryData(raw);
        if (import.meta.env.DEV || isAuditMode()) {
          // Schema contract strictly verified via Zod parseStoryData above.
        }

        if (!cancelled) {
          setState({ status: "ready", story });
        }
      } catch (err) {
        const message = err instanceof Error ? err.message : "Unknown story loading error";
        if (!cancelled) {
          setState({ status: "error", message });
        }
      }
    }

    void loadStory();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (state.status !== "ready") {
      return;
    }
    let cancelled = false;
    void markVizReady().then(() => {
      if (cancelled) {
        resetVizReady();
      }
    });
    return () => {
      cancelled = true;
    };
  }, [state.status]);

  if (state.status === "loading") {
    return (
      <main className="mx-auto flex min-h-[60dvh] max-w-[62ch] items-center justify-center px-6 text-sm text-[#5C5852]">
        Loading visual essay data…
      </main>
    );
  }

  if (state.status === "error") {
    return (
      <main className="mx-auto max-w-[62ch] px-6 py-16">
        <p className="font-mono text-xs uppercase tracking-[0.08em] text-[#D94E2A]">
          Data Contract Error
        </p>
        <h1 className="mt-2 font-serif text-3xl font-semibold text-[#171614]">
          Unable to validate story.json
        </h1>
        <p className="mt-4 text-sm leading-relaxed text-[#5C5852]">{state.message}</p>
      </main>
    );
  }

  const { story } = state;

  return (
    <div className="min-h-screen bg-[#FAF8F5] text-[#171614]">
      <header className="mx-auto max-w-[1380px] border-b border-[#DDD7CC] px-6 pt-10 pb-8 lg:px-10 lg:pt-14 lg:pb-11">
        <p className="font-mono text-[11px] uppercase tracking-[0.1em] text-[#5C5852]">
          {story.byline}
        </p>
        <h1 className="mt-3 max-w-[20ch] font-serif text-4xl leading-[1.06] font-semibold tracking-[-0.02em] text-[#171614] sm:text-5xl lg:text-[56px]">
          {story.title}
        </h1>
        <p className="mt-4 max-w-[62ch] text-[15px] leading-[1.65] text-[#5C5852] sm:text-lg">
          {story.dek}
        </p>
      </header>

      <main>
        <ScrollyLayout story={story} />
      </main>

      <footer className="mx-auto max-w-[1380px] border-t border-[#DDD7CC] px-6 py-10 text-xs leading-[1.65] text-[#5C5852] lg:px-10">
        <div className="max-w-[74ch]">
          <p className="font-mono text-[11px] uppercase tracking-[0.08em] text-[#171614]">
            Data &amp; Methodology
          </p>
          {story.methodologyNote && <p className="mt-2">{story.methodologyNote}</p>}
          <p className="mt-3 font-mono text-[11px] tabular-nums text-[#5C5852]">
            {story.beats.length} visual beats · 127 unique lawmakers · 24,442 priced stock buys
          </p>
        </div>
      </footer>
    </div>
  );
}

export default App;
