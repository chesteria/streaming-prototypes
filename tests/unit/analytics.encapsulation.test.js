/**
 * S4 — Encapsulation
 * Verifies the public API surface of analytics.js.
 * logEvent and setUserProperties must NOT be exported.
 */

let analyticsModule;

beforeEach(() => {
  jest.resetModules();
  analyticsModule = require('../../js/analytics');
});

// ── T4.1 ──────────────────────────────────────────────────────────────────
test('T4.1 analytics.js exports trackEvent as a function', () => {
  expect(typeof analyticsModule.trackEvent).toBe('function');
});

// ── T4.2 ──────────────────────────────────────────────────────────────────
test('T4.2 analytics.js exports initSession as a function', () => {
  expect(typeof analyticsModule.initSession).toBe('function');
});

// ── T4.3 ──────────────────────────────────────────────────────────────────
test('T4.3 analytics.js exports endSession as a function', () => {
  expect(typeof analyticsModule.endSession).toBe('function');
});

// ── T4.4 ──────────────────────────────────────────────────────────────────
test('T4.4 analytics.js does NOT export logEvent (Firebase internal)', () => {
  expect(analyticsModule.logEvent).toBeUndefined();
});

// ── T4.5 ──────────────────────────────────────────────────────────────────
test('T4.5 analytics.js does NOT export setUserProperties (Firebase internal)', () => {
  expect(analyticsModule.setUserProperties).toBeUndefined();
});
