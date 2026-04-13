/* ============================================================
   ANALYTICS — Firebase transport + BroadcastChannel relay
   Phase 2 — Insight Engine
   ============================================================ */

// BroadcastChannel for cross-tab relay to reporting.html
const _channel = new BroadcastChannel('proto_analytics');

// Firebase transport — set by _initFirebase() below; noop until initialized
let _logEvent        = () => {};
let _setUserProperties = () => {};

// One-time session-end guard (prevents double-fire on button click + beforeunload)
let _sessionEndFired = false;

// ---- Firebase initialization ------------------------------------------------
// Two init paths:
//   1. Synchronous via require() — Jest/Node test environment (require is defined)
//   2. Async CDN dynamic import  — Browser / production
// The dual approach lets the test suite assert on Firebase calls without async
// timing issues, while keeping CDN loading for the real browser build.

(function _initFirebase() {
  // Path 1: synchronous — Jest transforms dynamic import() to require(), and
  // typeof require is defined. Trying this first keeps tests fully synchronous.
  if (typeof require !== 'undefined') {
    try {
      const { firebaseConfig }     = require('./firebase-config.js');
      const { initializeApp }      = require('https://www.gstatic.com/firebasejs/12.12.0/firebase-app.js');
      const { getAnalytics, logEvent, setUserProperties }
                                   = require('https://www.gstatic.com/firebasejs/12.12.0/firebase-analytics.js');
      const app       = initializeApp(firebaseConfig);
      const analytics = getAnalytics(app);
      _logEvent          = (name, params) => logEvent(analytics, name, params);
      _setUserProperties = (props)        => setUserProperties(analytics, props);
      return; // sync init succeeded — skip async path
    } catch (e) {
      // firebase-config.js absent or require unavailable — fall through to async
    }
  }

  // Path 2: async CDN import — browser / production
  (async () => {
    try {
      const { firebaseConfig }          = await import('./firebase-config.js');
      const { initializeApp }           = await import('https://www.gstatic.com/firebasejs/12.12.0/firebase-app.js');
      const { getAnalytics, logEvent, setUserProperties }
                                         = await import('https://www.gstatic.com/firebasejs/12.12.0/firebase-analytics.js');
      const app       = initializeApp(firebaseConfig);
      const analytics = getAnalytics(app);
      _logEvent          = (name, params) => logEvent(analytics, name, params);
      _setUserProperties = (props)        => setUserProperties(analytics, props);
      console.log('[Analytics] Firebase initialized');
    } catch (e) {
      console.warn('[Analytics] Firebase not available — events will relay locally only:', e.message);
    }
  })();
})();

// ---- Core ----------------------------------------------------------------

/**
 * trackEvent(name, params)
 * The single call site for all screen JS. logEvent() and setUserProperties()
 * are internal — they are NOT re-exported.
 */
export function trackEvent(eventName, params = {}) {
  try {
    const participantId  = sessionStorage.getItem('participant_id')   || 'UNSET';
    const deviceProfile  = sessionStorage.getItem('device_profile')   || 'none';
    const scenarioPreset = sessionStorage.getItem('scenario_preset')  || 'none';
    const protoScreen    = sessionStorage.getItem('current_screen')   || 'unknown';

    // Maintain screens_visited — capped at 5 unique values to respect 100-char limit
    const raw         = sessionStorage.getItem('screens_visited') || '';
    const visited     = raw ? raw.split(',') : [];
    if (protoScreen !== 'unknown' && !visited.includes(protoScreen)) {
      if (visited.length < 5) visited.push(protoScreen);
      sessionStorage.setItem('screens_visited', visited.join(','));
    }

    // Caller params spread first; standard params overwrite — prevents spoofing
    const enrichedParams = {
      ...params,
      participant_id:    participantId,
      proto_screen:      protoScreen,
      device_profile:    deviceProfile,
      scenario_preset:   scenarioPreset,
      session_timestamp: parseInt(sessionStorage.getItem('session_start_ts') || '0'),
    };

    // Firebase transport
    _logEvent(eventName, enrichedParams);

    // Increment event counter
    const count = parseInt(sessionStorage.getItem('event_count') || '0');
    sessionStorage.setItem('event_count', (count + 1).toString());

    const payload = { eventName, params: enrichedParams, ts: Date.now() };

    // Cross-tab relay → reporting.html in a separate window
    _channel.postMessage(payload);

    // Same-tab relay → Debug Panel event log
    window.dispatchEvent(new CustomEvent('analytics_event', { detail: payload }));

  } catch (err) {
    // Never throw — analytics must never break the app
    console.warn('[Analytics] trackEvent() failed silently:', err);
  }
}

// ---- Session lifecycle ---------------------------------------------------

/**
 * initSession(participantCode, deviceProfile)
 * Called once at the start of each research session from the Debug Panel.
 */
export function initSession(participantCode, deviceProfile = 'none') {
  sessionStorage.setItem('participant_id',   participantCode);
  sessionStorage.setItem('session_start_ts', Date.now().toString());
  sessionStorage.setItem('event_count',      '0');
  sessionStorage.setItem('screens_visited',  '');
  sessionStorage.setItem('device_profile',   deviceProfile);
  _sessionEndFired = false; // allow a new session after a previous endSession()
  _setUserProperties({ participant_id: participantCode });
  trackEvent('proto_session_start', { participant_id: participantCode, device_profile: deviceProfile });
}

/**
 * endSession()
 * Called by the "End Session" button in the Debug Panel.
 * Also fires from beforeunload as a safety net.
 * Double-fire is prevented by _sessionEndFired guard.
 * Guard is only reset by initSession() — NOT here — so calling endSession()
 * twice is always a no-op for the second call.
 */
export function endSession() {
  _fireSessionEnd();
  sessionStorage.clear();
}

function _fireSessionEnd() {
  if (_sessionEndFired) return;
  _sessionEndFired = true;

  const startTs         = parseInt(sessionStorage.getItem('session_start_ts') || '0');
  const durationSeconds = startTs ? Math.round((Date.now() - startTs) / 1000) : 0;

  trackEvent('proto_session_end', {
    session_duration_seconds: durationSeconds,
    total_events_fired:       parseInt(sessionStorage.getItem('event_count') || '0'),
    screens_visited:          sessionStorage.getItem('screens_visited') || 'none',
  });
}

// Path 1: page/tab close — visibilitychange intentionally NOT used here
// (it fires on every tab switch, which would end sessions whenever the
// facilitator alt-tabs during a session).
window.addEventListener('beforeunload', _fireSessionEnd);

// ---- Global aliases (for non-module scripts: screen files, debug-panel) --

window.trackEvent  = trackEvent;
window.initSession = initSession;
window.endSession  = endSession;

// ---- Backward-compat shim for app.js and legacy Analytics.track() calls --
// app.js references Analytics.isFirstVisit(), Analytics.getSessionSummary(),
// Analytics.track(), etc. Route them through the new transport.
window.Analytics = {
  track: (eventName, params) => trackEvent(eventName, params),

  // First-visit is now managed by the debug panel's session init form;
  // always return false so the legacy participant prompt is suppressed.
  isFirstVisit: () => false,

  getParticipantId: () => sessionStorage.getItem('participant_id') || null,
  setParticipantId: (id) => { sessionStorage.setItem('participant_id', id); },

  getSessionSummary: () => ({
    durationMs:     Date.now() - parseInt(sessionStorage.getItem('session_start_ts') || String(Date.now())),
    screensVisited: (sessionStorage.getItem('screens_visited') || '').split(',').filter(Boolean),
    totalEvents:    parseInt(sessionStorage.getItem('event_count') || '0'),
  }),

  // getEvents() is used by the old debug panel "View Analytics Log" button.
  // With Firebase as the transport, local storage of raw events is not needed;
  // return an empty array so callers don't throw.
  getEvents:  () => [],
  clearEvents: () => {},
  get sessionId() { return sessionStorage.getItem('session_start_ts') || 'unknown'; },
};
