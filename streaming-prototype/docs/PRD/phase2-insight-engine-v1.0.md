# PRD: Streaming TV Prototype Platform — Phase 2
## Insight Engine: Analytics, Feedback & Usability Testing

**Version:** 1.0  
**Status:** Not yet built — spec only  
**Prerequisite:** Phase 1 (core app) + Phase 1.5 (debug panel) must be stable before starting Phase 2.

---

## Roadmap Context

This is one of three phase PRDs for the Streaming TV Prototype Platform:

| Phase | File | Status |
|-------|------|--------|
| **Phase 1 + 1.5** | `docs/PRD/phase1-core-app-v1.5.md` | ✅ Built |
| **Phase 2 (this doc)** | `docs/PRD/phase2-insight-engine-v1.0.md` | ⏳ Not started |
| **Phase 3** | `docs/PRD/phase3-scenarios-and-simulation-v1.0.md` | ⏳ Not started |

Phase 2 transforms the prototype from a static demo into a remote usability testing platform. Colleagues sideload the app onto their TV devices, use it naturally, and behavioral data plus direct feedback flows back to you — no moderation required.

**Core principle:** Every new feature added to the app in the future MUST include analytics instrumentation as a mandatory requirement. The analytics layer is not an afterthought — it's foundational infrastructure that every screen and component hooks into.

---

## Analytics Event Architecture

All analytics flow through a single event bus. Every component in the app fires events through one function:

```javascript
Analytics.track(eventName, payload)
```

The analytics module handles storage, batching, and transmission. No component needs to know where the data goes — it just calls `track()`.

---

## Privacy & PII Policy

**No personally identifiable information (PII) is collected, stored, or transmitted at any point.** This is a hard requirement.

**What counts as PII (do NOT collect):**
- Real names, initials, or nicknames
- Email addresses
- IP addresses
- Device serial numbers or hardware identifiers
- Any identifier that could be linked back to a specific individual without a lookup table

**What IS collected (anonymous identifiers only):**
- `sessionId`: a random UUID generated fresh at each app launch. Cannot be linked to a person. Dies when the session ends.
- `participantId`: a short random code (e.g., "P-7X3K") generated at first launch and stored in localStorage. This lets you correlate sessions from the same device across time, but it cannot identify who is using the device. The participant chooses their own code or accepts the auto-generated one — they are explicitly told NOT to use their name or initials.
- `deviceType`: generic platform string ("firetv", "tizen", "roku", "browser") — no model numbers, no serial numbers, no MAC addresses.

**First-launch prompt:**
When the app first opens on a device that has no `participantId` in localStorage, show a simple overlay:

```
Welcome to the prototype testing program.

Your feedback is anonymous. You'll be assigned a random
participant code to help us group your sessions.

Your code: P-7X3K

[Accept]    [Generate New Code]
```

The participant can regenerate until they get a code they're happy with (purely cosmetic preference). They are NOT asked for their name. If you need to know which colleague has which code for follow-up, maintain a separate private mapping document outside the app (e.g., a spreadsheet in your personal notes: "P-7X3K = Sarah"). This mapping never enters the app or its data pipeline.

**Data transmission rules:**
- All analytics data stored locally on-device by default
- QR code export: the participant sees exactly what data is being shared before confirming — full transparency
- Firebase transport (if enabled): no PII in any payload. The Firebase project should have no authentication linked to real user accounts. Use anonymous Firebase auth if auth is needed for write access.
- No third-party analytics SDKs (no Google Analytics, no Mixpanel, no Amplitude). The analytics system is fully self-contained.

**Data retention:**
- Local storage: rolling buffer, capped at 50 sessions or 5MB
- Firebase (if used): define a retention policy (e.g., auto-delete after 90 days). Document this in your team's data handling practices.
- Export files: the person who downloads them is responsible for secure storage and deletion.

**Event schema — every event includes:**
```json
{
  "event": "focus_change",
  "timestamp": "2026-04-05T14:23:01.442Z",
  "sessionId": "a1b2c3d4-random-uuid",
  "participantId": "P-7X3K",
  "deviceType": "firetv",
  "screen": "lander",
  "config": {
    "landerVersion": "config-hash",
    "debugOverrides": {}
  },
  "payload": {
    ...event-specific data
  }
}
```

No field in any event, anywhere in the system, should ever contain a value that could identify a specific person. If a future feature needs to collect something that might be PII, flag it in the PRD for privacy review before building it.

---

## Phase 2A — Passive Analytics (Zero Friction)

The app silently collects behavioral data. No action required from the tester. These events are mandatory for all existing and future screens.

### Navigation Events

**`focus_change`** — fired every time focus moves
```json
{
  "payload": {
    "from": { "screen": "lander", "zone": "rail-3", "index": 2, "itemId": "show-005" },
    "to": { "screen": "lander", "zone": "rail-4", "index": 0, "itemId": "show-012" },
    "method": "dpad-down",
    "dwellTimeMs": 3200
  }
}
```
The `dwellTimeMs` on the `from` element tells you how long they sat on that item before moving. This is your most valuable metric — long dwell on a tile they don't select means interest but hesitation.

**`navigation`** — fired on screen transitions
```json
{
  "payload": {
    "from": "lander",
    "to": "series-pdp",
    "trigger": "tile-select",
    "itemId": "show-001",
    "sourceRail": "hero-carousel",
    "sourceIndex": 2
  }
}
```

**`scroll_depth`** — fired when the user scrolls past each rail
```json
{
  "payload": {
    "screen": "lander",
    "railsVisible": ["hero-carousel", "local-cities", "live-channels"],
    "maxDepthRail": "live-channels",
    "maxDepthIndex": 2,
    "totalRails": 9
  }
}
```

**`dead_end`** — fired when a d-pad press has no effect
```json
{
  "payload": {
    "screen": "lander",
    "zone": "genre-pills",
    "index": 0,
    "direction": "left",
    "note": "user pressed left at first item — possible confusion"
  }
}
```

### Engagement Events

**`tile_select`** — fired when OK is pressed on any tile
```json
{
  "payload": {
    "screen": "lander",
    "rail": "top-flix",
    "railIndex": 3,
    "tileIndex": 1,
    "itemId": "show-007",
    "itemTitle": "Ocean Patrol",
    "timeOnScreenMs": 45200,
    "tilesViewedInRail": 4
  }
}
```

**`rail_engagement`** — fired when focus leaves a rail (summary)
```json
{
  "payload": {
    "screen": "lander",
    "rail": "continue-watching",
    "railIndex": 1,
    "tilesViewed": 3,
    "totalTiles": 6,
    "dwellTimeMs": 8400,
    "selectedTile": null,
    "scrolledPastWithoutEngaging": false
  }
}
```

**`feature_interaction`** — fired for special behaviors
```json
{
  "payload": {
    "feature": "living-tile-cycle",
    "screen": "lander",
    "rail": "local-cities",
    "cyclesSeen": 3,
    "selectedDuringCycle": true,
    "selectedImageIndex": 1
  }
}
```

### Session Events

**`session_start`** — fired at app launch
```json
{
  "payload": {
    "deviceType": "firetv",
    "screenResolution": "1920x1080",
    "configVersion": "hash-of-lander-config",
    "returningParticipant": true,
    "previousSessionCount": 4
  }
}
```

**`session_end`** — fired at app exit or after 5 minutes of inactivity
```json
{
  "payload": {
    "durationMs": 342000,
    "screensVisited": ["lander", "series-pdp", "player"],
    "totalFocusChanges": 187,
    "totalSelections": 12,
    "railsScrolledPast": 4,
    "deepestScreen": "player"
  }
}
```

### Player-Specific Events

**`playback_start`** — when playback begins  
**`playback_pause`** — when user pauses (or controls appear)  
**`playback_scrub`** — when user seeks (with from/to positions)  
**`playback_complete`** — when content finishes or user exits  
**`controls_interaction`** — which player buttons are used and in what order

---

## Phase 2B — Active Feedback (Low Friction)

A feedback mechanism designed for TV — no keyboard typing required.

**Trigger:** Hold the OK button for 3 seconds (a subtle radial progress indicator appears around the current focused element to show the hold is registering). On release, the feedback overlay appears.

**Feedback Overlay:**
- Full-screen semi-transparent dark overlay
- Current state is captured automatically:
  - Which screen
  - Which element has focus
  - Scroll position
  - Current rail configuration
  - All debug panel values
  - Timestamp
  - Tester ID
- **Quick Reaction Row:** 5 emoji-style icons navigable by d-pad:
  - 😍 Love it
  - 👍 Good
  - 😐 Neutral
  - 😕 Confusing
  - 👎 Dislike
- **Optional Tag Selection:** After picking a reaction, a second row appears with context tags (multi-select, toggle with OK):
  - "Too slow" / "Too fast"
  - "Expected something different"
  - "Couldn't find what I wanted"
  - "Layout feels wrong"
  - "Love this feature"
  - "Text too small"
  - "Navigation confusing"
- **Confirm and dismiss:** Select "Send" button. A brief "Thanks!" toast appears and the overlay closes. Total interaction: ~5 seconds.

**Feedback data captured:**
```json
{
  "event": "user_feedback",
  "timestamp": "...",
  "participantId": "P-7X3K",
  "reaction": "confusing",
  "tags": ["navigation confusing", "expected something different"],
  "state": {
    "screen": "series-pdp",
    "focusedElement": "season-selector-pill-3",
    "scrollPosition": 420,
    "heroShowId": "show-001",
    "activeConfig": { ... }
  }
}
```

---

## Phase 2C — Structured Task Testing

Optional test mode for directed usability studies.

**Activation:** A flag in the debug panel or a URL parameter (`?testMode=find-documentary`). When active, the app shows a task card before the session begins.

**Task Card:**
- Full-screen overlay with the task description
- Example: "Find a documentary about ocean life and start watching it."
- "Begin" button starts the session and the clock
- Optional: multiple tasks in sequence

**During the task:**
- A subtle timer badge in the corner (can be hidden via config)
- All standard analytics fire as normal
- Additional tracking: optimal path calculation (how many steps *should* it take vs. how many it *did* take)

**Task completion:**
- Detected automatically (user reaches the target screen/action) OR manually (user presses a "Done" button)
- Post-task survey: 1-3 quick d-pad-navigable questions
  - "How easy was that?" (1-5 scale)
  - "Did you find what you expected?" (Yes / No / Partially)

**Task data captured:**
```json
{
  "event": "task_complete",
  "taskId": "find-documentary",
  "participantId": "P-7X3K",
  "completedSuccessfully": true,
  "durationMs": 28400,
  "optimalSteps": 4,
  "actualSteps": 11,
  "pathTaken": ["lander:hero-carousel", "lander:genre-pills", "lander:genre-pills:documentary", "lander:screamer-ocean", "lander:screamer-ocean:cta", "series-pdp:show-012", "player:show-012"],
  "postTaskRating": 3,
  "foundExpected": "partially"
}
```

---

## Phase 2D — Data Transport

How collected data gets from TV devices back to you.

**Layer 1 — Local Storage (always on, zero infrastructure)**
All events are stored in localStorage in a rolling buffer (cap at last 50 sessions or 5MB, whichever comes first). A "View Local Data" option in the debug panel shows raw event logs for the current device.

**Layer 2 — QR Code Export (no backend required)**
In the debug panel, a "Send Report" button generates a QR code on screen. The tester scans it with their phone — it opens a pre-filled Google Form (or a simple web form hosted on GitHub Pages) with the session data JSON attached. You receive an email or spreadsheet entry with their data.

**Layer 3 — Firebase Realtime Database (recommended for scale)**
If you set up a free Firebase project, the app can POST event batches to a Firebase endpoint periodically (every 30 seconds or on session end). Zero server management, generous free tier (1GB storage, 10GB transfer/month — more than enough for internal testing). All data flows into one place.

Configuration in the app:
```javascript
// === ANALYTICS TRANSPORT ===
const ANALYTICS_ENABLED = true;
const ANALYTICS_TRANSPORT = 'localStorage';  // 'localStorage' | 'firebase' | 'both'
const FIREBASE_URL = '';                      // set when ready
const ANALYTICS_BATCH_INTERVAL_MS = 30000;   // how often to flush to Firebase
const ANALYTICS_MAX_LOCAL_SESSIONS = 50;     // rolling buffer cap
```

---

## Phase 2E — Reporting Dashboard (`reporting.html`)

A standalone page that visualizes all collected analytics data. Hosted alongside the prototype on GitHub Pages.

**Data source:** Reads from Firebase if configured, otherwise from a manually uploaded JSON export file.

**Dashboard sections:**

**A — Session Overview**
- Total sessions, unique participants, average session duration
- Sessions by device type (FireTV, Roku, Tizen, etc.)
- Sessions over time (line chart)

**B — Navigation Heatmap**
- Visual representation of the lander showing which rails and tiles get the most focus time
- Color intensity = dwell time
- Click-through rate per rail (selections / focus events)

**C — Flow Diagram**
- Sankey or flow chart showing how users move through the app
- Most common paths highlighted
- Drop-off points identified (where do people leave?)

**D — Rail Performance Comparison**
- Bar chart: average dwell time per rail
- Bar chart: selection rate per rail
- Bar chart: scroll-past rate per rail (rails people skip)
- Table: rail-by-rail breakdown with all metrics

**E — Feedback Feed**
- Chronological list of all user feedback events
- Each entry shows: participant code, reaction emoji, tags, and a reconstructed view of what they were looking at (screen + focused element + state)
- Filterable by reaction type, screen, participant

**F — Task Results (if structured testing is used)**
- Task completion rates
- Average completion time vs. optimal time
- Path efficiency scores
- Per-participant breakdown

**G — A/B Comparison (future)**
- If two different lander configs are deployed, compare engagement metrics side by side
- "Config A (hero carousel first) vs. Config B (live channels first)"

---

## File Structure Additions

```
streaming-prototype/
├── ... (existing files from Phase 1/1.5)
├── reporting.html              # Analytics dashboard
├── js/
│   ├── analytics.js            # Event bus, storage, transport
│   ├── feedback.js             # Feedback overlay logic
│   ├── task-runner.js          # Structured task testing
│   └── reporting.js            # Dashboard visualization logic
├── css/
│   ├── feedback.css            # Feedback overlay styling
│   └── reporting.css           # Dashboard styling
└── data/
    └── tasks/                  # Task definitions for structured testing
        ├── find-documentary.json
        └── resume-watching.json
```

---

## Instrumentation Requirements for Future Features

**Every new screen or feature added to the prototype MUST include:**

1. **Analytics events defined in the PRD** — list every trackable interaction before building
2. **Feedback trigger support** — the hold-OK feedback mechanism must work on the new screen with accurate state capture
3. **Debug panel controls** — any configurable values must be added to the debug panel
4. **Reporting dashboard update** — new event types should be reflected in the dashboard

This ensures the analytics layer grows with the app rather than being retrofitted.

---

## Claude Code Build Prompt

```
Add the analytics and feedback system to the streaming prototype.
Read the Phase 2 PRD at docs/PRD/phase2-insight-engine-v1.0.md
for full specifications.

Build in this order:
1. Analytics event bus (Analytics.track) with localStorage storage.
   Instrument all existing screens — every focus change, navigation,
   tile selection, rail engagement, and session start/end.
2. Feedback overlay (hold OK for 3 seconds) with reaction picker
   and tag selector. Capture full app state with each feedback event.
3. QR code export in the debug panel for sending data without a backend.
4. Reporting dashboard (reporting.html) with session overview,
   navigation heatmap, rail performance comparison, and feedback feed.
5. Firebase transport (disabled by default, configurable via constant).

Make Analytics.track the single entry point for all telemetry. Every
component fires events through this one function. The analytics module
handles storage and transport — no component should know or care where
the data goes.
```
