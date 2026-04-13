# PRD: Firebase Analytics Integration
**Product:** Streaming Prototype  
**Phase:** 2 — Insight Engine  
**Version:** 1.1  
**Status:** Ready for Development  
**Author:** Product  
**Last Updated:** 2026-04-12

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

### 3.1 Security Approach — GitHub Actions Secret Injection (Recommended)

The Firebase config contains a client-side API key that must **not** be committed to the repository in plaintext. The chosen approach is environment variable injection at build/deploy time via GitHub Actions secrets, combined with domain restriction in GCP Console. This is the most secure posture available without a server.

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

3. A GitHub Actions deploy workflow generates the file at deploy time using repository secrets:

```yaml
# .github/workflows/deploy.yml
- name: Generate Firebase config
  run: |
    cat > js/firebase-config.js << EOF
    export const firebaseConfig = {
      apiKey: "${{ secrets.FIREBASE_API_KEY }}",
      authDomain: "${{ secrets.FIREBASE_AUTH_DOMAIN }}",
      projectId: "${{ secrets.FIREBASE_PROJECT_ID }}",
      storageBucket: "${{ secrets.FIREBASE_STORAGE_BUCKET }}",
      messagingSenderId: "${{ secrets.FIREBASE_MESSAGING_SENDER_ID }}",
      appId: "${{ secrets.FIREBASE_APP_ID }}",
      measurementId: "${{ secrets.FIREBASE_MEASUREMENT_ID }}"
    };
    EOF
```

4. Restrict the API key in GCP Console → Credentials → HTTP referrers to `chesteria.github.io/*` so it cannot be used from any other origin even if exposed.

**For local development:** Create `js/firebase-config.js` manually from a local `.env` file (also gitignored). The repo should include a `firebase-config.example.js` with placeholder values so contributors know the expected shape.

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

export { analytics, logEvent, setUserProperties };
```

### 4.2 Event Bus Integration

Firebase is registered as a transport subscriber at initialization. Screen-level code calls only `trackEvent()` and is never coupled to Firebase directly.

```
[Screen Action]
     │
     ▼
[trackEvent(name, params)]   ← single call site in all screen JS
     │
     ├──► [Local event log / Debug Panel]
     │
     └──► [Firebase: logEvent(name, params)]   ← transport plug-in
```

### 4.3 Participant Session Initialization

At the start of every research session, the facilitator enters an anonymous participant code (e.g., `P-7X3K`) via the Debug Panel or session init screen. This code is:

- Stored in `sessionStorage` (cleared on tab close, never persisted to `localStorage`)
- Attached as a parameter to every Firebase event as `participant_id`
- Set as a Firebase user property so events can be filtered by participant in the console

```javascript
// Called once at session start
export function initSession(participantCode) {
  sessionStorage.setItem('participant_id', participantCode);
  sessionStorage.setItem('session_start_ts', Date.now().toString());
  setUserProperties(analytics, { participant_id: participantCode });
}
```

> **Privacy rule:** If no participant code is set, events fire with `participant_id: "UNSET"` — never with browser fingerprint data, IP, or device ID. No brand, product, or organization name is ever written to an event parameter.

---

## 5. Event Taxonomy

All events follow Firebase's recommended naming convention: `snake_case`, max 40 characters.

### 5.1 Standard Parameters (attached to every event)

| Parameter | Type | Description | Example |
|---|---|---|---|
| `participant_id` | string | Anonymous session code | `P-7X3K` |
| `screen_name` | string | Active screen at time of event | `lander`, `pdp`, `player` |
| `device_profile` | string | Simulated device from Debug Panel | `roku_express`, `samsung_tizen` |
| `scenario_preset` | string | Active scenario if set | `xumo_target`, `stress_test`, `none` |
| `session_timestamp` | number | Unix ms timestamp of session start | `1744483200000` |

### 5.2 Navigation Events

| Event Name | Trigger | Additional Parameters |
|---|---|---|
| `screen_view` | User lands on any screen | `previous_screen` |
| `rail_focus` | D-pad focus enters a content rail | `rail_id`, `rail_position` |
| `card_focus` | D-pad focus lands on a content card | `card_id`, `card_title`, `rail_id`, `card_position` |
| `card_select` | User presses OK/Select on a card | `card_id`, `card_title`, `destination_screen` |
| `nav_back` | User presses Back | `from_screen`, `to_screen` |
| `nav_exit` | User reaches exit boundary | `from_screen` |

### 5.3 Content Interaction Events

| Event Name | Trigger | Additional Parameters |
|---|---|---|
| `pdp_view` | Series PDP loads | `series_id`, `series_title` |
| `pdp_episode_focus` | Focus moves to an episode in the episode list | `episode_id`, `episode_number`, `season_number` |
| `pdp_episode_select` | User selects an episode to play | `episode_id`, `episode_number` |
| `pdp_trailer_select` | User selects trailer | `series_id` |
| `my_mix_rail_view` | My Mix rail is visible in viewport | `content_count` |
| `my_mix_card_focus` | Focus lands on a My Mix card | `card_id`, `card_type` |

### 5.4 Player Events

| Event Name | Trigger | Additional Parameters |
|---|---|---|
| `video_start` | Playback begins | `content_id`, `content_type` (`episode`/`trailer`/`clip`), `content_title` |
| `video_pause` | User pauses | `content_id`, `elapsed_seconds` |
| `video_resume` | User resumes from pause | `content_id`, `elapsed_seconds` |
| `video_seek` | User fast-forwards or rewinds | `content_id`, `direction` (`forward`/`back`), `elapsed_seconds` |
| `video_complete` | Playback reaches end | `content_id`, `total_duration_seconds` |
| `video_exit` | User exits player before completion | `content_id`, `elapsed_seconds`, `total_duration_seconds`, `percent_watched` |
| `player_error` | Player encounters an error state | `content_id`, `error_code` |

### 5.5 Feedback & Research Events

| Event Name | Trigger | Additional Parameters |
|---|---|---|
| `feedback_triggered` | Hold-OK gesture activates feedback overlay | `screen_name`, `content_id` (if applicable) |
| `feedback_submitted` | User submits active feedback | `feedback_type`, `rating` (if applicable), `screen_name` |
| `feedback_dismissed` | User dismisses feedback without submitting | `screen_name` |
| `task_start` | Facilitator starts a structured task | `task_id`, `task_name` |
| `task_complete` | User completes a structured task | `task_id`, `completion_time_seconds` |
| `task_abandon` | User cannot complete task | `task_id`, `abandon_reason` |

### 5.6 Session & Configuration Events

| Event Name | Trigger | Additional Parameters |
|---|---|---|
| `session_start` | Participant code is entered and session initialized | `participant_id`, `device_profile` |
| `session_end` | Facilitator clicks "End Session" or tab is closed/hidden | `participant_id`, `session_duration_seconds`, `total_events_fired`, `screens_visited` |
| `debug_panel_open` | Debug panel is opened | — |
| `config_changed` | Any debug panel setting is changed | `config_key`, `config_value` |
| `scenario_applied` | A scenario preset is activated | `scenario_id`, `scenario_name` |
| `device_profile_changed` | Device simulation profile is switched | `new_profile`, `previous_profile` |

#### `session_end` Implementation Note

`session_end` must fire reliably even when the tab is closed. Use the `visibilitychange` event, which fires before `beforeunload` and is more reliable across browsers:

```javascript
// In analytics.js
function fireSessionEnd() {
  const startTs = parseInt(sessionStorage.getItem('session_start_ts') || '0');
  const durationSeconds = startTs ? Math.round((Date.now() - startTs) / 1000) : 0;

  trackEvent('session_end', {
    session_duration_seconds: durationSeconds,
    total_events_fired: parseInt(sessionStorage.getItem('event_count') || '0'),
    screens_visited: sessionStorage.getItem('screens_visited') || 'unknown'
  });
}

document.addEventListener('visibilitychange', () => {
  if (document.visibilityState === 'hidden') fireSessionEnd();
});
```

> Firebase Analytics uses `navigator.sendBeacon()` internally for queued events on page unload, so events fired via `logEvent()` just before unload should transmit successfully. No custom beacon implementation is required unless testing reveals drop-off.

---

## 6. Implementation Requirements

### 6.1 File Structure Changes

```
/js/
  analytics.js               ← NEW: Firebase init + trackEvent() + event bus
  firebase-config.js         ← NEW: gitignored, generated by GitHub Actions
  firebase-config.example.js ← NEW: placeholder shape for local dev reference
  lander.js                  ← MODIFIED: import trackEvent, add event calls
  pdp.js                     ← MODIFIED: import trackEvent, add event calls
  player.js                  ← MODIFIED: import trackEvent, add event calls
  debug-panel.js             ← MODIFIED: session init, config_changed events

reporting.html               ← ENHANCED: local session dashboard
.gitignore                   ← MODIFIED: add firebase-config.js
.github/workflows/
  deploy.yml                 ← NEW: secret injection + GitHub Pages deploy
```

### 6.2 `trackEvent()` Wrapper (Required Pattern)

All screens use this single function. Direct calls to `logEvent()` are not permitted outside of `analytics.js`. The wrapper also maintains an event counter and screen visit log used by `session_end`.

```javascript
export function trackEvent(eventName, params = {}) {
  const participantId = sessionStorage.getItem('participant_id') || 'UNSET';
  const deviceProfile = sessionStorage.getItem('device_profile') || 'none';
  const scenarioPreset = sessionStorage.getItem('scenario_preset') || 'none';
  const screenName = sessionStorage.getItem('current_screen') || 'unknown';

  const enrichedParams = {
    participant_id: participantId,
    screen_name: screenName,
    device_profile: deviceProfile,
    scenario_preset: scenarioPreset,
    session_timestamp: parseInt(sessionStorage.getItem('session_start_ts') || '0'),
    ...params
  };

  logEvent(analytics, eventName, enrichedParams);

  // Increment event counter for session_end
  const count = parseInt(sessionStorage.getItem('event_count') || '0');
  sessionStorage.setItem('event_count', (count + 1).toString());

  // Dispatch to Debug Panel and reporting.html local log
  window.dispatchEvent(new CustomEvent('analytics_event', {
    detail: { eventName, params: enrichedParams, ts: Date.now() }
  }));
}
```

### 6.3 `type="module"` Requirement

Because Firebase uses ES module imports, all script tags importing from `analytics.js` must use `type="module"`. This is a breaking change — all existing `<script src="...">` tags for files that import analytics must be updated.

```html
<script type="module" src="/js/lander.js"></script>
```

---

## 7. Reporting Strategy

Reporting operates across two layers that complement each other: Firebase's default out-of-the-box console tooling for persistent cloud data, and the local `reporting.html` for in-session facilitation and quick exports.

### 7.1 Firebase Console — Default Tooling

Firebase Analytics provides useful reports immediately after events begin flowing, with no custom configuration required. Use these as the primary post-session cloud data source:

| Firebase Console Section | What It Shows | Useful For |
|---|---|---|
| **Events** | All custom events with occurrence counts | Confirming instrumentation and event volume |
| **DebugView** | Real-time event stream | Validating events during build |
| **Realtime** | Live user count and top active events | Monitoring during a live research session |
| **User Properties** | Breakdown by `participant_id`, `device_profile` | Segmenting data by participant or device |
| **Funnels** | Conversion paths between defined steps | Measuring task completion flows |
| **Explorations** | Free-form drag-and-drop analysis | Ad hoc research questions post-session |

**One-time console setup (manual, performed once):**

1. Confirm Google Analytics is linked to `streaming-prototype-uta`
2. Create an audience filter: `participant_id != "UNSET"` → label it **Research Sessions** to exclude developer testing noise
3. Set data retention to 14 months (Analytics → Settings)
4. Register key custom events to enable custom dimension filtering
5. Restrict API key in GCP Console → Credentials → HTTP referrers: `chesteria.github.io/*`

### 7.2 `reporting.html` — Local Session Dashboard

`reporting.html` is the facilitator-facing reporting view: a lightweight, self-contained page that reads from the local event stream (via `sessionStorage` and the `analytics_event` CustomEvent) and presents an in-session summary without requiring Firebase Console access.

#### Session Summary Panel
- Participant code, session start time, elapsed duration (live clock)
- Total events fired, screens visited (ordered breadcrumb list)
- Current device profile and active scenario

#### Live Event Log
- Scrollable feed of last 50 events
- Columns: timestamp, event name, key parameters
- Color-coded by category:
  - Navigation → blue
  - Player → green
  - Feedback → orange
  - Session/config → gray
- Auto-scroll to latest with a "Pause scroll" toggle for in-session review

#### Per-Screen Event Breakdown
- Tab or accordion per screen visited (`lander`, `pdp`, `player`)
- Event counts and key interactions per screen

#### Export Controls
- **"Export Session JSON"** — downloads full event log as `session_P-XXXX_[timestamp].json`
- **"Copy Event Log"** — copies last N events as formatted JSON to clipboard
- **"Export CSV"** — flat CSV for spreadsheet import

#### Firebase Console Deep Link
- Direct link to Firebase Console Realtime view for the active project, so facilitators can jump to cloud data in one click

---

## 8. Debug Panel Integration

The Debug Panel (`debug.html`) surfaces a live event tail for confirming instrumentation is firing correctly during builds and sessions.

**Requirements:**
- Display last 20 events in a scrollable panel
- Show: event name, key params, timestamp
- Color-coded by category (same scheme as `reporting.html`)
- "Copy Event Log" button exports last N events as JSON to clipboard
- Session init form: participant code input + "Start Session" button → calls `initSession()`
- "End Session" button → fires `session_end`, clears `sessionStorage`

---

## 9. Privacy & Security Requirements

| Requirement | Implementation |
|---|---|
| No PII in events | Enforced by `trackEvent()` — only anonymous `participant_id` is attached |
| No brand or product names in events | No product name, platform name, or org identifier appears in any event name, parameter key, or value |
| No device fingerprinting | `device_profile` comes from Debug Panel selection, not browser detection |
| Session-scoped storage | All session data in `sessionStorage`, never `localStorage` |
| API key not in repo | Gitignored; injected at deploy time via GitHub Actions secrets |
| API key domain restriction | Restricted to `chesteria.github.io/*` in GCP Console |
| No Firebase Auth | `getAuth()` is never imported or used in this phase |
| Participant code format | Codes follow `P-XXXX` format — generated by facilitator, never auto-generated from browser data |

---

## 10. Testing & Validation

### 10.1 Firebase DebugView

Enable real-time event streaming during development using the Firebase Analytics Debugger Chrome extension, or by setting the debug flag in the browser console:

```javascript
// In browser console during local dev only — never in production code
localStorage.setItem('firebase:analytics:debug', 'true');
```

### 10.2 Acceptance Criteria

| Scenario | Expected Result |
|---|---|
| Session started with code `P-7X3K` | All subsequent events include `participant_id: "P-7X3K"` |
| User focuses on a content card | `card_focus` fires with `card_id`, `rail_id`, `card_position` |
| User starts video | `video_start` fires; `video_exit` fires with `percent_watched` on player exit |
| User seeks forward | `video_seek` fires with `direction: "forward"` and current `elapsed_seconds` |
| Device profile changed to `roku_express` | All subsequent events include `device_profile: "roku_express"` |
| Tab is closed or hidden | `session_end` fires with `session_duration_seconds` and `total_events_fired` |
| Debug Panel event log | Last event visible within 500ms of firing |
| No participant code set | Events fire with `participant_id: "UNSET"`, never null or undefined |
| Firebase DebugView | Events appear within ~5 seconds during dev testing |
| `firebase-config.js` in repo | File does not exist; generated only by GitHub Actions |
| Brand audit | Zero occurrences of any product or org name in any event name, parameter key, or value |

---

## 11. Phasing & Dependencies

| Item | Dependency | Phase |
|---|---|---|
| GitHub Actions deploy workflow + secrets | None | 2.0 |
| Firebase config module (generated) | Deploy workflow | 2.0 |
| `analytics.js` + `trackEvent()` | Firebase config | 2.0 |
| Lander instrumentation | `analytics.js` complete | 2.0 |
| PDP instrumentation | Lander validated | 2.0 |
| Player instrumentation | PDP validated | 2.0 |
| Debug Panel session init + event log | All screen instrumentation | 2.0 |
| `reporting.html` local dashboard | Debug Panel complete | 2.0 |
| Firebase Console one-time setup | First events flowing | 2.0 |
| Feedback events | Feedback overlay UI | 2.1 |
| Task events | Structured task framework | 2.1 |
| Scenario / device events | Debug Panel Phase 1.5 complete | 2.1 |

---

## 12. Resolved Decisions

| # | Question | Decision |
|---|---|---|
| 1 | API key security approach | **GitHub Actions secret injection + GCP domain restriction.** Key is gitignored, generated at deploy time, and restricted to `chesteria.github.io/*`. |
| 2 | Reporting format | **Firebase default console tooling as cloud layer; `reporting.html` as local facilitator dashboard** with live event log, per-screen breakdown, and JSON/CSV export. |
| 3 | `video_seek` parameters | **`direction` + `elapsed_seconds` only.** Absolute seek position is not tracked. |
| 4 | `session_end` event | **Yes, included.** Fires on `visibilitychange` (hidden) and on explicit "End Session" button. Includes `session_duration_seconds`, `total_events_fired`, and `screens_visited`. |
