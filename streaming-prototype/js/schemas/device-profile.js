// @ts-check
// streaming-prototype/js/schemas/device-profile.js
//
// Zod schema for data/device-profiles/*.json.
// All device profile files share the same structure.

'use strict';
const { z } = require('zod');

const DeviceButtonSchema = z.object({
  label: z.string(),
  icon: z.string(),
  key: z.string(),
  appAction: z.string(),
});

const DeviceProfileSchema = z.object({
  id: z.string(),
  displayName: z.string(),
  shape: z.string(),
  detection: z.object({
    userAgentSubstrings: z.array(z.string()),
  }),
  footerHint: z.string(),
  buttons: z.array(DeviceButtonSchema),
});

module.exports = { DeviceProfileSchema, DeviceButtonSchema };
