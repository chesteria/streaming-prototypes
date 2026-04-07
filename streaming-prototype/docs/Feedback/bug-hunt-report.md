# Bug Hunt Report — Phase 1 / Phase 1.5 / HLS Stream Integration
**Date:** 2026-04-06  
**Branch:** `initial-debug-panel`  
**Scope:** Lander, Series PDP, Player, Debug Panel, HLS stream, navigation/focus system  
**Reference:** `prd/streaming-prototype-phase1-prd.md` + `change-log.md`

---

## CRITICAL — None found
No bugs that cause complete application failure were found. The app loads, navigates between screens, and plays the HLS stream on supported browsers.

---

## HIGH — Auto-fixed this session

---

### H1 — `App.navigate()` never calls `destroy()` on outgoing screens
**Type:** Bug  
**File:** `js/app.js`

**What's broken:**  
`App.navigate()` calls `onBlur()` when leaving a screen but never calls `destroy()`. Player's `destroy()` tears down HLS.js (`this._hls.destroy()`), removes the `debugconfig:change` event listener, pauses and nulls the video reference. Since this never runs:
- Every time the player is visited, a new HLS instance is created while the old one may still be attached to the video element
- The `debugconfig:change` listener accumulates — after 3 player visits there are 3 listeners firing on each debug config change
- The video element isn't properly torn down

**PRD says:** Screen objects expose `destroy()` for cleanup: *"destroy: function() { ... } — Cleanup"* (§2 Screen Registration Pattern).

**Proposed fix:** In `navigate()`, call `activeScreen.destroy()` when `replace === true` (BACK navigations). Forward navigations leave the screen in the DOM to be re-initialized on return, so `destroy()` isn't needed there.

> **FIXED** — Added `if (replace) activeScreen.destroy?.()` after `activeScreen.onBlur()` in `App.navigate()`. Now called on every BACK navigation.

---

### H2 — Lander focus and scroll not restored when pressing BACK
**Type:** Bug  
**File:** `js/screens/lander.js`

**What's broken:**  
`LanderScreen.onBlur()` correctly saves `this._scrollY` and `this._activeRailIdx` onto the container DOM element (`this._container._savedScroll`, `this._container._savedRailIdx`). But `init()` reads from `params.restoreRailIdx` and `params.scrollY`, which come from the history entry. The history entry stores the lander's *original* init params (empty `{}`), not the saved position. So every BACK navigation resets the lander to the top, rail 0.

**PRD says:** *"Focus memory: When navigating between rails (UP/DOWN), remember the horizontal position… Scroll behavior: When focus moves to a rail that's off-screen, the lander scrolls vertically to bring that rail into view."* (§7)

**Proposed fix:** In `init()`, read `this._container._savedRailIdx` and `this._container._savedScroll` (set by `onBlur()`) before re-building the DOM. Apply the saved scroll position immediately after DOM construction with `transition: none`, then restore the transition.

> **FIXED** — `init()` now reads `_savedRailIdx` / `_savedScroll` from the container element before the reset, clears them after reading, and applies the scroll position after building the DOM. `onFocus()` correctly enters the restored rail.

---

### H3 — Season selector changes the pill but not the episode tiles
**Type:** Bug  
**File:** `js/screens/series-pdp.js`

**What's broken:**  
`_selectSeason(idx)` updates the pill label/active state but does not rebuild the `#episodes-track` content. After pressing OK on "Season 2", the pills update but the episode tiles below still show Season 1's episodes. When the user presses DOWN and OK on an episode, `_handleKey` correctly uses `this._seasonIdx` to look up the episode in `this._seriesData.seasons[this._seasonIdx]` — so the player navigates to the right episode — but the *visual* shows the wrong tiles. The mismatch is confusing.

**PRD says:** *"OK/Select on a season switches the episodes rail below to that season's content."* (§5.2)

**Proposed fix:** Add `_applySeasonState(idx)` helper that updates pill labels AND rebuilds the episode track. Call it from `_selectSeason()`.

> **FIXED** — Added `_applySeasonState(idx)` which updates all pill labels and rebuilds `#episodes-track` innerHTML for the selected season. `_selectSeason()` now calls it. Episode index and track scroll are also reset to 0 on season change.

---

### H4 — Triple-LEFT debug panel combo fires from anywhere, not just nav
**Type:** Bug  
**File:** `js/debug-panel.js`

**What's broken:**  
The triple-LEFT combo (`ArrowLeft` × 3 within 800ms) opens the debug panel from any zone in the app. If a user navigates left quickly across tiles (e.g., pressing LEFT three times through the portrait rail or the genre pills within 800ms), the debug panel opens accidentally. This is a significant usability problem during normal TV navigation.

**PRD says:** *"On a TV remote, map this to a hidden button combo (e.g., press Left three times rapidly from the nav bar)."* (§12.1, emphasis on "from the nav bar")

**Proposed fix:** In the triple-LEFT handler, check that a nav tab has focus before triggering (`document.querySelector('.nav-tab.nav-focused')`). The `buildNavZone()` function adds `.nav-focused` to the active tab while nav is focused, and removes it when leaving nav. This check is zero-cost and correctly identifies the nav state.

> **FIXED** — Added `if (!document.querySelector('.nav-tab.nav-focused')) { _leftCount = 0; return; }` check before `toggle()` in the triple-LEFT handler. Panel now only opens from the nav zone.

---

### H5 — Series PDP focus zone, scroll, and season not restored on BACK from player
**Type:** Bug  
**File:** `js/screens/series-pdp.js`

**What's broken:**  
When navigating Player → BACK → Series PDP, the PDP re-runs `init()` with the original params (no saved state). `_activeZone` resets to `'buttons'`, `_seasonIdx` / `_episodeIdx` reset to 0, and scroll resets to top. If the user was in the episodes zone at episode 5 of season 2, they're dropped back at the hero Play button.

**PRD says:** *"BACK key → return to Lander (restore previous focus position)."* (§5.3) — implied the same applies to the PDP itself when returning from a sub-screen.

**Proposed fix:** Save all zone state in `onBlur()` onto the container element. Read and clear it at the top of `init()`. After `_render()`, apply saved scroll and re-apply season state if needed.

> **FIXED** — `onBlur()` saves `_savedZone`, `_savedSeasonIdx`, `_savedEpisodeIdx`, `_savedExtrasIdx`, `_savedSimilarIdx`, `_savedScrollY` onto container. `init()` reads and clears them before re-initializing. After `_render()`, scroll is restored (no-transition) and non-zero season state is re-applied via `_applySeasonState()`.

---

## MEDIUM — Awaiting your review

---

### M1 — 19 of 20 shows have no series data file
**Type:** Bug  
**File:** `data/series/` (only `show-001.json` exists)

**What's broken:**  
Every show except `show-001` (Garage Kings) navigates to a Series PDP that shows only the hero section. No season picker, no episode tiles, no extras, no similar titles, no more-info card. The user is stuck on the Play button with nowhere to go DOWN. For a prototype demo with 20 shows, this is a significant content gap.

**PRD says:** The Series PDP should show a season selector, episodes rail, extras rail, similar titles, and more-info card (§5.2). The PRD data spec calls for *"at least: 20 shows"* populated with content.

**Proposed fix:** Create `data/series/show-002.json` through `show-020.json`. Each file needs: seasons (with episodeCount, episodes array), extras array, similar array. This touches 19 new files — **flagged for approval per safety rule (>3 files)**.

**⚠️ NEEDS YOUR APPROVAL** — Not auto-fixed. Flagged in session log.

---

### M2 — Genre pill scroll uses hardcoded 120px width (imprecise)
**Type:** Bug  
**File:** `js/screens/lander.js` line ~684

**What's broken:**  
`scrollRailToIndex(track, idx, 120, 12, 0)` assumes every genre pill is 120px wide. Genre pills have variable text-based widths ("Action" ≈ 96px, "Documentary" ≈ 162px). When scrolling to pills beyond the first few, the focused pill may be slightly off-center or not fully visible.

**Proposed fix:** Use the actual DOM widths: measure `pills[idx].offsetLeft` and use that to set the translate, instead of computing from a hardcoded item width.

---

### M3 — Series PDP `_scrollRail` has no transition (instantly jumps)
**Type:** Bug  
**File:** `js/screens/series-pdp.js` `_scrollRail()`

**What's broken:**  
`track.style.transform = ...` is set without a CSS transition. The lander's equivalent function works because `.rail-scroll` has a CSS transition defined in `lander.css`. The PDP episode/extras/similar tracks may or may not have the same transition. If they don't, the rail jumps instantly instead of animating.

**Proposed fix:** Verify `.rail-scroll` CSS in `series-pdp.css` has a transition, or add `transition: transform var(--t-scroll) ...` inline.

---

### M4 — Nav bar shows hardcoded "Location, ST" instead of geo-detected city
**Type:** Bug (minor)  
**File:** `js/screens/lander.js` `buildNav()` line ~221

**What's broken:**  
The nav right section renders `"Location, ST"` as hardcoded text. `DataStore.getDetectedCity()` is available and returns the geo-detected city from `geo-state.json` (Atlanta, GA by default).

**PRD says:** Nav right section shows *"Location pin icon + 'Location, ST' text"* — this reads like a placeholder in the spec that should be replaced with real data.

**Proposed fix:** Call `DataStore.getDetectedCity()` in `buildNav()` or in `LanderScreen.init()` and pass it to `buildNav()`.

---

## LOW — Awaiting your review

---

### L1 — `std-rail-Top Flix` and `std-rail-My Mix` element IDs contain spaces
**Type:** Bug (technical)  
**File:** `js/screens/lander.js` `buildStandardRail()`

**What's broken:**  
`id="std-rail-${config.title}"` produces invalid HTML IDs (IDs cannot contain spaces). `id="std-rail-Top Flix"` is technically illegal. Works because the element is always accessed via `.rail-scroll` class selector, not by ID.

**Proposed fix:** `config.title.replace(/\s+/g, '-').toLowerCase()` for the ID.

---

### L2 — `_startCityTimers()` in LanderScreen is an empty no-op
**Type:** Intentional deviation (minor)  
**File:** `js/screens/lander.js`

**What's broken:**  
`_startCityTimers()` does nothing. Living tile timers are started inline inside `buildLocalCitiesRail()` and `buildHeroCarousel()` → `buildHeroTile()` during `init()`. The stop/restart functions are now `_stopAllLivingTiles()` / `_restartAllLivingTiles()`. The empty function body is a leftover stub that can be removed.

**Proposed fix:** Remove `_startCityTimers()` and its call in `onFocus()`, or replace its body with `_restartAllLivingTiles()` (to restart timers when returning to lander).

---

### L3 — `user-state.json` exists in `data/` but is never loaded
**Type:** Intentional deviation  
**File:** `data/user-state.json`

**What's broken:**  
The file exists but `data-store.js` does not load it. This is correct per the PRD: *"user-state.json (Continue Watching, My Stuff, Watch History, Saved Locations) is deferred to a future Authentication phase."* No action needed.

---

### L4 — Ken Burns Effect toggle missing from debug panel
**Type:** Intentional deviation  
**File:** `js/debug-panel.js` `PANEL_SPEC`

**What's broken:**  
PRD §12.1 Section C lists "Ken Burns Effect (subtle hero zoom)" as a feature toggle. The debug panel does not include this toggle. The PRD constant notes list it as `const ENABLE_KEN_BURNS = false;` — it was never implemented in the CSS/JS. Since there is no animation to control, the toggle would be a no-op. Intentional.

---

### L5 — `_fromLander` params stored in navigate but never consumed
**Type:** Bug (minor)  
**File:** `js/screens/lander.js` `_handleKey()`

**What's broken:**  
When navigating from lander: `App.navigate(result.screen, { ...result.params, _fromLander: { railIdx, scrollY } })`. The `_fromLander` object is attached to the destination screen's params. Neither `SeriesPDPScreen` nor `PlayerScreen` reads `params._fromLander`. The lander scroll/rail restoration is now handled via the container element save mechanism (H2 fix). These params are dead weight in history.

**Proposed fix:** Remove the `_fromLander` spreading in `_handleKey()`.

---

## Summary Table

| ID  | Severity | File(s)          | Fixed? |
|-----|----------|------------------|--------|
| H1  | HIGH     | app.js           | ✅ Yes |
| H2  | HIGH     | lander.js        | ✅ Yes |
| H3  | HIGH     | series-pdp.js    | ✅ Yes |
| H4  | HIGH     | debug-panel.js   | ✅ Yes |
| H5  | HIGH     | series-pdp.js    | ✅ Yes |
| M1  | MEDIUM   | data/series/ (19 files) | ⏳ Needs approval |
| M2  | MEDIUM   | lander.js        | ⏳ Your review |
| M3  | MEDIUM   | series-pdp.js    | ⏳ Your review |
| M4  | MEDIUM   | lander.js        | ⏳ Your review |
| L1  | LOW      | lander.js        | ⏳ Your review |
| L2  | LOW      | lander.js        | ⏳ Your review |
| L3  | LOW      | data/user-state.json | Intentional — no action |
| L4  | LOW      | debug-panel.js   | Intentional — no action |
| L5  | LOW      | lander.js        | ⏳ Your review |
