import { execFileSync, spawn, type ChildProcess } from "node:child_process";
import { existsSync, mkdirSync, readFileSync, rmSync, statSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { chromium, type Browser, type Page } from "playwright";
import { z } from "zod";

declare global {
  interface Window {
    __VIZ_READY__?: boolean;
  }
}

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const REPO_ROOT = path.resolve(__dirname, "..");
const WEB_DIR = path.join(REPO_ROOT, "web");
const PIPELINE_DIR = path.join(REPO_ROOT, "pipeline");
const DATA_DIR = path.join(WEB_DIR, "public", "data");
const ARTIFACTS_DIR = path.join(__dirname, "artifacts");

const manifestBeatSchema = z
  .object({
    beatId: z.string().min(1),
    index: z.number().int().nonnegative(),
    entityCount: z.number().int().positive(),
    entityIds: z.array(z.string().min(1)).min(1),
    annotationCounts: z
      .object({
        priority1: z.number().int().nonnegative(),
        priority2: z.number().int().nonnegative(),
        priority3: z.number().int().nonnegative(),
      })
      .strict(),
  })
  .strict();

const manifestSchema = z
  .object({
    schemaVersion: z.literal("1.0.0"),
    slug: z.string().min(1),
    beatCount: z.number().int().positive(),
    totalUniqueEntities: z.number().int().positive(),
    beats: z.array(manifestBeatSchema).min(1),
  })
  .strict();

const storyIntegritySchema = z
  .object({
    schemaVersion: z.literal("1.0.0"),
    slug: z.string().min(1),
    beats: z
      .array(
        z.object({
          id: z.string().min(1),
          index: z.number().int().nonnegative(),
          entities: z.array(z.object({ id: z.string().min(1) })),
          annotations: z.array(
            z.object({
              id: z.string().min(1),
              priority: z.union([z.literal(1), z.literal(2), z.literal(3)]),
            }),
          ),
        }),
      )
      .min(1),
  })
  .passthrough();

type StoryManifest = z.infer<typeof manifestSchema>;

interface ViewportSpec {
  name: "desktop" | "mobile";
  width: number;
  height: number;
  scrollAlignRatio: number;
}

const VIEWPORTS: readonly ViewportSpec[] = [
  { name: "desktop", width: 1280, height: 800, scrollAlignRatio: 0.5 },
  { name: "mobile", width: 390, height: 844, scrollAlignRatio: 0.72 },
] as const;

interface BoxRect {
  left: number;
  right: number;
  top: number;
  bottom: number;
  width: number;
  height: number;
}

interface VisibleLabelReport {
  id: string;
  text: string;
  priority: number;
  rect: BoxRect;
}

interface StageGeometryCheck {
  stageRect: BoxRect | null;
  visibleLabels: VisibleLabelReport[];
  renderedEntityIds: string[];
}

function validateStoryAgainstManifest(): StoryManifest {
  const manifestPath = path.join(DATA_DIR, "manifest.json");
  const storyPath = path.join(DATA_DIR, "story.json");

  if (!existsSync(manifestPath)) {
    throw new Error(`Missing manifest.json at ${manifestPath}`);
  }
  if (!existsSync(storyPath)) {
    throw new Error(`Missing story.json at ${storyPath}`);
  }

  const manifest = manifestSchema.parse(JSON.parse(readFileSync(manifestPath, "utf-8")));
  const story = storyIntegritySchema.parse(JSON.parse(readFileSync(storyPath, "utf-8")));

  if (story.slug !== manifest.slug) {
    throw new Error(`Slug mismatch: story='${story.slug}' vs manifest='${manifest.slug}'`);
  }
  if (story.beats.length !== manifest.beatCount || manifest.beats.length !== manifest.beatCount) {
    throw new Error(
      `Beat count mismatch: story=${story.beats.length}, manifest.beatCount=${manifest.beatCount}`,
    );
  }

  const allUnique = new Set<string>();
  for (let i = 0; i < manifest.beatCount; i += 1) {
    const mBeat = manifest.beats[i];
    const sBeat = story.beats[i];
    if (!mBeat || !sBeat) {
      throw new Error(`Missing beat at index ${i}`);
    }
    if (sBeat.id !== mBeat.beatId || sBeat.index !== mBeat.index) {
      throw new Error(`Beat metadata mismatch at index ${i}: ${sBeat.id} vs ${mBeat.beatId}`);
    }
    const sIds = sBeat.entities.map((e) => e.id);
    if (sIds.length !== mBeat.entityCount) {
      throw new Error(
        `Entity count mismatch on beat '${sBeat.id}': story=${sIds.length} vs manifest=${mBeat.entityCount}`,
      );
    }
    for (let j = 0; j < sIds.length; j += 1) {
      if (sIds[j] !== mBeat.entityIds[j]) {
        throw new Error(`Entity ID mismatch on beat '${sBeat.id}' at index ${j}`);
      }
      const id = sIds[j];
      if (id) {
        allUnique.add(id);
      }
    }

    const p1 = sBeat.annotations.filter((a) => a.priority === 1).length;
    const p2 = sBeat.annotations.filter((a) => a.priority === 2).length;
    const p3 = sBeat.annotations.filter((a) => a.priority === 3).length;
    if (
      p1 !== mBeat.annotationCounts.priority1 ||
      p2 !== mBeat.annotationCounts.priority2 ||
      p3 !== mBeat.annotationCounts.priority3
    ) {
      throw new Error(`Annotation priority counts mismatch on beat '${sBeat.id}'`);
    }
  }

  if (allUnique.size !== manifest.totalUniqueEntities) {
    throw new Error(
      `Unique entity count mismatch: actual=${allUnique.size} vs manifest=${manifest.totalUniqueEntities}`,
    );
  }

  return manifest;
}

async function waitForServer(url: string, timeoutMs: number): Promise<void> {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    try {
      const response = await fetch(url);
      if (response.ok) {
        return;
      }
    } catch {
      // Server still starting.
    }
    await new Promise((resolve) => setTimeout(resolve, 200));
  }
  throw new Error(`Timed out waiting for server at ${url}`);
}

function startPreviewServer(port: number): ChildProcess {
  const distIndex = path.join(WEB_DIR, "dist", "index.html");
  if (!existsSync(distIndex)) {
    throw new Error(
      `web/dist not found at ${distIndex}. Run 'npm run web:build' before Tier A audit.`,
    );
  }

  const viteBin = path.join(WEB_DIR, "node_modules", ".bin", "vite");
  const child = spawn(
    viteBin,
    ["preview", "--host", "127.0.0.1", "--port", String(port), "--strictPort"],
    {
      cwd: WEB_DIR,
      stdio: ["ignore", "pipe", "pipe"],
    },
  );
  return child;
}

async function stopPreviewServer(server: ChildProcess | null): Promise<void> {
  if (!server || server.exitCode !== null) {
    return;
  }
  await new Promise<void>((resolve) => {
    const timer = setTimeout(() => {
      if (server.exitCode === null) {
        server.kill("SIGKILL");
      }
      resolve();
    }, 3000);
    server.once("exit", () => {
      clearTimeout(timer);
      resolve();
    });
    server.kill("SIGTERM");
  });
}

async function scrollToStep(
  page: Page,
  stepIndex: number,
  alignRatio: number,
): Promise<number> {
  await page.evaluate(
    ({ idx, ratio }) => {
      const el = document.querySelector<HTMLElement>(`[data-step-index="${idx}"]`);
      if (!el) {
        throw new Error(`Missing step element [data-step-index="${idx}"]`);
      }
      const rect = el.getBoundingClientRect();
      const elementCenterY = window.scrollY + rect.top + rect.height / 2;
      const targetScrollY = Math.max(0, elementCenterY - window.innerHeight * ratio);
      window.scrollTo({ top: targetScrollY, behavior: "instant" });
    },
    { idx: stepIndex, ratio: alignRatio },
  );

  await page.waitForFunction(
    (expected) => {
      const container = document.querySelector<HTMLElement>("[data-active-step]");
      return container?.getAttribute("data-active-step") === String(expected);
    },
    stepIndex,
    { timeout: 5000 },
  );

  // Let layout & animation frames settle (transitions are instant under ?audit=1).
  await page.evaluate(
    () =>
      new Promise<void>((resolve) => {
        requestAnimationFrame(() => requestAnimationFrame(() => resolve()));
      }),
  );

  const activeAttr = await page.getAttribute("[data-active-step]", "data-active-step");
  return Number(activeAttr);
}

function rectsOverlap(a: BoxRect, b: BoxRect): boolean {
  return !(a.right <= b.left || b.right <= a.left || a.bottom <= b.top || b.bottom <= a.top);
}

async function checkVisibleLabelsAndEntities(
  page: Page,
  viewport: ViewportSpec,
  manifest: StoryManifest,
  stepIndex: number,
): Promise<{ visibleLabelCount: number; entityCount: number }> {
  const mBeat = manifest.beats[stepIndex];
  if (!mBeat) {
    throw new Error(`No manifest entry for step ${stepIndex}`);
  }

  const report = await page.evaluate<StageGeometryCheck>(() => {
    const stage = document.querySelector<HTMLElement>("[data-viz-stage]");
    const rawStageRect = stage ? stage.getBoundingClientRect() : null;
    const stageRect: BoxRect | null = rawStageRect
      ? {
          left: rawStageRect.left,
          right: rawStageRect.right,
          top: rawStageRect.top,
          bottom: rawStageRect.bottom,
          width: rawStageRect.width,
          height: rawStageRect.height,
        }
      : null;

    const labels = Array.from(document.querySelectorAll<Element>("[data-viz-label]"));
    const visibleLabels: VisibleLabelReport[] = [];

    for (const el of labels) {
      const style = window.getComputedStyle(el);
      const opacity = Number.parseFloat(style.opacity || "1");
      const rect = el.getBoundingClientRect();
      if (
        opacity > 0.5 &&
        style.visibility !== "hidden" &&
        style.display !== "none" &&
        rect.width > 0 &&
        rect.height > 0
      ) {
        visibleLabels.push({
          id: el.getAttribute("data-annotation-id") ?? "(unnamed)",
          text: (el.textContent ?? "").trim(),
          priority: Number(el.getAttribute("data-priority") ?? "0"),
          rect: {
            left: rect.left,
            right: rect.right,
            top: rect.top,
            bottom: rect.bottom,
            width: rect.width,
            height: rect.height,
          },
        });
      }
    }

    const renderedEntityIds = Array.from(
      document.querySelectorAll<Element>("[data-entity-id]"),
    ).map((el) => el.getAttribute("data-entity-id") ?? "");

    return { stageRect, visibleLabels, renderedEntityIds };
  });

  if (!report.stageRect) {
    throw new Error(`[${viewport.name} step ${stepIndex}] Missing [data-viz-stage] element.`);
  }

  // Verify entity integrity against manifest
  if (report.renderedEntityIds.length !== mBeat.entityCount) {
    throw new Error(
      `[${viewport.name} step ${stepIndex}] Rendered entity count ${report.renderedEntityIds.length} != manifest ${mBeat.entityCount}`,
    );
  }
  const renderedSet = new Set(report.renderedEntityIds);
  for (const expectedId of mBeat.entityIds) {
    if (!renderedSet.has(expectedId)) {
      throw new Error(
        `[${viewport.name} step ${stepIndex}] Missing manifest entity '${expectedId}' in DOM`,
      );
    }
  }

  // Verify annotation priority-tier expectations
  const expectedLabels =
    viewport.name === "mobile"
      ? mBeat.annotationCounts.priority1
      : mBeat.annotationCounts.priority1 +
        mBeat.annotationCounts.priority2 +
        mBeat.annotationCounts.priority3;

  if (report.visibleLabels.length !== expectedLabels) {
    throw new Error(
      `[${viewport.name} step ${stepIndex}] Expected ${expectedLabels} visible labels, got ${report.visibleLabels.length}`,
    );
  }

  if (viewport.name === "mobile") {
    for (const label of report.visibleLabels) {
      if (label.priority !== 1) {
        throw new Error(
          `[mobile step ${stepIndex}] Non-priority-1 label '${label.id}' (priority=${label.priority}) visible on mobile`,
        );
      }
    }
  }

  // Bounds containment inside [data-viz-stage]
  const stage = report.stageRect;
  const epsilon = 0.5;
  for (const label of report.visibleLabels) {
    const r = label.rect;
    if (
      r.left < stage.left - epsilon ||
      r.right > stage.right + epsilon ||
      r.top < stage.top - epsilon ||
      r.bottom > stage.bottom + epsilon
    ) {
      throw new Error(
        `[${viewport.name} step ${stepIndex}] Label '${label.id}' ("${label.text}") overflows [data-viz-stage]: ` +
          `label=[${r.left.toFixed(1)}, ${r.top.toFixed(1)}, ${r.right.toFixed(1)}, ${r.bottom.toFixed(1)}] ` +
          `stage=[${stage.left.toFixed(1)}, ${stage.top.toFixed(1)}, ${stage.right.toFixed(1)}, ${stage.bottom.toFixed(1)}]`,
      );
    }
  }

  // Pairwise label overlap check
  for (let i = 0; i < report.visibleLabels.length; i += 1) {
    for (let j = i + 1; j < report.visibleLabels.length; j += 1) {
      const a = report.visibleLabels[i];
      const b = report.visibleLabels[j];
      if (a && b && rectsOverlap(a.rect, b.rect)) {
        throw new Error(
          `[${viewport.name} step ${stepIndex}] Label collision between '${a.id}' ("${a.text}") and '${b.id}' ("${b.text}")`,
        );
      }
    }
  }

  return {
    visibleLabelCount: report.visibleLabels.length,
    entityCount: report.renderedEntityIds.length,
  };
}

async function auditViewport(
  browser: Browser,
  baseUrl: string,
  viewport: ViewportSpec,
  manifest: StoryManifest,
): Promise<void> {
  const outDir = path.join(ARTIFACTS_DIR, viewport.name);
  mkdirSync(outDir, { recursive: true });

  const context = await browser.newContext({
    viewport: { width: viewport.width, height: viewport.height },
    deviceScaleFactor: 1,
  });
  const page = await context.newPage();

  const consoleErrors: string[] = [];
  const pageErrors: string[] = [];

  page.on("console", (msg) => {
    if (msg.type() === "error") {
      consoleErrors.push(msg.text());
    }
  });
  page.on("pageerror", (err) => {
    pageErrors.push(err.message);
  });

  try {
    const auditUrl = `${baseUrl}/?audit=1`;
    await page.goto(auditUrl, { waitUntil: "networkidle" });
    await page.waitForFunction(() => window.__VIZ_READY__ === true, undefined, {
      timeout: 15000,
    });

    const lastStep = manifest.beatCount - 1;

    // 1. Forward pass: 0 -> N (check geometry + capture beat PNGs)
    for (let step = 0; step <= lastStep; step += 1) {
      const active = await scrollToStep(page, step, viewport.scrollAlignRatio);
      if (active !== step) {
        throw new Error(
          `[${viewport.name}] Forward scroll expected step ${step}, got ${active}`,
        );
      }
      const stats = await checkVisibleLabelsAndEntities(page, viewport, manifest, step);
      const mBeat = manifest.beats[step];
      const beatId = mBeat ? mBeat.beatId : `beat-${step}`;
      const pngPath = path.join(
        outDir,
        `beat-${String(step).padStart(2, "0")}-${beatId}.png`,
      );
      await page.screenshot({ path: pngPath, fullPage: false });
      console.log(
        `  [${viewport.name}] forward step ${step} (${beatId}): OK (${stats.entityCount} marks, ${stats.visibleLabelCount} labels)`,
      );
    }

    // 2. Backward pass: N -> 0
    for (let step = lastStep - 1; step >= 0; step -= 1) {
      const active = await scrollToStep(page, step, viewport.scrollAlignRatio);
      if (active !== step) {
        throw new Error(
          `[${viewport.name}] Backward scroll expected step ${step}, got ${active}`,
        );
      }
    }
    console.log(`  [${viewport.name}] backward scroll (${lastStep}->0): OK`);

    // 3. Rapid jump pass: 0 -> N -> 0
    for (const target of [0, lastStep, 0]) {
      const active = await scrollToStep(page, target, viewport.scrollAlignRatio);
      if (active !== target) {
        throw new Error(
          `[${viewport.name}] Rapid jump expected step ${target}, got ${active}`,
        );
      }
    }
    console.log(`  [${viewport.name}] rapid jump (0->${lastStep}->0): OK`);

    if (consoleErrors.length > 0) {
      throw new Error(
        `[${viewport.name}] Console errors (${consoleErrors.length}): ${consoleErrors.join(" | ")}`,
      );
    }
    if (pageErrors.length > 0) {
      throw new Error(
        `[${viewport.name}] Uncaught page errors (${pageErrors.length}): ${pageErrors.join(" | ")}`,
      );
    }
  } finally {
    await context.close();
  }
}

function stitchContactSheets(): void {
  execFileSync(
    "uv",
    ["run", "python", "src/stitch_contact_sheet.py", "--artifacts-dir", ARTIFACTS_DIR],
    {
      cwd: PIPELINE_DIR,
      stdio: "inherit",
    },
  );

  for (const sheetName of ["contact-sheet-desktop.png", "contact-sheet-mobile.png"]) {
    const sheetPath = path.join(ARTIFACTS_DIR, sheetName);
    if (!existsSync(sheetPath) || statSync(sheetPath).size === 0) {
      throw new Error(`Expected stitched contact sheet missing or empty: ${sheetPath}`);
    }
  }
}

async function main(): Promise<void> {
  console.log("Tier A Audit: validating story.json against manifest.json...");
  const manifest = validateStoryAgainstManifest();
  console.log(
    `  Manifest OK: ${manifest.slug} (${manifest.beatCount} beats, ${manifest.totalUniqueEntities} unique entities)`,
  );

  rmSync(ARTIFACTS_DIR, { recursive: true, force: true });
  mkdirSync(ARTIFACTS_DIR, { recursive: true });

  const externalUrl = process.env["AUDIT_URL"];
  const port = Number(process.env["AUDIT_PORT"] ?? "4179");
  const baseUrl = externalUrl ?? `http://127.0.0.1:${port}`;
  let server: ChildProcess | null = null;

  if (!externalUrl) {
    server = startPreviewServer(port);
    await waitForServer(baseUrl, 15000);
  }

  const browser = await chromium.launch({ headless: true });

  try {
    for (const viewport of VIEWPORTS) {
      console.log(`Tier A Audit: running ${viewport.name} (${viewport.width}x${viewport.height})...`);
      await auditViewport(browser, baseUrl, viewport, manifest);
    }
  } finally {
    await browser.close();
    await stopPreviewServer(server);
  }

  console.log("Tier A Audit: stitching contact sheets...");
  stitchContactSheets();

  console.log("Tier A Audit PASSED: 0 errors, 0 label collisions, 0 skipped steps.");
}

main().catch((err: unknown) => {
  console.error("Tier A Audit FAILED:", err instanceof Error ? err.message : err);
  process.exit(1);
});
