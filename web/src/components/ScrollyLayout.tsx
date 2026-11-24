import { MotionConfig } from "framer-motion";
import { useEffect, useState } from "react";
import { Scrollama, Step } from "react-scrollama";
import { isAuditMode } from "../lib/audit";
import type { StoryData } from "../schema/story";
import { BREAKPOINTS } from "../styles/tokens";
import { CongressViz } from "./CongressViz";
import { Highlight } from "./Highlight";

interface ScrollyLayoutProps {
  story: StoryData;
}

interface StepEnterEvent {
  data: number;
}

function useIsDesktop(): boolean {
  const [isDesktop, setIsDesktop] = useState<boolean>(() => {
    if (typeof window === "undefined") {
      return true;
    }
    return window.matchMedia(`(min-width: ${BREAKPOINTS.desktopPx}px)`).matches;
  });

  useEffect(() => {
    const mediaQuery = window.matchMedia(`(min-width: ${BREAKPOINTS.desktopPx}px)`);
    const update = () => setIsDesktop(mediaQuery.matches);
    update();
    mediaQuery.addEventListener("change", update);
    return () => mediaQuery.removeEventListener("change", update);
  }, []);

  return isDesktop;
}

export function ScrollyLayout({ story }: ScrollyLayoutProps) {
  const [activeStep, setActiveStep] = useState<number>(0);
  const [scrollProgress, setScrollProgress] = useState<number>(0);
  const isDesktop = useIsDesktop();
  const auditMode = isAuditMode();

  useEffect(() => {
    const updateProgress = () => {
      const scrollable = document.documentElement.scrollHeight - window.innerHeight;
      if (scrollable <= 0) {
        setScrollProgress(0);
        return;
      }
      const next = Math.max(0, Math.min(1, window.scrollY / scrollable));
      setScrollProgress(next);
    };

    updateProgress();
    window.addEventListener("scroll", updateProgress, { passive: true });
    window.addEventListener("resize", updateProgress);
    return () => {
      window.removeEventListener("scroll", updateProgress);
      window.removeEventListener("resize", updateProgress);
    };
  }, []);

  const handleStepEnter = ({ data }: StepEnterEvent) => {
    if (typeof data === "number" && data >= 0 && data < story.beats.length) {
      setActiveStep(data);
    }
  };

  return (
    <MotionConfig reducedMotion={auditMode ? "always" : "user"}>
      {/* 2px top reading-progress hairline (GPU-composited scaleX) */}
      <div
        aria-hidden="true"
        className="pointer-events-none fixed inset-x-0 top-0 z-50 h-[2px] bg-[#DDD7CC]/60"
      >
        <div
          className="h-full w-full origin-left bg-[#D94E2A]"
          style={{ transform: `scaleX(${scrollProgress})` }}
        />
      </div>

      <section
        aria-label="Interactive visual story"
        data-active-step={activeStep}
        className="relative mx-auto flex w-full max-w-[1380px] flex-col lg:flex-row-reverse lg:items-start"
      >
        {/* Single responsive sticky stage: top 50dvh on mobile, right 100dvh split on desktop */}
        <div className="sticky top-0 z-20 h-[50dvh] w-full border-b border-[#DDD7CC] bg-[#FAF8F5] lg:h-[100dvh] lg:flex-1 lg:border-b-0 lg:border-l">
          <CongressViz story={story} activeStep={activeStep} isDesktop={isDesktop} />
        </div>

        {/* Prose rail: centered warm cards on mobile, 404px left column on desktop */}
        <div className="relative z-10 w-full px-3 pt-5 pb-[36dvh] lg:w-[404px] lg:shrink-0 lg:px-8 lg:pt-[14dvh] lg:pb-[32dvh]">
          <Scrollama<number>
            key={isDesktop ? "desktop-scrollama" : "mobile-scrollama"}
            offset={isDesktop ? 0.5 : 0.72}
            onStepEnter={handleStepEnter}
          >
            {story.beats.map((beat) => {
              const isActive = activeStep === beat.index;
              return (
                <Step<number> data={beat.index} key={beat.id}>
                  <div
                    data-step-index={beat.index}
                    data-step-id={beat.id}
                    className="flex min-h-[65dvh] items-center justify-center py-5 lg:min-h-[82dvh] lg:items-center lg:py-10"
                  >
                    <article
                      className={`w-full max-w-[92vw] border px-5 py-5 transition-opacity duration-200 lg:max-w-none lg:border-0 lg:border-l-2 lg:bg-transparent lg:px-5 lg:py-2 ${
                        isActive
                          ? "border-[#171614]/25 bg-[#FAF8F5] opacity-100 lg:border-[#D94E2A]"
                          : "border-[#DDD7CC] bg-[#F1EDE6]/90 opacity-75 lg:border-[#DDD7CC] lg:opacity-40"
                      }`}
                    >
                      <p className="font-mono text-[11px] uppercase tracking-[0.08em] text-[#5C5852] tabular-nums">
                        {beat.kicker}
                      </p>
                      <h2 className="mt-2 font-serif text-[23px] leading-[1.18] font-semibold tracking-[-0.015em] text-[#171614] lg:text-2xl">
                        {beat.headline.replaceAll("S&P 500", "S&P\u00A0500")}
                      </h2>
                      <p className="mt-3 max-w-[60ch] text-[15px] leading-[1.65] text-[#171614]/90">
                        {beat.bodySegments.map((segment, segIdx) => {
                          const formatted = segment.text
                            .replaceAll("S&P 500", "S&P\u00A0500")
                            .replaceAll("click any circle", "select any circle");
                          return segment.tone ? (
                            <Highlight key={`${beat.id}-seg-${segIdx}`} tone={segment.tone}>
                              {formatted}
                            </Highlight>
                          ) : (
                            <span key={`${beat.id}-seg-${segIdx}`}>{formatted}</span>
                          );
                        })}
                      </p>
                    </article>
                  </div>
                </Step>
              );
            })}
          </Scrollama>
        </div>
      </section>
    </MotionConfig>
  );
}
