/**
 * S2 — Session Lifecycle
 * Tests initSession(), endSession(), session_end guard, and event triggers.
 */

let analytics;
let firebaseMock;

beforeEach(() => {
  jest.resetModules();
  sessionStorage.clear();
  firebaseMock = require('../__mocks__/firebase-analytics');
  analytics = require('../../js/analytics');
});

// ── T2.1 ──────────────────────────────────────────────────────────────────
test('T2.1 initSession() sets participant_id in sessionStorage', () => {
  analytics.initSession('P-7X3K');
  expect(sessionStorage.getItem('participant_id')).toBe('P-7X3K');
});

// ── T2.2 ──────────────────────────────────────────────────────────────────
test('T2.2 initSession() sets session_start_ts as a numeric string', () => {
  const before = Date.now();
  analytics.initSession('P-7X3K');
  const after = Date.now();
  const ts = parseInt(sessionStorage.getItem('session_start_ts'));
  expect(ts).toBeGreaterThanOrEqual(before);
  expect(ts).toBeLessThanOrEqual(after);
});

// ── T2.3 ──────────────────────────────────────────────────────────────────
test('T2.3 initSession() resets event_count to "0"', () => {
  sessionStorage.setItem('event_count', '99');
  analytics.initSession('P-7X3K');
  // event_count may be 1 after the proto_session_start event fires
  const count = parseInt(sessionStorage.getItem('event_count'));
  expect(count).toBeLessThanOrEqual(1); // 0 set, then incremented by session_start event
});

// ── T2.4 ──────────────────────────────────────────────────────────────────
test('T2.4 initSession() sets screens_visited to empty string', () => {
  sessionStorage.setItem('screens_visited', 'old,data');
  analytics.initSession('P-7X3K');
  // screens_visited should be empty or reset at session start
  const visited = sessionStorage.getItem('screens_visited');
  expect(visited === '' || visited === null).toBe(true);
});

// ── T2.5 ──────────────────────────────────────────────────────────────────
test('T2.5 initSession() calls setUserProperties with participant_id', () => {
  analytics.initSession('P-7X3K');
  expect(firebaseMock.setUserProperties).toHaveBeenCalledWith(
    expect.anything(),
    { participant_id: 'P-7X3K' }
  );
});

// ── T2.6 ──────────────────────────────────────────────────────────────────
test('T2.6 initSession() fires proto_session_start event', () => {
  analytics.initSession('P-7X3K', 'roku_express');
  expect(firebaseMock.logEvent).toHaveBeenCalledWith(
    expect.anything(),
    'proto_session_start',
    expect.objectContaining({ device_profile: 'roku_express' })
  );
});

// ── T2.7 ──────────────────────────────────────────────────────────────────
test('T2.7 endSession() fires proto_session_end exactly once', () => {
  analytics.initSession('P-7X3K');
  firebaseMock.logEvent.mockClear();
  analytics.endSession();
  const sessionEndCalls = firebaseMock.logEvent.mock.calls.filter(
    ([, name]) => name === 'proto_session_end'
  );
  expect(sessionEndCalls.length).toBe(1);
});

// ── T2.8 ──────────────────────────────────────────────────────────────────
test('T2.8 double-fire guard: calling endSession() twice fires proto_session_end once', () => {
  analytics.initSession('P-7X3K');
  firebaseMock.logEvent.mockClear();
  analytics.endSession();
  analytics.endSession(); // second call must be a no-op
  const sessionEndCalls = firebaseMock.logEvent.mock.calls.filter(
    ([, name]) => name === 'proto_session_end'
  );
  expect(sessionEndCalls.length).toBe(1);
});

// ── T2.9 ──────────────────────────────────────────────────────────────────
test('T2.9 endSession() clears sessionStorage', () => {
  analytics.initSession('P-7X3K');
  expect(sessionStorage.getItem('participant_id')).toBe('P-7X3K');
  analytics.endSession();
  expect(sessionStorage.getItem('participant_id')).toBeNull();
});

// ── T2.10 ─────────────────────────────────────────────────────────────────
test('T2.10 proto_session_end fires via beforeunload event', () => {
  analytics.initSession('P-7X3K');
  firebaseMock.logEvent.mockClear();
  window.dispatchEvent(new Event('beforeunload'));
  const sessionEndCalls = firebaseMock.logEvent.mock.calls.filter(
    ([, name]) => name === 'proto_session_end'
  );
  expect(sessionEndCalls.length).toBe(1);
});

// ── T2.11 ─────────────────────────────────────────────────────────────────
test('T2.11 proto_session_end does NOT fire on visibilitychange hidden', () => {
  analytics.initSession('P-7X3K');
  firebaseMock.logEvent.mockClear();

  // Simulate tab switch (visibilitychange → hidden)
  Object.defineProperty(document, 'visibilityState', {
    value: 'hidden', writable: true, configurable: true
  });
  document.dispatchEvent(new Event('visibilitychange'));

  const sessionEndCalls = firebaseMock.logEvent.mock.calls.filter(
    ([, name]) => name === 'proto_session_end'
  );
  expect(sessionEndCalls.length).toBe(0);

  // Restore
  Object.defineProperty(document, 'visibilityState', {
    value: 'visible', writable: true, configurable: true
  });
});
