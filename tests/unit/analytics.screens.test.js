/**
 * S3 — screens_visited Logic
 * Tests the screens_visited accumulation inside trackEvent().
 */

let analytics;

beforeEach(() => {
  jest.resetModules();
  sessionStorage.clear();
  analytics = require('../../js/analytics');
});

function setScreen(name) {
  sessionStorage.setItem('current_screen', name);
}

// ── T3.1 ──────────────────────────────────────────────────────────────────
test('T3.1 first screen visit is added to screens_visited', () => {
  setScreen('lander');
  analytics.trackEvent('rail_focus');
  expect(sessionStorage.getItem('screens_visited')).toContain('lander');
});

// ── T3.2 ──────────────────────────────────────────────────────────────────
test('T3.2 visiting the same screen twice results in only one entry', () => {
  setScreen('lander');
  analytics.trackEvent('rail_focus');
  analytics.trackEvent('card_focus');
  const visited = sessionStorage.getItem('screens_visited').split(',');
  const landerCount = visited.filter(s => s === 'lander').length;
  expect(landerCount).toBe(1);
});

// ── T3.3 ──────────────────────────────────────────────────────────────────
test('T3.3 multiple unique screens are all recorded', () => {
  setScreen('lander');  analytics.trackEvent('proto_screen_view');
  setScreen('pdp');     analytics.trackEvent('pdp_view');
  setScreen('player');  analytics.trackEvent('proto_video_start');

  const visited = sessionStorage.getItem('screens_visited');
  expect(visited).toContain('lander');
  expect(visited).toContain('pdp');
  expect(visited).toContain('player');
});

// ── T3.4 ──────────────────────────────────────────────────────────────────
test('T3.4 screens_visited is capped at 5 unique entries', () => {
  ['lander', 'pdp', 'player', 'settings', 'search', 'home'].forEach(screen => {
    setScreen(screen);
    analytics.trackEvent('proto_screen_view');
  });
  const visited = sessionStorage.getItem('screens_visited').split(',').filter(Boolean);
  expect(visited.length).toBeLessThanOrEqual(5);
});

// ── T3.5 ──────────────────────────────────────────────────────────────────
test('T3.5 screens_visited string is always ≤ 100 characters (Firebase limit)', () => {
  ['lander', 'pdp', 'player', 'settings', 'search'].forEach(screen => {
    setScreen(screen);
    analytics.trackEvent('proto_screen_view');
  });
  const visited = sessionStorage.getItem('screens_visited') || '';
  expect(visited.length).toBeLessThanOrEqual(100);
});

// ── T3.6 ──────────────────────────────────────────────────────────────────
test('T3.6 "unknown" screen is not added to screens_visited', () => {
  // current_screen not set → resolves to 'unknown'
  sessionStorage.removeItem('current_screen');
  analytics.trackEvent('rail_focus');
  const visited = sessionStorage.getItem('screens_visited') || '';
  expect(visited).not.toContain('unknown');
});

// ── T3.7 ──────────────────────────────────────────────────────────────────
test('T3.7 proto_session_end receives current screens_visited value', () => {
  jest.resetModules();
  const firebaseMock = require('../__mocks__/firebase-analytics');
  analytics = require('../../js/analytics');

  analytics.initSession('P-7X3K');
  setScreen('lander');  analytics.trackEvent('proto_screen_view');
  setScreen('pdp');     analytics.trackEvent('pdp_view');

  firebaseMock.logEvent.mockClear();
  analytics.endSession();

  const sessionEndCall = firebaseMock.logEvent.mock.calls.find(
    ([, name]) => name === 'proto_session_end'
  );
  expect(sessionEndCall).toBeDefined();
  const params = sessionEndCall[2];
  expect(params.screens_visited).toContain('lander');
  expect(params.screens_visited).toContain('pdp');
});

// ── T3.8 ──────────────────────────────────────────────────────────────────
test('T3.8 screens_visited is comma-separated with no spaces', () => {
  setScreen('lander');  analytics.trackEvent('proto_screen_view');
  setScreen('pdp');     analytics.trackEvent('pdp_view');
  const visited = sessionStorage.getItem('screens_visited');
  // Must match format: "screen1,screen2" — no spaces
  expect(visited).toMatch(/^[a-z_]+(,[a-z_]+)*$/);
});
