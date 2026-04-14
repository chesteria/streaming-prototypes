// @ts-check
// streaming-prototype/js/schemas/epg.js
//
// Zod schemas for data/epg-mock.json.
// Note: EpgChannel here is the EPG-specific shape (id, name, initials, color, etc.)
// and is distinct from the catalog Channel type (callSign, city, isLive, etc.).

'use strict';
const { z } = require('zod');

const EpgGenreSchema = z.object({
  id: z.string(),
  label: z.string(),
  order: z.number(),
  enabled: z.boolean(),
  channelIds: z.array(z.string()),
});

const EpgChannelSchema = z.object({
  id: z.string(),
  name: z.string(),
  initials: z.string(),
  color: z.string(),
  genreIds: z.array(z.string()),
  currentlyWatching: z.boolean(),
});

const ProgramSlotSchema = z.object({
  title: z.string(),
  description: z.string(),
  rating: z.string(),
  durationMinutes: z.number(),
});

const EpgMockSchema = z.object({
  genres: z.array(EpgGenreSchema),
  channels: z.array(EpgChannelSchema),
  // programSlots is a map of channelId -> ProgramSlot[]
  programSlots: z.record(z.array(ProgramSlotSchema)),
});

module.exports = { EpgGenreSchema, EpgChannelSchema, ProgramSlotSchema, EpgMockSchema };
