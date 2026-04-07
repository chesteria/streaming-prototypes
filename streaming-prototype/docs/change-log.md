# Change Log — PRD v1.4 Alignment
**Branch:** `initial-debug-panel`

---

## Bug Hunt — Medium & Low Fixes (2026-04-07)
Source: `Feedback/bug-hunt-report.md` — MEDIUM and LOW issues

### data/series/ (19 new files)
- **M1 — Series data for all 20 shows**: Created `show-002.json` through `show-020.json`. Each show now has 2 seasons of fully written episodes (4–12 episodes per season depending on the show), 2–3 extras, and a similar-titles array pointing to thematically related shows. Every Series PDP in the catalog is now fully functional.

### js/screens/lander.js
- **M2 — Genre pill scroll hardcoded width**: Replaced `scrollRailToIndex(track, idx, 120, 12, 0)` with direct `offsetLeft` measurement. Focused pill is now scrolled into view accurately regardless of variable pill text width.
- **M4 — Nav shows hardcoded "Location, ST"**: Replaced with `DataStore.getDetectedCity().name` (falls back to `'Location'` if geo data is unavailable). Nav now shows the detected city from `geo-state.json`.
- **L1 — Rail IDs contain spaces**: `id="std-rail-${config.title}"` now sanitizes the title with `.replace(/\s+/g, '-').toLowerCase()`. IDs are now valid HTML.
- **L2 — `_startCityTimers()` empty no-op**: Removed the empty `_startCityTimers()` method and replaced its `onFocus()` call with `_restartAllLivingTiles()`. Living tile timers now correctly restart when returning to the lander.
- **L5 — `_fromLander` dead params**: Removed the `_fromLander` spread from `_handleKey()`'s navigate call. State restoration is handled via the container save mechanism (H2 fix); these params were never consumed.

### css/series-pdp.css
- **M3 — Series PDP rail scroll has no transition**: Already present — `.rail-scroll` has `transition: transform var(--t-scroll) cubic-bezier(0.25, 0.46, 0.45, 0.94)`. No change needed.

---

## Bug Hunt — HIGH Fixes (2026-04-07)
Source: `Feedback/bug-hunt-report.md` — auto-fix session for CRITICAL/HIGH issues

### js/app.js
- **H1 — `destroy()` never called on BACK**: Added `if (replace) activeScreen.destroy?.()` after `activeScreen.onBlur()` in `navigate()`. Prevents HLS instance accumulation, listener leaks, and un-torn-down video elements when pressing BACK from Player.

### js/screens/lander.js
- **H2 — Focus/scroll lost on BACK**: `init()` previously read from `params.restoreRailIdx`/`params.scrollY` (history stores original params — always empty). Now reads `container._savedRailIdx` / `container._savedScroll` saved by `onBlur()`, clears them after reading. Scroll restored with `transition:none` then re-enabled on next frame.

### js/screens/series-pdp.js
- **H3 — Season selector pills update but episode tiles don't**: Added `_applySeasonState(idx)` helper that updates all pill labels AND rebuilds `#episodes-track` innerHTML for the selected season. `_selectSeason()` now calls it; episode index and track scroll reset to 0 on season change.
- **H5 — PDP zone/scroll/season lost on BACK from Player**: `onBlur()` now saves `_savedZone`, `_savedSeasonIdx`, `_savedEpisodeIdx`, `_savedExtrasIdx`, `_savedSimilarIdx`, `_savedScrollY` onto container element. `init()` reads and clears these before re-initializing. After `_render()`, scroll is restored (no-transition) and non-zero season state is re-applied via `_applySeasonState()`.

### js/debug-panel.js
- **H4 — Triple-LEFT combo fires from anywhere**: Added `.nav-tab.nav-focused` guard in the triple-LEFT handler — combo only counts when the nav bar is focused. Presses LEFT from tiles, pills, or any non-nav zone reset the counter and exit early. Panel now only opens from nav zone per PRD §12.1.

---

## Debug Panel — Control Wiring Fixes (2026-04-06)
Source: audit of all panel controls against runtime behavior

### js/screens/lander.js
- **`startLivingTile()`**: clears any pre-existing timer before starting a new one; stores `_livingImages` and sets `data-living-tile` attribute on the element so timers can be found and restarted without re-deriving data
- **`_stopAllLivingTiles()` (new helper)**: queries all `[data-living-tile]` elements, clears their `_livingTimer`, nulls the ref
- **`_restartAllLivingTiles()` (new helper)**: re-calls `startLivingTile()` on all marked elements using their stored `_livingImages`
- **`debugconfig:change` listener**: added handling for `livingTiles` and `cityCycleInterval` — stops all living tile timers, then restarts them if `livingTiles` is on. Previously these two controls had no runtime effect; required a page reload to take effect
- **`destroy()`**: added `_stopAllLivingTiles()` call — previously, living tile `setInterval`s kept running after the lander was unmounted (navigating to series-pdp or player), leaking timers against detached DOM elements

### js/screens/player.js
- **`debugconfig:change` listener**: added handling for `simulatedPlayback` — toggling it off clears `_playTimer`; toggling it on calls `_attachProgressUpdates()` (only relevant in the no-video fallback path; real HLS playback is unaffected)

### Controls status after fixes
| Control | Was | Now |
|---|---|---|
| Living Tiles toggle | No runtime effect | Stops/restarts all tiles live |
| City Cycle Interval slider | No runtime effect | Restarts tiles at new interval |
| Simulated Playback toggle | No runtime effect | Starts/stops fallback timer |
| All CSS var controls | ✓ Working | ✓ Working |
| Hero Auto-Advance / Interval | ✓ Working | ✓ Working |
| Controls Auto-Hide | ✓ Working | ✓ Working |
| Playback Speed | ✓ Working (prev session) | ✓ Working |
| Show Focus Outlines | ✓ Working | ✓ Working |
| Show Grid Overlay | ✓ Working | ✓ Working |

---

## Playback Fix — HLS.js + Vizio Compatibility (2026-04-06)
Source: `playback.md` issue analysis

### index.html
- Added HLS.js `1.x` via jsDelivr CDN (`hls.min.js`) before screen scripts — required for `.m3u8` playback on all Chromium-based browsers (Vizio SmartCast, Chrome, Firefox); Safari/WebKit uses its own native HLS path

### js/screens/player.js
- **`_render()`**: Removed hardcoded `src` attribute from `<video>` — source is now attached programmatically by HLS.js or the native path in `_attachProgressUpdates()`
- **`_attachProgressUpdates()`**: Replaced direct `video.src` assignment with two-path HLS init:
  - `Hls.isSupported()` → creates `Hls` instance, calls `loadSource` + `attachMedia`, plays on `MANIFEST_PARSED`
  - `video.canPlayType('application/vnd.apple.mpegurl')` → native HLS fallback (Safari / WebKit TVs)
- **`loadedmetadata` handler**: Moved `video.playbackRate` assignment here (was set before stream load — some Chromium builds reset it on load)
- **`_switchEpisode()`**: Removed lines that assigned episode thumbnail URL to `video.src` — `.player-bg` is the `<video>` element; setting an image URL as its source would break the active stream
- **`destroy()`**: Added `this._hls.destroy()` call before video teardown to release HLS.js resources
- **`_handleKey()`**: Added `PLAYPAUSE` action handler — toggles `video.play()`/`video.pause()` with toast, fires regardless of active zone
- Added `_hls: null` to state object

### js/utils/keycodes.js
- Added `PLAYPAUSE` key array: `['MediaPlayPause', 'XF86PlayPause', 'MediaPlay', 'MediaPause']` — maps Vizio and standard media remote play/pause keys to the new `PLAYPAUSE` action

---

## Phase 1.5 — Debug Panel & Configuration Dashboard (2026-04-06)
Source: PRD §12, `initial-debug-panel` branch

### NEW: data/debug-defaults.json
- Canonical defaults for all 19 debug config keys (timing, visual, feature toggles, auth state)

### NEW: js/debug-panel.js
- **`DebugConfig`** global: localStorage-backed config store with `get(key, fallback)`, `set(key, value)`, `reset()`, `applyAll()`. `set()` applies CSS variable changes immediately and dispatches `debugconfig:change` custom event. CSS var targets: `--tile-radius`, `--rail-gap`, `--color-bg`, `--t-focus`, `--t-scroll`, `--t-fade`, `--color-focus-glow`, `--focus-box-shadow`. `applyAll()` fires on DOMContentLoaded to restore any stored overrides.
- **`DebugPanel`** global: toggle with backtick `` ` `` key (capture-phase listener, fires before FocusEngine). Panel is built lazily on first open from `PANEL_SPEC` data array. Opens/closes with CSS `translateX` animation. Calls `FocusEngine.disable()` on open, `enable()` on close. D-pad navigable: UP/DOWN moves between controls, LEFT/RIGHT adjusts sliders and cycles selects, Enter/OK toggles switches and fires button actions. Each control row shows its CSS variable or JS constant name. Sections: A Timing, B Visual, C Feature Toggles, D Auth State (stub), E App State Controls (Reload, Screenshot Mode, Reset All).

### NEW: css/debug-panel.css
- Fixed 400px right-side panel with slide-in transition. `.dp-focused` row highlight. Slider, toggle, select, color swatch, button, radio component styles. `body.debug-focus-outlines` rule highlighting all focused elements. `#debug-grid-overlay` CSS grid lines at 60px intervals. `body.screenshot-mode` hides all debug chrome.

### NEW: debug.html + js/debug-config.js + css/debug-config.css
- **Lander Rail Editor**: reads `debug_landerConfig` from localStorage (falls back to `data/lander-config.json`). Drag-and-drop reordering (HTML5 drag API), per-rail enable/disable toggle, inline title editing, delete. Save → `localStorage.setItem('debug_landerConfig', ...)`. Preview App button opens `index.html` in new tab.
- **Catalog Editor**: reads `debug_catalog` from localStorage (falls back to `data/catalog.json`). Searchable table of all shows. Double-click any cell to edit inline (`contenteditable`). Add show (random picsum placeholder artwork). Delete row. Save → `localStorage.setItem('debug_catalog', ...)`.
- **Export/Import**: Export collects all `debug_` localStorage keys into a timestamped JSON file download. Import reads an uploaded JSON and writes all keys to localStorage.

### MODIFIED: js/data-store.js
- `init()` now checks `debug_landerConfig` and `debug_catalog` in localStorage before fetching JSON files — app reads overrides set by debug.html without reload

### MODIFIED: js/screens/lander.js
- `startAutoAdvance()`: respects `heroAutoAdvance` toggle; reads `heroCycleInterval` from DebugConfig at each restart
- `startLivingTile()`: respects `livingTiles` toggle; reads `cityCycleInterval` and `crossfadeDuration` from DebugConfig
- Hero rail return object: exposes `updateTimers()` method so `debugconfig:change` handler can restart the carousel timer live
- `LanderScreen.init()`: registers `debugconfig:change` listener for `heroCycleInterval` / `heroAutoAdvance` → calls `heroRail.updateTimers()`
- `LanderScreen.destroy()`: removes that listener

### MODIFIED: js/screens/player.js
- `_resetHideTimer()`: reads `controlsAutoHide` from DebugConfig
- `_attachProgressUpdates()`: reads `simulatedPlayback` toggle and `playbackSpeed` from DebugConfig each tick

### MODIFIED: index.html
- Added `debug-panel.css` link (before variables.css so panel can override)
- Added `debug-panel.js` script after `data-store.js`, before screen scripts (ensures `DebugConfig` is available when lander.js/player.js execute)
- Added `#debug-grid-overlay` div

---

## v1.4 r4 — Player Episodes Rail Layout (2026-04-06)
Source: direct session feedback

### css/player.css
- **Controls padding**: `padding-bottom` increased 40px → 100px on `.player-controls` — creates a 60px clearance zone at the bottom so the episode rail peek is never covered by control elements
- **Episodes area — three-state system** (replaces single `.hidden` class):
  - Default (no class): `translateY(100%)` — fully off-screen below the fold; pointer-events off
  - `.peek`: `translateY(calc(100% - 60px))` — top 60px ("More Episodes" label) visible at bottom edge while controls are shown; signals to the user that DOWN will access the rail
  - `.expanded`: `translateY(-50px)` — slides up so the rail top sits at ~30% from the bottom of the screen; controls are hidden in this state
- Added dark gradient background to `.player-episodes-area` for legibility against video

### js/screens/player.js
- **`_showControls()`**: now sets `.peek` on the episodes area (instead of removing `.hidden`), so episodes always peek when controls are visible
- **`_hideControls()`**: removes both `.peek` and `.expanded` to fully collapse the rail off-screen
- **`_resetHideTimer()`**: added `_activeZone !== 'episodes'` guard — auto-hide does not fire while the user is focused on the episode rail
- **Buttons zone DOWN**: hides controls, clears auto-hide timer, transitions episodes area from `.peek` → `.expanded`, then focuses first episode tile
- **Episodes zone UP**: transitions episodes area from `.expanded` → `.peek`, restores controls, resets auto-hide timer, returns focus to previously active button

---

## v1.4 r3 — Feedback Round 3 (2026-04-06)
Source: `Feedback/v1.4r3/v1.4r3 Feedback.md`

### data/lander-config.json
- **Local cities rail title**: Added `"title": "Locations Near Me"` — the JS already conditionally renders the title when present
- **Marketing banner CTA**: Changed `"cta"` from `"Browse Collection"` to `"Start Now"`

### data/catalog.json
- Added `"weatherBlurb"` field to all 5 city entries (Atlanta: "Mostly sunny", St. Louis: "Mainly cloudy", Chicago: "Breezy and cold", Austin: "Clear skies", Seattle: "Light rain showers")

### js/screens/lander.js
- **City tile backplate**: Replaced flat gradient overlay with a frosted-glass inline backplate (`rgba(15,25,35,0.72)` + `backdrop-filter:blur`) so city name and temp have legible contrast against any background image
- **City tile weather blurb**: Replaced `city.tags.join(' · ')` with `city.weatherBlurb` in the secondary info line
- **Screamer focus bug fix**: When CTA is focused, `DOWN` now returns `'DOWN'` (exits rail to next) instead of moving focus to the tiles. `RIGHT` from CTA enters the tile zone instead

### js/screens/series-pdp.js
- **Season picker selected state**: Added `_selectSeason(idx)` method — on OK, all pills are re-rendered: the active pill expands to "Season N · Xep" and all others collapse to "SN". Previously only the CSS `active` class toggled; the pill text was never updated

### index.html + css/global.css
- **Version/build stamp**: Added `#build-stamp` div fixed to bottom-right corner of every screen — displays `v1.4 · 20260406-03`. Styled at 13px, 25% white opacity so it's visible but unobtrusive. Z-index 9998 (below toast at 9999)

---

## v1.4 r2 — Feedback Round 2 (2026-04-06)
Source: direct session feedback

### css/lander.css
- **Hero tile size**: Reduced hero tile by 10% — width 920px → 828px, height 548px → 493px
- **Hero rail shift**: Increased hero carousel `padding-top` from `calc(var(--nav-height) + 60px)` to `calc(var(--nav-height) + 135px)` (+75px downward shift); carousel container height increased 680px → 720px to preserve tile fit

### css/variables.css
- Synced `--hero-tile-width` 920px → 828px and `--hero-tile-height` 550px → 493px to match lander.css

### js/screens/lander.js
- Updated `HERO_TILE_WIDTH` 920 → 828 and `HERO_TILE_HEIGHT` 550 → 493 to match new tile dimensions
- Fixed `gap` constant in `scrollHeroToIndex` from 20 → 16 to match CSS `gap: 16px` on `.hero-track` (scroll position accuracy for idx > 0)

---

## v1.4 r1 — Feedback Round 1 (2026-04-06)
Source: `Feedback/v1.4r1/v1.4PRD-Feedback-r1.md`

### css/lander.css
- **Hero gap**: Added 60px breathing room between nav and hero carousel — `padding-top` changed from `var(--nav-height)` to `calc(var(--nav-height) + 60px)`; `height` increased from 620px → 680px to preserve tile size
- **Hero left alignment**: Added `padding-left: var(--content-pad-x)` to `.hero-track` so the first hero tile's left edge aligns with all other rails at 60px (JS `scrollHeroToIndex` already accounts for this offset in its translate calculation)
- **Focus border clipping**: Added `padding: 20px 0; margin: -20px 0` to `.rail-overflow` — the expanded padding gives box-shadow room to render; the equal negative margin cancels the layout impact so rail spacing is unchanged. Fixes clipped focus borders on both 16:9 (channel/landscape) and 2:3 (portrait) tiles

---

## data/geo-state.json — NEW FILE
- Added anonymous geo-detection state file replacing `user-state.json`
- Fields: `detectedCity`, `detectedRegion`
- Provides city/region context for lander without requiring authentication

## data/lander-config.json — UPDATED
- Removed `continue-watching` rail from config (deferred to Auth phase)
- Removed title from `local-cities` rail entry (per v1.4 spec — no label above city tiles)
- Updated rail order to match v1.4: hero-carousel → local-cities → live-channels → screamer → top-flix (portrait) → genre-pills → marketing-banner → my-mix (landscape)

## js/data-store.js — REWRITTEN
- Now loads `geo-state.json` instead of `user-state.json`
- Added `getGeoState()` and `getDetectedCity()` methods
- `getContinueWatching()` returns `[]` (DEFERRED — Auth phase stub)
- Removed all user-state mutation methods: `isInMyStuff`, `toggleMyStuff`, `hasWatchHistory`, `getContinueWatchingItem`, `removeFromHistory`

## css/variables.css — UPDATED
- Focus border opacity corrected: `rgba(255,255,255,0.5)` → `rgba(255,255,255,0.4)` per PRD spec

## css/nav.css — UPDATED
- Nav `padding-left` changed from hardcoded `48px` to `var(--content-pad-x)` (60px)
- Ensures nav tabs share the same left edge as rail titles and content

## css/lander.css — FULLY REWRITTEN
- **Hero carousel**: removed horizontal padding from `.hero-track` so hero tile is edge-to-edge with right peeking tile visible at the right edge
- **Rail sections**: `padding-bottom` tightened 40px → 36px across all rail sections
- **Screamer redesign**: portrait tiles now live INSIDE the banner's right side using `position:absolute` `.screamer-tiles-area` with CSS `mask-image` gradient for blend effect (tiles are no longer in a separate section below the banner)
- **Marketing banner**: added `.marketing-banner.has-focus` box-shadow rule so entire banner glows on focus (matches Upsell.png mockup)
- **Genre pills**: updated wrapper class to `.genre-pills-overflow`; pill gap tightened to 10px
- **Continue Watching CSS**: removed entirely (deferred to Auth phase)

## js/screens/lander.js — UPDATED
- **`buildNav()`**: Removed Bookmark icon tab — nav now has: Search, For You, Live, Movies, Shows, Settings
- **`buildContinueWatchingRail()`**: Stubbed to return `null` immediately (DEFERRED — Auth phase)
- **`buildScreamer()`**: Updated HTML to place `.screamer-tiles-area` / `.screamer-tiles-track` inside `.screamer-banner` — matches new CSS structure where tiles are overlaid on the right portion of the banner
- **`buildLocalCitiesRail()`**: Title is conditionally rendered — no title when `config.title` is empty/absent (per v1.4 spec)
- **`buildMarketingBanner()`**: Added `has-focus` class to entire banner on enter/leave for correct focus ring behavior

## js/screens/series-pdp.js — REWRITTEN
- Anonymous state only — removed all auth-gated UI
- Single primary action button: `▶ Play S1:E1` (removed My Stuff, secondary buttons)
- Removed `_isReturning`, `_cwItem`, all watch-history logic
- Episode tiles simplified — no watched checkmarks, no progress bars
- `_handleKey()` for buttons zone: DOWN goes directly to seasons (single button)

## js/screens/player.js — UPDATED
- Removed `_inMyStuff` state property and `DataStore.isInMyStuff()` call
- **Info modal**: removed "Add to My Stuff" button (DEFERRED — Auth phase)
- **Info modal**: promoted "Go to Series Page" from `.modal-link-btn` text link to `.pill-btn` pill button with proper focus state
- Simplified `_handleModalKey()` — single focusable item, OK navigates to series-pdp

## css/player.css — UPDATED
- Removed `.modal-link-btn` and `.modal-add-btn` styles (elements removed from modal)
- Added `.modal-series-btn` minimal rule for the new pill button
