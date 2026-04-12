# Navigation Map

> All `App.navigate()` and `App.back()` call sites across the prototype.
> Last updated: 2026-04-12

---

## Overview

Navigation is managed entirely by `App.navigate(screenId, params, replace)`.
BACK navigation uses `App.back()` which pops the history stack.

- **`replace: false` (default):** pushes the current screen to history — BACK returns to it.
- **`replace: true`:** replaces without pushing — BACK skips over it.

---

## Screen Graph

```
                    ┌─────────────┐
              ┌────▶│   Lander    │◀────────────────────┐
              │     └──────┬──────┘                     │
              │            │ Live tab                    │
              │            │ App.navigate('epg',         │
              │            │   { entrySource: 'nav' })   │
              │            ▼                             │
              │     ┌─────────────┐  For You tab         │
              │     │     EPG     │──────────────────────┘
              │     └─────────────┘  App.navigate('lander')
              │
              │  BACK (App.back())
              │
  ┌───────────┴─────┐          ┌─────────────┐
  │   Series PDP    │◀─────────│   Lander    │
  └───────┬─────────┘  tile    └─────────────┘
          │            select
          │ episode / extra / similar tile
          │ App.navigate('player', { showId, episodeId, streamUrl })
          ▼
  ┌───────────────┐
  │    Player     │
  └───────────────┘
```

---

## All `App.navigate()` Call Sites

| File | Location | Navigates to | Params | Trigger |
|------|----------|-------------|--------|---------|
| `js/app.js` | `App.init()` | `lander` | `{}` | Boot — after welcome screen and participant prompt resolve |
| `js/screens/lander.js` | `buildNavZone()` select handler | `epg` | `{ entrySource: 'nav' }` | Live nav tab selected; also fires `epg_nav_to_live` |
| `js/screens/lander.js` | Rail tile select | `series-pdp` | `{ showId }` | OK on a show tile |
| `js/screens/lander.js` | Rail tile select | `player` | `{ showId, episodeId, streamUrl }` | OK on a channel or episode tile |
| `js/screens/epg/epg-screen.js` | `_buildNavZone()` For You handler | `lander` | `{}` | For You nav tab selected from EPG; fires `epg_nav_from_live` |
| `js/screens/series-pdp.js` | Episode / extra / similar select | `player` | `{ showId, episodeId, streamUrl }` | OK on a tile in any series-pdp rail |
| `js/screens/series-pdp.js` | Info modal CTA | `series-pdp` | `{ showId }` | "Go to Series Page" in player info modal |

---

## All `App.back()` Call Sites

| File | Context | Trigger | Notes |
|------|---------|---------|-------|
| `js/screens/lander.js` | Nav zone | BACK key at lander root | Fires `session_end` analytics via `App.back()` — history is empty |
| `js/screens/epg/epg-screen.js` | `'nav'` focus context | BACK key in nav bar | Exits EPG to whatever App.back() resolves (lander) |

---

## History Stack Behavior

`App.navigate(id, params, replace=false)` pushes `{ screenId, params }` onto the
history stack before mounting the new screen.

`App.back()` pops the stack and calls `App.navigate(prev.screenId, prev.params, replace=true)`.
With `replace=true`, the current screen is destroyed before mounting the previous one.

**Typical stack on player entry:**

```
Stack (bottom → top):
  { screenId: 'lander', params: {} }
  { screenId: 'series-pdp', params: { showId: 'show-001' } }

Active: player

Press BACK → series-pdp mounts, lander remains in stack.
Press BACK again → lander mounts, stack empty.
Press BACK again → App.back() returns false, session_end fires.
```

---

## EPG Navigation Context Detail

EPG has three internal focus contexts managed by `_focusContext`. These are
not App-level screen navigations — they are internal d-pad routing within the
single EPG screen.

```
  ┌──────────────────────────────────────────────────────────────┐
  │                         EPG Screen                           │
  │                                                              │
  │  [nav] ──DOWN──▶ [rail] ──DOWN──▶ [grid]                    │
  │    ▲               ▲                 │                       │
  │    │               │    ──UP──▶ [rail] (top row only)        │
  │    └───────BACK────┘                 │                       │
  │                          BACK ───────┘ (returns to 'nav')    │
  │                                                              │
  │  [grid] ──OK on logo──▶ [overlay] ──BACK/OK──▶ [grid]       │
  └──────────────────────────────────────────────────────────────┘
```

| From context | Key | To context | Notes |
|-------------|-----|-----------|-------|
| `nav` | DOWN | `rail` | `_navZone.deactivate()`, `_rail.setFocusedChip(idx)` |
| `nav` | BACK | App.back() | Exits EPG screen entirely |
| `rail` | UP | `nav` | `_rail.blurChips()`, `_navZone.activate()` |
| `rail` | DOWN | `grid` | `_enterRow(_lastRowIndex)` |
| `rail` | BACK | `nav` | Same as UP but also fires `epg_back_to_nav` |
| `rail` | OK | — | Selects genre chip, scrolls grid, moves to `grid` |
| `grid` | UP (row 0) | `rail` | `_blurCurrentRow()`, `_rail.setFocusedChip(idx)` |
| `grid` | BACK | `nav` | `_blurCurrentRow()`, fires `epg_back_to_nav`, calls `returnAllToNow()` |
| `grid` | OK on logo | overlay | `_overlay.open(channel, program, variant)` |
| overlay | BACK or OK | `grid` | `_onOverlayClose()` — no returnToNow |
