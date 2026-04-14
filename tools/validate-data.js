// tools/validate-data.js
//
// Validates every JSON file under streaming-prototype/data/ against zod schemas.
// Run via: npm run validate:data
// Exits non-zero on any failure.
//
// This is the PRIMARY safety net for JSON shape drift. It runs in Node, in CI,
// before merge. The browser never runs this. Runtime validation in the browser
// is a secondary debugging aid (see PRD section 6 — Approach A chosen).

'use strict';

const fs   = require('fs');
const path = require('path');

const { CatalogSchema }       = require('../streaming-prototype/js/schemas/catalog.js');
const { LanderConfigSchema }  = require('../streaming-prototype/js/schemas/lander-config.js');
const { SeriesDataSchema }    = require('../streaming-prototype/js/schemas/series.js');
const { VersionSchema }       = require('../streaming-prototype/js/schemas/version.js');
const { GeoStateSchema }      = require('../streaming-prototype/js/schemas/geo-state.js');
const { DeviceProfileSchema } = require('../streaming-prototype/js/schemas/device-profile.js');
const { EpgMockSchema }       = require('../streaming-prototype/js/schemas/epg.js');

const DATA_DIR = path.join(__dirname, '..', 'streaming-prototype', 'data');

let failures = 0;

/**
 * Parse and validate a single JSON file against a zod schema.
 * Increments `failures` and prints details on mismatch.
 * @param {string} filePath
 * @param {import('zod').ZodTypeAny} schema
 * @param {string} label
 */
function validate(filePath, schema, label) {
  const rel = path.relative(process.cwd(), filePath);
  try {
    const raw    = JSON.parse(fs.readFileSync(filePath, 'utf-8'));
    const result = schema.safeParse(raw);
    if (!result.success) {
      console.error(`✗  ${label}: ${rel}`);
      console.error(JSON.stringify(result.error.format(), null, 2));
      failures++;
    } else {
      console.log(`✓  ${label}: ${rel}`);
    }
  } catch (e) {
    console.error(`✗  ${label}: ${rel} — ${e.message}`);
    failures++;
  }
}

// ---- Singleton files ----
validate(path.join(DATA_DIR, 'catalog.json'),       CatalogSchema,       'Catalog');
validate(path.join(DATA_DIR, 'lander-config.json'), LanderConfigSchema,  'LanderConfig');
validate(path.join(DATA_DIR, 'version.json'),       VersionSchema,       'Version');
validate(path.join(DATA_DIR, 'geo-state.json'),     GeoStateSchema,      'GeoState');
validate(path.join(DATA_DIR, 'epg-mock.json'),      EpgMockSchema,       'EpgMock');

// ---- Series files (lazy-loaded in browser, validated here in CI) ----
const seriesDir = path.join(DATA_DIR, 'series');
for (const file of fs.readdirSync(seriesDir).filter(f => f.endsWith('.json')).sort()) {
  validate(path.join(seriesDir, file), SeriesDataSchema, 'SeriesData');
}

// ---- Device profiles ----
const profileDir = path.join(DATA_DIR, 'device-profiles');
for (const file of fs.readdirSync(profileDir).filter(f => f.endsWith('.json')).sort()) {
  validate(path.join(profileDir, file), DeviceProfileSchema, 'DeviceProfile');
}

// ---- Summary ----
if (failures > 0) {
  console.error(`\n${failures} file(s) failed validation.`);
  process.exit(1);
}
console.log(`\nAll JSON files validated successfully.`);
