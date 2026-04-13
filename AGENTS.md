# AGENTS.md — Streaming TV Prototype Platform

## Purpose

High-signal execution rules for coding agents working in this repo.

Prefer small, local diffs. Preserve architecture unless the task explicitly requires changing it.
When uncertain: inspect → plan → then edit.

---

## Repo layout at a glance

This repo is in the middle of a deliberate dual-architecture transition. Before any task, confirm which codebase the task belongs to:

- **`streaming-prototype/`** — Phase 1 + Phase 2, vanilla JS, no build step. This is the shipping app. All rules in the SHARED CORE RULES section below apply here.
- **`streaming-prototype-v2/`** — Phase 3, greenfield Vite + TypeScript + Tailwind. **Does not yet exist** — will be scaffolded in Chunk P1 of the Phase 3 PRD after device compatibility is validated in Chunk P0. When it does exist, it has its own architecture and its own rules, not the ones below.

If a task could plausibly belong to either codebase, stop and ask. Do not assume.

See `CLAUDE.md` for full context on the roadmap, device matrix, and rationale behind this split.

---

## SHARED CORE RULES (DO NOT DIVERGE)

> This section must stay identical in both `AGENTS.md` and `CLAUDE.md`.
> When this section changes, both files must be updated before committing.

### Scope

These rules apply to work inside **`streaming-prototype/`** (the existing Phase 1 + Phase 2 vanilla JS codebase). Phase 3 work happens in **`streaming-prototype-v2/`** (greenfield Vite + TypeScript + Tailwind), which is a separate project with its own architecture. When `streaming-prototype-v2/` is scaffolded, its own rules will be documented in `docs/PRD/phase3-experience-completion/PRD-v1.md` and eventually in a dedicated section of this file.

### Core repo truths (streaming-prototype/)

- No build step. No npm, bundlers, transpilers, or frameworks.
- Plain HTML/CSS/JS served from `streaming-prototype/`.
- Script loading order in `index.html` is architecture, not formatting.
- `js/analytics.js` is the only analytics entry point.
- `FocusEngine` is the only global keydown system.
- The app targets a fixed 1920×1080 logical canvas via `ScaleEngine`.
- The app must work locally without Firebase.
- No PII collection.
- The device support matrix is governed by `docs/SUPPORTED_DEVICES.md`. Tizen 4.0 is deprecated; do not add code paths targeting it.

### Hard rules (streaming-prototype/)

- Do not introduce a framework or build system into `streaming-prototype/` under any circumstances. Any "but wouldn't it be nicer with X" instinct belongs in Phase 3, not here.
- Do not casually change script order in `index.html`.
- Do not call Firebase directly outside `js/analytics.js`.
- Do not add competing input or keyboard systems.
- Do not use `vw` / `vh` in screen CSS unless the task explicitly requires physical viewport behavior.
- Do not change deployment or Firebase injection as part of unrelated work.
- Do not delete or reorganize PRDs or untracked planning files unless explicitly asked.
- Do not treat Roku or tvOS as targets for this codebase. They are out of scope and will be parallel implementations in separate projects.
- Do not begin Phase 3 work inside `streaming-prototype/`. Phase 3 lives in `streaming-prototype-v2/`, which is scaffolded in Chunk P1 of the Phase 3 experience-completion PRD.

### Required implementation patterns (streaming-prototype/)

#### Analytics
Always use:

```js
trackEvent(eventName, params)
```

Every user-facing feature or materially changed flow should include analytics instrumentation.

#### Screen lifecycle
Each screen follows:

```js
{ id, init(params, container), onFocus(), onBlur(), destroy() }
```

Register input handlers in `onFocus()` and clear them in `onBlur()`.

#### Debug panel event ordering
The debug panel keydown listener runs in capture phase.
If it opens overlays, defer with:

```js
setTimeout(..., 0)
```

to avoid same-keydown conflicts.

### Safe agent workflow

1. Inspect the current code path first.
2. Check the relevant PRD in `docs/PRD/` before feature work. Use the Phase Roadmap in `CLAUDE.md` to identify the active PRD for the task.
3. Confirm which codebase the task belongs to — `streaming-prototype/` (Phase 1 + 2) or `streaming-prototype-v2/` (Phase 3, once scaffolded).
4. Make the smallest change that solves the task.
5. Preserve existing patterns unless the task requires a structural change.
6. Verify analytics, focus behavior, navigation, and scaling were not regressed.

### Definition of done

A task is not done unless:
- it works within the architecture of whichever codebase it belongs to (no-build for Phase 1/2, Vite+TS for Phase 3),
- changed behavior is instrumented where appropriate,
- script order and lifecycle assumptions still hold (Phase 1/2),
- device support obligations from `docs/SUPPORTED_DEVICES.md` are respected,
- unrelated systems were not modified without reason.

---

## Repo-specific operating notes

### Quick start
Run Phase 1 + Phase 2 locally from the working directory:

```bash
cd streaming-prototype
python3 -m http.server 8000
```

Debug panel shortcut: backtick (`` ` ``)

Phase 3 (`streaming-prototype-v2/`) has its own run command once scaffolded — likely `npm run dev` per the Phase 3 PRD. Do not attempt to run it until P1 is complete.

### Important architecture reminders (streaming-prototype/)
- `analytics.js` loads as a module and exposes `window.trackEvent`, `window.initSession`, and `window.endSession`.
- Screen scripts are regular scripts and rely on those globals before `DOMContentLoaded`.
- Navigation flows through `App.navigate('screenId', params)`.
- Keep `FocusEngine` as the single source of truth for D-pad input.
- Keep design and layout aligned to the 1920×1080 logical canvas.
- `ScaleEngine` writes `--app-scale` and adds `.scale-ready` to `#app` after first layout — anything that reads scaled dimensions must account for this.

### Supported devices (both codebases)

Full matrix in `docs/SUPPORTED_DEVICES.md`. Short version:

- **In scope:** Samsung Tizen 5.5+ (2020+ models), VIZIO SmartCast 2019+, AndroidTV/Google TV/NVIDIA Shield/Google TV Streamer (Android 9+), FireTV via Capacitor wrapper (Fire OS 6+)
- **Out of scope for this codebase:** Roku (future parallel BrightScript project), tvOS (future parallel SwiftUI project), mobile (deferred future phase)
- **Deprecated:** Samsung Tizen 4.0 (2018 models) — do not add or preserve Tizen 4.0-specific code paths

### Safe change heuristics
Prefer:
- small diffs,
- additive changes,
- preserving current file structure,
- following existing naming and patterns.

Avoid:
- opportunistic refactors,
- renaming shared functions or files without need,
- touching analytics, router, focus, or deployment code for unrelated tasks,
- changing multiple systems at once unless the task clearly requires it,
- adding code paths for out-of-scope devices (Tizen 4.0, Roku, tvOS).

### Planning / PRD guidance
Before implementing a feature, check the relevant file in:

```text
docs/PRD/
```

The Phase Roadmap in `CLAUDE.md` lists the currently active PRDs, the superseded ones (kept as reference), and upcoming planned work. Two PRDs are currently in draft and ready to act on:

- `docs/PRD/jsdoc-typecheck-hedge/PRD-v1.md` — adds `// @ts-check` and zod JSON validation to `streaming-prototype/`. Layered on top of existing code; no rewrites.
- `docs/PRD/phase3-experience-completion/PRD-v1.md` — greenfield Phase 3 pilot in `streaming-prototype-v2/`. Location detection + picker as the first slice.

Two PRDs are explicitly superseded and should not be implemented without a fresh conversation:

- `docs/PRD/vite-ts-tailwind-migration/PRD-v1.md` — rejected after adversarial review. Kept as reference only.
- `docs/PRD/phase3-scenarios-and-simulation-v1.0.md` — Phase 3 was redefined. Kept as reference only.

If code and PRD conflict, call out the conflict before making a broad change.
