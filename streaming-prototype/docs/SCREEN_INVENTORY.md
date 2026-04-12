# Screen Inventory

> All screens registered with `App.registerScreen()`.
> Last updated: 2026-04-12

---

## Overview

The app uses a flat screen registry. Screens are registered at boot in `app.js`
and navigated to via `App.navigate(screenId, params)`. Each screen is a plain
JS object conforming to the screen contract:

```js
{
  id: 'string',
  init(container, params),  // async — renders DOM, sets up key handler
  onFocus(),                 // called when screen becomes active
  onBlur(),                  // called when navigating away
  destroy(),                 // called on replace — tears down timers, HLS, listeners
}
```

---

## Registered Screens

### Lander

| Field | Value |
|-------|-------|
| **Screen ID** | `'lander'` |
| **Module** | `LanderScreen` |
| **File** | `js/screens/lander.js` |
| **Registered in** | `js/app.js` |
| **Entry points** | App boot (always); `App.navigate('lander')` from EPG nav For You tab |
| **Exit points** | Nav Live tab → `epg`; tile select → `series-pdp`; tile select (channel) → `player` |
| **Params accepted** | None (scroll/focus state preserved on container element between visits) |
| **Focus zones** | `nav` (top nav bar, 120px), then one zone per visible rail (index 1…N) |
| **Key files loaded** | `lander.js` (monolithic — all rail builders inline) |
| **Data dependencies** | `DataStore.getLanderConfig()`, `DataStore.getAllShows()`, `DataStore.getAllChannels()`, `DataStore.getAllCities()` |
| **Debug overrides** | `debug_landerConfig` (rail order/visibility), `debug_catalog` (show/channel data) |
| **Analytics on enter** | `session_start` (first keypress), `navigation` (on tile select) |
| **Analytics on exit** | `scroll_depth` (in `onBlur`), `rail_engagement` (in `onBlur`) |

---

### Series PDP

| Field | Value |
|-------|-------|
| **Screen ID** | `'series-pdp'` |
| **Module** | `SeriesPDPScreen` |
| **File** | `js/screens/series-pdp.js` |
| **Registered in** | `js/app.js` |
| **Entry points** | Tile select on lander rails; "Go to Series Page" in player info modal |
| **Exit points** | BACK → lander (or wherever App.back() resolves); episode/extra tile → `player` |
| **Params accepted** | `{ showId: string }` |
| **Focus zones** | `buttons`, `seasons`, `episodes`, `extras`, `similar`, `more-info` |
| **Key files loaded** | `series-pdp.js` (monolithic) |
| **Data dependencies** | `DataStore.getShow(showId)`, `DataStore.getSeriesData(showId)` (lazy, per-show fetch) |
| **State saved on blur** | `_savedZone`, `_savedSeasonIdx`, `_savedEpisodeIdx`, `_savedExtrasIdx`, `_savedSimilarIdx`, `_savedScrollY` — stored on container DOM element |
| **Analytics on enter** | `navigation` |
| **Analytics on exit** | Implicit — no explicit onBlur event |

---

### Player

| Field | Value |
|-------|-------|
| **Screen ID** | `'player'` |
| **Module** | `PlayerScreen` |
| **File** | `js/screens/player.js` |
| **Registered in** | `js/app.js` |
| **Entry points** | Episode/channel tile select on lander or series-pdp |
| **Exit points** | BACK → series-pdp or lander (App.back()) |
| **Params accepted** | `{ showId: string, episodeId: string, streamUrl: string }` |
| **Focus zones** | `progress` (scrub bar), `buttons` (transport controls), `episodes` (episode rail) |
| **Key files loaded** | `player.js` (monolithic); `hls.min.js` (CDN, deferred) |
| **Data dependencies** | `DataStore.getSeriesData(showId)` for episode rail |
| **Destroy behavior** | `PlayerScreen.destroy()` calls `hls.destroy()` — critical to prevent HLS instances leaking across navigations |
| **Analytics on enter** | `navigation`, `playback_start` |
| **Analytics on exit** | `playback_pause` or `playback_complete` |

---

### EPG

| Field | Value |
|-------|-------|
| **Screen ID** | `'epg'` |
| **Module** | `EPGScreen` |
| **File** | `js/screens/epg/epg-screen.js` |
| **Registered in** | `js/app.js` |
| **Entry points** | Live tab in lander nav bar |
| **Exit points** | BACK from `'nav'` context → App.back() (lander); For You tab in EPG nav → `lander` |
| **Params accepted** | `{ entrySource: string }` (default: `'nav'`) |
| **Focus contexts** | `'nav'` (top nav bar), `'rail'` (genre chip strip), `'grid'` (channel/program grid) |
| **Component files** | `epg/data-model.js`, `epg/components/program-tile.js`, `epg/components/channel-logo.js`, `epg/components/channel-row.js`, `epg/components/genre-group.js`, `epg/components/channel-grid.js`, `epg/components/genre-rail.js`, `epg/components/more-info-overlay.js` |
| **Data dependencies** | `EPGDataModel.init()` → fetches `data/epg-mock.json`; applies localStorage debug overrides |
| **Overlay behavior** | More Info overlay appended to `document.body` — sits above all screen content; removed from body in `destroy()` |
| **Debug overrides** | `debug_epgGenreOrder`, `debug_epgGenreEnabled_*`, `debug_epgGenreLabel_*`, `debug_epgGenreMap`, `debug_epgChannels`, `epgShowRatings`, `epgShowGenreHeaders` |
| **Analytics on enter** | `epg_screen_entered` |
| **Analytics on exit** | `epg_screen_exited` (dwell_ms, exit_destination) |

**EPG Grid layout dimensions (1920×1080):**

| Measurement | Value | Rule |
|-------------|-------|------|
| Guide left offset | 130px from screen left | `content-pad-x` (60px) + 70px additional indent |
| Rail → first row gap | 60px fixed | `margin-top` on grid wrapper — outside overflow clip, rows clip at y=0 with no peeking |
| Row height (collapsed) | 163px | |
| Row height (focused) | 350px | CSS height transition 180ms |
| Row gap | 8px | `margin-bottom` |
| Logo cell width | 190px | Standalone rounded card; padding 0 13px |
| Logo-to-tile gap | 12px | `gap` on row flex container |
| Program tile width | 725px | `EPG_TILE_WIDTH` in `channel-row.js` |
| Logo cell radius | `--tile-radius` all corners | **Never flush to adjacent elements** |
| Program tile radius | `--tile-radius` all corners | **Never flush to logo cell** |

> **Design rule:** Logo cell and program tiles are completely independent cards separated by 12px.
> They must never be joined, flush, or share an edge.

**EPG Focus navigation (BACK stack):**

Grid → Rail → Nav (BACK progresses through each context in order)

- Grid BACK: blurs row visually, preserves tile scroll position, focuses rail. Does **not** call `returnToNow()`.
- Rail BACK: blurs chips, focuses nav bar.
- Rail DOWN: restores grid at `_lastRowIndex` — the row and tile position from before BACK was pressed.
- Grid scroll: focused row is always pinned at top of visible grid area; rows above slide under the genre rail; rows below slide up into view. Animated via `transition: transform 300ms ease` on `.epg-grid-scroll`.

**EPG Font sizes:**

| Element | Size | Notes |
|---------|------|-------|
| Main nav tabs | 10px | Matches genre chip |
| Genre chip | 10px | |
| Genre group header | hidden | `display: none` — genre changes reflected by rail only |
| Program tile title | 34px | `nowrap` + `text-overflow: ellipsis` |
| Program tile description | 10px | Visible only when row is focused |
| Program tile time | 29px | |
| Program tile rating | 25px | |
| Logo cell initials (collapsed) | 48px | |
| Logo cell initials (focused) | 60px | |

---

## Non-Screen Overlays

These are not registered screens — they are modal overlays managed by global
modules that block screen key handlers while open.

| Overlay | Global | File | Trigger |
|---------|--------|------|---------|
| Welcome Screen | `WelcomeScreen` | `js/welcome-screen.js` | First launch; H key; debug panel action |
| Participant ID prompt | `FeedbackSystem` | `js/feedback.js` | `Analytics.isFirstVisit()` is true at boot |
| Feedback overlay | `FeedbackSystem` | `js/feedback.js` | Hold OK for 3 seconds |
| QR export | `FeedbackSystem` | `js/feedback.js` | "Send Report (QR)" in debug panel |
| Debug panel | `DebugPanel` | `js/debug-panel.js` | Backtick key / triple-LEFT on nav bar |

---

## Screen Registration Order

```js
// js/app.js — App.init()
registerScreen(LanderScreen);
registerScreen(SeriesPDPScreen);
registerScreen(PlayerScreen);
registerScreen(EPGScreen);
```

Registration order does not affect runtime behavior — screens are stored in a
keyed object (`screens[id]`) and looked up by string ID.
