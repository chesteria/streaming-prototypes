# Performance Audit Report — Streaming TV Prototype
**Date:** 2026-04-09  
**Auditor:** Claude Code (read-only static analysis)  
**Codebase version:** v1.5.0, Build 1  
**Files read:** All JS, HTML, CSS, and key data/docs files  

---

## Section C — EXECUTIVE SUMMARY

### Overall Health Assessment

The codebase is in reasonable shape for a prototype at this phase. Architecture is intentional and well-documented. The focus engine is simple but correct. Screen management is clean. The biggest concern is not any single catastrophic bug — it is the accumulation of small performance costs that compound on every keypress, particularly on the lander screen.

The user-reported sluggishness on the lander is real and traceable to three specific causes.

---

### Top 3 Things Causing Sluggishness RIGHT NOW

**1. Analytics fires a full localStorage read+parse+write+prune cycle on every single keypress in the standard rail.**  
Every LEFT/RIGHT on the "Top Flix" or "My Mix" rail calls `Analytics.track('focus_change', ...)`. That single call triggers: `Object.keys(localStorage)` scan, `document.querySelector('.screen.active')` DOM query, `localStorage.getItem('analytics_events')` (the full event log), `JSON.parse` of the entire log, `JSON.stringify` of the log plus the new event, `localStorage.setItem` write, and then `_pruneOldSessions()` which does the parse and write again. On a TV chip this is 20–80ms of synchronous work per keypress. On desktop Chrome it is barely perceptible; on a Vizio or FireTV it is audible as input lag.

**2. Living tile timers continue running in the background after navigating to series-pdp or player.**  
`onBlur()` calls `_stopCityTimers()`, but `_cityTimers` is never populated (nothing ever pushes to it). The actual living tile timers are stored on `tileEl._livingTimer`. The result: when the user navigates from the lander to a series page, up to 10 `setInterval` callbacks (5 hero tiles + 5 city rail tiles) keep firing in the background, each one modifying `img.src` and triggering browser image fetches and layout work. `_stopAllLivingTiles()` is only called in `destroy()`, which only runs on `replace` navigation — not on normal forward navigation.

**3. Every focus change in every rail does a full `tiles.forEach(t => t.classList.remove('focused'))` scan before adding the new focus class.**  
On the cities rail (5 tiles) this is trivial. On the standard rails (10 tiles each) it is still cheap. However, this pattern means a keypress that moves focus in any rail always touches every tile in the rail. With 10 tiles per rail and two standard rails plus cities and channels, that is a total of ~33 DOM class operations per navigation event. Not catastrophic alone, but it adds up on a constrained chip.

---

### Top 3 Architectural Concerns for the Future

**1. Analytics fires synchronously in every hot input path.**  
The `track()` function is called inline inside key handlers, before the visual update occurs. As the session grows (more events in localStorage), the cost of each track call increases linearly. By session 50, a single keypress could incur 50KB+ of JSON serialization. This will become a wall before Phase 3 device simulation starts generating synthetic event volume.

**2. All rail component logic is inlined in `lander.js` — a single 1,289-line file with no reuse.**  
`buildStandardRail`, `buildHeroCarousel`, `buildLocalCitiesRail`, etc. are all freestanding functions inside one file. Focus management, analytics state tracking, and DOM construction are all mixed together with no abstraction boundary. Adding Phase 3 scenario switching will require editing every rail builder in that file. Any future screen that wants to show a rail (e.g., a search results screen) cannot reuse any of this code.

**3. DataStore lookups are O(n) linear array scans with no indexing.**  
`getShow(id)` does `catalog.shows.find(s => s.id === id)` on every call. `getFeaturedItems()` calls that three times per featured ID. `getTopFlix()` calls it 10 times. With 20 shows this is negligible now. If the catalog grows to 200+ items in Phase 3 (which is the stated goal for device simulation), every lander build will do hundreds of linear scans.

---

### Recommendation

**Hybrid: fix the hot path now, defer the architecture.**

Fix items 1 and 2 above in the next work session — they are causing real, measurable sluggishness on TV hardware. Item 3 (analytics) is a medium-complexity refactor. The architectural concerns (section A) can wait until the end of Phase 2 when the event taxonomy is stable.

### Red Flags

- **Living tile timers running during screen transitions is a confirmed bug, not just a risk.** On a TV chip with a weak GPU, six background `setInterval` callbacks each mutating image src elements will visibly affect the smoothness of the series-pdp page load animation.
- **No `async` or `defer` on CDN scripts.** `hls.min.js` and `qrcode.min.js` are both render-blocking. `hls.min.js` is ~250KB. On a slow TV network connection this delays the first paint.
- The analytics `_pruneOldSessions()` function is called twice on every `track()` call — once inside `_store()` and once at module init (`if (ANALYTICS_ENABLED) { init(); _pruneOldSessions(); }`). On a fresh session this is harmless, but it is structurally redundant.

---

## Detailed Findings

---

### Finding 1: Analytics localStorage Read+Parse+Write on Every Keypress in Standard Rails

**IMPACT:** HIGH — directly causes input lag on constrained hardware  
**COMPLEXITY:** SMALL — focused change to one module  
**LOCATION:** `js/analytics.js` — `track()` → `_store()` → `_pruneOldSessions()` (lines 146–212)  
**ALSO:** `js/screens/lander.js` `buildStandardRail` `handleKey` for LEFT/RIGHT (lines 1152–1200)

**SYMPTOM:** User feels a slight "stutter" or frame drop after each LEFT/RIGHT keypress when browsing Top Flix or My Mix rails. The lag is less noticeable on desktop Chrome (fast JS engine + fast SSD) and is most visible on a TV chip (Vizio, FireTV).

**ROOT CAUSE:**  
Every LEFT/RIGHT keypress in a standard rail triggers `Analytics.track('focus_change', ...)`. The `track()` function:
1. Calls `_getConfig()` which iterates `Object.keys(localStorage)` and reads multiple keys.
2. Calls `_getCurrentScreen()` which runs `document.querySelector('.screen.active')`.
3. Calls `_store(event)` which: reads `localStorage.getItem('analytics_events')` (the entire event log as a string), `JSON.parse`s it, creates a new array, `JSON.stringify`s it, and calls `localStorage.setItem` to write it back.
4. Calls `_pruneOldSessions()` which: reads `getEvents()` (another full parse of the event log), scans all events for unique session IDs, and potentially writes the trimmed array back.

This is 3–5 synchronous localStorage operations plus two JSON parse/stringify cycles per keypress. localStorage is synchronous and disk-backed — it blocks the main thread. JSON parsing a growing event log (50+ events after a few minutes of use) is non-trivial work on a TV chip.

**PROPOSED FIX:**  
Decouple event writing from event tracking. Keep an in-memory array (`_buffer`) of events. Flush to localStorage on a timer (e.g., every 10 seconds or on `beforeunload`). The `track()` function should only push to `_buffer`. Remove `_pruneOldSessions()` from the `_store()` hot path — run it only at flush time. Cache `_getConfig()` and invalidate on `debugconfig:change` events rather than computing it fresh every call. Cache `_getCurrentScreen()` and update it on navigation events. This pattern reduces the per-keypress cost from ~5 localStorage ops to zero localStorage ops.

**REGRESSION RISK:** Low. The analytics data is already write-only for the app's purposes; the only reader is `getEvents()` called by the debug panel and reporting. Buffering introduces a small window where events could be lost on a crash, which is acceptable for a prototype.

**DEPENDENCIES:** None.

---

### Finding 2: Living Tile Timers Not Stopped on Forward Navigation (Confirmed Bug)

**IMPACT:** HIGH — background work during other screens, image network requests, layout invalidation  
**COMPLEXITY:** TRIVIAL — one line added to `onBlur()`  
**LOCATION:** `js/screens/lander.js` — `onBlur()` method (line 131), `_stopCityTimers()` (line 302), `startLivingTile()` (line 604)

**SYMPTOM:** After navigating from the lander to a series detail page, the background image cycling animation in the hero carousel city tile and the city rail tiles continues to fire. On a low-power TV chip, this means every 5 seconds a batch of `img.src` mutations occurs in a hidden DOM tree, potentially triggering image fetches (if the browser evicted them from cache) and compositing work.

**ROOT CAUSE:**  
`onBlur()` calls `this._stopCityTimers()` (line 134), but `_stopCityTimers()` clears `this._cityTimers[]` (line 303), an array that is **never populated**. Nothing in the codebase pushes to `this._cityTimers`. The actual living tile timers are stored on `tileEl._livingTimer` (set in `startLivingTile()` at line 629). The function that correctly clears them is `_stopAllLivingTiles()` (line 632), which queries `document.querySelectorAll('[data-living-tile]')` and clears each `_livingTimer`. This function is called in `destroy()` (line 146) but `destroy()` is only invoked on `replace`-mode navigation (e.g., pressing BACK to the lander). Normal forward navigation (lander → series-pdp) only calls `onBlur()`, leaving all living tile timers running.

**PROPOSED FIX:**  
Add `_stopAllLivingTiles()` to `onBlur()`:
```js
onBlur() {
  this._navZone.deactivate();
  this._railModules.forEach(r => r.onLeave && r.onLeave());
  _stopAllLivingTiles();   // ADD THIS LINE
  // this._stopCityTimers(); // this can be removed — it's a no-op
  clearInterval(this._heroTimer);
  ...
}
```
Also add `_restartAllLivingTiles()` in `onFocus()` — it already exists there (line 128), so this is already handled on return.

**REGRESSION RISK:** Very low. `onFocus()` already restarts living tiles, so the user experience on BACK navigation is unaffected.

**DEPENDENCIES:** None.

---

### Finding 3: Hero Carousel Resets `setInterval` on Every Keypress

**IMPACT:** MEDIUM — wasteful timer churn; degrades on repeated rapid keypresses  
**COMPLEXITY:** TRIVIAL — already has the right structure, needs a guard  
**LOCATION:** `js/screens/lander.js` — `startAutoAdvance()` (line 439), called from `handleKey()` for LEFT/RIGHT (lines 502, 520)

**SYMPTOM:** When the user navigates left or right through the hero carousel, the 5-second auto-advance timer is canceled and restarted on every keypress. If the user presses LEFT 10 times in quick succession, 10 intervals are created and destroyed. This is correct behavior (reset timer on interaction) but the `clearInterval` + `setInterval` pair is being called for every individual keypress rather than being debounced.

**ROOT CAUSE:**  
`startAutoAdvance()` at line 439 unconditionally calls `clearInterval(autoTimer)` followed by `setInterval(...)`. It is called from `handleKey()` at lines 502 and 520 on each LEFT or RIGHT press. There is no debounce. On a TV remote where keypresses can fire 15+ times per second during a held-down direction, this creates and destroys many timer objects in rapid succession.

**PROPOSED FIX:**  
Debounce `startAutoAdvance()` with a small delay (e.g., 300ms). Do not call `startAutoAdvance()` immediately on keypress; instead, call it only after the user has stopped pressing keys for a beat. Alternatively: only call `startAutoAdvance()` after a keypress if the timer is not already running (add an `isActive` guard to skip the restart if the user is in the middle of rapid navigation).

**REGRESSION RISK:** Very low. The visual behavior (timer resets on user interaction) is preserved.

**DEPENDENCIES:** None.

---

### Finding 4: Full O(n) Tile Scan on Every Focus Change

**IMPACT:** MEDIUM on current scale (10 tiles max), will become HIGH if tiles grow  
**COMPLEXITY:** SMALL  
**LOCATION:** `js/screens/lander.js` — every `focusTile()` function in every rail builder (lines 702, 810, 888, 996, 1003, 1129); `js/screens/series-pdp.js` — `_deactivateAllZones()` (lines 315–322), `_focusEpisode()` (lines 363–367), `_focusSimilar()` (lines 379–383)

**SYMPTOM:** Perceptible on the series-pdp screen when focus zone changes (e.g., pressing DOWN from seasons to episodes triggers `_deactivateAllZones()` which runs 4 `querySelectorAll` + 4 `forEach`). On the lander standard rails, each focus change runs `tiles.forEach(t => t.classList.remove('focused'))` across all tiles.

**ROOT CAUSE:**  
Every `focusTile(idx)` function first removes `focused` from all tiles, then adds it to the target tile. No reference to the previously focused tile is kept. This is a classic O(n) clear-all-then-set-one pattern. For 10 tiles it is ~10 class operations per keypress. For `_deactivateAllZones()` in series-pdp, it runs across 4 different element sets.

**PROPOSED FIX:**  
Track `_prevFocusedTile` as a direct element reference in each rail and in series-pdp. On focus change: `prevTile.classList.remove('focused'); newTile.classList.add('focused')`. This reduces DOM operations from O(n) to O(1) per focus change. The `FocusEngine.createZone()` helper already has a `prevIdx` pattern in its `focus()` method (line 58) — extend that to pass the actual element.

**REGRESSION RISK:** Low. The focused/unfocused visual state is maintained identically.

**DEPENDENCIES:** None. But coordinate with Finding 5 below (series-pdp) if refactoring that file.

---

### Finding 5: `_deactivateAllZones()` Runs 5 `querySelectorAll` Calls on Every Zone Change in Series-PDP

**IMPACT:** MEDIUM  
**COMPLEXITY:** SMALL  
**LOCATION:** `js/screens/series-pdp.js` — `_deactivateAllZones()` (lines 315–322), called from `_activateZone()` (lines 258, 288)

**SYMPTOM:** Each time the user presses UP or DOWN to move between zones on the series detail page (buttons → seasons → episodes → extras → similar → more-info), `_deactivateAllZones()` runs:
- `querySelectorAll('.pdp-btn')` + forEach
- `querySelectorAll('.season-pill')` + forEach
- `querySelectorAll('.episode-tile')` + forEach (could be 8+ tiles)
- `querySelectorAll('#similar-track .portrait-tile')` + forEach (could be 5+ tiles)
- `querySelector('#more-info-card')` + class removal

That is 5 DOM queries plus N class removals on every zone transition keypress.

**ROOT CAUSE:**  
No state is kept about which element was previously focused. All elements are cleared en masse rather than specifically undoing the previous state.

**PROPOSED FIX:**  
Cache zone element references at render time. Keep a reference to the current focused element per zone (e.g., `this._focusedBtnEl`, `this._focusedSeasonEl`, etc.). On zone change, only touch the elements for the outgoing and incoming zones. Cache `querySelectorAll` results for static collections (episode tiles, season pills) after `_render()` and update the cache only after `_applySeasonState()` rebuilds the episode track.

**REGRESSION RISK:** Low. Functionally equivalent behavior.

**DEPENDENCIES:** Coordinate with Finding 4 if done in the same session.

---

### Finding 6: Analytics `_store()` Calls `_pruneOldSessions()` on Every Write, Which Reads the Full Event Log Again

**IMPACT:** HIGH (compounds Finding 1)  
**COMPLEXITY:** TRIVIAL — move the call  
**LOCATION:** `js/analytics.js` — `_store()` line 212

**SYMPTOM:** After `_store()` writes the new event to localStorage, it immediately calls `_pruneOldSessions()`, which calls `getEvents()` (another `localStorage.getItem` + `JSON.parse`), then iterates all events to build a session order, then potentially writes again. So each `track()` call results in up to 2 full reads and 2 full writes of the entire events array.

**ROOT CAUSE:**  
`_pruneOldSessions()` was added as a protective measure (bug M5 from the prior bug hunt). It is correct to prune, but it is unnecessary to prune on every single event write. Pruning only needs to happen when the session count could have changed (i.e., on `init()`, which is already done).

**PROPOSED FIX:**  
Remove the `_pruneOldSessions()` call from `_store()`. Keep it in `init()`. If prune-on-write is desired for safety, check `sessionOrder.length` using in-memory state (tracked as a counter) rather than reading from localStorage again.

**REGRESSION RISK:** Very low. The prune is additive safety behavior; removing it from the hot path does not affect correctness for normal session lengths.

**DEPENDENCIES:** Related to Finding 1 (both are analytics perf issues; fix together).

---

### Finding 7: `_getConfig()` Called on Every `track()` — Iterates All localStorage Keys

**IMPACT:** MEDIUM  
**COMPLEXITY:** TRIVIAL — cache the result  
**LOCATION:** `js/analytics.js` — `_getConfig()` (line 66), called from `track()` (line 169)

**SYMPTOM:** Every analytics event includes a `config` payload built by `_getConfig()`, which calls `Object.keys(localStorage)` and then `localStorage.getItem()` for each key starting with `debug_`. This is done on every single event — including `focus_change` which fires on every keypress.

**ROOT CAUSE:**  
Config snapshot is computed fresh on every event. The debug config only changes when the user actively adjusts something in the debug panel (rare). Computing it on every keypress is unnecessary.

**PROPOSED FIX:**  
Cache the result of `_getConfig()` in a module-level variable. Invalidate the cache on `debugconfig:change` events. Add a listener:
```js
document.addEventListener('debugconfig:change', () => { _cachedConfig = null; });
```
Return the cached value when available.

**REGRESSION RISK:** None. Config changes while the panel is open are a debugging action, not a user action.

**DEPENDENCIES:** None.

---

### Finding 8: CDN Scripts Are Render-Blocking (No `async`/`defer`)

**IMPACT:** MEDIUM on fast connections, HIGH on slow TV network connections  
**COMPLEXITY:** TRIVIAL  
**LOCATION:** `index.html` lines 45 and 48

**SYMPTOM:** On a TV device with a slow Wi-Fi connection, the app's first paint is delayed by the sequential download of `hls.min.js` (~250KB) and `qrcode.min.js`. Both scripts are loaded with plain `<script src="...">` tags in the body, which halts HTML parsing until the scripts download and execute.

**ROOT CAUSE:**  
Standard synchronous script loading. Scripts in the body still block the parser when encountered. HLS.js in particular is large and not needed at first paint — it is only initialized when the player screen opens.

**PROPOSED FIX:**  
Add `defer` to both CDN `<script>` tags. `defer` maintains execution order and fires before `DOMContentLoaded`, which is when `App.init()` runs. Both libraries are only referenced inside screen `init()` functions (HLS.js is used in `player.js`, QRCode.js in `feedback.js`), so deferred loading is safe.

```html
<script defer src="https://cdn.jsdelivr.net/npm/hls.js@1/dist/hls.min.js"></script>
<script defer src="https://cdn.jsdelivr.net/npm/qrcodejs@1.0.0/qrcode.min.js"></script>
```

**REGRESSION RISK:** Low. The existing guard `if (typeof Hls !== 'undefined' && Hls.isSupported())` in player.js already handles the case where HLS.js is not yet loaded.

**DEPENDENCIES:** None.

---

### Finding 9: `will-change: transform` Applied to All Tiles at All Times

**IMPACT:** MEDIUM — excess GPU memory pressure on TV devices  
**COMPLEXITY:** SMALL  
**LOCATION:** `css/lander.css` lines 55, 201, 292, 442, 466, 614; `css/series-pdp.css` lines 147, 235; `css/player.css` lines 195, 221, 254, 267

**SYMPTOM:** GPU memory usage is higher than necessary, which on TV devices with limited VRAM can cause compositing stalls and dropped frames during simultaneous animations.

**ROOT CAUSE:**  
`will-change: transform` is applied statically to every tile class (`hero-tile`, `channel-tile`, `portrait-tile`, `landscape-tile`, `.rail-scroll`, `.hero-track`, `.lander-scroll`, etc.). This tells the browser to promote each element to its own GPU layer at all times. With ~60+ tiles on the lander screen, this means 60+ compositor layers exist permanently, even when no animation is running. On a TV GPU with limited VRAM (commonly 512MB–1GB shared with system RAM), this is meaningful pressure.

**PROPOSED FIX:**  
Remove `will-change: transform` from the static tile classes. Add it via JavaScript or a `.is-animating` CSS class only when a transition is actively in progress:
```js
// Before animation starts
track.classList.add('is-animating');
track.style.transform = `translateX(${x}px)`;
// After transition ends (transitionend event)
track.classList.remove('is-animating');
```
Or, more pragmatically: keep `will-change: transform` only on the scroll containers (`lander-scroll`, `hero-track`, `.rail-scroll`) which genuinely animate on every navigation. Remove it from individual tile elements — the tiles themselves do not translate, they only scale on focus.

**REGRESSION RISK:** Low. The visual output is identical. On desktop Chrome the difference is unmeasurable; on a TV chip it should reduce memory pressure.

**DEPENDENCIES:** None.

---

### Finding 10: Video Event Listeners (`loadedmetadata`, `timeupdate`, `ended`) Not Explicitly Removed in `destroy()`

**IMPACT:** LOW — bounded leak since the element is discarded with the DOM  
**COMPLEXITY:** TRIVIAL  
**LOCATION:** `js/screens/player.js` — `_attachProgressUpdates()` (lines 254–307), `destroy()` (lines 347–364)

**SYMPTOM:** (Hypothesis, not confirmed to cause observable symptom at this scale.) When the player screen is destroyed, the `<video>` element is part of the discarded DOM subtree. Modern browsers will garbage-collect the element and its listeners. However, setting `video.src = ''` and calling `video.load()` in `destroy()` can trigger a `loadedmetadata` or `ended` event callback that fires on a now-destroyed screen object, potentially calling `this._updateProgressUI()` on a detached container.

**ROOT CAUSE:**  
`_attachProgressUpdates()` adds anonymous arrow function listeners to the video element. These are not stored and cannot be removed by reference. `destroy()` does a reasonable cleanup (`hls.destroy()`, `video.pause()`, `video.removeAttribute('src')`, `video.load()`) but does not call `video.removeEventListener`. Since the listeners are anonymous, they cannot be removed. The `video.load()` call can trigger `ended` events.

**PROPOSED FIX:**  
Store the event handler references as named functions on `this` so they can be removed:
```js
this._onTimeUpdate = () => { ... };
video.addEventListener('timeupdate', this._onTimeUpdate);
// In destroy():
if (this._video && this._onTimeUpdate) {
  this._video.removeEventListener('timeupdate', this._onTimeUpdate);
  // etc.
}
```

**REGRESSION RISK:** None.

**DEPENDENCIES:** None.

---

### Finding 11: `_getCurrentScreen()` Queries the DOM on Every Analytics Event

**IMPACT:** LOW (fast query, but unnecessary)  
**COMPLEXITY:** TRIVIAL  
**LOCATION:** `js/analytics.js` — `_getCurrentScreen()` (lines 187–191), called from `track()` (line 168)

**SYMPTOM:** No visible symptom at current event volume, but adds a small synchronous DOM query to every tracked event.

**ROOT CAUSE:**  
The active screen is determined by querying `document.querySelector('.screen.active')` on every `track()` call. The active screen only changes on `App.navigate()` calls, which happen at most once per user action. There is no need to re-query on every focus change event.

**PROPOSED FIX:**  
Have `App.navigate()` push the current screen id to a module-level variable in analytics:
```js
// In app.js, after setting activeScreen:
if (typeof Analytics !== 'undefined') Analytics._setActiveScreen(screenId);
```
Or add a getter to `App` and call it once per navigation rather than once per event. Alternatively, subscribe to `debugconfig:change`-style custom events dispatched on navigation.

**REGRESSION RISK:** None.

**DEPENDENCIES:** Mild coupling between `App` and `Analytics`. Can be done as a simple event.

---

### Finding 12: Welcome Screen Fetches 8 Device Profile JSON Files on Every Launch

**IMPACT:** LOW — parallel fetches, non-blocking after DOMContentLoaded  
**COMPLEXITY:** SMALL  
**LOCATION:** `js/welcome-screen.js` — `_loadProfiles()` (lines 242–251)

**SYMPTOM:** On first launch, 8 parallel `fetch()` calls are made for device profile JSON files. These are small files and the fetches are parallel, but on a TV with limited network bandwidth they add to startup latency. The profiles are loaded on every app launch even when the welcome screen has already been seen.

**ROOT CAUSE:**  
`WelcomeScreen.init()` always calls `_loadProfiles()`, even on returning visits where `seen = true`. The profiles are fetched just to run `_detect()` to determine which profile to show — but on a returning visit, the screen is not shown at all.

**PROPOSED FIX:**  
Move `_loadProfiles()` inside the `if (!seen || force) { ... }` block. On returning visits, skip the fetch entirely. The detected device ID can be stored in localStorage after first detection so `_detect()` doesn't need profile data on subsequent launches.

**REGRESSION RISK:** Low. The only risk is a stale device profile if profile files change — acceptable for a prototype.

**DEPENDENCIES:** None.

---

### Finding 13: `getTopFlix()` and `getMyMix()` Perform 20 O(n) Linear Scans at Lander Init

**IMPACT:** LOW now (20 items), MEDIUM at Phase 3 catalog scale  
**COMPLEXITY:** SMALL — add an index map  
**LOCATION:** `js/data-store.js` — `getTopFlix()` (lines 111–115), `getMyMix()` (lines 117–121), `getShow()` (line 55)

**SYMPTOM:** No perceptible symptom at 20 shows. Will become noticeable if the catalog grows to 200+ items in Phase 3.

**ROOT CAUSE:**  
`getShow(id)` uses `catalog.shows.find(s => s.id === id)`. `getTopFlix()` calls `getShow()` 10 times in sequence. `getMyMix()` calls it another 10 times. `getFeaturedItems()` calls `find` on shows, cities, and collections for each featured ID. At 20 items, each `find` is ≤20 comparisons — invisible. At 200 items with 10 calls, it is 2,000 comparisons at lander init.

**PROPOSED FIX:**  
After `catalog` is loaded in `DataStore.init()`, build an index:
```js
const _showsById = {};
catalog.shows.forEach(s => { _showsById[s.id] = s; });
```
`getShow(id)` becomes `return _showsById[id] || null` — O(1). Do the same for channels, cities, collections.

**REGRESSION RISK:** None. The interface does not change.

**DEPENDENCIES:** None.

---

### Finding 14: `Math.random()` in Live Channels Rail HTML Template

**IMPACT:** LOW — render-time only, not in animation loop  
**COMPLEXITY:** TRIVIAL  
**LOCATION:** `js/screens/lander.js` — `buildLiveChannelsRail()` (line 782)

**SYMPTOM:** No direct performance impact. The value is computed once at render time, not in a loop. However, it produces a different progress bar width on every page load/rebuild, which means the lander state is not reproducible across sessions. This could create inconsistencies in user testing scenarios where the researcher wants to compare behavior across participants.

**ROOT CAUSE:**  
`${30 + Math.random() * 60 | 0}%` generates a random progress percentage for each live channel tile. This is done at template string construction time.

**PROPOSED FIX:**  
Use a seeded value derived from the channel ID or a fixed value from the channel data model. This makes the display deterministic.

**REGRESSION RISK:** None.

**DEPENDENCIES:** None. Optionally coordinate with lander-config or catalog data.

---

### Finding 15: `backdrop-filter: blur()` Applied in 9 Places

**IMPACT:** MEDIUM on TV hardware — this is one of the most GPU-expensive CSS properties  
**COMPLEXITY:** MEDIUM — requires design judgment about which ones to remove  
**LOCATION:** Multiple CSS files (see list below)

**Files:**
- `css/global.css` lines 57 (toast), 88 (badge)
- `css/lander.css` line 142 (city temp badge)
- `css/debug-panel.css` line 14
- `css/feedback.css` lines 44, 137, 333
- `css/player.css` line 185
- `css/welcome-screen.css` line 11

**SYMPTOM:** On TV devices with weak GPU compositors (Roku, older Vizio), blur-composited elements can cause dropped frames when they appear or are animated. The badge in `lander.css` (city temperature pill) is always visible on the lander screen. The toast in `global.css` appears frequently.

**ROOT CAUSE:**  
`backdrop-filter: blur()` requires the browser to sample and blur pixels behind the element in real time. Unlike `filter: blur()` on the element itself, backdrop-filter reads other layers — it is not GPU-cacheable. On Apple Silicon (desktop) it runs in hardware with no perceptible cost. On a Vizio chipset it is a software fallback.

**PROPOSED FIX:**  
Audit each usage for necessity. The toast and badges do not require real blur — replace with a semi-transparent background using `background: rgba(...)` (already partially done). Keep `backdrop-filter` on the debug panel, feedback overlay, and welcome screen (these are full-screen overlays that appear infrequently). Remove it from always-visible inline elements (badge, city temperature pill, toast).

**REGRESSION RISK:** Low visual change — the semi-transparent background still looks polished without the blur effect.

**DEPENDENCIES:** None.

---

## Section A — ARCHITECTURAL RECOMMENDATIONS

---

### A1. Analytics Is Synchronous in the Hot Input Path

**What's fragile:** `Analytics.track()` blocks the main thread. It is called from inside key handlers, which are called from `FocusEngine.handleKey()`, which is called from the global `keydown` listener. The entire chain is synchronous. As the event log grows, each keypress incurs increasing serialization overhead.

**What problem this causes as the app grows:** Phase 3 scenario simulation is planned to run synthetic user sessions. Synthetic events will generate analytics events at machine speed — potentially hundreds per second. With the current synchronous localStorage write model, this will saturate the main thread and make the simulation output untrustworthy (the simulation will slow down due to its own instrumentation).

**Ideal architecture:** Track events into an in-memory buffer. Flush to localStorage on a 10-second interval, on `beforeunload`, and when the buffer exceeds a size threshold (e.g., 50 events). `track()` itself becomes a single array push — O(1), no I/O. This is sometimes called a "write-behind" or "async sink" pattern. The Analytics module already has the infrastructure for this (`_pendingBatch` for Firebase transport); apply the same model to localStorage.

**Effort estimate:** 1 Claude Code session.

**Do it now or later:** Do it now, before Phase 3. The current implementation will actively harm Phase 3 simulation accuracy.

---

### A2. All Rail Logic Is Monolithic in `lander.js` — No Component Abstraction

**What's fragile:** `lander.js` is 1,289 lines and contains 8 rail builder functions, each with its own focus management, analytics state, and DOM construction logic. There is no shared abstraction for "a horizontal scrollable rail with focus." The patterns repeat nearly identically across `buildStandardRail`, `buildLocalCitiesRail`, and `buildLiveChannelsRail`.

**What problem this causes as the app grows:** 
- Adding a new rail type requires adding another large function to an already-large file.
- Bug fixes to shared patterns (e.g., the O(n) tile scan in Finding 4) must be applied in multiple places by hand.
- A search results screen that wants to show a rail cannot import or reuse anything from lander.js.
- Phase 3 scenario presets may need to rearrange or toggle rails dynamically — this is currently only possible by modifying `lander-config.json`, which is loaded at init. Dynamic rail insertion/removal is not supported.

**Ideal architecture:** Extract a shared `RailBuilder` module (or factory function) that accepts a config object and returns a rail controller. Focus management, analytics state shape, and DOM scroll logic would be defined once. Individual rail types would override only what is different (tile render function, data source, key behavior). This mirrors what the existing `FocusEngine.createZone()` does for horizontal navigation zones — extend that pattern to full rail lifecycle.

**Effort estimate:** 2–3 Claude Code sessions (risky to do mid-feature, should follow a Phase 2 milestone).

**Do it now or later:** After Phase 2 is complete and the analytics taxonomy is stable. The refactor will touch `lander.js` everywhere and should not happen during active feature development.

---

### A3. DataStore Has No Indexing — All Lookups Are Linear Scans

**What's fragile:** `getShow(id)`, `getChannel(id)`, `getCity(id)`, `getCollection(id)` all use `Array.find()`. `getFeaturedItems()` calls multiple finds in sequence. This is fine at 20 shows but scales poorly.

**What problem this causes as the app grows:** Phase 3 scenarios are expected to simulate different catalog compositions. If scenario switching involves refreshing the catalog (e.g., swapping in a 200-item catalog for a different market), lander build time will noticeably increase.

**Ideal architecture:** Build an ID-keyed lookup map (`_showsById`, `_citiesById`, etc.) in `DataStore.init()` immediately after loading. All `getX(id)` functions use O(1) map lookup. No interface change required.

**Effort estimate:** 30 minutes. A very small, isolated change.

**Do it now or later:** Do it now — it is trivial and low-risk, and it future-proofs the data layer.

---

### A4. Global Scope Pollution via Module-Level `const` Declarations

**What's fragile:** Every module (`LanderScreen`, `SeriesPDPScreen`, `PlayerScreen`, `FocusEngine`, `Analytics`, `DataStore`, `DebugPanel`, `DebugConfig`, `FeedbackSystem`, `WelcomeScreen`, `App`) is a module-level `const` on the global `window` object. Load order in `index.html` is the only thing preventing name collisions. There is no namespace, no module system.

**What problem this causes as the app grows:** Adding Phase 3 scenario modules or additional screens will add more globals. If any library loaded via CDN uses the same name (e.g., a future QR library that exports `Analytics` or `App`), there will be a silent collision. TypeScript or JSDoc-based type checking is impossible without a module system.

**Ideal architecture:** Adopt ES modules (`<script type="module">`) with explicit `import`/`export`. This is supported by all modern TV browsers (Chrome 61+, which covers Vizio SmartCast, FireTV Silk Browser, Tizen 5+, WebOS 6+). Roku's SCENEGRAPH would need a different approach, but the PRD targets WebView-based platforms.

**Effort estimate:** 2 Claude Code sessions (requires touching every file, low logic risk but high diff volume).

**Do it now or later:** Defer until after Phase 3. The current approach works and was explicitly chosen for TV WebView compatibility. Revisit when Roku support is added, at which point a bundler (Rollup, Vite) would handle the compatibility concern.

---

## Section B — PRIORITIZED ACTION LIST

### QUICK WINS (high impact, low complexity)

| # | Issue | Finding | Estimated time |
|---|-------|---------|----------------|
| 1 | Stop living tile timers in `onBlur()` | Finding 2 | 5 minutes |
| 2 | Remove `_pruneOldSessions()` from `_store()` hot path | Finding 6 | 10 minutes |
| 3 | Cache `_getConfig()` result, invalidate on config change | Finding 7 | 15 minutes |
| 4 | Add `defer` to CDN script tags | Finding 8 | 2 minutes |
| 5 | Add ID-keyed index maps to DataStore | Finding 13 | 30 minutes |
| 6 | Remove `will-change: transform` from static tile elements | Finding 9 | 20 minutes |

---

### FOUNDATION FIXES (high impact, medium complexity)

| # | Issue | Finding | Estimated time |
|---|-------|---------|----------------|
| 1 | Decouple Analytics `track()` from localStorage (write-behind buffer) | Finding 1 + A1 | 1 session |
| 2 | Cache `_getCurrentScreen()` via App navigation events | Finding 11 | 30 minutes |
| 3 | Track focused tile by element reference rather than full scan | Finding 4 + 5 | 1 session (covers both) |

---

### CLEANUP (medium-low impact, low complexity)

| # | Issue | Finding | Estimated time |
|---|-------|---------|----------------|
| 1 | Debounce hero carousel timer reset on keypress | Finding 3 | 15 minutes |
| 2 | Name and store video event listener refs for clean removal | Finding 10 | 20 minutes |
| 3 | Replace `Math.random()` in live channel progress with seeded value | Finding 14 | 10 minutes |
| 4 | Delay WelcomeScreen profile fetch until screen is actually needed | Finding 12 | 20 minutes |
| 5 | Audit and reduce `backdrop-filter` usage on always-visible elements | Finding 15 | 30 minutes |

---

### DEFER (medium-low impact, medium-high complexity)

| # | Issue | Arch Finding | Notes |
|---|-------|-------------|-------|
| 1 | Extract shared RailBuilder abstraction from `lander.js` | A2 | After Phase 2 complete |
| 2 | Adopt ES modules | A4 | After Phase 3, with bundler |

---

## Non-Performance Issues Found During Audit

These are correctness or UX bugs, not performance issues. Noted here for completeness.

---

**NP-1: `_stopCityTimers()` is a permanent dead code no-op.**  
`this._cityTimers` is initialized to `[]` at line 41 and reset to `[]` at line 304, but nothing ever pushes to it. The method does nothing. It appears to be a legacy from an earlier design where timers were tracked differently. It should be removed to avoid confusion. The actual timer management is via `tileEl._livingTimer`. (See also Finding 2.)

**NP-2: `scrollHeroToIndex()` function signature does not match its call signature.**  
`scrollHeroToIndex(track, idx, items.length)` is called at line 423, but the function definition at line 426 is `function scrollHeroToIndex(track, idx)` — the third argument `items.length` is ignored. The function computes the number of items implicitly (it is not needed). This is harmless but misleading.

**NP-3: `debug-config.css` is not included in `index.html`.**  
The file exists at `css/debug-config.css` (544 lines) but is not in the `<link>` list in `index.html`. It is presumably only used by `debug.html`. This is likely intentional but worth confirming — if any debug-config page styles are expected in the main app, they will be missing.

**NP-4: `_cycleInterval` configuration in `lander-config.json` is not read by the app.**  
`lander-config.json` specifies `"config": { "cycleInterval": 5000, "fadeDuration": 600 }` for the hero carousel. The `buildHeroCarousel()` function does not read this config object — it uses the module-level constants `HERO_CYCLE_INTERVAL_MS` and `FADE_DURATION_MS`, overridden by `DebugConfig.get()`. The config object in the JSON file is dead data. This creates a discoverability gap: someone editing `lander-config.json` would expect the cycle interval to change but it will not.

**NP-5: `App.navigate()` does not call `destroy()` on the outgoing screen during normal forward navigation.**  
The `destroy()` lifecycle method is only called on `replace`-mode navigation (line 40: `if (replace) activeScreen.destroy?.()`). Normal forward navigation (lander → series-pdp) does not call `destroy()` on the lander. This is intentional (the lander is preserved for BACK navigation), but it means the lander's cleanup contract (`_stopAllLivingTiles()`, `clearInterval(heroTimer)`) is only enforced in `onBlur()`. As found in Finding 2, `onBlur()` does not correctly stop all living tile timers. The fix for Finding 2 closes this gap, but the asymmetry between `onBlur` and `destroy` should be documented in the component contract.

**NP-6: `getKeyAction()` iterates ALL key mappings on every keydown event, including non-navigation keys.**  
`keycodes.js` `getKeyAction()` iterates `Object.entries(KEYS)` and checks `keys.includes(key)` for every entry on every keydown event fired on the document. This is called on backtick presses, letter presses (for debug panel `w/a/s/d`), and every other key. For 7 action categories with 2–4 keys each, this is ~20 comparisons per event. Harmless at this scale but worth a note.

---

*End of report.*
