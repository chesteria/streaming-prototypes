# PRD: Firebase Analytics Integration
**Product:** Streaming Prototype  
**Phase:** 2 — Insight Engine  
**Version:** 1.2  
**Status:** Ready for Development  
**Author:** Product  
**Last Updated:** 2026-04-12
**Feature Slug** firebase-integration

---

## Changelog

| Version | Changes |
|---|---|
| 1.0 | Initial draft |
| 1.1 | Removed brand references; resolved 4 open decisions (security, reporting, seek params, session_end) |
| 1.2 | Technical review pass — 10 issues resolved. See Section 13 for full audit log. |

---

## 1. Overview

This document defines the requirements for integrating Firebase Analytics into the streaming prototype. The integration enables anonymous behavioral event collection across all prototype screens, providing structured data for user research sessions, stakeholder reporting, and design validation — without requiring user accounts or collecting personally identifiable information.

The Firebase project (`streaming-prototype-uta`) has been provisioned. This PRD specifies how to connect the existing analytics event bus (Phase 2 architecture) to Firebase as its primary transport layer, and how to surface collected data through both Firebase's default console tooling and a local `reporting.html` dashboard.

> **Brand policy:** This prototype is a brand-free experience. No product names, platform names, or organization identifiers appear in the UI, in event parameters, or in any analytics data.

---

## 2. Goals & Non-Goals

### Goals
- Send structured analytics events from all prototype screens to Firebase in real time
- Maintain the privacy-first design: all events are keyed to anonymous participant codes (format: `P-XXXX`), never names or device IDs
- Integrate cleanly with the existing event bus architecture so Firebase is a transport plug-in, not a rewrite
- Keep the Firebase API key out of the repository using GitHub Actions secret injection
- Enable downstream reporting via Firebase's default console tooling and the local `reporting.html` dashboard

### Non-Goals
- Firebase Authentication (deferred to a future auth phase)
- Firestore or Realtime Database (this phase is Analytics-only)
- A/B testing or Remote Config
- Push notifications
- Any event collection that could fingerprint or identify individual users
- Any brand or product name appearing in event data

---

## 3. Firebase Project Configuration

### 3.1 Security Approach — GitHub Actions Secret Injection

The Firebase config contains a client-side API key that must **not** be committed to the repository in plaintext. The chosen approach is environment variable injection at build/deploy time via GitHub Actions secrets, combined with domain restriction in GCP Console.

**How it works:**

1. Store each config value as a GitHub Actions secret (`Settings → Secrets → Actions`):

| Secret Name | Value |
|---|---|
| `FIREBASE_API_KEY` | `AIzaSyC6z3KDDbADeYpccER0-s5rhH1kBbMHwGI` |
| `FIREBASE_AUTH_DOMAIN` | `streaming-prototype-uta.firebaseapp.com` |
| `FIREBASE_PROJECT_ID` | `streaming-prototype-uta` |
| `FIREBASE_STORAGE_BUCKET` | `streaming-prototype-uta.firebasestorage.app` |
| `FIREBASE_MESSAGING_SENDER_ID` | `87440384508` |
| `FIREBASE_APP_ID` | `1:87440384508:web:ccfb6a778294f9a1a71279` |
| `FIREBASE_MEASUREMENT_ID` | `G-RS1QHW5BKD` |

2. Add `firebase-config.js` to `.gitignore` so it is never committed.

3. The GitHub Actions workflow passes secrets as **environment variables** into the step, then generates the config file using `envsubst`. This approach avoids the heredoc terminator indentation bug and prevents special characters in secret values from corrupting the output:

```yaml
# .github/workflows/deploy.yml
- name: Generate Firebase config
  env:
    FIREBASE_API_KEY: ${{ secrets.FIREBASE_API_KEY }}
    FIREBASE_AUTH_DOMAIN: ${{ secrets.FIREBASE_AUTH_DOMAIN }}
    FIREBASE_PROJECT_ID: ${{ secrets.FIREBASE_PROJECT_ID }}
    FIREBASE_STORAGE_BUCKET: ${{ secrets.FIREBASE_STORAGE_BUCKET }}
    FIREBASE_MESSAGING_SENDER_ID: ${{ secrets.FIREBASE_MESSAGING_SENDER_ID }}
    FIREBASE_APP_ID: ${{ secrets.FIREBASE_APP_ID }}
    FIREBASE_MEASUREMENT_ID: ${{ secrets.FIREBASE_MEASUREMENT_ID }}
  run: |
    cat firebase-config.template.js | envsubst > js/firebase-config.js
```

4. The template file (`firebase-config.template.js`) is committed to the repo and uses `$VAR` shell-style placeholders:

```javascript
// firebase-config.template.js  ← committed to repo
export const firebaseConfig = {
  apiKey: "$FIREBASE_API_KEY",
  authDomain: "$FIREBASE_AUTH_DOMAIN",
  projectId: "$FIREBASE_PROJECT_ID",
  storageBucket: "$FIREBASE_STORAGE_BUCKET",
  messagingSenderId: "$FIREBASE_MESSAGING_SENDER_ID",
  appId: "$FIREBASE_APP_ID",
  measurementId: "$FIREBASE_MEASUREMENT_ID"
};
```

> `envsubst` is available by default on GitHub-hosted Ubuntu runners. This pattern is safe against secret values containing `$`, `\`, quotes, or any shell-special characters, because substitution is performed by `envsubst`, not the shell.

5. Restrict the API key in GCP Console → Credentials → HTTP referrers to `chesteria.github.io/*` so it cannot be used from any other origin even if exposed.

**For local development:** Copy `firebase-config.template.js` to `js/firebase-config.js` and replace placeholder values manually. That file is gitignored and never committed.

---

## 4. Architecture

### 4.1 SDK Import Strategy

The prototype uses vanilla HTML/CSS/JS with no build toolchain. Firebase is loaded via CDN ES module imports.

```javascript
// /js/analytics.js — central analytics module
import { initializeApp } from "https://www.gstatic.com/firebasejs/12.12.0/firebase-app.js";
import { getAnalytics, logEvent, setUserProperties } from "https://www.gstatic.com/firebasejs/12.12.0/firebase-analytics.js";
import { firebaseConfig } from "./firebase-config.js";

const app = initializeApp(firebaseConfig);
const analytics = getAnalytics(app);

// logEvent and setUserProperties are intentionally NOT re-exported.
// All external callers must use trackEvent() and initSession() only.
```

### 4.2 Event Bus Integration

Firebase is registered as a transport subscriber at initialization. Screen-level code calls only `trackEvent()` — never Firebase directly. A `BroadcastChannel` named `proto_analytics` relays events cross-tab so `reporting.html` can operate in a separate window.

```
[Screen Action]
     │
     ▼
[trackEvent(name, params)]   ← single call site in all screen JS
     │
     ├──► [Firebase: logEvent(name, params)]
     │
     ├──► [BroadcastChannel: proto_analytics]  ← cross-tab relay
     │         │
     │         └──► [reporting.html in separate tab]
     │
     └──► [window CustomEvent: analytics_event]  ← same-tab Debug Panel
```

### 4.3 Participant Session Initialization

At the start of every research session, the facilitator enters an anonymous participant code (e.g., `P-7X3K`) via the Debug Panel. This code is:

- Stored in `sessionStorage` (cleared on tab close, never persisted to `localStorage`)
- Attached as a parameter to every Firebase event as `participant_id`
- Set as a Firebase user property via `setUserProperties()` for console segmentation

```javascript
// Called once at session start — the only function that touches setUserProperties
export function initSession(participantCode, deviceProfile = 'none') {
  sessionStorage.setItem('participant_id', participantCode);
  sessionStorage.setItem('session_start_ts', Date.now().toString());
  sessionStorage.setItem('event_count', '0');
  sessionStorage.setItem('screens_visited', '');
  sessionStorage.setItem('device_profile', deviceProfile);
  setUserProperties(analytics, { participant_id: participantCode });
  trackEvent('proto_session_start', { device_profile: deviceProfile });
}
```

> **User property reporting delay:** `setUserProperties()` sets participant_id as a Firebase user property, but user properties take up to 24 hours to become filterable in the Firebase Console. For same-day session analysis, always filter on the `participant_id` **event parameter** using Firebase Explorations — not on the user property dimension.

> **Privacy rule:** If no participant code is set, events fire with `participant_id: "UNSET"` — never with browser fingerprint data, IP, or device ID. No brand, product, or organization name is written to any event parameter.

---

## 5. Firebase SDK Limits (Reference)

All event design must respect these hard limits enforced by the Firebase Analytics SDK:

| Constraint | Limit |
|---|---|
| Event name length | 40 characters max |
| Parameter name length | 40 characters max |
| Parameter string value length | **100 characters max** |
| Custom parameters per event | 25 max |
| User properties | 25 max |

> **`screens_visited` implication:** This parameter is a comma-separated list of screen names appended as the session progresses. It is capped at the first **5 unique screens visited** to stay well within the 100-character string limit. Format: `lander,pdp,player` (no spaces).

---

## 6. Event Taxonomy

All custom events use a `proto_` prefix where the unprefixed name is reserved or auto-collected by Firebase (see Section 13, Issue 1). All event names follow `snake_case` convention and stay within the 40-character limit.

### 6.1 Standard Parameters (attached to every event)

| Parameter | Type | Description | Example |
|---|---|---|---|
| `participant_id` | string | Anonymous session code | `P-7X3K` |
| `proto_screen` | string | Active screen at time of event | `lander`, `pdp`, `player` |
| `device_profile` | string | Simulated device from Debug Panel | `roku_express`, `samsung_tizen` |
| `scenario_preset` | string | Active scenario if set | `xumo_target`, `stress_test`, `none` |
| `session_timestamp` | number | Unix ms timestamp of session start | `1744483200000` |

> `proto_screen` replaces `screen_name` to avoid collision with Firebase's own `screen_name` parameter used on its auto-collected `screen_view` event (see Section 13, Issue 2).

### 6.2 Navigation Events

| Event Name | Trigger | Additional Parameters |
|---|---|---|
| `proto_screen_view` | User lands on any screen | `previous_screen` |
| `rail_focus` | D-pad focus enters a content rail | `rail_id`, `rail_position` |
| `card_focus` | D-pad focus lands on a content card | `card_id`, `card_title`, `rail_id`, `card_position` |
| `card_select` | User presses OK/Select on a card | `card_id`, `card_title`, `destination_screen` |
| `nav_back` | User presses Back | `from_screen`, `to_screen` |
| `nav_exit` | User reaches exit boundary | `from_screen` |

### 6.3 Content Interaction Events

| Event Name | Trigger | Additional Parameters |
|---|---|---|
| `pdp_view` | Series PDP loads | `series_id`, `series_title` |
| `pdp_episode_focus` | Focus moves to an episode in the episode list | `episode_id`, `episode_number`, `season_number` |
| `pdp_episode_select` | User selects an episode to play | `episode_id`, `episode_number` |
| `pdp_trailer_select` | User selects trailer | `series_id` |
| `my_mix_rail_view` | My Mix rail is visible in viewport | `content_count` |
| `my_mix_card_focus` | Focus lands on a My Mix card | `card_id`, `card_type` |

### 6.4 Player Events

| Event Name | Trigger | Additional Parameters |
|---|---|---|
| `proto_video_start` | Playback begins | `content_id`, `content_type` (`episode`/`trailer`/`clip`), `content_title` |
| `video_pause` | User pauses | `content_id`, `elapsed_seconds` |
| `video_resume` | User resumes from pause | `content_id`, `elapsed_seconds` |
| `video_seek` | User fast-forwards or rewinds | `content_id`, `direction` (`forward`/`back`), `elapsed_seconds` |
| `proto_video_complete` | Playback reaches end | `content_id`, `total_duration_seconds` |
| `video_exit` | User exits player before completion | `content_id`, `elapsed_seconds`, `total_duration_seconds`, `percent_watched` |
| `player_error` | Player encounters an error state | `content_id`, `error_code` |

### 6.5 Feedback & Research Events

| Event Name | Trigger | Additional Parameters |
|---|---|---|
| `feedback_triggered` | Hold-OK gesture activates feedback overlay | `content_id` (if applicable) |
| `feedback_submitted` | User submits active feedback | `feedback_type`, `rating` (if applicable) |
| `feedback_dismissed` | User dismisses feedback without submitting | — |
| `task_start` | Facilitator starts a structured task | `task_id`, `task_name` |
| `task_complete` | User completes a structured task | `task_id`, `completion_time_seconds` |
| `task_abandon` | User cannot complete task | `task_id`, `abandon_reason` |

> `proto_screen` is already attached to every event via standard params and is not listed again as an additional parameter here.

### 6.6 Session & Configuration Events

| Event Name | Trigger | Additional Parameters |
|---|---|---|
| `proto_session_start` | Participant code is entered and session initialized | `participant_id`, `device_profile` |
| `proto_session_end` | "End Session" button clicked or page unloads | `participant_id`, `session_duration_seconds`, `total_events_fired`, `screens_visited` |
| `debug_panel_open` | Debug panel is opened | — |
| `config_changed` | Any debug panel setting is changed | `config_key`, `config_value` |
| `scenario_applied` | A scenario preset is activated | `scenario_id`, `scenario_name` |
| `device_profile_changed` | Device simulation profile is switched | `new_profile`, `previous_profile` |

#### `proto_session_end` — Implementation

`proto_session_end` fires from two paths only: an explicit "End Session" button click, and the `beforeunload` event. A `sessionEndFired` boolean guard prevents double-firing if both trigger in the same lifecycle (e.g., button click followed immediately by tab close).

`visibilitychange` is **not** used for this purpose. It fires on every tab switch, which would prematurely end the session any time the facilitator alt-tabs.

```javascript
// In analytics.js
let sessionEndFired = false;

function fireSessionEnd() {
  if (sessionEndFired) return;
  sessionEndFired = true;

  const startTs = parseInt(sessionStorage.getItem('session_start_ts') || '0');
  const durationSeconds = startTs ? Math.round((Date.now() - startTs) / 1000) : 0;

  trackEvent('proto_session_end', {
    session_duration_seconds: durationSeconds,
    total_events_fired: parseInt(sessionStorage.getItem('event_count') || '0'),
    screens_visited: sessionStorage.getItem('screens_visited') || 'none'
  });
}

// Path 1: page/tab close
window.addEventListener('beforeunload', fireSessionEnd);

// Path 2: explicit facilitator action — "End Session" button calls this directly
export function endSession() {
  fireSessionEnd();
  sessionStorage.clear();
  sessionEndFired = false; // reset so a new session can start in the same tab
}
```

> **Why `beforeunload` and not `visibilitychange`?** `visibilitychange → hidden` fires every time the user switches browser tabs, backgrounding the app, or the OS sleep-locks the screen — all of which would fire `session_end` repeatedly during a normal research session. `beforeunload` fires only on actual page close or navigation away.

---

## 7. Implementation Requirements

### 7.1 File Structure Changes

```
/js/
  analytics.js               ← NEW: Firebase init + trackEvent() + BroadcastChannel
  firebase-config.js         ← NEW: gitignored, generated by GitHub Actions
  firebase-config.example.js ← NEW: placeholder shape for local dev reference
  lander.js                  ← MODIFIED: import trackEvent, add event calls
  pdp.js                     ← MODIFIED: import trackEvent, add event calls
  player.js                  ← MODIFIED: import trackEvent, add event calls
  debug-panel.js             ← MODIFIED: session init, config_changed events

firebase-config.template.js  ← NEW: committed to repo; $VAR placeholders for envsubst
reporting.html               ← ENHANCED: cross-tab session dashboard via BroadcastChannel
.gitignore                   ← MODIFIED: add firebase-config.js
.github/workflows/
  deploy.yml                 ← NEW: secret injection + GitHub Pages deploy
```

### 7.2 `trackEvent()` Wrapper (Required Pattern)

All screens use this single function. `logEvent()` and `setUserProperties()` are **not exported** from `analytics.js` — they are internal implementation details only.

The wrapper maintains the event counter and `screens_visited` list that `proto_session_end` depends on.

```javascript
// /js/analytics.js
const channel = new BroadcastChannel('proto_analytics');

export function trackEvent(eventName, params = {}) {
  const participantId = sessionStorage.getItem('participant_id') || 'UNSET';
  const deviceProfile  = sessionStorage.getItem('device_profile')  || 'none';
  const scenarioPreset = sessionStorage.getItem('scenario_preset') || 'none';
  const protoScreen    = sessionStorage.getItem('current_screen')  || 'unknown';

  // Maintain screens_visited (capped at 5 unique values, 100-char limit safe)
  const currentVisited = sessionStorage.getItem('screens_visited') || '';
  const visitedList = currentVisited ? currentVisited.split(',') : [];
  if (protoScreen !== 'unknown' && !visitedList.includes(protoScreen)) {
    if (visitedList.length < 5) visitedList.push(protoScreen);
    sessionStorage.setItem('screens_visited', visitedList.join(','));
  }

  // Standard params — cannot be overridden by caller
  const enrichedParams = {
    ...params,                            // caller params first (lower priority)
    participant_id:    participantId,     // then standard params overwrite any collision
    proto_screen:      protoScreen,
    device_profile:    deviceProfile,
    scenario_preset:   scenarioPreset,
    session_timestamp: parseInt(sessionStorage.getItem('session_start_ts') || '0')
  };

  // Firebase transport
  logEvent(analytics, eventName, enrichedParams);

  // Increment event counter
  const count = parseInt(sessionStorage.getItem('event_count') || '0');
  sessionStorage.setItem('event_count', (count + 1).toString());

  const payload = { eventName, params: enrichedParams, ts: Date.now() };

  // Cross-tab relay (reporting.html in separate window)
  channel.postMessage(payload);

  // Same-tab relay (Debug Panel)
  window.dispatchEvent(new CustomEvent('analytics_event', { detail: payload }));
}
```

> **Standard param write-order:** caller params are spread first, then standard params overwrite. This prevents any caller from accidentally overriding `participant_id`, `proto_screen`, or other protected fields.

### 7.3 `reporting.html` Cross-Tab Subscription

`reporting.html` subscribes to `BroadcastChannel('proto_analytics')` rather than listening to `sessionStorage` or same-tab `CustomEvent`. This works correctly when `reporting.html` is open in a separate tab or window, which is the expected facilitator workflow.

```javascript
// In reporting.html <script type="module">
const channel = new BroadcastChannel('proto_analytics');

channel.onmessage = (event) => {
  const { eventName, params, ts } = event.data;
  appendToEventLog(eventName, params, ts);
  updateSessionSummary(params);
};
```

> **BroadcastChannel scope:** Works across all tabs and windows sharing the same origin (`chesteria.github.io`). Does not persist across sessions — `reporting.html` only receives events fired after it is opened. Facilitators should open `reporting.html` before starting a session.

### 7.4 `type="module"` Requirement

Because Firebase uses ES module imports, all script tags importing from `analytics.js` must use `type="module"`. This is a breaking change — all existing `<script src="...">` tags for files that import analytics must be updated.

```html
<script type="module" src="/js/lander.js"></script>
```

---

## 8. Reporting Strategy

### 8.1 Firebase Console — Default Tooling

Firebase Analytics provides useful reports immediately after events begin flowing, with no custom configuration required:

| Firebase Console Section | What It Shows | Useful For |
|---|---|---|
| **Events** | All custom events with occurrence counts | Confirming instrumentation and event volume |
| **DebugView** | Real-time event stream | Validating events during build |
| **Realtime** | Live user count and top active events | Monitoring during a live research session |
| **User Properties** | Breakdown by `participant_id` user property | Cross-session participant segmentation (24h delay — see note below) |
| **Funnels** | Conversion paths between defined steps | Measuring task completion flows |
| **Explorations** | Free-form drag-and-drop analysis | Same-day participant filtering; ad hoc queries |

> **Same-day analysis:** User property filtering has a ~24-hour propagation delay. For same-day session analysis, use **Explorations** and filter on the `participant_id` **event parameter** (not the user property dimension).

**One-time console setup (manual, performed once):**

1. Confirm Google Analytics is linked to `streaming-prototype-uta`
2. Create an audience filter: `participant_id != "UNSET"` → label it **Research Sessions** to exclude developer testing noise
3. Set data retention to 14 months (Analytics → Settings)
4. Register key custom events to enable custom dimension filtering
5. Confirm API key is restricted to `chesteria.github.io/*` in GCP Console

### 8.2 `reporting.html` — Local Session Dashboard

`reporting.html` is the facilitator-facing reporting view. It subscribes to the `proto_analytics` BroadcastChannel and presents an in-session summary without requiring Firebase Console access. It should be opened in a second tab or window before starting a session.

#### Session Summary Panel
- Participant code, session start time, elapsed duration (live clock)
- Total events fired, screens visited (ordered breadcrumb list, max 5)
- Current device profile and active scenario

#### Live Event Log
- Scrollable feed of last 50 events
- Columns: timestamp, event name, key parameters
- Color-coded by category:
  - Navigation → blue
  - Player → green
  - Feedback → orange
  - Session/config → gray
- Auto-scroll to latest with a "Pause scroll" toggle

#### Per-Screen Event Breakdown
- Tab or accordion per screen visited (`lander`, `pdp`, `player`)
- Event counts and key interactions per screen

#### Export Controls
- **"Export Session JSON"** — downloads full event log as `session_P-XXXX_[timestamp].json`
- **"Copy Event Log"** — copies last N events as formatted JSON to clipboard
- **"Export CSV"** — flat CSV for spreadsheet import

#### Firebase Console Deep Link
- Direct link to Firebase Console Explorations view, pre-filtered where possible

---

## 9. Debug Panel Integration

The Debug Panel (`debug.html`) surfaces a same-tab live event tail via the `analytics_event` CustomEvent. It does not use BroadcastChannel — it is always co-located with the prototype in the same tab.

**Requirements:**
- Display last 20 events in a scrollable panel
- Show: event name, key params, timestamp
- Color-coded by category (same scheme as `reporting.html`)
- "Copy Event Log" button exports last N events as JSON to clipboard
- Session init form: participant code input + device profile selector + "Start Session" button → calls `initSession()`
- "End Session" button → calls `endSession()` (fires `proto_session_end`, clears `sessionStorage`)

---

## 10. Privacy & Security Requirements

| Requirement | Implementation |
|---|---|
| No PII in events | Enforced by `trackEvent()` — only anonymous `participant_id` is attached |
| No brand or product names in events | No product name, platform name, or org identifier in any event name, parameter key, or value |
| No device fingerprinting | `device_profile` comes from Debug Panel selection, not browser detection |
| Standard params cannot be overridden | Caller params spread first; standard params overwrite in `enrichedParams` construction |
| Session-scoped storage | All session data in `sessionStorage`, never `localStorage` |
| API key not in repo | Gitignored; generated at deploy time via `envsubst` + GitHub Actions secrets |
| API key domain restriction | Restricted to `chesteria.github.io/*` in GCP Console |
| No Firebase Auth | `getAuth()` is never imported or used in this phase |
| Participant code format | Codes follow `P-XXXX` format — generated by facilitator, never auto-generated from browser data |

---

## 11. Testing & Validation

### 11.1 Firebase DebugView

Enable real-time event streaming during development using the Firebase Analytics Debugger Chrome extension, or by setting the debug flag in the browser console:

```javascript
// In browser console during local dev only
// Clear this before any research session: localStorage.removeItem('firebase:analytics:debug')
localStorage.setItem('firebase:analytics:debug', 'true');
```

> This flag persists in `localStorage` across page loads. Remember to remove it before conducting a research session to avoid polluting Firebase DebugView with dev noise.

### 11.2 Acceptance Criteria

| Scenario | Expected Result |
|---|---|
| Session started with code `P-7X3K` | All subsequent events include `participant_id: "P-7X3K"` |
| User focuses on a content card | `card_focus` fires with `card_id`, `rail_id`, `card_position` |
| User starts video | `proto_video_start` fires; `video_exit` fires with `percent_watched` on player exit |
| User seeks forward | `video_seek` fires with `direction: "forward"` and current `elapsed_seconds` |
| Device profile changed to `roku_express` | All subsequent events include `device_profile: "roku_express"` |
| Facilitator alt-tabs during session | `proto_session_end` does NOT fire |
| "End Session" button clicked | `proto_session_end` fires once with `session_duration_seconds` and `screens_visited` |
| Tab is closed after "End Session" clicked | `proto_session_end` fires exactly once (guard prevents double-fire) |
| Tab is closed without clicking "End Session" | `proto_session_end` fires via `beforeunload` |
| `reporting.html` open in separate tab | Receives all events in real time via BroadcastChannel |
| `reporting.html` opened after session starts | Only receives events fired after it was opened |
| No participant code set | Events fire with `participant_id: "UNSET"`, never null or undefined |
| Firebase DebugView | Events appear within ~5 seconds during dev testing |
| Event with caller `participant_id` param | Standard param overwrites caller value — cannot be spoofed |
| `firebase-config.js` in repo | File does not exist; template committed, config generated only by GitHub Actions |
| Brand audit | Zero occurrences of any product or org name in any event name, parameter key, or value |

---

## 12. Phasing & Dependencies

| Item | Dependency | Phase |
|---|---|---|
| GitHub Actions deploy workflow + secrets | None | 2.0 |
| `firebase-config.template.js` committed | None | 2.0 |
| Firebase config module (generated) | Deploy workflow | 2.0 |
| `analytics.js` + `trackEvent()` + BroadcastChannel | Firebase config | 2.0 |
| Lander instrumentation | `analytics.js` complete | 2.0 |
| PDP instrumentation | Lander validated | 2.0 |
| Player instrumentation | PDP validated | 2.0 |
| Debug Panel session init + event log | All screen instrumentation | 2.0 |
| `reporting.html` cross-tab dashboard | `analytics.js` BroadcastChannel complete | 2.0 |
| Firebase Console one-time setup | First events flowing | 2.0 |
| Feedback events | Feedback overlay UI | 2.1 |
| Task events | Structured task framework | 2.1 |
| Scenario / device events | Debug Panel Phase 1.5 complete | 2.1 |

---

## 13. Technical Audit Log (v1.1 → v1.2)

The following issues were identified and resolved during technical review. All changes are incorporated in the sections above.

| # | Severity | Issue | Resolution |
|---|---|---|---|
| 1 | Critical | **Reserved event names:** `screen_view`, `session_start`, `video_start`, `video_complete` are reserved or auto-collected by Firebase. Custom events with these names cause schema collisions in the Firebase Console. | Renamed to `proto_screen_view`, `proto_session_start`, `proto_session_end`, `proto_video_start`, `proto_video_complete`. All other event names unaffected. |
| 2 | Critical | **Reserved parameter name:** `screen_name` is used by Firebase's own auto-collected `screen_view` event. Reusing it as a standard custom parameter creates ambiguity in Explorations. | Renamed to `proto_screen` throughout. |
| 3 | Critical | **`reporting.html` cross-tab isolation:** `sessionStorage` is tab-scoped and `CustomEvent` on `window` does not cross tab boundaries. A facilitator opening `reporting.html` in a second tab would receive zero events. | Added `BroadcastChannel('proto_analytics')` as the cross-tab relay. `trackEvent()` posts to the channel; `reporting.html` subscribes. Same-tab Debug Panel retains the `CustomEvent` path. |
| 4 | Critical | **`visibilitychange` fires on every tab switch:** Using `visibilitychange → hidden` to trigger `proto_session_end` caused it to fire every time the facilitator switched away from the prototype tab — potentially dozens of times per session. | Replaced with `beforeunload` (fires only on actual page close/navigation) plus an explicit "End Session" button. |
| 5 | Critical | **`screens_visited` never populated:** `proto_session_end` included `screens_visited` as a parameter and `fireSessionEnd()` read it from `sessionStorage`, but no code in the spec ever wrote to it. Dead parameter. | Added deduplication + append logic inside `trackEvent()`. Capped at 5 unique screens to respect the 100-char string parameter limit. |
| 6 | Important | **Encapsulation break:** `analytics.js` exported `logEvent` and `setUserProperties` directly, while Section 6.2 stated that direct calls to `logEvent()` outside `analytics.js` are prohibited. The rule was unenforceable as written. | Removed both from exports. Only `trackEvent` and `initSession`/`endSession` are exported. |
| 7 | Important | **GitHub Actions heredoc bug:** Secrets injected directly into a bash heredoc body are subject to shell expansion — secret values containing `$`, `\`, or quotes can corrupt the output file. Additionally, the heredoc terminator placement in a YAML `run:` block requires careful alignment. | Switched to `envsubst` pattern: secrets are passed as step environment variables, and `envsubst` performs substitution on a committed template file, safely handling all special characters. |
| 8 | Important | **Firebase User Property 24-hour delay:** `setUserProperties()` sets `participant_id` as a user property, but Firebase takes ~24 hours to make user properties filterable in the console. This makes same-day participant filtering impossible through the standard User Properties view. | Documented the delay prominently in Section 4.3. Directed facilitators to filter on the `participant_id` event parameter in Explorations for same-day queries. |
| 9 | Minor | **Redundant `screen_name` in feedback events:** `feedback_triggered`, `feedback_submitted`, and `feedback_dismissed` listed `screen_name` as an additional parameter despite it being present on every event via standard params. | Removed from those event rows. The `proto_screen` standard param covers it. |
| 10 | Minor | **Firebase parameter limits not documented:** The 100-character string value limit and 25-parameter-per-event cap were unspecified. `screens_visited` as an uncapped growing string would exceed the limit in any multi-screen session. | Added Section 5 (Firebase SDK Limits). Capped `screens_visited` at 5 unique entries. |

---

## 14. Resolved Decisions

| # | Question | Decision |
|---|---|---|
| 1 | API key security approach | **GitHub Actions secret injection via `envsubst` + GCP domain restriction.** Key is gitignored, generated at deploy time from a committed template, and restricted to `chesteria.github.io/*`. |
| 2 | Reporting format | **Firebase default console tooling as cloud layer; `reporting.html` as local facilitator dashboard** with BroadcastChannel cross-tab support, live event log, per-screen breakdown, and JSON/CSV export. |
| 3 | `video_seek` parameters | **`direction` + `elapsed_seconds` only.** Absolute seek position is not tracked. |
| 4 | `session_end` event | **Yes, included as `proto_session_end`.** Fires on `beforeunload` and explicit "End Session" button. Guarded against double-firing. Includes `session_duration_seconds`, `total_events_fired`, and `screens_visited` (capped at 5 screens). |


## 15. Retroactive Docs Update Prompt

```
The [feature-slug] feature has been built and verified. Update the
following platform-level documents to reflect it. Check each one —
if it doesn't exist yet, create it.

docs/COMPONENT_MAP.md
  — Add any new components introduced. For each: name, screen(s),
    file(s), states supported, analytics events emitted.
  — Update any existing components that were modified.

docs/ANALYTICS_REGISTRY.md
  — Add a row for every new event instrumented in this feature:
    event name | screen | trigger | payload fields | feature slug.

docs/SCREEN_INVENTORY.md
  — Update state coverage for any screen this feature touched.
  — Note any new navigation entry points added.

docs/NAVIGATION_MAP.md
  — Update if this feature added or changed any d-pad focus paths.

docs/DEPENDENCY_GRAPH.md
  — Add this feature's dependencies on existing modules.
  — Note any new shared modules introduced.

docs/KNOWN_ISSUES.md
  — Add any open (unresolved) bugs from the bug hunt log,
    with: issue ID, feature slug, description, severity, suggested fix.

CHANGELOG.md (project root)
  — Append an entry: feature name, date, branch, what was added,
    events instrumented, known issues, and reference to the feature folder.
```

---