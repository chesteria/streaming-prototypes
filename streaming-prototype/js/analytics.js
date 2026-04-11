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

  // Write buffer — events accumulate here and are flushed to localStorage on a timer
  let _writeBuffer      = [];
  let _writeFlushTimer  = null;
  const WRITE_FLUSH_MS  = 5000; // flush every 5 seconds instead of on every event

  // One-time cached values (don't recompute on every track() call)
  let _deviceTypeCache = null;
  let _configCache     = null;

  // Per-session counters (for session_end payload)
  let _focusChangeCount    = 0;
  let _selectionCount      = 0;
  let _railsScrolledPast   = 0;
  let _screensVisited      = [];
  let _deepestScreen       = 'lander';

  // Inactivity timer (H3)
  let _inactivityTimer     = null;
  const INACTIVITY_TIMEOUT_MS = 5 * 60 * 1000; // 5 minutes

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

  // ---- Device type detection (cached — UA never changes mid-session) ----
  function _detectDeviceType() {
    if (_deviceTypeCache) return _deviceTypeCache;
    const ua = navigator.userAgent || '';
    if (/AFTS|AmazonFireTV|FireTV/i.test(ua)) _deviceTypeCache = 'firetv';
    else if (/Tizen/i.test(ua)) _deviceTypeCache = 'tizen';
    else if (/Roku/i.test(ua)) _deviceTypeCache = 'roku';
    else _deviceTypeCache = 'browser';
    return _deviceTypeCache;
  }

  // ---- Config snapshot (cached — debug overrides don't change mid-session) ----
  function _getConfig() {
    if (_configCache) return _configCache;
    try {
      const overrides = {};
      Object.keys(localStorage).forEach(k => {
        if (k.startsWith('debug_')) overrides[k.slice(6)] = localStorage.getItem(k);
      });

      const versionInfo = (typeof DataStore !== 'undefined')
        ? (() => {
            const v = DataStore.getVersion();
            return { appVersion: v.version, buildNumber: v.buildNumber, gitCommit: v.gitCommit };
          })()
        : {};

      _configCache = {
        landerVersion: localStorage.getItem('debug_landerConfig')
          ? _simpleHash(localStorage.getItem('debug_landerConfig'))
          : 'default',
        debugOverrides: overrides,
        ...versionInfo,
      };
      return _configCache;
    } catch (e) {
      return { landerVersion: 'default', debugOverrides: {} };
    }
  }

  // ---- Inactivity timer (H3) ----
  function _resetInactivityTimer() {
    clearTimeout(_inactivityTimer);
    _inactivityTimer = setTimeout(() => {
      track('session_end', { ...getSessionSummary(), trigger: 'inactivity' });
    }, INACTIVITY_TIMEOUT_MS);
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
      _resetInactivityTimer();

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

  // ---- Write buffer — push events here, flush to localStorage on a timer ----
  function _store(event) {
    _writeBuffer.push(event);
    if (!_writeFlushTimer) {
      _writeFlushTimer = setTimeout(_flushWriteBuffer, WRITE_FLUSH_MS);
    }
  }

  function _flushWriteBuffer() {
    _writeFlushTimer = null;
    if (_writeBuffer.length === 0) return;

    const toWrite = _writeBuffer.splice(0); // drain buffer atomically
    try {
      const raw = localStorage.getItem('analytics_events');
      const stored = raw ? JSON.parse(raw) : [];
      const merged = stored.concat(toWrite);

      // Trim if over size cap (remove oldest 10%)
      const serialized = JSON.stringify(merged);
      if (serialized.length > ANALYTICS_MAX_STORAGE_BYTES) {
        const trim = Math.max(1, Math.floor(merged.length * 0.1));
        merged.splice(0, trim);
      }

      localStorage.setItem('analytics_events', JSON.stringify(merged));
      _pruneOldSessions();
    } catch (e) {
      console.warn('[Analytics] localStorage flush failed:', e);
      // Put events back in the buffer so they aren't lost
      _writeBuffer = toWrite.concat(_writeBuffer);
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

  // ---- Read events from storage (includes buffered events not yet flushed) ----
  function getEvents() {
    try {
      const raw = localStorage.getItem('analytics_events');
      const stored = raw ? JSON.parse(raw) : [];
      return stored.concat(_writeBuffer);
    } catch (e) {
      return _writeBuffer.slice();
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
    _resetInactivityTimer();

    // Flush write buffer and Firebase transport on page unload
    window.addEventListener('beforeunload', () => {
      _flushWriteBuffer();
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

  // Auto-init on script load — guarded so ANALYTICS_ENABLED=false truly disables
  // all collection including localStorage writes (session counter, session ID).
  if (ANALYTICS_ENABLED) {
    init();
    _pruneOldSessions();
  }

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
