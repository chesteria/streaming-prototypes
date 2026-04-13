/**
 * Mock Firebase Analytics SDK.
 * logEvent and setUserProperties are jest.fn() so tests can assert on calls.
 *
 * No afterEach here: tests use jest.resetModules() + require() in beforeEach,
 * which creates entirely fresh jest.fn() instances each time. Registering hooks
 * (afterEach) at module level inside a require() call breaks jest-circus.
 */
const logEvent          = jest.fn();
const setUserProperties = jest.fn();
const getAnalytics      = jest.fn(() => ({ name: 'mock-analytics' }));

module.exports = { logEvent, setUserProperties, getAnalytics };
