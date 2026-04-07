/* ============================================================
   ANALYTICS — Event bus, localStorage storage, Firebase transport
   Phase 2 — Insight Engine
   ============================================================ */

// === TRANSPORT CONFIG ===
const ANALYTICS_ENABLED            = true;
const ANALYTICS_TRANSPORT          = 'localStorage'; // 'localStorage' | 'firebase' | 'both'
const FIREBASE_URL                 = '';             // set when ready
const ANALYTICS_BATCH_INTERVAL_MS  = 30000;
const ANALYTICS_MAX_LOCAL_SESSIONS = 50;
const ANALYTICS_MAX_STORAGE_BYTES  = 5 * 1024 * 1024; // 5MB

const Analytics = (() => {

  // === STATE ===
  let _sessionId      = null;
  let _participantId  = null;
  let _sessionStart   = null;
  let _batchTimer     = null;
  let _pendingBatch   = [];

  // Per-session counters (for session_end payload)
  let _focusChangeCount    = 0;
  let _selectionCount      = 0;
  let _railsScrolledPast   = 0;
  let _screensVisited      = [];
  let _deepestScreen       = 'lander';

  // ---- UUID generation ----
  function _uuid() {
    if (typeof crypto !== 'undefined' && crypto.randomUUID) {
      return crypto.randomUUID();
    }
    // Fallback
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, c => {
      const r = Math.random() * 16 | 0;
      return (c === 'x' ? r : (r & 0x3 | 0x8)).toString(16);
    });
  }

  // ---- Participant ID generation ----
  function _generateParticipantId() {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // no ambiguous chars
    let code = 'P-';
    for (let i = 0; i < 4; i++) {
      code += chars[Math.floor(Math.random() * chars.length)];
    }
    return code;
  }

  // ---- Device type detection ----
  function _detectDeviceType() {
    const ua = navigator.userAgent || '';
    if (/AFTS|AmazonFireTV|FireTV/i.test(ua)) return 'firetv';
    if (/Tizen/i.test(ua)) return 'tizen';
    if (/Roku/i.test(ua)) return 'roku';
    return 'browser';
  }

  // ---- Config snapshot ----
  function _getConfig() {
    try {
      const overrides = {};
      Object.keys(localStorage).forEach(k => {
        if (k.startsWith('debug_')) overrides[k.slice(6)] = localStorage.getItem(k);
      });
      return {
        landerVersion: localStorage.getItem('debug_landerConfig')
          ? _simpleHash(localStorage.getItem('debug_landerConfig'))
          : 'default',
        debugOverrides: overrides,
      };
    } catch (e) {
      return { landerVersion: 'default', debugOverrides: {} };
    }
  }

  function _simpleHash(str) {
    let h = 0;
    for (let i = 0; i < str.length; i++) {
      h = ((h << 5) - h) + str.charCodeAt(i);
      h |= 0;
    }
    return Math.abs(h).toString(16).slice(0, 8);
  }

  // ---- Session init ----
  function _initSession() {
    _sessionId    = _uuid();
    _sessionStart = Date.now();
    _focusChangeCount  = 0;
    _selectionCount    = 0;
    _railsScrolledPast = 0;
    _screensVisited    = [];
    _deepestScreen     = 'lander';

    // Increment session count
    const count = parseInt(localStorage.getItem('analytics_sessionCount') || '0') + 1;
    localStorage.setItem('analytics_sessionCount', String(count));
    localStorage.setItem('analytics_sessionId', _sessionId);
  }

  // ---- Participant ID management ----
  function getParticipantId() {
    if (_participantId) return _participantId;
    _participantId = localStorage.getItem('analytics_participantId');
    return _participantId;
  }

  function setParticipantId(id) {
    _participantId = id;
    localStorage.setItem('analytics_participantId', id);
  }

  function generateNewParticipantId() {
    return _generateParticipantId();
  }

  function isFirstVisit() {
    return !localStorage.getItem('analytics_participantId');
  }

  // ---- Core track function ----
  function track(eventName, payload = {}) {
    if (!ANALYTICS_ENABLED) return;

    try {
      // Update per-session counters
      if (eventName === 'focus_change') _focusChangeCount++;
      if (eventName === 'tile_select')  _selectionCount++;
      if (eventName === 'scroll_depth') _railsScrolledPast++;
      if (eventName === 'navigation' && payload.to) {
        if (!_screensVisited.includes(payload.to)) _screensVisited.push(payload.to);
        const depth = ['lander', 'series-pdp', 'player'];
        if (depth.indexOf(payload.to) > depth.indexOf(_deepestScreen)) {
          _deepestScreen = payload.to;
        }
      }

      const event = {
        event: eventName,
        timestamp: new Date().toISOString(),
        sessionId: _sessionId,
        participantId: getParticipantId() || 'unknown',
        deviceType: _detectDeviceType(),
        screen: _getCurrentScreen(),
        config: _getConfig(),
        payload,
      };

      _store(event);

      if (ANALYTICS_TRANSPORT === 'firebase' || ANALYTICS_TRANSPORT === 'both') {
        _pendingBatch.push(event);
      }

    } catch (err) {
      // Never throw — analytics must not break the app
      console.warn('[Analytics] track() failed silently:', err);
    }
  }

  // ---- Current screen helper ----
  function _getCurrentScreen() {
    // Try to read from the active screen element
    const activeEl = document.querySelector('.screen.active');
    if (activeEl) return activeEl.dataset.screen || 'unknown';
    return 'unknown';
  }

  // ---- localStorage storage ----
  function _store(event) {
    try {
      const raw = localStorage.getItem('analytics_events');
      const events = raw ? JSON.parse(raw) : [];
      events.push(event);

      // Rolling buffer: trim if over 5MB
      const serialized = JSON.stringify(events);
      if (serialized.length > ANALYTICS_MAX_STORAGE_BYTES) {
        // Remove oldest 10% of events
        const trim = Math.max(1, Math.floor(events.length * 0.1));
        events.splice(0, trim);
      }

      localStorage.setItem('analytics_events', JSON.stringify(events));
    } catch (e) {
      console.warn('[Analytics] localStorage store failed:', e);
    }
  }

  // ---- Firebase transport ----
  function _flushToFirebase() {
    if (!FIREBASE_URL || _pendingBatch.length === 0) return;

    const batch = _pendingBatch.slice();
    _pendingBatch = [];

    fetch(FIREBASE_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(batch),
    }).catch(err => {
      console.warn('[Analytics] Firebase flush failed:', err);
      // Re-add to pending for next attempt
      _pendingBatch = batch.concat(_pendingBatch);
    });
  }

  function _startBatchTimer() {
    if (_batchTimer) clearInterval(_batchTimer);
    if (ANALYTICS_TRANSPORT === 'firebase' || ANALYTICS_TRANSPORT === 'both') {
      _batchTimer = setInterval(_flushToFirebase, ANALYTICS_BATCH_INTERVAL_MS);
    }
  }

  // ---- Read events from storage ----
  function getEvents() {
    try {
      const raw = localStorage.getItem('analytics_events');
      return raw ? JSON.parse(raw) : [];
    } catch (e) {
      return [];
    }
  }

  function clearEvents() {
    localStorage.removeItem('analytics_events');
  }

  // ---- Session summary (for session_end) ----
  function getSessionSummary() {
    return {
      durationMs: Date.now() - (_sessionStart || Date.now()),
      screensVisited: _screensVisited.slice(),
      totalFocusChanges: _focusChangeCount,
      totalSelections: _selectionCount,
      railsScrolledPast: _railsScrolledPast,
      deepestScreen: _deepestScreen,
    };
  }

  // ---- init ----
  function init() {
    _initSession();
    _startBatchTimer();

    // Flush on page unload
    window.addEventListener('beforeunload', () => {
      _flushToFirebase();
    });
  }

  // ---- Prune old sessions to stay within cap ----
  function _pruneOldSessions() {
    try {
      const events = getEvents();
      if (!events.length) return;

      // Get unique sessionIds, ordered by first appearance
      const sessionOrder = [];
      events.forEach(e => {
        if (e.sessionId && !sessionOrder.includes(e.sessionId)) {
          sessionOrder.push(e.sessionId);
        }
      });

      if (sessionOrder.length <= ANALYTICS_MAX_LOCAL_SESSIONS) return;

      // Remove events from oldest sessions
      const sessionsToRemove = new Set(
        sessionOrder.slice(0, sessionOrder.length - ANALYTICS_MAX_LOCAL_SESSIONS)
      );
      const trimmed = events.filter(e => !sessionsToRemove.has(e.sessionId));
      localStorage.setItem('analytics_events', JSON.stringify(trimmed));
    } catch (e) {
      console.warn('[Analytics] pruneOldSessions failed:', e);
    }
  }

  // Auto-init on script load
  init();
  _pruneOldSessions();

  return {
    track,
    getParticipantId,
    setParticipantId,
    generateNewParticipantId,
    getDeviceType: _detectDeviceType,
    isFirstVisit,
    getEvents,
    clearEvents,
    getSessionSummary,
    get sessionId() { return _sessionId; },
  };

})();
