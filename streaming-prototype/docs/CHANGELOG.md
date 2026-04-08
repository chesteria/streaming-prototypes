# Changelog

All notable version releases are documented here.
Follow [Keep a Changelog](https://keepachangelog.com/en/1.0.0/) format.
Version numbers follow [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

---

## [Unreleased]

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
