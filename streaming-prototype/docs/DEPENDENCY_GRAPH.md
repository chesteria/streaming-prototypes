# Dependency Graph

> JS file load order and inter-module dependencies for `index.html`.
> Last updated: 2026-04-12

There is no module bundler. All files load as classic `<script>` tags in
dependency order. Globals defined in earlier files are available to all
subsequent files via the `window` scope.

---

## Load Order (`index.html`)

```
1.  js/utils/keycodes.js          → KeyCodes
2.  js/utils/animations.js        → Animations
3.  js/data-store.js              → DataStore
4.  js/debug-panel.js             → DebugConfig, DebugPanel
5.  js/focus-engine.js            → FocusEngine
6.  js/analytics.js               → Analytics
    [CDN defer] qrcode.min.js     → QRCode        (deferred — used by feedback.js)
    [CDN defer] hls.min.js        → Hls           (deferred — used by player.js)
7.  js/screens/lander.js          → LanderScreen
8.  js/screens/series-pdp.js      → SeriesPDPScreen
9.  js/screens/player.js          → PlayerScreen
10. js/screens/epg/data-model.js  → EPGDataModel
11. js/screens/epg/components/program-tile.js   → createProgramTile, _escEPG (global fn)
12. js/screens/epg/components/channel-logo.js   → createChannelLogoCell
13. js/screens/epg/components/channel-row.js    → createChannelRow
14. js/screens/epg/components/genre-group.js    → createGenreGroup
15. js/screens/epg/components/channel-grid.js   → createChannelGrid
16. js/screens/epg/components/genre-rail.js     → createGenreRail
17. js/screens/epg/components/more-info-overlay.js → createMoreInfoOverlay
18. js/screens/epg/epg-screen.js  → EPGScreen
19. js/feedback.js                → FeedbackSystem
20. js/welcome-screen.js          → WelcomeScreen
21. js/app.js                     → App           (boots on DOMContentLoaded)
```

---

## Dependency Matrix

Each row is a module; columns are what it depends on.

| Module | KeyCodes | Animations | DataStore | DebugConfig | FocusEngine | Analytics | EPGDataModel | `_escEPG` |
|--------|:--------:|:----------:|:---------:|:-----------:|:-----------:|:---------:|:------------:|:---------:|
| `keycodes.js` | — | | | | | | | |
| `animations.js` | | — | | | | | | |
| `data-store.js` | | | — | | | | | |
| `debug-panel.js` | | | ✓ | — | | | | |
| `focus-engine.js` | ✓ | | | | — | | | |
| `analytics.js` | | | ✓ | ✓ | | — | | |
| `lander.js` | | ✓ | ✓ | ✓ | ✓ | ✓ | | |
| `series-pdp.js` | | | ✓ | | ✓ | ✓ | | |
| `player.js` | | | ✓ | ✓ | ✓ | ✓ | | |
| `epg/data-model.js` | | | | ✓ | | | — | |
| `epg/program-tile.js` | | | | | | | | — (defines it) |
| `epg/channel-logo.js` | | | | | | | | ✓ |
| `epg/channel-row.js` | | | | | | | | ✓ |
| `epg/genre-group.js` | | | | | | | ✓ | |
| `epg/channel-grid.js` | | | | | | | ✓ | |
| `epg/genre-rail.js` | | | | | | | | |
| `epg/more-info-overlay.js` | | | | | | | | ✓ |
| `epg/epg-screen.js` | | | | ✓ | ✓ | ✓ | ✓ | |
| `feedback.js` | | | ✓ | ✓ | ✓ | ✓ | | |
| `welcome-screen.js` | | | ✓ | ✓ | ✓ | | | |
| `app.js` | | | ✓ | | ✓ | ✓ | | |

---

## Critical Load-Order Constraints

These pairs **must** load in the given order or the app will throw at runtime:

| Must load first | Must load before | Reason |
|-----------------|-----------------|--------|
| `keycodes.js` | `focus-engine.js` | `FocusEngine` maps raw key events using `KeyCodes` |
| `data-store.js` | `analytics.js` | `Analytics._getConfig()` reads from `DataStore.getVersion()` |
| `analytics.js` | All screens | Every screen uses `Analytics.track()` |
| `focus-engine.js` | All screens | Every screen calls `FocusEngine.setHandler()` in `onFocus()` |
| `data-store.js` | `epg/data-model.js` | `EPGDataModel` reads debug overrides via `DebugConfig` (loaded after DataStore) |
| `epg/program-tile.js` | All other EPG components | Defines `_escEPG()` as a global function used by subsequent EPG files |
| All EPG component files | `epg/epg-screen.js` | `EPGScreen.init()` calls all component factory functions |
| All screens | `app.js` | `App.init()` calls `registerScreen()` for all screen modules |

---

## Global Functions Defined at Script Scope

These are not module exports — they are plain functions hoisted to `window`
by their containing script and available to all subsequent scripts.

| Function | Defined in | Used by |
|----------|-----------|---------|
| `_escEPG(str)` | `epg/program-tile.js` | `epg/channel-logo.js`, `epg/channel-row.js`, `epg/more-info-overlay.js` |
| `buildEPGNav()` | `epg/epg-screen.js` (below IIFE) | `EPGScreen.init()` (same file, above definition — safe due to hoisting) |
| `showToast(msg)` | `app.js` or `global.js` | All screens |

---

## CDN Dependencies

| Library | CDN URL | Used by | Load strategy |
|---------|---------|---------|--------------|
| `hls.min.js` | `cdn.jsdelivr.net/npm/hls.js@1/…` | `player.js` | `defer` — safe because player.js only references `Hls` inside `PlayerScreen.init()` |
| `qrcode.min.js` | `cdn.jsdelivr.net/npm/qrcodejs@1.0.0/…` | `feedback.js` | `defer` — safe because QRCode is only used after user action (debug panel send report) |

Both CDN scripts fail gracefully — the app renders without them, and the features
that depend on them (`Hls.isSupported()` check, QR export button) degrade to
fallback behavior.

---

## `debug.html` Load Order

`debug.html` loads only one script: `js/debug-config.js`. This file is completely
standalone — it does not share code with the main app and manages its own
localStorage reads/writes using the `debug_*` key namespace.
