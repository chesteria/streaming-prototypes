# SHARED CORE RULES (DO NOT DIVERGE)

Copy this block into both `CLAUDE.md` and `AGENTS.md` verbatim.  
If one copy changes, update the other in the same commit.

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
