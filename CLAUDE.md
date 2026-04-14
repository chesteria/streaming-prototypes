# CLAUDE.md — Streaming TV Prototype Platform

## Project Overview

A TV streaming app prototype built for **remote usability research**. Participants sideload it onto real TV devices; facilitators monitor sessions via a debug panel and Firebase Analytics dashboard.

**Live deployment:** GitHub Pages via `chesteria/UTA` → `.github/workflows/deploy.yml`
**Current version:** 1.7.0, build 44 (Phase 2 — Viewport Scaling milestone within the Insight Engine phase)
**Primary working directory:** `streaming-prototype/` (Phase 1 + Phase 2, vanilla JS, no build step)
**Phase 3 working directory (planned):** `streaming-prototype-v2/` (greenfield Vite + TypeScript + Tailwind — does not exist yet; see the Phase Roadmap for details)

> **Important architectural note:** This repo is in the middle of a deliberate dual-architecture transition. The existing Phase 1 + Phase 2 app in `streaming-prototype/` stays vanilla JS with no build step. New Phase 3 work happens in a separate sibling folder `streaming-prototype-v2/` using Vite + TypeScript + Tailwind, as a greenfield toolchain pilot rather than a migration. Rules and conventions below that specify "no build step" apply to `streaming-prototype/` only. When you're working in `streaming-prototype-v2/`, different rules apply — see `docs/PRD/phase3-experience-completion/PRD-v1.md`.

---

## Quick Start

**Running locally:** `cd streaming-prototype && python3 -m http.server 8000`

**Deploy:** Push to `main` → GitHub Actions handles Firebase config injection → deploys to Pages

**Debug panel:** Press `` ` `` (backtick) to open

**Adding a feature:**
1. Check the relevant PRD in `docs/PRD/` (see Phase Roadmap below for the current active set)
2. Confirm which codebase the feature belongs to — Phase 1/2 work goes in `streaming-prototype/`, Phase 3 work goes in `streaming-prototype-v2/` once that project is scaffolded
3. Implement + add analytics events
4. Update CLAUDE.md if architecture changes

---

## Architecture (streaming-prototype/ — Phase 1 + Phase 2)

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

## Architecture (streaming-prototype-v2/ — Phase 3, planned)

**Status:** Folder does not yet exist. Will be scaffolded in Chunk P1 of the Phase 3 experience-completion PRD after the device compatibility spike (P0) passes on target hardware.

**Toolchain:** Vite + TypeScript (strict mode) + Tailwind CSS v3. Vitest for tests, `@testing-library/dom` for DOM helpers. `@fontsource/roboto` for the font. `qrcode` npm package replaces the old `qrcodejs` CDN load. `hls.js` and `firebase` become npm deps instead of CDN loads.

**Same repo, sibling folder.** Not a separate repo. Phase 1 docs, PRDs, and design tokens are shared references; Phase 3 code is independent.

**FocusEngine is the only piece of Phase 1 code that gets ported literally.** Its behavior is the most-tested part of the app and must be preserved exactly. Everything else in Phase 3 is new code for new screens.

**Deploy:** Separate GitHub Pages path or sub-path (TBD in Chunk P1). Phase 1's existing deploy workflow is unaffected.

**Device matrix:** See `docs/SUPPORTED_DEVICES.md`. Minimum supported Tizen is **5.5** (2020+ Samsung models, Chromium 69 baseline) — Tizen 4.0 is explicitly out of scope for Phase 3. FireTV is supported via a Capacitor wrapper on Fire OS 6+ as a separate deployment workstream.

---

## Supported Devices

Full matrix lives in `docs/SUPPORTED_DEVICES.md`. Summary:

| Platform | Status | Floor | Notes |
|---|---|---|---|
| Samsung Tizen | ✅ Supported | 5.5 (2020+) | Tizen 4.0 is **deprecated** as of 2026-04-13 |
| VIZIO SmartCast | ✅ Supported | 2019+ | Chromium-based |
| AndroidTV / Google TV | ✅ Supported | Android 9+ | NVIDIA Shield, Google TV Streamer, etc. |
| FireTV | ✅ Supported (wrapped) | Fire OS 6+ | Via Capacitor APK — separate deploy workstream |
| Roku | ❌ Out of scope | — | Future parallel project (BrightScript/SceneGraph, separate Claude project) |
| tvOS | ❌ Out of scope | — | Future parallel project (SwiftUI, separate Claude project) |
| Mobile (iOS/Android) | ⏳ Future phase | — | Deferred; own phase with own toolchain decisions |

**Roku and tvOS are not targets for this codebase in any form.** They are not web platforms and cannot run vanilla JS or Vite+TS output. If and when they happen, they'll be separate parallel implementations that consume the same data contracts (`catalog.json`, `lander-config.json`, design tokens) but live in entirely separate projects.

---

## Key Files

| File | Purpose |
|------|---------|
| `streaming-prototype/index.html` | Entry point — all scripts and CSS loaded here |
| `streaming-prototype/js/app.js` | Router, screen registry, navigation history |
| `streaming-prototype/js/analytics.js` | **Single analytics call site** — Firebase transport + BroadcastChannel relay |
| `streaming-prototype/js/debug-panel.js` | Research facilitator controls — session init, config overrides, event log |
| `streaming-prototype/js/focus-engine.js` | D-pad input handling |
| `streaming-prototype/js/utils/scale.js` | Viewport scaling engine (1920×1080 canvas) |
| `streaming-prototype/js/data-store.js` | In-memory data layer — catalog, user state, EPG data |
| `streaming-prototype/js/screens/lander.js` | Home screen — hero + content rails |
| `streaming-prototype/js/screens/series-pdp.js` | Series detail page |
| `streaming-prototype/js/screens/player.js` | Video player (HLS + simulated playback) |
| `streaming-prototype/js/screens/epg/epg-screen.js` | Live TV guide |
| `streaming-prototype/js/welcome-screen.js` | Onboarding modal |
| `streaming-prototype/js/feedback.js` | In-prototype feedback widget |
| `streaming-prototype/reporting.html` | Live analytics dashboard (BroadcastChannel subscriber) |
| `streaming-prototype/firebase-config.template.js` | Config template — `$VAR` placeholders, committed to git |
| `streaming-prototype/js/firebase-config.example.js` | Shape reference for local dev (placeholder values) |
| `streaming-prototype/js/firebase-config.js` | **Git-ignored** — generated at deploy time via `envsubst` |
| `streaming-prototype/data/debug-defaults.json` | Default values for all debug panel config sliders |
| `streaming-prototype/data/device-profiles/` | Per-device timing/viewport presets (vizio, roku, firetv, etc.) |
| `docs/PRD/` | All feature PRDs — source of truth for planned work (see Phase Roadmap below for active set) |
| `docs/SUPPORTED_DEVICES.md` | Device support matrix — authoritative source for what this codebase targets |
| `docs/KNOWN_ISSUES.md` | Runtime quirks and deliberate trade-offs (distinct from platform support) |
| `docs/CHANGELOG.md` | Version history in Keep a Changelog format |

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

### Phase 3 analytics namespace

When Phase 3 (`streaming-prototype-v2/`) comes online, its events will be namespaced with a `v2_` prefix and will use a separate `BroadcastChannel('proto_analytics_v2')` to prevent crosstalk with Phase 1's event data during any period of overlap. Firebase project assignment for Phase 3 is TBD at the Chunk P10 decision gate.

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

## Firebase / Deployment (Phase 1 + Phase 2)

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

### Phase 3 deploy (planned)

Phase 3 introduces a separate deploy path for `streaming-prototype-v2/` using Vite's build output and `VITE_FIREBASE_*` env vars passed directly to the build step (no `envsubst`). Planned for Chunk P9 of the Phase 3 PRD. Phase 1's existing deploy is unaffected.

---
## Pinned CDN Dependencies (streaming-prototype/)

Phase 1 + Phase 2 load all third-party libraries from CDNs rather than npm. There is no `package.json` and no automated dependency tracking for this codebase — Dependabot does not apply here. This table is the source of truth for what's pinned and where.

| Library | Version | Source | Loaded by | Notes |
|---|---|---|---|---|
| Firebase (App + Analytics) | _TBD — check `js/analytics.js`_ | `https://www.gstatic.com/firebasejs/` | `js/analytics.js` (ES module) | Backward-compatible across minor versions; v9+ modular SDK |
| hls.js | _TBD — check `index.html`_ | `https://cdn.jsdelivr.net/npm/hls.js` | `js/screens/player.js` | Required for HLS playback on non-Safari browsers |
| qrcodejs | _TBD — check `index.html`_ | `https://cdnjs.cloudflare.com/` | Welcome screen / debug panel | **Being replaced** by `qrcode` npm package in `streaming-prototype-v2/` |

### Update policy

This codebase is in maintenance mode. Active development has moved to `streaming-prototype-v2/` (Dependabot-managed) and the JSDoc hedge. **No recurring update audit.** Update only when:

- A security advisory is published for one of the libraries above
- A bug is traced to an outdated library version
- The library is needed for a Phase 1 hotfix that requires a newer API

When updating, pin to a specific version in the URL (never use `@latest`) and note the change in `docs/CHANGELOG.md`.

### Cross-codebase Firebase note

Firebase is loaded in **both** `streaming-prototype/` (CDN) and `streaming-prototype-v2/` (npm) during the Phase 3 buildout. Event namespacing (`v2_` prefix + separate BroadcastChannel) prevents data crosstalk, but if you update Firebase in v2, sanity-check that the v1 CDN pin isn't dramatically behind — large version gaps can cause subtle analytics behavior differences.

---


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

**Type safety (planned):** The `jsdoc-typecheck-hedge` PRD (see Phase Roadmap) adds JSDoc `@typedef` blocks and zod schemas to validate these files at load time. This is a Phase 1 enhancement — no code rewrite, layered on top of the existing vanilla JS.

---

## Development Conventions (streaming-prototype/)

- **No build step** — changes are live on save. Open `streaming-prototype/index.html` directly in browser or via a local server.
- **New screen** → create `js/screens/[name].js`, add `<script src="...">` to `index.html` before `app.js`, register with `App.registerScreen(ScreenModule)`.
- **New analytics event** → call `trackEvent()` from the screen file. Add the event name to the taxonomy table above and in any relevant PRD.
- **Every new feature requires analytics instrumentation** — this is a hard requirement per the Phase 2 PRD.
- **No PII** — never collect real names, emails, IPs, or hardware IDs. Participant codes are opaque researcher-assigned labels (e.g., `P01`).
- `version.json` is updated via `scripts/bump-build-number.sh` when cutting a new version.

---

## Phase Roadmap

> **Note:** Phase 3 was redefined on 2026-04-13. The original Phase 3 (Scenarios & Device Simulation) has been superseded by a user-facing completion phase (location detection, search, auth flows). The old PRD is kept as reference with a superseded header.

### Active PRDs

| Phase / Feature | PRD | Status |
|---|---|---|
| Phase 1 + 1.5 — Core App | `docs/PRD/phase1-core-app-v1.5.md` | ✅ Built |
| Phase 2 — Insight Engine | `docs/PRD/phase2-insight-engine-v1.0.md` | ✅ Substantially built (analytics, feedback, reporting, debug panel shipped) |
| Phase 2 — Viewport Scaling sub-feature | `docs/PRD/viewport scaling/` | ✅ Shipped in v1.7.0 |
| Phase 2.1 (deferred sub-features) | — | ⏳ Deferred: task events, scenario/device events (feedback events shipped in Phase 2) |
| **Foundation: JSDoc + zod hedge** | `docs/PRD/jsdoc-typecheck-hedge/PRD-v1.md` | 📝 Draft — ready to build, 3–5 sessions |
| **Phase 3 — Experience Completion (greenfield toolchain pilot)** | `docs/PRD/phase3-experience-completion/PRD-v1.md` | 📝 Draft — planning phase, 12–15 sessions for location pilot |

### Superseded / Rejected PRDs (kept as reference)

| PRD | Why |
|---|---|
| `docs/PRD/phase3-scenarios-and-simulation-v1.0.md` | **Superseded 2026-04-13.** Phase 3 was redefined from internal tooling (scenario presets + 14-device simulation) to user-facing experience completion. Old PRD kept as reference; scenario/simulation work may return later as separate internal tooling PRDs. |
| `docs/PRD/vite-ts-tailwind-migration/PRD-v1.md` | **Rejected after adversarial review 2026-04-13.** Proposed a full 25–35 session (realistically 45–65 session) migration of Phase 1 into Vite + TS + Tailwind via a long-lived branch. Rejected because ROI math does not pencil for a prototype, toolchain bet was speculative rather than evidence-based, and the freeze-main cost was understated. Replaced by the Phase 3 greenfield pilot + JSDoc hedge combination. Kept as reference with a superseded header. |

### Future / Planned (not yet drafted)

- Phase 3 sub-features after the location pilot ships successfully: **Search**, **Auth flows**, and any additional "seam" screens needed to make the simulated experience feel complete. Each gets its own PRD after the Chunk P10 decision gate in `phase3-experience-completion`.
- Mobile (iOS/Android) — deferred future phase with its own toolchain decisions.
- Roku parallel implementation (BrightScript/SceneGraph) — future separate Claude project, not a target for this codebase.
- tvOS parallel implementation (SwiftUI) — future separate Claude project, not a target for this codebase.

---

## Current State

**Active work:** Planning phase for the Phase 3 greenfield pilot and the JSDoc/zod hedge. No implementation in progress as of the last update to this file. The next concrete step is either (a) starting the JSDoc hedge in `streaming-prototype/`, or (b) running Chunk P0 (device compatibility spike) of the Phase 3 experience-completion PRD on target TV hardware.

**Branch model going forward:**
- `main` — production, currently v1.7.0
- Phase 1 hotfixes and the JSDoc hedge — feature branches off `main`, merged back to `main` normally
- Phase 3 greenfield work — will branch off `main` into feature branches targeting `streaming-prototype-v2/` once that folder is scaffolded in Chunk P1. Phase 3 work **does not touch `streaming-prototype/`** except for the literal port of `focus-engine.js`

---

## SHARED CORE RULES (DO NOT DIVERGE)

> This section must stay identical in both `AGENTS.md` and `CLAUDE.md`.
> When this section changes, both files must be updated before committing.

### Scope

These rules apply to work inside **`streaming-prototype/`** (the existing Phase 1 + Phase 2 vanilla JS codebase). Phase 3 work happens in **`streaming-prototype-v2/`** (greenfield Vite + TypeScript + Tailwind), which is a separate project with its own architecture. When `streaming-prototype-v2/` is scaffolded, its own rules will be documented in `docs/PRD/phase3-experience-completion/PRD-v1.md` and eventually in a dedicated section of this file.

### Core repo truths (streaming-prototype/)

- No build step. No npm, bundlers, transpilers, or frameworks.
- Plain HTML/CSS/JS served from `streaming-prototype/`.
- Script loading order in `index.html` is architecture, not formatting.
- `js/analytics.js` is the only analytics entry point.
- `FocusEngine` is the only global keydown system.
- The app targets a fixed 1920×1080 logical canvas via `ScaleEngine`.
- The app must work locally without Firebase.
- No PII collection.
- The device support matrix is governed by `docs/SUPPORTED_DEVICES.md`. Tizen 4.0 is deprecated; do not add code paths targeting it.

### Hard rules (streaming-prototype/)

- Do not introduce a framework or build system into `streaming-prototype/` under any circumstances. Any "but wouldn't it be nicer with X" instinct belongs in Phase 3, not here.
- Do not casually change script order in `index.html`.
- Do not call Firebase directly outside `js/analytics.js`.
- Do not add competing input or keyboard systems.
- Do not use `vw` / `vh` in screen CSS unless the task explicitly requires physical viewport behavior.
- Do not change deployment or Firebase injection as part of unrelated work.
- Do not delete or reorganize PRDs or untracked planning files unless explicitly asked.
- Do not treat Roku or tvOS as targets for this codebase. They are out of scope and will be parallel implementations in separate projects.
- Do not begin Phase 3 work inside `streaming-prototype/`. Phase 3 lives in `streaming-prototype-v2/`, which is scaffolded in Chunk P1 of the Phase 3 experience-completion PRD.

### Required implementation patterns (streaming-prototype/)

#### Analytics
Always use:

```js
trackEvent(eventName, params)
```

Every user-facing feature or materially changed flow should include analytics instrumentation.

#### Screen lifecycle
Each screen follows:

```js
{ id, init(params, container), onFocus(), onBlur(), destroy() }
```

Register input handlers in `onFocus()` and clear them in `onBlur()`.

#### Debug panel event ordering
The debug panel keydown listener runs in capture phase.
If it opens overlays, defer with:

```js
setTimeout(..., 0)
```

to avoid same-keydown conflicts.

### Safe agent workflow

1. Inspect the current code path first.
2. Check the relevant PRD in `docs/PRD/` before feature work. Use the Phase Roadmap in `CLAUDE.md` to identify the active PRD for the task.
3. Confirm which codebase the task belongs to — `streaming-prototype/` (Phase 1 + 2) or `streaming-prototype-v2/` (Phase 3, once scaffolded).
4. Make the smallest change that solves the task.
5. Preserve existing patterns unless the task requires a structural change.
6. Verify analytics, focus behavior, navigation, and scaling were not regressed.

### Definition of done

A task is not done unless:
- it works within the architecture of whichever codebase it belongs to (no-build for Phase 1/2, Vite+TS for Phase 3),
- changed behavior is instrumented where appropriate,
- script order and lifecycle assumptions still hold (Phase 1/2),
- device support obligations from `docs/SUPPORTED_DEVICES.md` are respected,
- unrelated systems were not modified without reason.

---
