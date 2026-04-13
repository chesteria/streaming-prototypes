# TESTPLAN.md — Firebase Analytics Integration
**PRD Reference:** v1.2  
**Test Framework:** Jest 29 + jsdom + Babel  
**Last Updated:** 2026-04-12

---

## Overview

This plan covers 6 test suites and 47 test cases derived directly from PRD v1.2. Tests are written in Jest and run entirely in Node.js — no browser launch required. Firebase SDK calls are intercepted by local mocks so no live network connections are made.

**Claude Code workflow:**

```
1. Create all files listed in Section 2
2. Run: npm install
3. Run: npm test
4. Read: REPORT.md (auto-generated)
5. Fix any failures in js/analytics.js
6. Repeat from step 3 until all tests pass
```

---

## 1. Test Suites at a Glance

| Suite | File | Cases | PRD Sections |
|---|---|---|---|
| S1 — Analytics Core | `analytics.core.test.js` | 9 | §4.2, §7.2 |
| S2 — Session Lifecycle | `analytics.session.test.js` | 11 | §4.3, §6.6 |
| S3 — screens_visited Logic | `analytics.screens.test.js` | 8 | §5, §6.6 |
| S4 — Encapsulation | `analytics.encapsulation.test.js` | 5 | §4.1, §7.2 |
| S5 — Event Taxonomy | `taxonomy.test.js` | 8 | §5, §6.1–6.6 |
| S6 — Repo Structure | `repo.structure.test.js` | 6 | §3.1, §7.1 |
| **Total** | | **47** | |

---

## 2. Setup — Files to Create

Claude Code must create every file below before running `npm test`. File contents are in Section 3.

```
[project root]/
  package.json                          ← test runner config
  babel.config.js                       ← ES module → CommonJS transform
  jest.config.js                        ← Jest config with CDN URL mocking
  firebase-config.template.js           ← required by S6 (repo structure)
  .gitignore                            ← required by S6 (must contain firebase-config.js)
  .github/
    workflows/
      deploy.yml                        ← required by S6
  tests/
    setup.js                            ← BroadcastChannel mock + global reset
    generate-report.js                  ← reads test-output.json → writes REPORT.md
    __mocks__/
      firebase-app.js                   ← mock initializeApp
      firebase-analytics.js             ← mock getAnalytics / logEvent / setUserProperties
      firebase-config.js                ← stub config object
    unit/
      analytics.core.test.js            ← S1
      analytics.session.test.js         ← S2
      analytics.screens.test.js         ← S3
      analytics.encapsulation.test.js   ← S4
      taxonomy.test.js                  ← S5
      repo.structure.test.js            ← S6
```

> `js/analytics.js` is the **implementation under test**. Tests will fail until it is built to match the PRD. That is expected — Claude Code reads REPORT.md and builds/fixes `analytics.js` to make them pass.

---

## 3. File Contents

### 3.1 `package.json`

```json
{
  "name": "streaming-prototype-analytics-tests",
  "version": "1.0.0",
  "description": "Test suite for Firebase Analytics integration per PRD v1.2",
  "scripts": {
    "test": "jest --forceExit",
    "test:ci": "jest --forceExit --json --outputFile=test-output.json && node tests/generate-report.js",
    "report": "node tests/generate-report.js"
  },
  "devDependencies": {
    "@babel/core": "^7.23.0",
    "@babel/preset-env": "^7.23.0",
    "babel-jest": "^29.7.0",
    "jest": "^29.7.0",
    "jest-environment-jsdom": "^29.7.0"
  }
}
```

---

### 3.2 `babel.config.js`

```javascript
module.exports = {
  presets: [
    ['@babel/preset-env', { targets: { node: 'current' } }]
  ]
};
```

---

### 3.3 `jest.config.js`

```javascript
module.exports = {
  testEnvironment: 'jest-environment-jsdom',
  setupFilesAfterFramework: ['<rootDir>/tests/setup.js'],
  setupFilesAfterFramework: ['<rootDir>/tests/setup.js'],
  setupFiles: ['<rootDir>/tests/setup.js'],
  moduleNameMapper: {
    // Redirect Firebase CDN imports to local mocks
    'https://www\\.gstatic\\.com/firebasejs/[^/]+/firebase-app\\.js':
      '<rootDir>/tests/__mocks__/firebase-app.js',
    'https://www\\.gstatic\\.com/firebasejs/[^/]+/firebase-analytics\\.js':
      '<rootDir>/tests/__mocks__/firebase-analytics.js',
    // Redirect relative config import
    '\\./firebase-config\\.js':
      '<rootDir>/tests/__mocks__/firebase-config.js',
  },
  transform: {
    '^.+\\.js$': 'babel-jest',
  },
  testMatch: ['<rootDir>/tests/unit/**/*.test.js'],
  collectCoverageFrom: ['js/analytics.js'],
  coverageThreshold: {
    global: { lines: 80 }
  },
  // Prevent open handles from BroadcastChannel
  forceExit: true,
};
```

---

### 3.4 `tests/setup.js`

```javascript
/**
 * Global test setup.
 * Runs before each test file.
 * Provides a controllable BroadcastChannel mock and resets shared state.
 */

// ── BroadcastChannel Mock ──────────────────────────────────────────────────
// jsdom does not guarantee BroadcastChannel is available; override it
// explicitly so tests can inspect postMessage calls.

class BroadcastChannelMock {
  constructor(name) {
    this.name = name;
    this.onmessage = null;
    this._closed = false;
    BroadcastChannelMock._instances.push(this);
  }

  postMessage(data) {
    if (this._closed) return;
    BroadcastChannelMock._posted.push({ channel: this.name, data });
    // Deliver to other open instances on the same channel
    BroadcastChannelMock._instances
      .filter(i => i !== this && i.name === this.name && !i._closed && i.onmessage)
      .forEach(i => i.onmessage({ data }));
  }

  close() {
    this._closed = true;
  }

  // ── Test helpers ─────────────────────────────────────────────────────────
  static reset() {
    BroadcastChannelMock._instances = [];
    BroadcastChannelMock._posted   = [];
  }

  static postedTo(channelName) {
    return BroadcastChannelMock._posted
      .filter(m => m.channel === channelName)
      .map(m => m.data);
  }
}

BroadcastChannelMock._instances = [];
BroadcastChannelMock._posted    = [];

global.BroadcastChannel = BroadcastChannelMock;

// ── Per-test reset ─────────────────────────────────────────────────────────
beforeEach(() => {
  sessionStorage.clear();
  localStorage.clear();
  BroadcastChannelMock.reset();
  // Clear all window event listeners between tests by replacing window.dispatchEvent
  // with a spy that records calls — individual tests that need this will set it up.
});
```

---

### 3.5 `tests/__mocks__/firebase-app.js`

```javascript
const initializeApp = jest.fn(() => ({ name: 'mock-app' }));
module.exports = { initializeApp };
```

---

### 3.6 `tests/__mocks__/firebase-analytics.js`

```javascript
/**
 * Mock Firebase Analytics SDK.
 * logEvent and setUserProperties are exposed as jest.fn() so tests
 * can assert on calls without hitting the network.
 */
const logEvent         = jest.fn();
const setUserProperties = jest.fn();
const getAnalytics     = jest.fn(() => ({ name: 'mock-analytics' }));

// Reset mocks between test files (jest.resetModules handles per-test)
afterEach(() => {
  logEvent.mockClear();
  setUserProperties.mockClear();
  getAnalytics.mockClear();
});

module.exports = { logEvent, setUserProperties, getAnalytics };
```

---

### 3.7 `tests/__mocks__/firebase-config.js`

```javascript
const firebaseConfig = {
  apiKey:            'TEST_API_KEY',
  authDomain:        'test.firebaseapp.com',
  projectId:         'test-project',
  storageBucket:     'test.appspot.com',
  messagingSenderId: '000000000000',
  appId:             '1:000000000000:web:0000000000000000',
  measurementId:     'G-XXXXXXXXXX',
};

module.exports = { firebaseConfig };
```

---

### 3.8 `tests/generate-report.js`

```javascript
/**
 * Reads Jest JSON output (test-output.json) and writes a human-readable
 * REPORT.md. Run automatically via `npm run test:ci`.
 *
 * Claude Code: after running `npm run test:ci`, read REPORT.md to find
 * which tests failed and what the error messages are, then fix js/analytics.js.
 */
const fs   = require('fs');
const path = require('path');

const inputPath  = path.join(__dirname, '..', 'test-output.json');
const outputPath = path.join(__dirname, '..', 'REPORT.md');

if (!fs.existsSync(inputPath)) {
  console.error('test-output.json not found. Run `npm run test:ci` first.');
  process.exit(1);
}

const results = JSON.parse(fs.readFileSync(inputPath, 'utf8'));
const ts      = new Date().toISOString();

const totalTests   = results.numTotalTests;
const passedTests  = results.numPassedTests;
const failedTests  = results.numFailedTests;
const pendingTests = results.numPendingTests;
const passed       = results.success;

const statusBadge = passed ? '✅ ALL PASSING' : `❌ ${failedTests} FAILING`;

let md = `# Test Report — Firebase Analytics Integration
**Generated:** ${ts}  
**Status:** ${statusBadge}  
**Results:** ${passedTests}/${totalTests} passed`;

if (pendingTests > 0) md += ` (${pendingTests} skipped)`;
md += '\n\n---\n\n';

// ── Suite Summary ──────────────────────────────────────────────────────────
md += '## Suite Summary\n\n';
md += '| Suite | Status | Passed | Failed |\n|---|---|---|---|\n';

for (const suite of results.testResults) {
  const suiteName = path.basename(suite.testFilePath);
  const suitePass = suite.status === 'passed';
  const icon      = suitePass ? '✅' : '❌';
  const p         = suite.numPassingTests;
  const f         = suite.numFailingTests;
  md += `| ${suiteName} | ${icon} | ${p} | ${f} |\n`;
}

md += '\n---\n\n';

// ── Failures Detail ────────────────────────────────────────────────────────
const failures = results.testResults.flatMap(suite =>
  suite.testResults.filter(t => t.status === 'failed').map(t => ({
    suite: path.basename(suite.testFilePath),
    title: t.fullName,
    messages: t.failureMessages,
  }))
);

if (failures.length === 0) {
  md += '## Failures\n\nNone. All tests passed.\n';
} else {
  md += `## Failures (${failures.length})\n\n`;
  for (const f of failures) {
    md += `### ❌ ${f.title}\n`;
    md += `**Suite:** \`${f.suite}\`\n\n`;
    md += '**Error:**\n```\n';
    md += f.messages.join('\n').replace(/\x1b\[[0-9;]*m/g, ''); // strip ANSI
    md += '\n```\n\n';
  }
}

// ── Fix Instructions ───────────────────────────────────────────────────────
if (!passed) {
  md += `---\n\n## Fix Instructions for Claude Code\n\n`;
  md += `1. Read each failure above — the test title maps directly to a PRD requirement.\n`;
  md += `2. Open \`js/analytics.js\` and implement or correct the failing behaviour.\n`;
  md += `3. Run \`npm run test:ci\` again to regenerate this report.\n`;
  md += `4. Repeat until this report shows **✅ ALL PASSING**.\n\n`;
  md += `**Do not modify test files to make tests pass — fix the implementation.**\n`;
}

fs.writeFileSync(outputPath, md);
console.log(`\nReport written to REPORT.md — ${passedTests}/${totalTests} passed, ${failedTests} failed.`);
```

---

### 3.9 `firebase-config.template.js` *(committed to repo)*

```javascript
// firebase-config.template.js
// This file is committed. js/firebase-config.js is generated from it at deploy time.
// Do not put real values here.
export const firebaseConfig = {
  apiKey:            "$FIREBASE_API_KEY",
  authDomain:        "$FIREBASE_AUTH_DOMAIN",
  projectId:         "$FIREBASE_PROJECT_ID",
  storageBucket:     "$FIREBASE_STORAGE_BUCKET",
  messagingSenderId: "$FIREBASE_MESSAGING_SENDER_ID",
  appId:             "$FIREBASE_APP_ID",
  measurementId:     "$FIREBASE_MEASUREMENT_ID"
};
```

---

### 3.10 `.gitignore` *(must include these entries)*

```
# Firebase — generated at deploy time, never committed
js/firebase-config.js
node_modules/
test-output.json
REPORT.md
```

---

### 3.11 `.github/workflows/deploy.yml` *(skeleton — expand as needed)*

```yaml
name: Deploy to GitHub Pages

on:
  push:
    branches: [main]

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - name: Generate Firebase config
        env:
          FIREBASE_API_KEY: ${{ secrets.FIREBASE_API_KEY }}
          FIREBASE_AUTH_DOMAIN: ${{ secrets.FIREBASE_AUTH_DOMAIN }}
          FIREBASE_PROJECT_ID: ${{ secrets.FIREBASE_PROJECT_ID }}
          FIREBASE_STORAGE_BUCKET: ${{ secrets.FIREBASE_STORAGE_BUCKET }}
          FIREBASE_MESSAGING_SENDER_ID: ${{ secrets.FIREBASE_MESSAGING_SENDER_ID }}
          FIREBASE_APP_ID: ${{ secrets.FIREBASE_APP_ID }}
          FIREBASE_MEASUREMENT_ID: ${{ secrets.FIREBASE_MEASUREMENT_ID }}
        run: |
          cat firebase-config.template.js | envsubst > js/firebase-config.js

      - name: Deploy to GitHub Pages
        uses: peaceiris/actions-gh-pages@v3
        with:
          github_token: ${{ secrets.GITHUB_TOKEN }}
          publish_dir: ./
```

---

## 4. Test Suite Files

---

### S1 — Analytics Core (`tests/unit/analytics.core.test.js`)

**PRD refs:** §4.2 Event Bus Integration, §7.2 trackEvent() Wrapper  
**What it tests:** trackEvent() fires Firebase, attaches standard params, protects them from override, and dispatches to both BroadcastChannel and window CustomEvent.

```javascript
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
```

---

### S2 — Session Lifecycle (`tests/unit/analytics.session.test.js`)

**PRD refs:** §4.3, §6.6, §11.2  
**What it tests:** initSession(), endSession(), double-fire guard, beforeunload, visibilitychange must NOT trigger session_end.

```javascript
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
```

---

### S3 — screens_visited Logic (`tests/unit/analytics.screens.test.js`)

**PRD refs:** §5 (Firebase SDK Limits), §6.6 (screens_visited in proto_session_end), §7.2  
**What it tests:** screen deduplication, 5-screen cap, 100-char string limit, unknown screen exclusion.

```javascript
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
```

---

### S4 — Encapsulation (`tests/unit/analytics.encapsulation.test.js`)

**PRD refs:** §4.1, §7.2  
**What it tests:** Only trackEvent, initSession, endSession are exported. Firebase internals are not exposed.

```javascript
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
```

---

### S5 — Event Taxonomy (`tests/unit/taxonomy.test.js`)

**PRD refs:** §5 (SDK Limits), §6.1–6.6  
**What it tests:** All event names and params conform to Firebase limits, naming conventions, and `proto_` prefix rules. Brand audit.

```javascript
/**
 * S5 — Event Taxonomy
 * Data-driven validation of the event catalog defined in PRD §6.
 * No analytics.js import needed — tests the spec itself as a data contract.
 */

// ── Catalog ────────────────────────────────────────────────────────────────
// Mirrors PRD §6 exactly. Each entry: { name, params: [param names] }
// Standard params are listed separately and excluded from per-event counts.

const STANDARD_PARAMS = [
  'participant_id',
  'proto_screen',
  'device_profile',
  'scenario_preset',
  'session_timestamp',
];

const EVENT_CATALOG = [
  // §6.2 Navigation
  { name: 'proto_screen_view',      params: ['previous_screen'] },
  { name: 'rail_focus',             params: ['rail_id', 'rail_position'] },
  { name: 'card_focus',             params: ['card_id', 'card_title', 'rail_id', 'card_position'] },
  { name: 'card_select',            params: ['card_id', 'card_title', 'destination_screen'] },
  { name: 'nav_back',               params: ['from_screen', 'to_screen'] },
  { name: 'nav_exit',               params: ['from_screen'] },

  // §6.3 Content Interaction
  { name: 'pdp_view',               params: ['series_id', 'series_title'] },
  { name: 'pdp_episode_focus',      params: ['episode_id', 'episode_number', 'season_number'] },
  { name: 'pdp_episode_select',     params: ['episode_id', 'episode_number'] },
  { name: 'pdp_trailer_select',     params: ['series_id'] },
  { name: 'my_mix_rail_view',       params: ['content_count'] },
  { name: 'my_mix_card_focus',      params: ['card_id', 'card_type'] },

  // §6.4 Player
  { name: 'proto_video_start',      params: ['content_id', 'content_type', 'content_title'] },
  { name: 'video_pause',            params: ['content_id', 'elapsed_seconds'] },
  { name: 'video_resume',           params: ['content_id', 'elapsed_seconds'] },
  { name: 'video_seek',             params: ['content_id', 'direction', 'elapsed_seconds'] },
  { name: 'proto_video_complete',   params: ['content_id', 'total_duration_seconds'] },
  { name: 'video_exit',             params: ['content_id', 'elapsed_seconds', 'total_duration_seconds', 'percent_watched'] },
  { name: 'player_error',           params: ['content_id', 'error_code'] },

  // §6.5 Feedback & Research
  { name: 'feedback_triggered',     params: ['content_id'] },
  { name: 'feedback_submitted',     params: ['feedback_type', 'rating'] },
  { name: 'feedback_dismissed',     params: [] },
  { name: 'task_start',             params: ['task_id', 'task_name'] },
  { name: 'task_complete',          params: ['task_id', 'completion_time_seconds'] },
  { name: 'task_abandon',           params: ['task_id', 'abandon_reason'] },

  // §6.6 Session & Config
  { name: 'proto_session_start',    params: ['participant_id', 'device_profile'] },
  { name: 'proto_session_end',      params: ['participant_id', 'session_duration_seconds', 'total_events_fired', 'screens_visited'] },
  { name: 'debug_panel_open',       params: [] },
  { name: 'config_changed',         params: ['config_key', 'config_value'] },
  { name: 'scenario_applied',       params: ['scenario_id', 'scenario_name'] },
  { name: 'device_profile_changed', params: ['new_profile', 'previous_profile'] },
];

// Firebase reserved event names that MUST be prefixed (PRD §13, Issue 1)
const FIREBASE_RESERVED = [
  'screen_view', 'session_start', 'session_end',
  'video_start', 'video_complete', 'video_progress',
  'page_view', 'user_engagement', 'first_visit', 'first_open',
];

// Brand terms that must never appear in event names or param names
const BRAND_TERMS = [
  'localnow', 'local_now', 'local now',
  'anthropic', 'samsung', 'tizen', 'xumo', 'comcast',
];

// ── T5.1 ──────────────────────────────────────────────────────────────────
test('T5.1 all event names are ≤ 40 characters (Firebase limit)', () => {
  const violations = EVENT_CATALOG.filter(e => e.name.length > 40);
  expect(violations.map(e => `${e.name} (${e.name.length})`)).toEqual([]);
});

// ── T5.2 ──────────────────────────────────────────────────────────────────
test('T5.2 all event names are snake_case (lowercase + underscores only)', () => {
  const snakeCasePattern = /^[a-z][a-z0-9_]*$/;
  const violations = EVENT_CATALOG.filter(e => !snakeCasePattern.test(e.name));
  expect(violations.map(e => e.name)).toEqual([]);
});

// ── T5.3 ──────────────────────────────────────────────────────────────────
test('T5.3 all param names are ≤ 40 characters (Firebase limit)', () => {
  const violations = [];
  for (const event of EVENT_CATALOG) {
    const allParams = [...STANDARD_PARAMS, ...event.params];
    for (const param of allParams) {
      if (param.length > 40) violations.push(`${event.name}.${param}`);
    }
  }
  expect(violations).toEqual([]);
});

// ── T5.4 ──────────────────────────────────────────────────────────────────
test('T5.4 total params per event (standard + specific) do not exceed 25', () => {
  const violations = EVENT_CATALOG.filter(
    e => STANDARD_PARAMS.length + e.params.length > 25
  );
  expect(violations.map(e => `${e.name} (${STANDARD_PARAMS.length + e.params.length})`)).toEqual([]);
});

// ── T5.5 ──────────────────────────────────────────────────────────────────
test('T5.5 Firebase reserved event names are prefixed with proto_', () => {
  const unprefixed = EVENT_CATALOG
    .map(e => e.name)
    .filter(name => FIREBASE_RESERVED.includes(name));
  expect(unprefixed).toEqual([]);
});

// ── T5.6 ──────────────────────────────────────────────────────────────────
test('T5.6 standard params use proto_screen, not screen_name', () => {
  expect(STANDARD_PARAMS).toContain('proto_screen');
  expect(STANDARD_PARAMS).not.toContain('screen_name');
});

// ── T5.7 ──────────────────────────────────────────────────────────────────
test('T5.7 no event-specific params duplicate a standard param key', () => {
  const violations = [];
  for (const event of EVENT_CATALOG) {
    for (const param of event.params) {
      if (STANDARD_PARAMS.includes(param) && param !== 'participant_id' && param !== 'device_profile') {
        // participant_id and device_profile intentionally appear in proto_session_* events
        violations.push(`${event.name}.${param}`);
      }
    }
  }
  expect(violations).toEqual([]);
});

// ── T5.8 ──────────────────────────────────────────────────────────────────
test('T5.8 brand audit: no brand terms in event names or param names', () => {
  const allIdentifiers = [
    ...EVENT_CATALOG.map(e => e.name),
    ...EVENT_CATALOG.flatMap(e => e.params),
    ...STANDARD_PARAMS,
  ].map(s => s.toLowerCase());

  const violations = [];
  for (const term of BRAND_TERMS) {
    for (const id of allIdentifiers) {
      if (id.includes(term.toLowerCase())) violations.push(`"${term}" found in "${id}"`);
    }
  }
  expect(violations).toEqual([]);
});
```

---

### S6 — Repo Structure (`tests/unit/repo.structure.test.js`)

**PRD refs:** §3.1, §7.1  
**What it tests:** `.gitignore` entries, template file format, deploy workflow correctness.

```javascript
/**
 * S6 — Repo Structure
 * Verifies security-critical file structure requirements from PRD §3.1.
 * Tests the filesystem, not analytics.js.
 */

const fs   = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..', '..');

function readFile(relPath) {
  return fs.readFileSync(path.join(ROOT, relPath), 'utf8');
}

function fileExists(relPath) {
  return fs.existsSync(path.join(ROOT, relPath));
}

// ── T6.1 ──────────────────────────────────────────────────────────────────
test('T6.1 .gitignore contains firebase-config.js entry', () => {
  const gitignore = readFile('.gitignore');
  // Must explicitly ignore the generated config — not just node_modules
  const lines = gitignore.split('\n').map(l => l.trim());
  const hasEntry = lines.some(l =>
    l === 'js/firebase-config.js' || l === 'firebase-config.js'
  );
  expect(hasEntry).toBe(true);
});

// ── T6.2 ──────────────────────────────────────────────────────────────────
test('T6.2 firebase-config.js does NOT exist in the repo (must be gitignored/absent)', () => {
  // The generated file should not be present — only the template is committed.
  // In CI, this file is generated at deploy time. It must not be present in source.
  const configExists = fileExists('js/firebase-config.js');
  if (configExists) {
    const content = readFile('js/firebase-config.js');
    // Fail only if it contains real-looking values (not placeholder $VAR)
    const hasRealValues = /AIzaSy/.test(content) || /firebaseapp\.com/.test(content);
    expect(hasRealValues).toBe(false);
  } else {
    expect(configExists).toBe(false);
  }
});

// ── T6.3 ──────────────────────────────────────────────────────────────────
test('T6.3 firebase-config.template.js exists and contains all 7 placeholder variables', () => {
  expect(fileExists('firebase-config.template.js')).toBe(true);
  const template = readFile('firebase-config.template.js');
  const requiredVars = [
    '$FIREBASE_API_KEY',
    '$FIREBASE_AUTH_DOMAIN',
    '$FIREBASE_PROJECT_ID',
    '$FIREBASE_STORAGE_BUCKET',
    '$FIREBASE_MESSAGING_SENDER_ID',
    '$FIREBASE_APP_ID',
    '$FIREBASE_MEASUREMENT_ID',
  ];
  for (const varName of requiredVars) {
    expect(template).toContain(varName);
  }
});

// ── T6.4 ──────────────────────────────────────────────────────────────────
test('T6.4 template file does not contain real Firebase credentials', () => {
  const template = readFile('firebase-config.template.js');
  // Real API keys start with AIzaSy
  expect(template).not.toMatch(/AIzaSy[A-Za-z0-9_-]{33}/);
  expect(template).not.toMatch(/firebaseapp\.com/);
});

// ── T6.5 ──────────────────────────────────────────────────────────────────
test('T6.5 .github/workflows/deploy.yml exists', () => {
  expect(fileExists('.github/workflows/deploy.yml')).toBe(true);
});

// ── T6.6 ──────────────────────────────────────────────────────────────────
test('T6.6 deploy.yml references all 7 required secret names', () => {
  const deploy = readFile('.github/workflows/deploy.yml');
  const requiredSecrets = [
    'FIREBASE_API_KEY',
    'FIREBASE_AUTH_DOMAIN',
    'FIREBASE_PROJECT_ID',
    'FIREBASE_STORAGE_BUCKET',
    'FIREBASE_MESSAGING_SENDER_ID',
    'FIREBASE_APP_ID',
    'FIREBASE_MEASUREMENT_ID',
  ];
  for (const secret of requiredSecrets) {
    expect(deploy).toContain(`secrets.${secret}`);
  }
});
```

---

## 5. Execution Commands

```bash
# Step 1 — Install dependencies (once)
npm install

# Step 2 — Run tests and generate REPORT.md
npm run test:ci

# Step 3 — Read the report
cat REPORT.md

# Step 4 — Run tests only (faster, no report regeneration)
npm test

# Step 5 — Run a single suite during targeted fixes
npx jest tests/unit/analytics.session.test.js --verbose

# Step 6 — Run with coverage
npm test -- --coverage
```

---

## 6. Fix Workflow for Claude Code

After running `npm run test:ci`, REPORT.md will contain:

1. A suite-level summary table (which suites pass/fail)
2. Individual failure blocks with the exact assertion message and stack trace
3. Fix instructions

**Rules for fixing:**

- **Never modify test files.** Only `js/analytics.js` should change to make tests pass.
- **S1–S4** failures → fix `js/analytics.js` implementation
- **S5** failures → the event catalog in `taxonomy.test.js` is the spec; if a name is wrong in the PRD, update the PRD and both the catalog and implementation simultaneously
- **S6** failures → fix the file structure (missing `.gitignore` entry, missing template, missing workflow)

**Typical fix iteration:**

```bash
# See which suite has the most failures first
grep "❌" REPORT.md

# Fix js/analytics.js

# Re-run just that suite to check
npx jest tests/unit/analytics.core.test.js --verbose

# Once the suite goes green, run full suite
npm run test:ci
```

---

## 7. Expected Initial State

Before `js/analytics.js` is built, the expected test results are:

| Suite | Expected Initial Outcome |
|---|---|
| S1 — Analytics Core | ❌ All 9 fail (module not found) |
| S2 — Session Lifecycle | ❌ All 11 fail (module not found) |
| S3 — screens_visited | ❌ All 8 fail (module not found) |
| S4 — Encapsulation | ❌ All 5 fail (module not found) |
| S5 — Event Taxonomy | ✅ Expected to pass immediately (tests the spec data, not the implementation) |
| S6 — Repo Structure | ⚠️ Partial — passes once template and deploy.yml are created |

**Target state:** All 47 tests passing, `js/analytics.js` coverage ≥ 80%.
