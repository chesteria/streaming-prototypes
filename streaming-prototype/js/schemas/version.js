// @ts-check
// streaming-prototype/js/schemas/version.js
//
// Zod schema for data/version.json.

'use strict';
const { z } = require('zod');

const VersionSchema = z.object({
  version: z.string(),
  buildNumber: z.number(),
  // null is allowed — see VERSION_FALLBACK in data-store.js
  buildDate: z.string().nullable(),
  gitCommit: z.string(),
  gitBranch: z.string(),
  phase: z.string(),
  label: z.string(),
});

module.exports = { VersionSchema };
