/**
 * Schema positive smoke tests — verify real production data passes each schema.
 * These catch misconfigured wiring: wrong require path, wrong exported symbol,
 * or a schema that accidentally rejects valid data.
 * Paired with schemas-reject-bad-data.test.js which verifies schemas aren't too permissive.
 */

const { CatalogSchema }       = require('../../streaming-prototype/js/schemas/catalog.js');
const { LanderConfigSchema }  = require('../../streaming-prototype/js/schemas/lander-config.js');
const { SeriesDataSchema }    = require('../../streaming-prototype/js/schemas/series.js');
const { VersionSchema }       = require('../../streaming-prototype/js/schemas/version.js');
const { GeoStateSchema }      = require('../../streaming-prototype/js/schemas/geo-state.js');

const realCatalog      = require('../../streaming-prototype/data/catalog.json');
const realLanderConfig = require('../../streaming-prototype/data/lander-config.json');
const realVersion      = require('../../streaming-prototype/data/version.json');
const realGeoState     = require('../../streaming-prototype/data/geo-state.json');
// Use show-001 as representative series file
const realSeries       = require('../../streaming-prototype/data/series/show-001.json');

test('Real catalog.json validates against CatalogSchema', () => {
  const result = CatalogSchema.safeParse(realCatalog);
  if (!result.success) console.error(result.error.format());
  expect(result.success).toBe(true);
});

test('Real lander-config.json validates against LanderConfigSchema', () => {
  const result = LanderConfigSchema.safeParse(realLanderConfig);
  if (!result.success) console.error(result.error.format());
  expect(result.success).toBe(true);
});

test('Real version.json validates against VersionSchema', () => {
  const result = VersionSchema.safeParse(realVersion);
  if (!result.success) console.error(result.error.format());
  expect(result.success).toBe(true);
});

test('Real geo-state.json validates against GeoStateSchema', () => {
  const result = GeoStateSchema.safeParse(realGeoState);
  if (!result.success) console.error(result.error.format());
  expect(result.success).toBe(true);
});

test('Real series/show-001.json validates against SeriesDataSchema', () => {
  const result = SeriesDataSchema.safeParse(realSeries);
  if (!result.success) console.error(result.error.format());
  expect(result.success).toBe(true);
});
