# Changelog

All notable version releases are documented here.
Follow [Keep a Changelog](https://keepachangelog.com/en/1.0.0/) format.
Version numbers follow [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

---

## [Unreleased]

---

## [1.5.3] — 2026-04-11

Remaining input latency fixes from the performance audit.

### Performance
- Hero carousel auto-advance timer now debounced on keypress — previously
  `clearInterval` + `setInterval` fired on every LEFT/RIGHT, creating and
  destroying timer objects at held-key repeat rate (~15/s on TV remotes);
  timer now only restarts 300ms after the last keypress (audit Finding 3)
- All lander rail `focusTile()` / `focusPill()` functions now O(1) —
  each rail tracks its previously focused element by reference and
  removes `focused` from only that element rather than scanning all tiles
  on every keypress; affects cities, channels, genre pills, standard rails,
  and screamer (audit Finding 4)
- Series-PDP zone transitions now O(1) — `_deactivateAllZones()` reduced
  from 5 `querySelectorAll` calls + N `forEach` iterations to a single
  element reference clear; all intra-zone focus methods (`_focusSeason`,
  `_focusEpisode`, `_focusExtra`, `_focusSimilar`) updated to match
  (audit Finding 5)
- CDN scripts (`hls.min.js`, `qrcode.min.js`) now load with `defer` —
  eliminates render-blocking on first paint; both scripts are only
  referenced inside screen `init()` functions so deferred loading is safe
  (audit Finding 8)

---

## [1.5.2] — 2026-04-11

Performance fixes and welcome screen completion.

### Added
- Welcome screen — shown on first launch before the participant ID prompt;
  displays device controls reference and version/build stamp in the footer
- Reload-as-New-User debug action — resets participant state and reloads
  the app from the debug panel without manual localStorage clearing

### Fixed
- Living tile timers now stopped in `onBlur()` on forward navigation —
  previously up to 10 `setInterval` callbacks (hero + city tiles) continued
  running in the background during series-pdp and player screens, causing
  image fetches and layout work on constrained TV hardware
- Welcome screen close mechanisms and sequencing — welcome screen now
  correctly closes before the participant ID prompt is shown; close
  handling is robust across all navigation paths

### Performance
- Analytics writes buffered in memory; flushed to localStorage on a timer
  rather than synchronously on every keypress — eliminates the per-keypress
  `localStorage.getItem` + `JSON.parse` + `JSON.stringify` + `localStorage.setItem`
  cycle that caused input lag on TV hardware (audit Finding 1 + 6)
- `_getConfig()` result cached at module level and invalidated on
  `debugconfig:change` — eliminates per-event `Object.keys(localStorage)`
  scan (audit Finding 7)
- DataStore catalog lookups indexed on first access — `getShow()` and
  related calls now O(1) instead of O(n) linear array scans (audit Finding 3)

---

## [1.5.1] — 2026-04-08

Bug hunt fixes for the versioning system.

### Fixed
- `set-version.sh` now accepts an optional third argument for the `phase`
  field — previously phase would drift out of sync when crossing phase
  boundaries (e.g., `./scripts/set-version.sh 2.0.0 "Scenario Presets" "Phase 3"`)
- Pre-commit hook now aborts the commit with a visible error if
  `bump-build-number.sh` fails — previously failures were silent and
  the build number would not increment
- Debug panel "Built" row now uses `toLocaleString()` instead of
  `toLocaleDateString()` for the time component — the previous call was
  non-standard and not guaranteed to include time on all TV WebView engines

### Known limitation (documented, not fixed)
- `gitCommit` in `version.json` always stores the parent commit's hash,
  not the hash of the commit being created. This is an inherent constraint
  of pre-commit hooks. Use `buildNumber` as the reliable build identifier.
  See `scripts/README.md` for details.

---

## [1.5.0] — 2026-04-08

Phase 2 — Insight Engine + versioning foundation.

### Added
- Analytics event bus (`analytics.js`) — `Analytics.track()` single entry point
  for all telemetry; localStorage storage with 5MB rolling buffer; Firebase
  transport (disabled by default)
- Analytics instrumentation across all screens — focus_change, navigation,
  tile_select, rail_engagement, scroll_depth, dead_end, session_start,
  session_end, playback events
- Feedback overlay — hold OK for 3 seconds to open; emoji reaction picker;
  tag multi-select; captures full app state with each submission
- Participant ID prompt — anonymous P-XXXX code on first launch
- QR code export — compact session summary scannable from the debug panel
- Reporting dashboard (`reporting.html`) — session overview, navigation
  heatmap, screen flow, rail performance, feedback feed
- Inactivity session_end — fires after 5 minutes of no tracked events
- Versioning system — `data/version.json` source of truth; build number
  auto-increments on every commit via pre-commit hook; version displayed
  in build stamp, debug panel, console, and HTML meta tags

### Fixed
- Hero rail focus event noise — single event on rail enter instead of
  one per tile change
- Feedback overlay tag navigation — UP/DOWN now traverses visual rows
  instead of skipping to action buttons
- QR codes too large to scan — now encodes compact summary instead of
  raw event JSON
- Player BACK with controls visible — now exits to previous screen
  in a single press
- scroll_depth missing railsVisible — now computes visible rails via
  getBoundingClientRect
- dead_end events missing on series-pdp and player — full edge coverage added
- Chart.js CDN failure — human-readable fallback when library is unavailable

---

## [1.4.0] — 2026-04-06

Phase 1.5 — Debug Panel + configuration system + bug fixes.

### Added
- In-app debug panel (backtick key / triple-LEFT on nav bar) with d-pad
  navigation; sections for timing, visual, feature toggles, auth state,
  app controls
- `DebugConfig` global — localStorage-backed config store; dispatches
  `debugconfig:change` for live control wiring
- Companion config page (`debug.html`) — drag-and-drop lander rail editor,
  inline catalog editor, export/import of all debug overrides
- HLS.js integration for `.m3u8` playback on Chromium-based TV browsers
  (Vizio SmartCast, Chrome, Firefox); native HLS fallback for Safari/WebKit
- Player episode rail — three-state system (hidden / peek / expanded);
  episodes peek when controls are visible; DOWN from controls expands rail

### Changed
- Lander redesigned to v1.4 spec — hero carousel with right-peeking tile,
  city tiles with frosted-glass backplates, screamer with overlaid portrait
  tiles, marketing banner with full-banner focus ring
- Series PDP simplified to anonymous state — single Play action, no auth
  gating; season picker updates both pill labels and episode tiles
- Player info modal — "Add to My Stuff" deferred to auth phase; "Go to
  Series Page" promoted to pill button
- Nav tabs updated — Bookmark removed; tabs are Search, For You, Live,
  Movies, Shows, Settings

### Fixed
- destroy() never called on BACK from player — HLS instances now properly
  torn down
- Focus and scroll position lost on BACK to lander — saved on onBlur(),
  restored in init()
- Season change not updating episode tiles — _applySeasonState() helper
  rebuilds track HTML on selection
- PDP state (zone, season, scroll) lost on BACK from player — full state
  save/restore via container element properties
- Triple-LEFT debug panel combo firing from anywhere — now requires nav
  bar focus
- Living tile timers leaking after lander unmount — _stopAllLivingTiles()
  called in destroy()

---

## [1.0.0] — 2026-04-04

Phase 1 — Core app.

### Added
- App shell with router, screen manager, and navigation history stack
- Focus engine for d-pad navigation across all screens
- Data layer (`data-store.js`) loading catalog, geo-state, and lander config
- Lander screen — hero carousel with auto-advance, local cities rail with
  living tile animation, live channels rail, genre pills, screamer banner,
  portrait and landscape standard rails, marketing banner
- Series PDP — hero image, metadata, season picker, episode rail, extras
  rail, similar titles rail
- Video player — HLS.js playback, transport controls, scrub bar, episode
  rail, info modal
- 20 shows with full series data (2 seasons, episodes, extras, similar titles)
- Anonymous geo-detection (`geo-state.json`) — no authentication required

---

*Use `./scripts/set-version.sh <version> "<label>"` to cut a new release.*
