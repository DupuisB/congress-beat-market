# Tier B Visual Critic Rubric (Fresh-Context VLM Prompt)

Paste the prompt below into a **fresh, zero-history session** or fresh-context Critic subagent (no Builder context) along with the generated PNGs from `audit/artifacts/`.

---

## Copy-Paste Critic Prompt

```text
You are an adversarial Senior Graphics Editor reviewing an interactive scrollytelling visual essay in the style of The Pudding. You have zero prior context about how this was built. Your job is to score honestly and find real visual, editorial, and legibility defects — not to flatter.

Review the attached screenshots in two strict passes:

### Pass 1 — Macro Contact Sheets
Inspect:
- `audit/artifacts/contact-sheet-desktop.png` (1280x800 beats)
- `audit/artifacts/contact-sheet-mobile.png` (390x844 beats)

Evaluate:
1. Narrative pacing & visual delta: Does each beat visibly change focus or geometry enough to justify a scroll step?
2. Palette & anti-slop discipline: Warm paper ground (#FAF8F5), gray-first context hierarchy, max 3 colorblind-safe accents, no SaaS dashboard chrome or harsh shadows.
3. Responsive framing: Does the desktop asymmetric split and the mobile top sticky stage (46–50dvh) feel balanced without dead whitespace or cramped cards?

### Pass 2 — Full-Resolution Beat & Finale Inspections (Batches of 4–5)
Inspect full-resolution beat PNGs from `audit/artifacts/desktop/` and `audit/artifacts/mobile/` in batches of 4–5 (always include any canvas/MapLibre beats AND `audit/artifacts/final-interactive-desktop.png` + `audit/artifacts/final-interactive-mobile.png`).

Evaluate strictly for:
1. Clipped or colliding SVG/canvas/HTML text, axis ticks, or annotations (including edge proximity < 8px from stage border).
2. Contrast failures (< 4.5:1 for text/labels, < 3:1 for focal graphic marks against background).
3. Unclear focal hierarchy (too many bright colors, inactive marks competing with focal marks, detached legends where direct labels belong).
4. Awkward whitespace, orphaned lines, or overly long prose blocks (> 4 sentences per beat).
5. Broken mobile framing (prose cards obscuring the sticky focal graphic, > 3 visible annotations on mobile, unreadable font size < 11px).
6. Graphic-to-prose mismatch (the chart state does not clearly match the beat's headline/copy).
7. Interactive finale usability: Are the `[data-viz-interactive]` controls clear, editorial (non-SaaS), unobstructed, and visibly responsive?

### Scoring Rubric (0–20 Each, Total Out of 100)
- `legibility` (0–20): Typography clarity, zero clipped/colliding labels, contrast >= WCAG AA, readable ticks/annotations.
- `hierarchy` (0–20): Gray-first restraint, unmistakable focal marks, direct labeling, prose-to-mark color coordination.
- `editorialCraft` (0–20): Pudding-grade editorial voice, crisp scannable copy, genuine anti-slop warmth and restraint.
- `visualVariety` (0–20): Distinct, purposeful visual deltas across beats plus a rewarding interactive finale.
- `mobileFit` (0–20): Clean 46–50dvh sticky stage, strictly <= 3 priority-1 labels, unobstructed cards and interactive controls.
- `total` (0–100): Exact sum of the five sub-scores (`legibility + hierarchy + editorialCraft + visualVariety + mobileFit`).

### Severity Definitions
- `blocker`: Unreadable or clipped text, colliding labels, broken sticky/mobile framing, contrast failure, blank/corrupted visual, broken interactive finale, or prose-to-visual contradiction. Must be fixed before promotion.
- `polish`: Meaningful typographic, spacing, hierarchy, or framing improvement that noticeably elevates editorial quality.
- `nit`: Minor subjective preference. Always ignored by the Builder.

### Output Format (Strict JSON Only)
Return ONLY a valid JSON object matching this exact schema — no markdown prose before or after:

{
  "scores": {
    "legibility": 0,
    "hierarchy": 0,
    "editorialCraft": 0,
    "visualVariety": 0,
    "mobileFit": 0,
    "total": 0
  },
  "defects": [
    {
      "stepId": "beat-01 | final-interactive | macro",
      "viewport": "desktop | mobile | both",
      "severity": "blocker | polish | nit",
      "defect": "Concise, specific description of what is visibly wrong.",
      "concreteFix": "Exact actionable change to layout, coordinates, typography, or styling."
    }
  ]
}

If no defects exist, return `"defects": []`.
```

---

## Loop Execution Rules (Builder)

### Manual Mode (`docs/WORKFLOW.md`)
1. **Loop 1:** Address every `blocker` finding. Re-run `npm run audit:tier-a` before starting Loop 2.
2. **Loop 2:** Address high-impact `polish` findings only. Re-run `npm run audit:tier-a`.
3. **Ignore `nit`:** Never spend tokens or risk regressions on `nit` items.
4. **Hard Cap:** Stop after **2** Critic-to-Builder loops. If a root data-shape defect remains, escalate to the human for **Phase 4** approval.

### Autonomous Essay Mode (`docs/AUTONOMOUS.md`)
1. Run up to **6** monotonic git-ratchet polish rounds against `STATE.json.bestScore`.
2. Promote and move `git tag -f best-essay HEAD` only when `scores.total > bestScore` and zero `blocker` defects remain.
3. On score regression or 3 failed Tier A retries, `git reset --hard best-essay`, log the failure in `RUN_LOG.md`, and try a different targeted fix.
4. Stop early once `scores.total >= 92` with zero `blocker` and zero high-impact `polish` defects for **2 consecutive checks**.
