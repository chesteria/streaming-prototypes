# AGENTS.md — Streaming TV Prototype Platform

## Purpose

High-signal execution rules for coding agents working in this repo.

Prefer small, local diffs. Preserve architecture unless the task explicitly requires changing it.
When uncertain: inspect → plan → then edit.

---

## SHARED CORE RULES (DO NOT DIVERGE)

This section should stay identical to the matching section in `CLAUDE.md`.

## Core repo truths

- No build step. No npm, bundlers, transpilers, or frameworks.
- Plain HTML/CSS/JS served from `streaming-prototype/`.
- Script loading order in `index.html` is architecture, not formatting.
- `js/analytics.js` is the only analytics entry point.
- `FocusEngine` is the only global keydown system.
- The app targets a fixed 1920×1080 logical canvas via `ScaleEngine`.
- The app must work locally without Firebase.
- No PII collection.

## Hard rules

- Do not introduce a framework or build system unless explicitly asked.
- Do not casually change script order in `index.html`.
- Do not call Firebase directly outside `js/analytics.js`.
- Do not add competing input or keyboard systems.
- Do not use `vw` / `vh` in screen CSS unless the task explicitly requires physical viewport behavior.
- Do not change deployment or Firebase injection as part of unrelated work.
- Do not delete or reorganize PRDs or untracked planning files unless explicitly asked.

## Required implementation patterns

### Analytics
Always use:

```js
trackEvent(eventName, params)
```

Every user-facing feature or materially changed flow should include analytics instrumentation.

### Screen lifecycle
Each screen follows:

```js
{ id, init(params, container), onFocus(), onBlur(), destroy() }
```

Register input handlers in `onFocus()` and clear them in `onBlur()`.

### Debug panel event ordering
The debug panel keydown listener runs in capture phase.  
If it opens overlays, defer with:

```js
setTimeout(..., 0)
```

to avoid same-keydown conflicts.

## Safe agent workflow

1. Inspect the current code path first.
2. Check the relevant PRD in `docs/PRD/` before feature work.
3. Make the smallest change that solves the task.
4. Preserve existing patterns unless the task requires a structural change.
5. Verify analytics, focus behavior, navigation, and scaling were not regressed.

## Definition of done

A task is not done unless:
- it works within the no-build architecture,
- changed behavior is instrumented where appropriate,
- script order and lifecycle assumptions still hold,
- unrelated systems were not modified without reason.

---

## Repo-specific operating notes

### Quick start
Run locally from the working directory:

```bash
cd streaming-prototype
python3 -m http.server 8000
```

Debug panel shortcut: backtick (`)

### Important architecture reminders
- `analytics.js` loads as a module and exposes `window.trackEvent`, `window.initSession`, and `window.endSession`.
- Screen scripts are regular scripts and rely on those globals before `DOMContentLoaded`.
- Navigation flows through `App.navigate('screenId', params)`.
- Keep `FocusEngine` as the single source of truth for D-pad input.
- Keep design and layout aligned to the 1920×1080 logical canvas.

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
- changing multiple systems at once unless the task clearly requires it.

### Planning / PRD guidance
Before implementing a feature, check the relevant file in:

```text
docs/PRD/
```

If code and PRD conflict, call out the conflict before making a broad change.

