// @ts-check
// streaming-prototype/js/schemas/geo-state.js
//
// Zod schema for data/geo-state.json.

'use strict';
const { z } = require('zod');

const GeoStateSchema = z.object({
  detectedCity: z.string(),
  detectedRegion: z.string(),
});

module.exports = { GeoStateSchema };
