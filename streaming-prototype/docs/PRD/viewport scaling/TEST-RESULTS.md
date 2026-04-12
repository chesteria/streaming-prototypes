# Test Results: Viewport Scaling & Aspect Ratio Normalization
> PRD Version: 1.1 | Implementation: v1.7.0 | Date: 2026-04-12
> Branch: `feature/viewport-scaling`

---

## Summary

All 7 acceptance criteria passed. One implementation bug was found and fixed during audit (AC5 — Debug Panel diagnostic blank on initial open). Two known limitations are documented; both are pre-acknowledged in the PRD risks table and do not affect prototype fidelity.

| # | Acceptance Criterion | Status | Notes |
|---|---|---|---|
| AC1 | 1440×900 — 16:9 at correct proportions, letterbox bars | PASS | |
| AC2 | 2560×1080 ultrawide — pillarbox bars | PASS | |
| AC3 | Resize updates in real time, no jank | PASS | |
| AC4 | D-pad navigation correct at all scales | PASS | |
| AC5 | Debug Panel shows scale diagnostic | PASS (after fix) | Bug found and fixed — see below |
| AC6 | No CSS layout, focus ring, or animation breakage | PASS | |
| AC7 | No FOUC — canvas invisible until first scale applied | PASS | |

---

## Acceptance Criteria Detail

### AC1 — 1440×900 Viewport (16:10)
**Expected:** App renders at 16:9 proportions with letterbox bars top and bottom.

**Scale math verification:**
```
scaleX = 1440 / 1920 = 0.750
scaleY = 900  / 1080 = 0.833
scale  = Math.min(0.750, 0.833) = 0.750   ← constrained by width
```
- Canvas visual size: 1440 × 810px
- Letterbox bars: (900 - 810) / 2 = **45px top and bottom** ✓ (matches PRD behavior table)
- Background `#000` on `body` fills bar areas ✓
- `translate(-50%, -50%) scale(0.750)` centers canvas in viewport ✓

**Result: PASS**

---

### AC2 — 2560×1080 Ultrawide (21:9)
**Expected:** App renders at 1.0× scale with pillarbox bars left and right.

**Scale math verification:**
```
scaleX = 2560 / 1920 = 1.333
scaleY = 1080 / 1080 = 1.000
scale  = Math.min(1.333, 1.000) = 1.000   ← constrained by height
```
- Canvas visual size: 1920 × 1080px
- Pillarbox bars: (2560 - 1920) / 2 = **320px left and right** ✓ (matches PRD behavior table)

**Result: PASS**

---

### AC3 — Real-Time Resize Without Jank
**Implementation verified:**
- `window.addEventListener('resize', _onResize)` in `ScaleEngine.init()`
- `_onResize` uses `cancelAnimationFrame` + `requestAnimationFrame` — debounced to one update per browser paint cycle
- `_appRoot.style.transform` is a single compositor write — no layout or paint phase triggered
- `will-change: transform` on `#app` promotes element to GPU layer ahead of time

**Result: PASS**

---

### AC4 — D-Pad Navigation at All Scales
**Audit scope:** All scroll/focus calculations across `lander.js`, `series-pdp.js`, `epg/components/genre-rail.js`, `epg/components/channel-row.js`, `focus-engine.js`.

**Findings:**
- `lander.js:291` — `el.offsetTop` — logical coordinate ✓
- `lander.js:926` — `el.offsetLeft` — logical coordinate ✓
- `series-pdp.js:397` — `el.offsetTop` — logical coordinate ✓
- `genre-rail.js:49-51` — `chip.offsetLeft`, `chip.offsetWidth`, `railEl.offsetWidth` — all logical ✓
- `genre-rail.js:47-48` — `chip.getBoundingClientRect()`, `railEl.getBoundingClientRect()` — **read but never used in scroll math** (dead reads). No scale-induced bug. Pre-existing minor performance issue (forces layout); not introduced by this feature.
- `lander.js:231` — `r.element.getBoundingClientRect()` used for analytics scroll-depth only; compared against `window.innerHeight` (both in CSS pixels). Comparison remains valid at any scale ✓
- `FocusEngine` — no coordinate math found; operates entirely on DOM traversal and keyboard events ✓

All transform-based scroll (`translateX`, `translateY`) operates in the 1920×1080 logical coordinate space. D-pad navigation is unaffected by viewport scaling.

**Result: PASS**

---

### AC5 — Debug Panel Viewport Scale Diagnostic

**Bug found and fixed during audit:**

| | |
|---|---|
| **Issue** | Debug Panel lazily builds its DOM on first `open()`. `ScaleEngine.init()` fires the `scaleupdate` event during page load — before the panel has been built — so `document.getElementById('debug-viewport-scale')` returns `null`. The listener runs but silently skips. The diagnostic row displayed `—` when the panel was first opened, and would only populate on a subsequent resize. |
| **Root cause** | Late DOM construction + early event firing. No fault in `scaleupdate` design — the event fires correctly; the receiver simply didn't exist yet. |
| **Fix** | In `_buildBody()`, when constructing a `diagnostic` spec row, pre-populate the span's text content by reading `ScaleEngine.getScale()` and `window.innerWidth/Height` at build time. Since the panel is always opened after `App.init()` completes, `ScaleEngine` is guaranteed to be initialized at that point. Subsequent `scaleupdate` events (on resize) continue to update the element via the existing listener. |
| **Fix location** | `js/debug-panel.js` — `diagnostic` branch of `_buildBody()` |

**Expected display format:**
```
Viewport Scale    0.750×  (1440 × 900 → 1920 × 1080)
```
When a forced viewport is active (Phase 3):
```
Viewport Scale    0.667× FORCED (1280 × 720)
```

**Result: PASS (after fix)**

---

### AC6 — No CSS Layout, Focus Ring, or Animation Breakage

**`position: fixed` inside `#app` — behavior change audit:**

This is the most significant behavioral side-effect of applying `transform` to `#app`. Per CSS spec, a transformed ancestor creates a new containing block for `position: fixed` descendants.

Elements inside `#app` using `position: fixed`:
| Element | Before (no transform) | After (with transform) | Effect |
|---|---|---|---|
| `.top-nav` (`nav.css:6`) | Anchored to viewport | Anchored to `#app` (1920×1080 canvas) | **Correct** — nav stays at top of canvas at all scales |
| `.epg-more-info-overlay` (`epg.css:362`) | Covered viewport | Covers `#app` canvas | **Correct** — overlay fills the 1920×1080 content area |

Both elements were designed for a 1920×1080 space. The behavior change is intentional and correct — they remain anchored to the canvas at any scale.

**Other checks:**
- All CSS pixel values (tile sizes, font sizes, padding, gaps) unchanged — scaling is applied only via `transform` on `#app`, not via any property change on descendants ✓
- `transition` and `animation` timing values unchanged ✓
- Focus ring `box-shadow` values unchanged ✓
- `will-change: transform` on `#app` does not conflict with `will-change: transform` on child elements (`.rail-scroll`, `.pill-btn`) ✓
- `.screen { opacity: 0 }` / `.screen.active { opacity: 1 }` transitions unaffected ✓

**Result: PASS**

---

### AC7 — No Flash of Unscaled Content (FOUC)

**Implementation:**
- `#app` starts at `opacity: 0` via CSS (no JS required)
- `ScaleEngine.init()` calls `scaleApp()` (applies correct transform) then immediately adds `.scale-ready` to `#app`
- `.scale-ready { opacity: 1; transition: opacity 0.1s ease }` fades the canvas in after scale is applied
- First paint: browser renders `#app` at `opacity: 0`, then JS applies scale and transitions to `opacity: 1`

**Sequence:**
```
DOMContentLoaded
  → ScaleEngine.init()
      → scaleApp()         [transform applied, #app still opacity:0]
      → .scale-ready added [#app begins 100ms fade-in]
  → FocusEngine.init()
  → DataStore.init()       [async — data fetch]
  → WelcomeScreen.init()   [async — shows modal overlay]
  → navigate('lander')     [screen fades in via .screen.active]
```

The 100ms opacity transition on `#app` provides a smooth reveal with no unscaled flash. Individual screens have their own `opacity: 0 → 1` transition via `.screen.active`.

**Result: PASS**

---

## Known Limitations

These are pre-acknowledged in the PRD risks table. No action required for this phase.

### KL-1: Elements Outside `#app` Do Not Scale

`#toast`, `#build-stamp` are direct children of `<body>` and use `position: fixed`. They are positioned relative to the browser viewport, not the scaled canvas. At 0.75 scale, their text renders at native browser pixel size (effectively ~1.33× larger relative to app content).

**Impact:** Low. Both are developer/research-session tools, not primary prototype content. Toast notifications remain legible and in a reasonable position relative to the canvas at tested scales.

**Affected elements:** `#toast` (global.css:73), `#build-stamp` (global.css:238)

**Mitigation if needed (future):** Move `#toast` and `#build-stamp` inside `#app` — they would then scale with the canvas and `position: fixed` would anchor to the canvas (correct behavior). Requires moving HTML and verifying z-index layering.

### KL-2: Welcome Screen, Feedback Overlays, Debug Panel Cover Full Viewport

`WelcomeScreen`, `FeedbackSystem` overlays, and `DebugPanel` are all appended to `document.body` via `document.body.appendChild()` and use `position: fixed`. They fill the entire browser viewport, including letterbox/pillarbox bars.

**Impact:** None. Full-viewport coverage is the correct behavior for modal overlays — they should not be confined to the scaled canvas area. A fullscreen overlay covering 2560×1080 when the canvas is 1920×1080 (pillarboxed) is the desired UX for research session flows.

---

## Analytics Verification

`viewport_scale_applied` event fires on `ScaleEngine.init()` completion.

**Payload structure (example — 1440×900 viewport):**
```json
{
  "event": "viewport_scale_applied",
  "scale_factor": 0.75,
  "scale_mode": "contain",
  "viewport_width": 1440,
  "viewport_height": 900,
  "canvas_width": 1920,
  "canvas_height": 1080,
  "forced": false
}
```

Event fires once per page load. Resize events are not tracked. `try/catch` wrapper silently skips if Analytics is unavailable (e.g. on `debug.html`).

---

## Files Changed

| File | Type | Description |
|---|---|---|
| `js/utils/scale.js` | Created | ScaleEngine module |
| `css/global.css` | Modified | `html`/`body` split, `#app` centering + FOUC prevention |
| `css/variables.css` | Modified | Added `--app-scale: 1` |
| `js/debug-panel.js` | Modified | Section G diagnostics + scaleupdate listener + build-time pre-population fix |
| `js/app.js` | Modified | `ScaleEngine.init()` call before first screen render |
| `index.html` | Modified | Viewport meta updated, `scale.js` load order |
| `data/version.json` | Modified | Bumped to v1.7.0 build 42 |
| `docs/CHANGELOG.md` | Modified | v1.7.0 entry added |

---

*Test results version: 1.0 | Tested by: Claude Code | PRD: prd-viewport-scaling-v1.1.md*
