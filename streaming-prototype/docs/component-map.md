# Component Map

> Living reference document. Update when screens, rails, zones, or globals change.
> Last updated: 2026-04-12

---

## Overview

The app has no component framework and no shared `js/components/` folder.
All component logic (rails, tiles, zones) is built inline within each screen
file. This is intentional — it keeps the codebase compatible with TV WebViews
that may not support modern module bundlers.

The architecture has three layers:

```
Globals (always loaded)
  └── Screens (registered with App, rendered on demand)
        └── Zones (focus areas within each screen)
              └── Rails / Components (built inline per screen file)
```

---

## Global Modules

These are singleton `const` objects available across all screens.
Load order in `index.html` matters — each module may depend on earlier ones.

| Global | File | Depends on | Purpose |
|--------|------|------------|---------|
| `KeyCodes` | `js/utils/keycodes.js` | — | Maps key events to action strings (`UP`, `DOWN`, `SELECT`, etc.) |
| `Animations` | `js/utils/animations.js` | — | Shared animation helpers (crossfade, etc.) |
| `DataStore` | `js/data-store.js` | — | Loads JSON data; exposes catalog, geo-state, lander config, version, series data |
| `DebugConfig` | `js/debug-panel.js` | — | localStorage-backed config store; dispatches `debugconfig:change` events |
| `DebugPanel` | `js/debug-panel.js` | `DebugConfig`, `FocusEngine` | Backtick-toggleable developer overlay; d-pad navigable |
| `FocusEngine` | `js/focus-engine.js` | — | Global d-pad handler; delegates to active screen via `setHandler()` / `clearHandler()` |
| `Analytics` | `js/analytics.js` | `DataStore` | Event bus; single entry point `Analytics.track(event, payload)` |
| `FeedbackSystem` | `js/feedback.js` | `Analytics`, `FocusEngine` | Hold-OK overlay, participant ID prompt, QR export |
| `WelcomeScreen` | `js/welcome-screen.js` | `DataStore`, `DebugConfig`, `FocusEngine` | First-launch controls reference; device-profile-driven |
| `App` | `js/app.js` | All of the above | Router, screen manager, navigation history stack |

### Load order in index.html

```
keycodes.js → animations.js → data-store.js → debug-panel.js
→ focus-engine.js → analytics.js → [QRCode CDN] → [HLS.js CDN]
→ lander.js → series-pdp.js → player.js
→ feedback.js → welcome-screen.js → app.js
```

---

## App Router (`App`)

`App` is the central coordinator. It manages a flat list of registered screens
and a history stack for BACK navigation.

**Key methods:**
- `App.init()` — boots the app: init FocusEngine, register screens, load data, show welcome, navigate to lander
- `App.navigate(screenId, params, replace)` — blur current screen, init next screen, push to history
- `App.back()` — pop history stack, navigate to previous screen (fires `session_end` analytics when stack is empty)
- `App.registerScreen(module)` — add a screen to the registry

**Screen contract** — every screen module must export:
```js
{
  id: 'string',
  init(container, params),   // async — renders DOM, sets up key handler
  onFocus(),                  // called when screen becomes active
  onBlur(),                   // called when navigating away (save state here)
  destroy(),                  // called on replace — tear down timers, HLS, listeners
}
```

---

## Screens

### Lander (`LanderScreen`) — `js/screens/lander.js`

The home screen. Renders a configurable list of rail components driven by
`data/lander-config.json`. Each rail type is a separate builder function
within the same file.

**Focus zones (ordered top → bottom):**

| Zone index | Zone | Description |
|-----------|------|-------------|
| 0 | `nav` | Top navigation bar — tab items |
| 1+ | `rail-N` | Each visible rail, in config order |

Focus moves UP/DOWN between zones. Within a zone, LEFT/RIGHT moves between
items. Scroll position is saved on `onBlur()` and restored on `init()` after
BACK navigation.

**Rail builder functions** (all in `lander.js`):

| Function | Rail type key | Data source | Description |
|----------|--------------|-------------|-------------|
| `buildHeroCarousel()` | `hero-carousel` | `catalog.featured` | Large featured tiles with auto-advance; living tile animation |
| `buildLocalCitiesRail()` | `local-cities` | `catalog.cities` | City tiles with cycling background images and weather blurb |
| `buildLiveChannelsRail()` | `live-channels` | `catalog.channels` | Landscape tiles with LIVE badge |
| `buildGenrePillsRail()` | `genre-pills` | `catalog.genres` | Horizontally scrolling pill buttons |
| `buildScreamer()` | `screamer` | `catalog.collections` | Full-width banner with overlaid portrait tiles on the right |
| `buildStandardRail()` | `standard-rail` | `catalog.shows` | Generic horizontal tile rail (portrait or landscape depending on config) |
| `buildMarketingBanner()` | `marketing-banner` | `config.content` | Full-width promotional card with CTA button |
| `buildContinueWatchingRail()` | `continue-watching` | — | **Deferred — returns null** (Authentication phase) |

**Rail analytics state** — each rail builder returns an `_analyticsState`
object tracking `railId`, `enterTime`, `currentTileIdx`, `maxTileReached`,
`totalTiles`, `selectedTile`, `focusedItemTitle`. Used by `rail_engagement`
and `tile_select` events.

**Key events fired:** `session_start`, `focus_change`, `rail_engagement`,
`tile_select`, `scroll_depth`, `dead_end`, `navigation`

---

### Series PDP (`SeriesPDPScreen`) — `js/screens/series-pdp.js`

Series detail page. Renders a show's metadata, seasons, episodes, extras,
and similar titles. State is fully restored on BACK from player.

**Focus zones:**

| Zone | Description |
|------|-------------|
| `buttons` | Primary action row — Play S1:E1 (single button in anonymous state) |
| `seasons` | Season selector pills |
| `episodes` | Episode tile rail for selected season |
| `extras` | Bonus content tile rail |
| `similar` | Similar titles tile rail |
| `more-info` | Read-more text block at bottom of page |

**Key methods:**
- `_render()` — builds full page DOM from `_show` + `_seriesData`
- `_activateZone(zone)` — moves focus to a zone, fires `focus_change` analytics
- `_applySeasonState(idx)` — rebuilds episode track HTML and resets scroll on season change
- `_selectSeason(idx)` — updates pill labels and calls `_applySeasonState()`

**State saved on `onBlur()`:** `_savedZone`, `_savedSeasonIdx`, `_savedEpisodeIdx`,
`_savedExtrasIdx`, `_savedSimilarIdx`, `_savedScrollY` — stored on the container
DOM element, read back in `init()`.

**Key events fired:** `navigation` (on arrive), `focus_change` (zone transitions),
`feature_interaction` (season select), `tile_select` + `navigation` (episode/extra/similar select),
`dead_end` (edge presses)

---

### EPG (`EPGScreen`) — `js/screens/epg/epg-screen.js`

Live TV program guide. Three internal focus contexts (`nav`, `rail`, `grid`)
managed within a single registered screen.

**Component files (load in this order):**

| File | Factory function | Purpose |
|------|-----------------|---------|
| `epg/data-model.js` | `EPGDataModel` (IIFE) | Fetches mock data; generates 24h schedules; applies debug overrides |
| `epg/components/program-tile.js` | `createProgramTile()` | Program tile DOM; defines `_escEPG()` global |
| `epg/components/channel-logo.js` | `createChannelLogoCell()` | Logo cell with heart decoration |
| `epg/components/channel-row.js` | `createChannelRow()` | Horizontal tile track; independent scroll state; return-to-now |
| `epg/components/genre-group.js` | `createGenreGroup()` | Genre header + channel rows for one genre |
| `epg/components/channel-grid.js` | `createChannelGrid()` | Full vertical grid; flat row array; genre visibility callbacks |
| `epg/components/genre-rail.js` | `createGenreRail()` | Horizontal chip strip; wrap navigation; debounced anchor |
| `epg/components/more-info-overlay.js` | `createMoreInfoOverlay()` | Body-appended overlay; d-pad focus trap |

**Focus contexts:**

| Context | Description | Entry |
|---------|-------------|-------|
| `nav` | EPG top nav bar | Initial; rail BACK |
| `rail` | Genre chip strip | Nav DOWN; grid BACK |
| `grid` | Channel/program grid | Rail DOWN; chip select |
| overlay | More Info overlay | Grid OK on logo cell |

**BACK stack (grid → rail → nav):**

- Grid BACK → Rail: blurs row highlight only — does **not** call `returnToNow()`. Tile scroll position is preserved. `_lastRowIndex` is saved.
- Rail DOWN → Grid: re-enters at `_lastRowIndex` with tile scroll position intact.
- Rail BACK → Nav: unchanged.

**Grid scroll (pinned focus):**

The focused row is always pinned at the top of the visible grid area (below the 40px `padding-top`). On focus change, `scrollToRow(flatIndex)` applies `translateY(-rowY)` to `.epg-grid-scroll`. Rows above slide up under the genre rail; rows below slide up into view. Animated via `transition: transform 300ms ease`.

**Row state keying:** Each `channel-row.js` instance is keyed by `${channelId}:${genreId}`.
Multi-genre channels appear in multiple genre groups with independent tile scroll state.

**Layout dimensions (1920×1080):**

| Element | Value | Notes |
|---------|-------|-------|
| Guide left offset | `content-pad-x (60px) + 70px = 130px` from screen left | Grid indented 70px beyond the genre rail |
| Top gap (rail → first row) | `60px` fixed | Applied as `margin-top` on the grid wrapper — outside the overflow clip boundary, so rows scrolling off the top clip at y=0 immediately with no peeking |
| Channel row height (collapsed) | `168px` | |
| Channel row height (focused) | `360px` | Smooth CSS height transition |
| Row gap | `8px` | `margin-bottom` on each row |
| Logo cell width | `190px` | Standalone card — **not joined to program tiles** |
| Logo cell gap from tiles | `12px` | `gap` on the row flex container |
| Program tile width | `725px` | `EPG_TILE_WIDTH` constant in `channel-row.js` |
| Tile gap (between tiles) | `3px` | `EPG_TILE_GAP` constant in `channel-row.js` — **must match `gap` on `.epg-tile-track` in CSS** or tiles will drift on each RIGHT press |
| Logo cell border-radius | `var(--tile-radius)` all corners | Full radius — not flush to any adjacent element |
| Program tile border-radius | `var(--tile-radius)` all corners | Full radius — not flush to logo cell |

**Key design rule:** The logo cell and program meta tiles are **completely separate cards** with a
12px gap between them. They must never be joined, flush, or share edges.

**Font sizes:**

| Element | Size | Notes |
|---------|------|-------|
| Main nav tabs | 10px | Matches genre chip |
| Genre chip | 10px | |
| Genre group header | hidden | `display: none` — genre transitions shown via rail chip only |
| Program tile title | 34px | `white-space: nowrap` + `text-overflow: ellipsis` |
| Program tile description | 10px | Visible only when row is focused |
| Program tile time | 29px (−25%) | |
| Program tile rating | 25px (−25%) | |
| Logo cell initials (collapsed) | 48px | |
| Logo cell initials (focused row) | 60px | |

**Key events fired:** 17 EPG-specific events — see `ANALYTICS_REGISTRY.md` for full list.

**Debug overrides:** `debug_epgGenreOrder`, `debug_epgGenreEnabled_*`, `debug_epgGenreLabel_*`,
`debug_epgGenreMap`, `debug_epgChannels`, `epgShowRatings`, `epgShowGenreHeaders`

---

### Player (`PlayerScreen`) — `js/screens/player.js`

Video player with HLS.js. Plays `.m3u8` streams via two paths:
`Hls.isSupported()` for Chromium/FireTV/Vizio, native HLS for Safari/WebKit TVs.
Falls back to a simulated progress timer if no stream is available.

**Focus zones:**

| Zone | Description |
|------|-------------|
| `progress` | Scrub bar — LEFT/RIGHT seeks |
| `buttons` | Transport controls — two groups (left: Start Over, Next Episode; right: More Info, Captions) |
| `episodes` | Episode rail — slides up from bottom when focused |

**Episode rail states:**
- Off-screen (no class) — hidden below the fold
- `.peek` — 60px visible at bottom while controls are shown
- `.expanded` — rail slides up, controls hidden

**Info modal** — shown by the More Info button. Contains series title, episode
description, "Go to Series Page" pill button. Focus is trapped in the modal
while open.

**Key events fired:** `navigation` (on arrive), `playback_start`, `playback_pause`,
`playback_complete`, `playback_scrub`, `controls_interaction`, `dead_end`

---

## Overlay Systems

These are full-screen overlays managed by global modules (not registered screens).
They use `FocusEngine.disable()` / `enable()` to block screen key handlers while open.

| Overlay | Global | z-index | Trigger | Dismiss |
|---------|--------|---------|---------|---------|
| Welcome Screen | `WelcomeScreen` | 10002 | First launch / H key / debug panel | OK / Enter / Back |
| Participant ID prompt | `FeedbackSystem` | 10000 | First analytics visit (no `analytics_participantId`) | Accept / Generate New Code |
| Feedback overlay | `FeedbackSystem` | 9999 | Hold OK for 3 seconds | Send / Skip / Back |
| QR export | `FeedbackSystem` | 9999 | "Send Report (QR)" in debug panel | Back / Enter |
| Debug panel | `DebugPanel` | 10000 | Backtick / triple-LEFT on nav | Backtick / Esc / Back |

**z-index stacking order (lowest → highest):**
```
App content (screens)
  → Feedback overlay / QR export (9999)
  → Participant ID prompt / Debug panel (10000)
  → Welcome screen (10002)
```

---

## Data Layer (`DataStore`)

All data is read-only static JSON loaded at app init. No network calls after
`DataStore.init()` completes (except lazy `getSeriesData()` per-show fetch).

| Method | Source file | Returns |
|--------|------------|---------|
| `getVersion()` | `data/version.json` | Version, build number, git info |
| `getLanderConfig()` | `data/lander-config.json` | Ordered list of rail configs |
| `getShow(id)` | `data/catalog.json` | Single show object |
| `getAllShows()` | `data/catalog.json` | All show objects |
| `getAllChannels()` | `data/catalog.json` | All channel objects |
| `getAllCities()` | `data/catalog.json` | All city objects |
| `getGenres()` | `data/catalog.json` | Genre string array |
| `getTopFlix()` | `data/catalog.json` | Curated 10-show list |
| `getMyMix()` | `data/catalog.json` | Curated 10-show list |
| `getGeoState()` | `data/geo-state.json` | Detected region |
| `getDetectedCity()` | `data/geo-state.json` | Single city object |
| `getSeriesData(id)` | `data/series/{id}.json` | Seasons, episodes, extras (lazy, cached) |
| `getContinueWatching()` | — | Always `[]` (deferred to Auth phase) |

**Debug overrides:** `DataStore.init()` checks `localStorage.debug_landerConfig`
and `localStorage.debug_catalog` before fetching JSON — the companion `debug.html`
page writes these keys to allow live config editing without touching source files.

---

## Analytics (`Analytics`)

Single entry point: `Analytics.track(eventName, payload)`.

Every event envelope includes: `event`, `timestamp`, `sessionId`, `participantId`,
`deviceType`, `screen`, `config` (with `appVersion`, `buildNumber`, `gitCommit`,
`landerVersion`, `debugOverrides`), `payload`.

**Events by screen:**

| Screen / Global | Events |
|----------------|--------|
| App boot | `session_start`, `session_end` |
| Lander | `focus_change`, `rail_engagement`, `tile_select`, `scroll_depth`, `dead_end`, `navigation`, `epg_nav_to_live` |
| EPG | `epg_screen_entered`, `epg_screen_exited`, `epg_nav_from_live`, `epg_back_to_nav`, `epg_back_to_rail`, `epg_channel_row_focused`, `epg_channel_logo_focused`, `epg_program_tile_focused`, `epg_program_tile_scrubbed`, `epg_row_returned_to_now`, `epg_genre_chip_focused`, `epg_genre_selected`, `epg_genre_anchor_updated`, `epg_more_info_opened`, `epg_more_info_closed`, `epg_more_info_cta_activated` |
| Series PDP | `navigation`, `focus_change`, `feature_interaction`, `tile_select`, `dead_end` |
| Player | `navigation`, `playback_start`, `playback_pause`, `playback_complete`, `playback_scrub`, `controls_interaction`, `dead_end` |
| Feedback overlay | `user_feedback` |

See `docs/ANALYTICS_REGISTRY.md` for full payload documentation per event.

**Transport:** localStorage by default (rolling buffer, 50 sessions / 5 MB cap).
Firebase optional — set `FIREBASE_URL` constant and switch `ANALYTICS_TRANSPORT`
to `'firebase'` or `'both'`.

---

## Debug System

### In-app Debug Panel (`DebugPanel` / `DebugConfig`)

Opened with backtick `` ` `` (desktop) or triple-LEFT on the nav bar (TV remote).
Panel sections:

| Section | Controls |
|---------|---------|
| A — Timing | Hero interval, city cycle, crossfade, controls auto-hide, focus/scroll speeds, playback speed |
| B — Visual | Focus glow opacity/spread/width, tile corner radius, tile gap, background color |
| C — Feature Toggles | Living tiles, hero auto-advance, simulated playback, focus outlines, grid overlay, force welcome screen, device profile override |
| D — Auth State | Auth mode radio (anonymous only; other modes deferred) |
| E — App State | Show welcome screen, reload lander config, screenshot mode, send report (QR), view analytics log, reset all |
| F — Version Info | Version, build, phase/label, built timestamp, commit, branch |

### Companion Config Page (`debug.html`)

Separate page. Not part of the main app shell.

| Editor | Persists to | Effect |
|--------|------------|--------|
| Lander Rail Editor | `localStorage.debug_landerConfig` | Overrides rail order/content on next app load |
| Catalog Editor | `localStorage.debug_catalog` | Overrides show/channel/city data on next app load |
| EPG Genre Management | `debug_epgGenreOrder`, `debug_epgGenreEnabled_*`, `debug_epgGenreLabel_*` | Overrides genre list order, visibility, and labels |
| EPG Channel→Genre Association | `debug_epgGenreMap` | Overrides which genres each channel appears under |
| EPG Channel Metadata | `debug_epgChannels` | Overrides channel name and currently-watching flag |
| EPG Display Toggles | `epgShowRatings`, `epgShowGenreHeaders` | Toggles ratings and genre header visibility |
| Export / Import | JSON file download / upload | Snapshot and restore all debug overrides |

---

## Device Profiles (`WelcomeScreen`)

Profile JSON files live in `data/device-profiles/`. Each file defines display
name, UA detection substrings, button mapping, and visual shape.

**Detection priority** (first match wins):
1. VIZIO → FireTV → Android TV → Tizen → webOS → Roku (UA substring match)
2. Mobile (touch capability + screen < 1200×900)
3. Desktop (fallback)

**Adding a new profile:** Create `data/device-profiles/{id}.json` following
the existing format. Add the `id` to the `PROFILE_IDS` array in
`js/welcome-screen.js`. No other code changes needed.

---

## Key Files at a Glance

```
js/
├── app.js               Router + screen lifecycle
├── focus-engine.js      Global d-pad delegation
├── data-store.js        All JSON loading + accessors
├── debug-panel.js       DebugConfig + DebugPanel
├── debug-config.js      Companion debug.html editor logic
├── analytics.js         Analytics.track() event bus
├── feedback.js          Hold-OK overlay + participant ID
├── welcome-screen.js    First-launch device-profile overlay
├── screens/
│   ├── lander.js        Home screen + all rail builders
│   ├── series-pdp.js    Series detail page
│   ├── player.js        Video player
│   └── epg/
│       ├── data-model.js          EPGDataModel — data fetch + debug overrides
│       ├── epg-screen.js          EPGScreen — registered screen module
│       └── components/
│           ├── program-tile.js    createProgramTile(); defines _escEPG()
│           ├── channel-logo.js    createChannelLogoCell()
│           ├── channel-row.js     createChannelRow()
│           ├── genre-group.js     createGenreGroup()
│           ├── channel-grid.js    createChannelGrid()
│           ├── genre-rail.js      createGenreRail()
│           └── more-info-overlay.js  createMoreInfoOverlay()
└── utils/
    ├── keycodes.js      Key → action mapping
    └── animations.js    Shared animation helpers
```
