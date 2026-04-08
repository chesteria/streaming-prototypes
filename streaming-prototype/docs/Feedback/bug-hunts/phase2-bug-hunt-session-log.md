# Phase 2 Bug Hunt — Session Log
**Date:** 2026-04-07  
**Branch:** insights-engine-v1  
**Auditor:** Claude Code (Sonnet 4.6)

---

## Issue Counts

| Severity | Total Found | Fixed This Session | Remaining for Review |
|----------|-------------|-------------------|----------------------|
| CRITICAL | 4 | 4 | 0 |
| HIGH | 6 | 0 | 6 |
| MEDIUM | 7 | 0 | 7 |
| LOW | 4 | 0 | 4 |
| **TOTAL** | **21** | **4** | **17** |

---

## CRITICAL Issues Fixed

| ID | Commit | Description |
|----|--------|-------------|
| C1 | `5986332` | Replaced `navigator.userAgent` with `Analytics.getDeviceType()` in both `session_start` callers (lander.js, feedback.js). Exposed `_detectDeviceType` as public `getDeviceType()` from analytics.js. |
| C2 | `b0d2f60` | Removed `participantId` from `_captureCurrentState()` in feedback.js. It was duplicated in `payload.state` — already present in the top-level event envelope. |
| C3 | `cfb6ca2` | Removed duplicate `session_start` from feedback.js `onComplete` callback. On first visit, both lander.js and feedback.js were firing `session_start`, creating conflicting data. |
| C4 | `0cf0c56` | Guarded `init()` and `_pruneOldSessions()` behind `ANALYTICS_ENABLED` check. Previously, setting `ANALYTICS_ENABLED=false` still wrote to localStorage on module load. |

---

## Verify These in the Morning

Priority checklist for the next session — review in this order:

**Privacy / Data Quality (review immediately):**
- [ ] **H1** — `session_start` fires with `participantId: 'unknown'` on first visit (race condition: lander fires before participant prompt resolves). Consider retroactive patch in `_acceptParticipantId`. Check by opening app fresh with localStorage cleared and inspecting the first `session_start` event.
- [ ] **H5** — `focusedElement` stores full CSS class string in feedback state. Low PII risk but worth tightening. Review `_captureCurrentState()` in feedback.js.

**Functional (breaks real use):**
- [ ] **H2** — QR export generates a QR from a `data:` URI of up to 10 JSON events. Very likely too large to scan at 232×232px. Test by opening the debug panel → "Send Report (QR)" and actually trying to scan the result with a phone. Almost certainly produces an unreadable QR.
- [ ] **H3** — 5-minute inactivity `session_end` is completely missing. Sessions that time out will never have a `session_end` event. This means the reporting dashboard's average duration calculation will fall back to timestamp diff (which works but is imprecise). Add an inactivity timer to `analytics.js`.
- [ ] **H4** — BACK from the player hides controls but does NOT navigate back to series-pdp. First BACK: hides controls. Second BACK: navigates. The `session_end` call in `app.js` `back()` requires actually reaching the lander — so player exits may never trigger `session_end`. Verify the intended UX for BACK from player.
- [ ] **H6** — `scroll_depth` event missing `railsVisible` array. Minor for reporting but listed in the PRD schema.

**Data Quality:**
- [ ] **M1** — `tile_select.itemTitle` is always empty string on lander selections. Makes rail performance data hard to read.
- [ ] **M2** — `dwellTimeMs` not recorded for auto-advanced hero carousel tiles. Missing dwell data for one of the most important engagement signals.
- [ ] **M5** — Session count cap (50 sessions) not enforced on every write — only at module load.

**Dashboard:**
- [ ] **M3** — `reporting.html` Chart.js loads from CDN. Test offline. No user-visible fallback when CDN fails.
- [ ] **M4** — localStorage write in `_store()` can hit QuotaExceededError between push and trim. Test with a nearly-full localStorage.
- [ ] **L3** — `#import-overlay` in reporting.html may flash visible on page load before JS hides it.

**Missing Features:**
- [ ] **L1** — Phase 2C (Structured Task Testing / task-runner.js) not built. Decide: defer to Phase 3 or build now?
- [ ] **M6** — `dead_end` events not instrumented on series-pdp or player.
- [ ] **M7** — Reporting auto-refresh checks event count only; misses count-neutral changes.

---

## Uncertainties / Things I Was Unsure About

1. **H1 race condition fix approach:** The cleanest fix is retroactive patching of the `session_start` event's `participantId` once the participant accepts their code. I chose not to auto-fix this because it requires a careful implementation of "find and patch stored events" which touches data integrity and felt riskier than the scope of a CRITICAL auto-fix. The current behavior (first session has `participantId: 'unknown'`) is a data quality issue, not a privacy issue — the code is correct, just imprecise.

2. **H4 Player BACK behavior:** I classified this HIGH but was uncertain whether the "two BACK presses to exit player" behavior was intentional (first BACK dismisses controls, second BACK exits). The comment in the code says `// Track playback_complete (exit)` which suggests BACK should exit — but `App.back()` is not called. I didn't auto-fix this because it's a UX decision, not a clear bug.

3. **H2 QR capacity:** I know QR codes at correction level L can hold ~4,296 alphanumeric characters, but the actual URL-encoded JSON size depends on content. It's possible that with very small events, 10 events would fit. I flagged it HIGH because in practice with typical event payloads it will overflow, but I couldn't test this at runtime.

4. **C3 / H1 interaction:** After fixing C3 (removing the feedback.js `session_start`), the first session's `session_start` now ONLY comes from lander.js — and that fires before the participant prompt resolves. This means C3's fix makes H1 worse in one sense (no fallback `session_start` after participant ID is set), but it was the right fix because the fallback was creating duplicates and also had bad data. H1 needs a proper architectural fix.

---

## New Issues Potentially Introduced by Fixes

- **C3 fix impact:** Removing the feedback.js `session_start` means the only `session_start` event is the one from lander.js, which fires with `participantId: 'unknown'` on first visit (H1). This was already happening before the fix — the feedback.js `session_start` fired AFTER, creating a duplicate. The net effect: one `session_start` with `'unknown'` instead of two (one with `'unknown'`, one with the real code). This is a marginal improvement. **H1 must still be fixed separately.**

- **C4 fix impact:** `getSessionSummary()`, `isFirstVisit()`, `getParticipantId()`, `getEvents()`, and `sessionId` getter all depend on internal state that is only initialized by `init()`. If `ANALYTICS_ENABLED=false` and any code calls these methods, they will return `null`/empty/undefined values rather than throwing. This is the correct behavior (graceful degradation) but should be verified if `ANALYTICS_ENABLED` is ever set to false.

---

## Files Changed This Session

| File | Changes |
|------|---------|
| `js/analytics.js` | Exposed `getDeviceType()` public method; guarded auto-init behind `ANALYTICS_ENABLED` |
| `js/screens/lander.js` | Fixed `session_start` deviceType to use `Analytics.getDeviceType()` |
| `js/feedback.js` | Fixed `session_start` deviceType; removed `participantId` from capturedState; removed duplicate `session_start` |
| `docs/phase2-bug-hunt-report.md` | Created (this report) |
| `docs/phase2-bug-hunt-session-log.md` | Created (this log) |
