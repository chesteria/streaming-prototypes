# Bug Hunt Session Log
**Date:** 2026-04-06 → 2026-04-07  
**Branch:** `initial-debug-panel`  
**Scope:** Phase 1 (Lander, Series PDP, Player), Phase 1.5 (Debug Panel), HLS stream integration

---

## Session Summary

Full discovery pass across all Phase 1 screens and the debug panel. No CRITICAL bugs found. Five HIGH bugs auto-fixed; four MEDIUM and three actionable LOW issues left for morning review.

---

## Fix Totals

| Severity | Found | Fixed | Deferred |
|----------|-------|-------|----------|
| CRITICAL | 0     | 0     | —        |
| HIGH     | 5     | 5     | 0        |
| MEDIUM   | 4     | 0     | 4 (needs review) |
| LOW      | 5     | 0     | 3 (needs review) + 2 intentional |
| **Total**| **14**| **5** |          |

---

## Commits Made This Session

| Commit | Hash | Description |
|--------|------|-------------|
| Pre-snapshot | `86d62a5` | pre-bug-hunt snapshot |
| H1 fix | `278638b` | fix(H1): call destroy() on outgoing screen during back navigation |
| H2 fix | `064f678` | fix(H2): restore lander focus and scroll position on BACK navigation |
| H3+H5 fix | `73402c3` | fix(H3,H5): season state + zone/scroll restored on BACK in series PDP |
| H4 fix | `f5e0b28` | fix(H4): restrict triple-LEFT debug panel combo to nav bar only |

---

## HIGH Fixes Detail

### H1 — `App.navigate()` never calls `destroy()` (`js/app.js`)
Added `if (replace) activeScreen.destroy?.()` after `activeScreen.onBlur()`. Fixes HLS.js instance accumulation and `debugconfig:change` listener leaks on repeated Player visits.

### H2 — Lander focus/scroll not restored on BACK (`js/screens/lander.js`)
`init()` was reading from `params.restoreRailIdx`/`params.scrollY` — but history stores original params (always `{}`). Fixed to read `container._savedRailIdx` / `container._savedScroll` saved by `onBlur()`. Scroll applied with `transition:none` to prevent flash.

### H3 — Season selector pills update but episode tiles don't (`js/screens/series-pdp.js`)
Added `_applySeasonState(idx)` helper that updates pill labels AND rebuilds `#episodes-track` for the selected season. `_selectSeason()` delegates to it. Episode index and track scroll reset to 0 on season change.

### H4 — Triple-LEFT debug panel combo fires from any zone (`js/debug-panel.js`)
Added `.nav-tab.nav-focused` guard — combo only counts presses while the nav bar is focused. PRD §12.1 specifies "from the nav bar" explicitly.

### H5 — PDP zone/scroll/season lost on BACK from Player (`js/screens/series-pdp.js`)
`onBlur()` now saves all six state properties onto the container element. `init()` reads and clears them before re-initializing. Scroll restored no-transition; non-zero season state re-applied via `_applySeasonState()`.

---

## MEDIUM — Needs Your Review

### M1 — 19 of 20 shows have no series data file ⚠️ NEEDS APPROVAL
Creating `data/series/show-002.json` through `show-020.json` (19 new files) is flagged per the >3-file safety rule. Each show's Series PDP currently shows only the hero section — no seasons, no episodes, no extras. This is the most impactful remaining issue for a demo.

**To approve:** Give the go-ahead and I'll generate all 19 files in one pass.

### M2 — Genre pill scroll hardcoded 120px width (`js/screens/lander.js` ~line 684)
`scrollRailToIndex(track, idx, 120, 12, 0)` assumes uniform 120px pills. Pills vary ("Action" ≈ 96px, "Documentary" ≈ 162px). Fix: use `pills[idx].offsetLeft` directly.

### M3 — Series PDP `_scrollRail` has no transition (`js/screens/series-pdp.js`)
`track.style.transform = ...` is set without a CSS transition. Verify `.rail-scroll` in `series-pdp.css` has `transition: transform var(--t-scroll)`, or add it inline.

### M4 — Nav bar shows hardcoded "Location, ST" (`js/screens/lander.js` ~line 221)
`DataStore.getDetectedCity()` is available and returns the geo-detected city from `geo-state.json`. The nav `buildNav()` should call it instead of rendering the placeholder string.

---

## LOW — Needs Your Review

### L1 — Rail element IDs contain spaces (`js/screens/lander.js`)
`id="std-rail-Top Flix"` is invalid HTML. Fix: `config.title.replace(/\s+/g, '-').toLowerCase()`.

### L2 — `_startCityTimers()` is an empty no-op (`js/screens/lander.js`)
The method body is empty; living tile timers are now started inline. Remove the method and its `onFocus()` call, or replace the body with `_restartAllLivingTiles()`.

### L5 — `_fromLander` params never consumed (`js/screens/lander.js`)
State restoration is now handled via the container save mechanism (H2 fix). The `_fromLander` object spread in `_handleKey()` is dead weight. Remove it.

---

## Intentional Deviations (No Action)

- **L3** — `user-state.json` not loaded: correct per PRD — deferred to Auth phase
- **L4** — Ken Burns toggle missing from debug panel: Ken Burns was never implemented in CSS/JS; the toggle would be a no-op

---

## Approval Requests

| Item | What's needed |
|------|--------------|
| M1   | Approve creation of 19 series data files (`show-002.json` → `show-020.json`) |

---

## Not Pushed
Per session instructions, no `git push` was run. All commits are local on branch `initial-debug-panel`.
