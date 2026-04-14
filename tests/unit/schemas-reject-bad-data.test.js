/**
 * Schema negative tests — verify schemas reject intentionally broken fixtures.
 * Each test catches one specific failure mode.
 * Paired with schemas-accept-real-data.test.js which catches misconfigured wiring.
 */

const { CatalogSchema, ShowSchema }  = require('../../streaming-prototype/js/schemas/catalog.js');
const { LanderConfigSchema }         = require('../../streaming-prototype/js/schemas/lander-config.js');
const { SeriesDataSchema }           = require('../../streaming-prototype/js/schemas/series.js');
const { VersionSchema }              = require('../../streaming-prototype/js/schemas/version.js');

const brokenCatalog    = require('../../streaming-prototype/tests/fixtures/broken/catalog-missing-shows.json');
const brokenShow       = require('../../streaming-prototype/tests/fixtures/broken/show-wrong-rating.json');
const brokenLander     = require('../../streaming-prototype/tests/fixtures/broken/lander-config-unknown-rail.json');
const brokenVersion    = require('../../streaming-prototype/tests/fixtures/broken/version-missing-build.json');
const brokenSeries     = require('../../streaming-prototype/tests/fixtures/broken/series-missing-episodes.json');

test('CatalogSchema rejects catalog missing shows array', () => {
  expect(CatalogSchema.safeParse(brokenCatalog).success).toBe(false);
});

test('ShowSchema rejects show with invalid rating (TV-X)', () => {
  expect(ShowSchema.safeParse(brokenShow).success).toBe(false);
});

test('LanderConfigSchema rejects unknown rail type (fake-rail)', () => {
  expect(LanderConfigSchema.safeParse(brokenLander).success).toBe(false);
});

test('VersionSchema rejects version missing buildNumber', () => {
  expect(VersionSchema.safeParse(brokenVersion).success).toBe(false);
});

test('SeriesDataSchema rejects season missing episodes array', () => {
  expect(SeriesDataSchema.safeParse(brokenSeries).success).toBe(false);
});
