/**
 * S1 — Analytics Core
 * Tests trackEvent() fundamental behaviour.
 */

let analytics;
let firebaseMock;

beforeEach(() => {
  jest.resetModules();
  sessionStorage.clear();
  firebaseMock = require('../__mocks__/firebase-analytics');
  analytics = require('../../js/analytics');
});

// ── T1.1 ──────────────────────────────────────────────────────────────────
test('T1.1 trackEvent() calls Firebase logEvent with the event name', () => {
  analytics.trackEvent('card_focus', { card_id: 'c1' });
  expect(firebaseMock.logEvent).toHaveBeenCalledTimes(1);
  expect(firebaseMock.logEvent).toHaveBeenCalledWith(
    expect.anything(),
    'card_focus',
    expect.any(Object)
  );
});

// ── T1.2 ──────────────────────────────────────────────────────────────────
test('T1.2 trackEvent() attaches all 5 standard params to every event', () => {
  sessionStorage.setItem('participant_id', 'P-TEST');
  sessionStorage.setItem('current_screen', 'lander');
  sessionStorage.setItem('device_profile', 'roku_express');
  sessionStorage.setItem('scenario_preset', 'none');
  sessionStorage.setItem('session_start_ts', '1700000000000');

  analytics.trackEvent('rail_focus', { rail_id: 'r1' });

  const [, , params] = firebaseMock.logEvent.mock.calls[0];
  expect(params).toMatchObject({
    participant_id:    'P-TEST',
    proto_screen:      'lander',
    device_profile:    'roku_express',
    scenario_preset:   'none',
    session_timestamp: 1700000000000,
  });
});

// ── T1.3 ──────────────────────────────────────────────────────────────────
test('T1.3 participant_id defaults to "UNSET" when sessionStorage is empty', () => {
  analytics.trackEvent('rail_focus');
  const [, , params] = firebaseMock.logEvent.mock.calls[0];
  expect(params.participant_id).toBe('UNSET');
});

// ── T1.4 ──────────────────────────────────────────────────────────────────
test('T1.4 standard params overwrite caller-supplied collisions (protected fields)', () => {
  sessionStorage.setItem('participant_id', 'P-REAL');

  // Caller tries to spoof participant_id — must be silently ignored
  analytics.trackEvent('card_focus', { participant_id: 'SPOOFED', card_id: 'c1' });

  const [, , params] = firebaseMock.logEvent.mock.calls[0];
  expect(params.participant_id).toBe('P-REAL');
  expect(params.participant_id).not.toBe('SPOOFED');
});

// ── T1.5 ──────────────────────────────────────────────────────────────────
test('T1.5 proto_screen standard param is used (not screen_name)', () => {
  sessionStorage.setItem('current_screen', 'pdp');
  analytics.trackEvent('pdp_view', { series_id: 's1' });
  const [, , params] = firebaseMock.logEvent.mock.calls[0];
  expect(params).toHaveProperty('proto_screen');
  expect(params).not.toHaveProperty('screen_name');
});

// ── T1.6 ──────────────────────────────────────────────────────────────────
test('T1.6 trackEvent() dispatches window CustomEvent named analytics_event', () => {
  const listener = jest.fn();
  window.addEventListener('analytics_event', listener);
  analytics.trackEvent('nav_back', { from_screen: 'pdp', to_screen: 'lander' });
  window.removeEventListener('analytics_event', listener);
  expect(listener).toHaveBeenCalledTimes(1);
  const detail = listener.mock.calls[0][0].detail;
  expect(detail.eventName).toBe('nav_back');
  expect(detail.params).toMatchObject({ from_screen: 'pdp' });
});

// ── T1.7 ──────────────────────────────────────────────────────────────────
test('T1.7 trackEvent() posts to BroadcastChannel proto_analytics', () => {
  analytics.trackEvent('card_select', { card_id: 'c2' });
  const posted = BroadcastChannel.postedTo('proto_analytics');
  expect(posted.length).toBe(1);
  expect(posted[0].eventName).toBe('card_select');
});

// ── T1.8 ──────────────────────────────────────────────────────────────────
test('T1.8 trackEvent() increments event_count in sessionStorage', () => {
  sessionStorage.setItem('event_count', '3');
  analytics.trackEvent('card_focus');
  expect(sessionStorage.getItem('event_count')).toBe('4');
});

// ── T1.9 ──────────────────────────────────────────────────────────────────
test('T1.9 BroadcastChannel payload includes eventName, params, and ts', () => {
  const before = Date.now();
  analytics.trackEvent('nav_exit', { from_screen: 'lander' });
  const after = Date.now();
  const posted = BroadcastChannel.postedTo('proto_analytics');
  const payload = posted[0];
  expect(payload).toHaveProperty('eventName', 'nav_exit');
  expect(payload).toHaveProperty('params');
  expect(payload.ts).toBeGreaterThanOrEqual(before);
  expect(payload.ts).toBeLessThanOrEqual(after);
});
