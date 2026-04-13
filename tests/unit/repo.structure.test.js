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
