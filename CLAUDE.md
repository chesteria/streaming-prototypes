# CLAUDE.md — Streaming TV Prototype Platform

## Project Overview

A TV streaming app prototype built for **remote usability research**. Participants sideload it onto real TV devices; facilitators monitor sessions via a debug panel and Firebase Analytics dashboard. No build step — plain HTML/CSS/JS served from a single directory.

**Live deployment:** GitHub Pages via `chesteria/UTA` → `.github/workflows/deploy.yml`
**Current version:** 1.7.0 (Phase 2 — Insight Engine)
**Working directory:** `streaming-prototype/`

---

## Quick Start

**Running locally:** `cd streaming-prototype && python3 -m http.server 8000`

**Deploy:** Push to `main` → GitHub Actions handles Firebase config injection → deploys to Pages

**Debug panel:** Press `` ` `` (backtick) to open

**Adding a feature:** 
1. Check the relevant phase PRD in `docs/PRD/`
2. Implement + add analytics events 
3. Update CLAUDE.md if architecture changes

---

## Architecture

### No-build, no framework

All JS is vanilla. No npm, no bundler, no transpilation. Files load as `<script src="...">` tags in `index.html` in strict dependency order. The single exception is `analytics.js`, which loads as `<script type="module">` because it uses dynamic ES module imports for Firebase.

### Script loading order (index.html)

```
scale.js → keycodes.js → animations.js
  → data-store.js → debug-panel.js → focus-engine.js
  → analytics.js (module)
  → [screens: lander, series-pdp, player, epg]
  → [components: welcome-screen, feedback, nav]
  → app.js (last — calls App.init() on DOMContentLoaded)
```

`analytics.js` loads as an ES module (deferred, non-blocking) and assigns `window.trackEvent`, `window.initSession`, `window.endSession` as globals. Screen files are regular scripts — they call `trackEvent(...)` as a global, which is guaranteed available before `DOMContentLoaded`.

### Screen lifecycle (App router)

Each screen exports a module object: `{ id, init(params, container), onFocus(), onBlur(), destroy() }`. The App router in `app.js` manages navigation history, element creation/destruction, and screen transitions. Navigate with `App.navigate('screenId', params)`.

### Focus / D-pad navigation

`FocusEngine` in `js/focus-engine.js` is the sole `keydown` listener. Each screen registers its key handler via `FocusEngine.setHandler(fn)` on `onFocus()` and clears it on `onBlur()`. Key codes are normalized in `js/utils/keycodes.js` → actions: `UP`, `DOWN`, `LEFT`, `RIGHT`, `OK`, `BACK`, `PLAYPAUSE`.

### Viewport scaling

`js/utils/scale.js` (`ScaleEngine`) scales the `#app` element to fit any viewport into a 1920×1080 canvas. Sets a `--scale` CSS variable and adds `.scale-ready` to reveal the app (FOUC prevention). Called on load and `resize`.

---

## Key Files

| File | Purpose |
|------|---------|
| `index.html` | Entry point — all scripts and CSS loaded here |
| `js/app.js` | Router, screen registry, navigation history |
| `js/analytics.js` | **Single analytics call site** — Firebase transport + BroadcastChannel relay |
| `js/debug-panel.js` | Research facilitator controls — session init, config overrides, event log |
| `js/focus-engine.js` | D-pad input handling |
| `js/utils/scale.js` | Viewport scaling engine (1920×1080 canvas) |
| `js/data-store.js` | In-memory data layer — catalog, user state, EPG data |
| `js/screens/lander.js` | Home screen — hero + content rails |
| `js/screens/series-pdp.js` | Series detail page |
| `js/screens/player.js` | Video player (HLS + simulated playback) |
| `js/screens/epg/epg-screen.js` | Live TV guide |
| `js/welcome-screen.js` | Onboarding modal |
| `js/feedback.js` | In-prototype feedback widget |
| `reporting.html` | Live analytics dashboard (BroadcastChannel subscriber) |
| `firebase-config.template.js` | Config template — `$VAR` placeholders, committed to git |
| `js/firebase-config.example.js` | Shape reference for local dev (placeholder values) |
| `js/firebase-config.js` | **Git-ignored** — generated at deploy time via `envsubst` |
| `data/debug-defaults.json` | Default values for all debug panel config sliders |
| `data/device-profiles/` | Per-device timing/viewport presets (vizio, roku, firetv, etc.) |
| `docs/PRD/` | All feature PRDs — source of truth for planned work |

---

## Analytics

### Event bus

**Always use `trackEvent(eventName, params)`** — never call Firebase directly. `analytics.js` is the only file that knows about Firebase.

```javascript
trackEvent('card_select', { card_id: '...', card_title: '...', destination_screen: 'pdp' });
```

### Standard params (auto-enriched — do not pass manually)

`participant_id`, `proto_screen`, `device_profile`, `scenario_preset`, `session_timestamp`

### Event taxonomy

| Prefix | Category |
|--------|----------|
| `proto_screen_view` | Screen navigation |
| `proto_session_start/end` | Session lifecycle |
| `proto_video_start/complete` | Playback lifecycle |
| `card_select`, `rail_focus` | Content interaction |
| `pdp_view`, `pdp_episode_focus`, `pdp_episode_select` | PDP events |
| `video_pause/resume/seek/exit` | Player controls |
| `config_changed`, `debug_panel_open` | Debug/facilitator events |

Use `proto_` prefix for any event name that collides with a Firebase reserved name (`screen_view`, `session_start`, `video_start`, `video_complete`).

### `screens_visited` cap

Capped at 5 unique values to stay within Firebase's 100-character string param limit.

### Session management

Sessions are initialized from the debug panel. `sessionStorage` holds `participant_id`, `device_profile`, `session_start_ts`, `screens_visited`, `event_count`, `current_screen`. All cleared on `endSession()` or tab close.

---

## Debug Panel

Keyboard shortcut: **`` ` `` (backtick)** — toggles the panel.

The debug panel is a research facilitation tool. It provides:
- **Session init form** — participant code + device profile → calls `initSession()`
- **Config overrides** — all values in `debug-defaults.json` are live-editable
- **Event log** — last 20 `analytics_event` custom events (dispatched by `trackEvent`)
- **Device profile selector** — loads timing/viewport presets from `data/device-profiles/`
- **Welcome screen trigger** — deferred via `setTimeout(..., 0)` to avoid same-keydown conflict

### Important: keydown listener ordering

The debug panel registers its keydown listener in **capture phase**. Welcome screen and other overlays register in **bubble phase**. If you trigger an overlay from the debug panel, always defer the `show()` call with `setTimeout(..., 0)` to let the triggering keydown event fully propagate before the new listener is registered.

---

## Firebase / Deployment

### Local dev (no Firebase)

`firebase-config.js` is git-ignored. Without it, `analytics.js` catches the import error and falls back to local-only relay (BroadcastChannel + `window.analytics_event`). The app works fully without Firebase.

### Deploy flow

Push to `main` → GitHub Actions (`.github/workflows/deploy.yml`) → `envsubst` injects 7 secrets into `firebase-config.template.js` → output written to `js/firebase-config.js` → deploys `streaming-prototype/` to GitHub Pages.

### Required GitHub secrets (`chesteria/UTA → Settings → Secrets → Actions`)

`FIREBASE_API_KEY`, `FIREBASE_AUTH_DOMAIN`, `FIREBASE_PROJECT_ID`, `FIREBASE_STORAGE_BUCKET`, `FIREBASE_MESSAGING_SENDER_ID`, `FIREBASE_APP_ID`, `FIREBASE_MEASUREMENT_ID`

### Adding new secrets to the config

1. Add `$NEW_VAR` placeholder to `firebase-config.template.js`
2. Add the secret to GitHub repo secrets
3. Add `NEW_VAR: ${{ secrets.NEW_VAR }}` to the `env:` block in `deploy.yml`

---

## CSS Architecture

| File | Scope |
|------|-------|
| `css/variables.css` | Design tokens — colors, spacing, typography (load first) |
| `css/global.css` | Reset, body, `#app`, shared utilities |
| `css/debug-panel.css` | Debug panel + session panel + event log |
| `css/[screen].css` | Per-screen styles |

The app renders at 1920×1080 logical pixels. `ScaleEngine` applies a CSS transform to fit that canvas into the actual viewport. Design to 1920×1080; do not use `vw`/`vh` inside screen CSS (they reference the physical viewport, not the scaled canvas).

---

## Data

- `data/catalog.json` — content catalog (shows, series, episodes)
- `data/lander-config.json` — rail order and hero configuration
- `data/epg-mock.json` — EPG channel/program grid data
- `data/user-state.json` — initial user state (watchlist, continue watching)
- `data/device-profiles/*.json` — per-device config overrides

All data is loaded by `data-store.js` at startup. No API calls; everything is static JSON.

---

## Development Conventions

- **No build step** — changes are live on save. Open `streaming-prototype/index.html` directly in browser or via a local server.
- **New screen** → create `js/screens/[name].js`, add `<script src="...">` to `index.html` before `app.js`, register with `App.registerScreen(ScreenModule)`.
- **New analytics event** → call `trackEvent()` from the screen file. Add the event name to the taxonomy table above and in any relevant PRD.
- **Every new feature requires analytics instrumentation** — this is a hard requirement per the Phase 2 PRD.
- **No PII** — never collect real names, emails, IPs, or hardware IDs. Participant codes are opaque researcher-assigned labels (e.g., `P01`).
- `version.json` is updated manually when cutting a new version.

---

## Phase Roadmap

| Phase | PRD | Status |
|-------|-----|--------|
| Phase 1 + 1.5 | `docs/PRD/phase1-core-app-v1.5.md` | Built |
| Phase 2 — Insight Engine | `docs/PRD/phase2-insight-engine-v1.0.md` | Built (Firebase, reporting, debug panel) |
| Phase 2.1 | — | Deferred: feedback events, task events, scenario/device events |
| Phase 3 — Scenarios & Simulation | `docs/PRD/phase3-scenarios-and-simulation-v1.0.md` | Not started |

---

## Current Branch State

Active branch: `feature/viewport-scaling` — has untracked viewport scaling PRD files in `docs/PRD/viewport scaling/`.
