# Change Log — PRD v1.4 Alignment
**Branch:** `align-v1.4prd`

---

## v1.5 r1 — Feedback Round 1 (2026-04-08)
Source: `docs/Feedback/v1.5-insights/v1.5-r1.md`

### js/screens/lander.js
- **Hero rail focus events**: Removed `focus_change` from LEFT/RIGHT tile movement and auto-advance — these were firing one event per tile change and polluting the event stream. Now fires a single `focus_change` on `onEnter()` (when user arrives at the hero rail from nav). Tile index tracking (`currentTileIdx`, `focusedItemTitle`, `maxTileReached`) is preserved without analytics side effects.

### js/feedback.js
- **Tag navigation row-awareness**: Added `_getTagRows()` helper that groups `.feedback-tag-btn` elements into visual rows by comparing `offsetTop` values. UP/DOWN in the tags zone now navigates between rows (finding the closest tag by `offsetLeft`) rather than jumping directly to reactions or actions. DOWN from the last tag row still goes to actions; UP from the first row still goes to reactions. UP from actions now returns to the first tag of the last row instead of always resetting to index 0.

---

## Phase 2 — Insight Engine: Bug Hunt Fixes (2026-04-07)
Source: `docs/phase2-bug-hunt-report.md` — HIGH, MEDIUM, LOW issues
Branch: `insights-engine-v1`

### js/analytics.js
- **H3 — Missing inactivity session_end**: Added 5-minute inactivity timer (`_inactivityTimer`). `_resetInactivityTimer()` is called on every `track()` call and on `init()`. Fires `session_end` with `trigger: 'inactivity'` after 5 minutes of no tracked events.
- **M4 — `_store()` checks size after pushing**: Now computes `JSON.stringify([...events, event]).length` before pushing. Trims oldest 10% first if the addition would exceed the 5MB cap.
- **M5 — `_pruneOldSessions()` only called at init**: Now called at the end of every `_store()` call to enforce the 50-session cap on each write.

### js/feedback.js
- **H1 (option B) — `session_start` has `participantId: 'unknown'`**: In `_acceptParticipantId()`, after `Analytics.setParticipantId()`, scans all stored events for the current `sessionId` with `participantId: 'unknown'` and patches them, then re-saves to localStorage.
- **H2 (option 1) — QR codes too large to scan**: `showQRExport()` now encodes a compact session summary object (sessionId prefix, participantId, timestamp, totalEvents, screensVisited, deepestScreen, totalSelections, totalFocusChanges, durationMs, deviceType) instead of raw event JSON. Stays well under QR capacity limits.
- **H5 — `focusedElement` stores full CSS class string**: Changed `focused?.className || 'none'` to `focused?.className?.split(' ')[0] || 'none'` in `_captureCurrentState()`. Now stores only the first (primary) class token.
- **L2 — Feedback overlay animation doesn't fire**: `#feedback-overlay` and `#qr-overlay` CSS changed from `display:none` (hidden) / `display:flex` (visible) to always `display:flex` with `opacity:0; pointer-events:none` (hidden) / `opacity:1; pointer-events:auto` (visible). JS-side `style.display` assignments removed. Transitions now fire correctly.

### js/screens/lander.js
- **H6 — `scroll_depth` missing `railsVisible` array**: Added `railsVisible` computation using `getBoundingClientRect()` to find which rail elements are currently intersecting the viewport at the time of scroll. Added to `scroll_depth` payload.
- **M1 — `itemTitle` always empty in `tile_select`**: Added `focusedItemTitle` field to `heroAnalyticsState` and `stdAnalyticsState`. Updated on `onEnter()` and on every LEFT/RIGHT focus move. `tile_select` payload now reads `s.focusedItemTitle`.
- **M2 — `dwellTimeMs` edge cases**: Wrapped all dwell calculations in `Math.max(0, ...)`. Also fires `focus_change` event in `startAutoAdvance()` with `method: 'auto-advance'`.

### js/screens/series-pdp.js
- **M6 — `dead_end` events missing on series-pdp**: Added `dead_end` tracking for: UP from `buttons` zone (top of page), DOWN from `more-info` zone (bottom of page), LEFT at first item and RIGHT at last item in `episodes`, `extras`, and `similar` rails.

### js/screens/player.js
- **H4 — Player BACK doesn't always reach `session_end`**: BACK with controls visible now calls `App.back()` directly (previously only hid controls, requiring a second BACK to actually exit). `playback_complete` still fires before navigation.
- **M6 — `dead_end` events missing on player**: Added `dead_end` tracking for: UP from `progress` zone, DOWN from `episodes` zone (bottom of screen), LEFT at scrub position 0, RIGHT at scrub position 1, LEFT at first episode tile, RIGHT at last episode tile.

### js/reporting.js
- **M3 — Chart.js CDN failure — no visible fallback**: When `typeof Chart === 'undefined'`, replaces the canvas container's innerHTML with a human-readable error message instead of silently leaving the chart area blank.
- **M7 — Auto-refresh only compares event count**: Now also compares the latest event's `timestamp`. Detects new events even when count hasn't changed (e.g., same-session updates replacing older events).

### reporting.html
- **L3 — `#import-overlay` renders briefly before JS hides it**: Added `style="display:none"` inline to prevent flash-of-overlay on page load.

---

## Phase 2 — Insight Engine: Analytics, Feedback & Reporting (2026-04-07)
Source: `docs/PRD/phase2-insight-engine-v1.0.md`
Branch: `prd-v1.5-update`

### NEW: js/analytics.js
- **`Analytics`** global: single-entry-point event bus. `Analytics.track(eventName, payload)` is the only function components call.
- Generates fresh `sessionId` (UUID) on each page load; persists `participantId` in localStorage as `P-XXXX`.
- Transport config at top of file: `ANALYTICS_ENABLED`, `ANALYTICS_TRANSPORT` (`localStorage` | `firebase` | `both`), `FIREBASE_URL`, `ANALYTICS_BATCH_INTERVAL_MS`, `ANALYTICS_MAX_LOCAL_SESSIONS`.
- localStorage: stores all events in `analytics_events` JSON array; rolling buffer capped at 5MB; prunes oldest sessions to stay within `ANALYTICS_MAX_LOCAL_SESSIONS=50`.
- Firebase transport: batch-POSTs every 30s when `FIREBASE_URL` is set. Fails silently when URL is empty.
- Exposes: `track()`, `getParticipantId()`, `setParticipantId()`, `generateNewParticipantId()`, `isFirstVisit()`, `getEvents()`, `clearEvents()`, `getSessionSummary()`, `sessionId`.

### NEW: css/feedback.css
- Hold-progress SVG ring styles (`.feedback-hold-ring`, `.feedback-hold-ring-fill`).
- Participant ID overlay (`#participant-overlay`, `.participant-card`, `.participant-btn`).
- Feedback overlay (`#feedback-overlay`, `.feedback-reaction-btn`, `.feedback-tag-btn`, `.feedback-send-btn`, `.feedback-skip-btn`).
- QR export overlay (`#qr-overlay`, `#qr-code-container`, `.qr-close-btn`).
- Thanks toast (`.feedback-thanks`).

### NEW: js/feedback.js
- **`FeedbackSystem`** global: hold-OK detection, radial ring animation, feedback overlay, participant ID prompt, QR export overlay.
- **Participant ID prompt**: shown on first visit (no `analytics_participantId` in localStorage). `FocusEngine.disable()` while shown. Accept / Generate New Code (d-pad navigable). BACK = Accept. Calls `Analytics.setParticipantId()` on confirm.
- **Hold-OK ring**: `keydown` listener on document (non-capturing, coexists with FocusEngine). Starts 3s countdown on OK press; animates SVG stroke-dashoffset via rAF. Cancels on key-up < 3s.
- **Feedback overlay**: full-screen on 3s hold. 5 emoji reactions (d-pad), tag multi-select row, Send / Skip actions. BACK dismisses. Send fires `Analytics.track('user_feedback', ...)`. Shows "Thanks!" toast after send.
- **QR export**: `FeedbackSystem.showQRExport()` — encodes last ≤10 events as `data:text/plain` URI, renders via QRCode.js library. BACK / Enter to close.
- Auto-inits on `DOMContentLoaded`.

### NEW: reporting.html
- Standalone analytics dashboard; does not use `index.html`'s app shell.
- Sections: A Session Overview, B Navigation Heatmap, C Screen Flow, D Rail Performance, E Feedback Feed.
- "Load from JSON" import overlay with drag-and-drop. "Export" button. "Clear" button.
- Uses Chart.js 4 via CDN for bar charts.

### NEW: css/reporting.css
- Full dashboard layout: sticky top bar + sidebar nav + main content area.
- Card grid, heatmap bars, sortable table, feedback feed list, import overlay, filter pills.
- Responsive breakpoints for 1100px and 800px.

### NEW: js/reporting.js
- Reads `analytics_events` from localStorage on page load; auto-refreshes every 30s.
- **Section A**: unique sessions, participants, avg duration (from session_start/end pairs), total events, device breakdown bar chart, event type breakdown.
- **Section B**: aggregates dwell times from `focus_change` and `rail_engagement` events; color-coded heatmap bars (blue→red by intensity).
- **Section C**: builds screen paths per session from `navigation` events; counts path frequencies; sorted table.
- **Section D**: aggregates `rail_engagement` events; Chart.js bar charts for avg dwell and selection rate per rail; detail table.
- **Section E**: lists `user_feedback` events; filterable by reaction type; newest first.

### MODIFIED: js/debug-panel.js
- Added "Send Report (QR)" button to section E — calls `FeedbackSystem.showQRExport()`.
- Added "View Analytics Log" button — shows event count / session count / participant ID in toast; dumps full event array to console.

### MODIFIED: js/app.js
- `back()`: fires `Analytics.track('session_end', getSessionSummary())` when history is empty (user pressed BACK from lander — top of navigation stack).

### MODIFIED: js/screens/lander.js
- `init()`: fires `Analytics.track('session_start', ...)` on first load (not on BACK-return). Stores `_screenEnterTime`.
- Rail modules: all rail builders now return `_analyticsState` object tracking `railId`, `enterTime`, `currentTileIdx`, `maxTileReached`, `totalTiles`, `selectedTile`. Instrumented: hero-carousel, local-cities, live-channels, genre-pills, screamer, standard-rail, marketing-banner.
- `_handleKey()`: fires `rail_engagement` when focus leaves a rail (UP or DOWN). Fires `scroll_depth` on DOWN to next rail. Fires `tile_select` + `navigation` when OK navigates to a screen. Fires `focus_change` on LEFT/RIGHT tile movement in hero and standard rails. Fires `dead_end` when at edge with no further movement.

### MODIFIED: js/screens/series-pdp.js
- `init()`: fires `Analytics.track('navigation', ...)` on arrival. Stores `_screenEnterTime`.
- `_activateZone()`: fires `focus_change` on zone transitions; tracks `_zoneEnterTime`.
- `_getZoneIndex()`: helper returns current index within a zone.
- Season OK: fires `feature_interaction` (season-selector).
- Episode OK: fires `tile_select` + `navigation` before navigating to player.
- Extra OK: fires `tile_select` + `navigation`.
- Similar title OK: fires `tile_select` + `navigation`.

### MODIFIED: js/screens/player.js
- `init()`: fires `Analytics.track('navigation', ...)`.
- `loadedmetadata`: fires `playback_start`.
- `ended`: fires `playback_complete`.
- `PLAYPAUSE` action: fires `playback_start` (resume) or `playback_pause`.
- `BACK` action: fires `playback_complete` with `exitedEarly` flag.
- Progress scrub LEFT/RIGHT: fires `playback_scrub` with from/to positions.
- `_handleBtnAction()`: fires `controls_interaction` for all button presses.

### MODIFIED: index.html
- Added `<link rel="stylesheet" href="css/feedback.css" />`.
- Added `<script src="js/analytics.js">` (before screens — ensures `Analytics` global is available).
- Added QRCode.js CDN script.
- Added `<script src="js/feedback.js">` (after screens — FocusEngine must exist first).

---

## Bug Hunt — Medium & Low Fixes (2026-04-07)

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
