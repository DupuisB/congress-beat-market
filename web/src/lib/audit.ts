declare global {
  interface Window {
    __VIZ_READY__?: boolean;
  }
}

const AUDIT_STYLE_ID = "pudding-audit-mode-overrides";

export function isAuditMode(): boolean {
  if (typeof window === "undefined") {
    return false;
  }
  const params = new URLSearchParams(window.location.search);
  return params.get("audit") === "1";
}

export function applyAuditModeOverrides(): void {
  if (typeof document === "undefined" || !isAuditMode()) {
    return;
  }
  if (document.getElementById(AUDIT_STYLE_ID)) {
    return;
  }
  const style = document.createElement("style");
  style.id = AUDIT_STYLE_ID;
  style.textContent = `
    html, body, * {
      scroll-behavior: auto !important;
      transition-duration: 0s !important;
      animation-duration: 0s !important;
    }
  `;
  document.head.appendChild(style);
}

export function resetVizReady(): void {
  if (typeof window !== "undefined") {
    window.__VIZ_READY__ = false;
  }
}

export interface MarkVizReadyOptions {
  canvasIdle?: Promise<void>;
}

function nextAnimationFrame(): Promise<void> {
  return new Promise((resolve) => {
    window.requestAnimationFrame(() => resolve());
  });
}

async function waitForImagesDecoded(): Promise<void> {
  const images = Array.from(document.images);
  await Promise.all(
    images.map(async (img) => {
      if (img.complete && img.naturalWidth > 0) {
        return;
      }
      if (typeof img.decode === "function") {
        try {
          await img.decode();
        } catch {
          // Ignore broken image decoding errors here; asset tests catch 404s.
        }
      }
    }),
  );
}

export async function markVizReady(options?: MarkVizReadyOptions): Promise<void> {
  if (typeof window === "undefined" || typeof document === "undefined") {
    return;
  }

  if ("fonts" in document) {
    await document.fonts.ready;
  }

  await waitForImagesDecoded();

  if (options?.canvasIdle) {
    await options.canvasIdle;
  }

  await nextAnimationFrame();
  await nextAnimationFrame();

  window.__VIZ_READY__ = true;
}
