# Phase 2 Bug Hunt Report
**Date:** 2026-04-07  
**Branch:** insights-engine-v1  
**Auditor:** Claude Code (Sonnet 4.6)  
**Scope:** Analytics, Feedback, Reporting, Privacy — all Phase 2 files

---

## Summary

| Severity | Count | Fixed | Remaining |
|----------|-------|-------|-----------|
| CRITICAL | 4 | 4 | 0 |
| HIGH | 6 | 0 | 6 |
| MEDIUM | 7 | 0 | 7 |
| LOW | 4 | 0 | 4 |

---

## CRITICAL Issues

---

### C1 — Full `navigator.userAgent` string sent as `deviceType` in `session_start`

**What's broken:**  
`lander.js` (line 59) and `feedback.js` (line 639) both pass the raw `navigator.userAgent` string as the `deviceType` field in `session_start` event payloads. A full user-agent string is quasi-PII — it can contain OS version, browser version, device model, and in some environments partial hardware identifiers. The PRD explicitly states `deviceType` must be a generic platform string like `"firetv"`, `"tizen"`, `"roku"`, or `"browser"`.

**PRD says:**  
> `deviceType`: generic platform string ("firetv", "tizen", "roku", "browser") — no model numbers, no serial numbers, no MAC addresses.

**What the correct value is:**  
`analytics.js` already has a proper `_detectDeviceType()` function that returns the correct generic string. Both `session_start` callers are simply ignoring it and passing `navigator.userAgent` directly.

**Fix:**  
Replace `deviceType: navigator.userAgent` with `deviceType: Analytics._detectDeviceType ? Analytics._detectDeviceType() : 'browser'`.  
However, `_detectDeviceType` is private. The cleanest fix is to expose it from the Analytics module OR have the callers call `navigator.userAgent` detection inline — but the right fix is to expose a public `getDeviceType()` method and use it in both callers.

**Bug or intentional?** Bug.

**FIXED — See commit fix(C1): replaced navigator.userAgent with Analytics.getDeviceType() in session_start callers; exposed getDeviceType() from analytics.js**

---

### C2 — `_captureCurrentState()` in feedback.js stores `participantId` inside the `state` object, which is then stored inside `Analytics.track('user_feedback', { ..., state: _capturedState })` — creating a nested duplicate of participantId inside the payload

**What's broken:**  
`feedback.js` line 248 sets `participantId: Analytics.getParticipantId()` inside the captured state object. When `_sendFeedback()` calls `Analytics.track('user_feedback', { reaction, tags, state: _capturedState })`, the resulting stored event has `participantId` at the top-level envelope (correct) AND again inside `payload.state.participantId`. While not technically extra PII (it's the same anonymous code), it's redundant, inconsistent with the schema, and creates a potential footgun if the state-capture is ever extended to collect more fields that could become PII.

More importantly, the `state` object also captures `focusedElement: focused?.className || 'none'` (line 245). A class name containing a show title, user-typed search term, or other content is low risk here but should be noted — see HIGH issues.

**PRD says:**  
Feedback data structure shows `state` capturing screen, focusedElement, scrollPosition, heroShowId, activeConfig — not a duplicate of participantId.

**Fix:**  
Remove `participantId` from `_captureCurrentState()` return value in `feedback.js`.

**FIXED — See commit fix(C2): removed participantId from capturedState in feedback.js**

---

### C3 — `session_start` fires twice on a first-visit session

**What's broken:**  
On a first visit, both code paths fire `session_start`:
1. `lander.js` line 58 fires `session_start` unconditionally when the lander initialises without a saved rail index (i.e., on every fresh page load).
2. `feedback.js` line 638 fires `session_start` in the `onComplete` callback of `showParticipantPrompt()` — which only fires on first visit.

On a returning participant's session: only lander.js fires it — correct.  
On a first-visit session: **both fire** — creating a duplicate `session_start` with inconsistent payload data. The second `session_start` (from feedback.js) has `returningParticipant: false` and `previousSessionCount: 0`, but lander.js already fired one with accurate values.

**PRD says:**  
`session_start` — fired at app launch (once per session).

**Fix:**  
Remove the `session_start` call from `feedback.js`'s `onComplete` callback. The lander.js instrumentation already handles this correctly. The participant ID will have been set by the time the lander's `session_start` fires only if the participant prompt resolves first — but the lander fires immediately on init. The real sequence issue is a HIGH problem (see H1). For now, removing the duplicate from feedback.js is the right fix.

**FIXED — See commit fix(C3): removed duplicate session_start from feedback.js onComplete callback**

---

### C4 — `ANALYTICS_ENABLED = true` is hardcoded; setting it to `false` in the source doesn't fully work because `analytics.js` auto-inits and calls `_pruneOldSessions()` and `init()` at module load time regardless

**What's broken:**  
The constant `ANALYTICS_ENABLED` is checked only inside `track()`. However, `init()` (which calls `_initSession()`, sets `localStorage.setItem('analytics_sessionId', ...)`, and increments `analytics_sessionCount`) and `_pruneOldSessions()` are called unconditionally at module load time (lines 283–284). If a developer sets `ANALYTICS_ENABLED = false` to disable analytics, the session counter still increments and session ID still writes to localStorage. This is a functional bug that undermines the disable switch.

**PRD says:**  
`ANALYTICS_ENABLED`: when false, nothing should be collected or stored.

**Fix:**  
Wrap the `init()` and `_pruneOldSessions()` auto-calls at the bottom of analytics.js in an `if (ANALYTICS_ENABLED)` guard.

**FIXED — See commit fix(C4): guarded analytics.js auto-init behind ANALYTICS_ENABLED check**

---

## HIGH Issues

*Not fixed — left for developer review.*

---

### H1 — Race condition: `session_start` fires before `participantId` is set on first visit

**What's broken:**  
On first visit, the execution order is:
1. `analytics.js` auto-inits (no participant ID yet)
2. `lander.js` `init()` runs, fires `session_start` immediately
3. `feedback.js` `DOMContentLoaded` fires, shows participant prompt after 800ms
4. User accepts participant ID

The `session_start` event fired in step 2 has `participantId: 'unknown'` because no participant ID has been set yet. This means the first session's `session_start` event will never be attributable to the correct participant code.

**PRD says:**  
`session_start` should have `participantId: "P-7X3K"` — a real participant code.

**Proposed fix:**  
Either: (a) delay `session_start` until after `FeedbackSystem.init()` resolves the participant prompt — difficult with current architecture; or (b) update the `participantId` field in the stored `session_start` event retroactively once the participant accepts their code. Option (b) is pragmatic: in `_acceptParticipantId`, after calling `Analytics.setParticipantId()`, scan stored events for the current session and patch any `participantId: 'unknown'` entries. The data is still anonymous — this is purely a data quality issue.

---

### H2 — QR export encodes raw event JSON as a `data:` URI, which is not scannable as a QR code at any practical size

**What's broken:**  
`feedback.js` line 509–510: the data URI is `data:text/plain;charset=utf-8,` + the URL-encoded JSON of up to 10 events. A single analytics event is typically 300–600 bytes of JSON. Even URL-encoded, 10 events will be 3,000–6,000+ characters. QR codes at correction level L top out at ~4,296 alphanumeric chars before becoming unreadably dense at 232×232px. The current code will frequently generate either an unreadable QR or silently fail.

**PRD says:**  
"QR code export: the participant sees exactly what data is being shared before confirming — full transparency." The intent is a scannable QR that lets the device owner send data.

**Proposed fix:**  
Options in order of preference:
1. Encode only a session summary (session ID, participant ID, total events count, key metrics) rather than raw events — keeps QR scannable and the full data can be exported via JSON download.
2. Use a URL shortener or a pre-configured Google Form URL with key metrics as query params.
3. Reduce to last 3 events and add a note that full data must be exported via the debug panel's JSON export.

At minimum: add a visible warning in the QR overlay if event count × avg size would likely exceed the QR capacity.

---

### H3 — `session_end` never fires on inactivity (5-minute timeout missing)

**What's broken:**  
The PRD specifies: "`session_end` — fired at app exit or after 5 minutes of inactivity." The only place `session_end` is fired is in `app.js` `back()` when the user presses BACK from the lander. There is no inactivity timer anywhere in the codebase.

**PRD says:**  
`session_end` fires after 5 minutes of inactivity.

**Proposed fix:**  
In `analytics.js`, add an inactivity timer:
```javascript
let _inactivityTimer = null;
const INACTIVITY_TIMEOUT_MS = 5 * 60 * 1000; // 5 minutes

function _resetInactivityTimer() {
  clearTimeout(_inactivityTimer);
  _inactivityTimer = setTimeout(() => {
    track('session_end', getSessionSummary());
  }, INACTIVITY_TIMEOUT_MS);
}
```
Call `_resetInactivityTimer()` inside `track()` on every event, and once during `init()`. Expose `_resetInactivityTimer` or wire it to a `resetInactivity()` public method that can also be called on raw keydown events.

---

### H4 — Player `BACK` key fires `playback_complete` but does NOT fire `session_end`

**What's broken:**  
`player.js` line 499–514: BACK from the player fires `playback_complete` (correct), then calls `this._hideControls()` and returns — it does NOT call `App.back()`. The `session_end` instrumentation lives in `app.js`'s `back()` function, which is only called when BACK is pressed from the lander (the top of the nav stack). Since the player hides controls on BACK rather than navigating back, a session that ends while the player is open will never fire `session_end` through the normal path.

**Proposed fix:**  
After `_hideControls()`, call `App.back()` to navigate back to the series PDP. Or if the intent is to stay in the player with hidden controls, add a second BACK from that state that calls `App.back()`. The current behavior may also be a UX bug — pressing BACK from the player doesn't actually go back.

---

### H5 — Feedback overlay `focusedElement` captures the full CSS class string, which can leak show ID context

**What's broken:**  
`feedback.js` line 245: `focusedElement: focused?.className || 'none'`. CSS class strings on tiles may include things like `hero-tile focused` — which is fine. But some tiles use `data-show-id` attributes and class names may be generated dynamically (e.g. `portrait-tile show-001 focused`). If a class name ever contains an identifier that can be linked back to a specific piece of content a specific user was viewing, combined with timing data, it could theoretically be used for re-identification in a small test group.

**Proposed fix:**  
Extract only the first non-generic class token: `focusedElement: focused?.dataset?.btnId || focused?.dataset?.zone || focused?.className?.split(' ')[0] || 'none'`. This gives useful debugging info (e.g. `episode-tile`, `hero-tile`, `pdp-btn`) without leaking the full class string.

---

### H6 — `scroll_depth` event payload is missing the `railsVisible` field required by the PRD schema

**What's broken:**  
`lander.js` line 226–233 fires `scroll_depth` with `{ screen, maxDepthRail, maxDepthIndex, totalRails }`. The PRD schema includes a `railsVisible` array: which rails are currently in the viewport. The implementation omits this field.

**PRD says:**
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

**Proposed fix:**  
Compute `railsVisible` by iterating `this._railModules` and checking which ones have their element within the current scroll viewport. Add it to the `scroll_depth` payload.

---

## MEDIUM Issues

*Not fixed — left for developer review.*

---

### M1 — `tile_select` `itemTitle` field is empty string on lander navigation

**What's broken:**  
`lander.js` line 248: `itemTitle: ''` — the title is always empty because the analytics state only stores the item ID, not the title. For the hero carousel, the item title is available as `items[prevIdx2]?.title` but isn't passed through.

**Impact:** Rail performance dashboard and tile_select analysis will have no title data for lander selections, making the reporting output harder to read.

**Proposed fix:**  
Add `itemTitle` to the analytics state object for each rail builder, populated from the item's title field at the time of focus. Pass it through to the `tile_select` payload.

---

### M2 — `dwellTimeMs` edge case: focus enters and immediately leaves a tile (e.g., auto-advance in hero carousel skips over a tile)

**What's broken:**  
When the hero carousel auto-advances, it calls `focusTile(focusedIdx, prev)` but does NOT fire a `focus_change` event — so dwell time for auto-advanced tiles is never recorded. The `focus_change` events are only fired on manual d-pad presses. Additionally, when a user barely touches a tile before moving (sub-millisecond dwell), `dwellTimeMs` can be 0 or negative if `Date.now()` is called before `_sessionStart` is properly set.

**Proposed fix:**  
Fire `focus_change` on auto-advance with `method: 'auto-advance'`. Add a `Math.max(0, ...)` guard on all `dwellTimeMs` calculations.

---

### M3 — `reporting.html` loads `Chart.js` from CDN — fails offline / on TV devices without internet

**What's broken:**  
`reporting.html` line 217: `<script src="https://cdn.jsdelivr.net/npm/chart.js@4/dist/chart.umd.min.js">`. The reporting dashboard is meant to be used when reviewing data, but if the reviewer is offline or the CDN is blocked, the charts silently don't render. The `reporting.js` code has a guard `if (typeof Chart === 'undefined')` but only logs a warning — the UI shows empty chart containers with no error message for the user.

**Proposed fix:**  
Add a user-visible fallback message in chart containers when Chart.js fails to load, or bundle Chart.js locally.

---

### M4 — `_store()` in analytics.js checks byte size AFTER pushing the new event, creating a potential for localStorage to briefly exceed 5MB

**What's broken:**  
`analytics.js` lines 175–191: the event is pushed to the array first, then the byte check runs, then old events are trimmed. Between the push and the trim, `localStorage.setItem()` is called with the oversized payload. If localStorage is nearly full (e.g., system or cross-origin quota), this could throw a QuotaExceededError before the trim runs. The `catch (e)` block only logs a warning — the event is silently lost.

**Proposed fix:**  
Check the size before pushing. If over limit, trim first, then push. Or: check for the `QuotaExceededError` name specifically and aggressively trim before retrying the write.

---

### M5 — `_pruneOldSessions()` doesn't enforce the 50-session cap when called after every page load — it only prunes if over 50 sessions, but `_store()` trims by bytes not by session count

**What's broken:**  
The PRD says: "rolling buffer, capped at 50 sessions or 5MB, whichever comes first." The byte cap is enforced in `_store()`. The session count cap is enforced in `_pruneOldSessions()`. But `_pruneOldSessions()` is only called once at module load, not after each event. If a participant has many short sessions, the byte limit may not be hit until well past 50 sessions.

**Proposed fix:**  
Call `_pruneOldSessions()` at the end of each `_store()` call, or check session count inside `_store()` as well.

---

### M6 — No `dead_end` events fired on series-pdp or player screens

**What's broken:**  
`dead_end` events are only instrumented in `lander.js` (hero-carousel and standard-rail left/right edges). The series-pdp and player screens have no `dead_end` instrumentation. Users pressing UP from the `buttons` zone, DOWN from the `more-info` zone on PDP, or DOWN from the `episodes` zone on the player will not fire any `dead_end` event.

**PRD says:**  
`dead_end` — fired when a d-pad press has no effect (should cover all screens).

---

### M7 — `reporting.js` auto-refresh polls every 30 seconds but only checks event count, not session count or participant count

**What's broken:**  
`reporting.js` line 651–657: `if (fresh.length !== _events.length)`. This means if events are cleared (the count goes down) OR if old events are trimmed from the buffer (count stays similar), the dashboard doesn't refresh. More importantly, if localStorage is being written by a different tab/window, a new session might add a session_start and session_end pair without changing the total event count in a detectable way.

**Proposed fix:**  
Compare total event count AND the latest event timestamp, or just refresh unconditionally every 30s since `_renderAll()` is cheap.

---

## LOW Issues

*Not fixed — left for developer review.*

---

### L1 — Phase 2C (Structured Task Testing) is entirely missing

**What's broken:**  
`task-runner.js` does not exist. The `data/tasks/` directory does not exist. The `?testMode=` URL parameter does nothing. The PRD specifies this as an optional feature ("Optional test mode") but it is listed in the file structure as a required deliverable.

**Classification:** LOW because the PRD marks it optional, but it was listed in the file structure spec.

---

### L2 — `feedback-overlay` CSS: `#feedback-overlay.visible` uses `display: flex` but the element starts as `display: none` via JavaScript — transition from `none` to `flex` doesn't animate opacity

**What's broken:**  
`feedback.css` lines 144–148: `.visible` sets `display: flex; opacity: 1`. The overlay starts with `display: none` (set by JS). Toggling `display` from `none` to `flex` via a class change is not animatable — the `opacity: 0 → 1` transition in `feedback.css` line 140 won't fire because display:none collapses the element before the transition can run.

The code works around this with a double-rAF trick (lines 307–309 in feedback.js), but this is fragile. The double-rAF forces a layout before the class toggle, which does typically work, but the CSS rule sets both `display:flex` and `opacity:1` together in `.visible` — so the transition from 0 to 1 may not fire correctly on all browsers/TV platforms.

**Proposed fix:**  
Set `display: flex` always, control visibility with `opacity` and `pointer-events: none` (when not visible).

---

### L3 — `reporting.html` is missing the import overlay CSS / doesn't apply `visible` class properly

**What's broken:**  
`reporting.html` has `<div id="import-overlay">` but the CSS in `reporting.css` uses `#import-overlay.visible` for display. On page load, `#import-overlay` has no initial `display:none` style in HTML or CSS — it renders at full opacity immediately before the JS hides it. Whether this is visible depends on browser rendering order.

**Proposed fix:**  
Add `style="display:none"` to `#import-overlay` in the HTML, and in the JS toggle `display` rather than `visible` class, or add a CSS initial hidden state.

---

### L4 — `css/reporting.css` is never linked from `index.html` (correct — it's only for `reporting.html`) but `feedback.css` is linked from `index.html` while `reporting.css` is linked from `reporting.html` — minor note, this is correct as-is

**What this is:**  
Not a bug. Confirming the CSS load order is intentional and correct. `feedback.css` is in the main app, `reporting.css` is in the standalone reporting dashboard. No action needed.

---

## Privacy Audit Summary

| Check | Result |
|-------|--------|
| No real names, emails in any event | PASS |
| participantId is random code format "P-XXXX" | PASS |
| First-launch prompt does NOT ask for name | PASS |
| No third-party analytics SDKs | PASS |
| Firebase disabled by default | PASS (FIREBASE_URL = '') |
| QR export shows participant what data is being shared | PARTIAL — shows count but encodes raw JSON that is likely too large to scan (H2) |
| No GA / Mixpanel / Amplitude | PASS |
| `deviceType` field contains only generic platform string | FAIL → FIXED (C1) |
| `participantId` not duplicated in nested state objects | FAIL → FIXED (C2) |
| `session_start.deviceType` uses navigator.userAgent | FAIL → FIXED (C1) |
| All event fields audited for PII | PASS after C1/C2 fixes. One note: `focusedElement` stores full CSS class string (H5 — recommended to tighten) |

---

## Architecture Notes

- Analytics IS the single entry point — no bypasses found. All screen files call `Analytics.track()` and nothing writes to localStorage directly.
- No third-party analytics scripts embedded.
- FocusEngine.disable/enable correctly called on overlay open/close in both feedback overlay and QR overlay.
- Memory leak check: `_overlayKeyHandler` is added/removed correctly in `_openOverlay`/`_closeOverlay`. `_qrKeyHandler` is added/removed correctly. Participant prompt `_keyHandler` is removed on accept. No obvious leaks found.
- Phase 1 functionality appears intact — `lander.js`, `series-pdp.js`, `player.js` routing untouched.
