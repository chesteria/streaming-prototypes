// @ts-check
// streaming-prototype/js/schemas/series.js
//
// Zod schemas for per-show series JSON files under data/series/*.json.
// All 20 series files have been confirmed to include `extras` and `similar`.

'use strict';
const { z } = require('zod');

const EpisodeSchema = z.object({
  id: z.string(),
  title: z.string(),
  description: z.string(),
  thumbnail: z.string(),
  airDate: z.string(),
  duration: z.string(),
  season: z.number(),
  episode: z.number(),
});

const SeasonSchema = z.object({
  number: z.number(),
  episodeCount: z.number(),
  episodes: z.array(EpisodeSchema),
});

const ExtraSchema = z.object({
  id: z.string(),
  title: z.string(),
  description: z.string(),
  thumbnail: z.string(),
  duration: z.string(),
});

const SeriesDataSchema = z.object({
  id: z.string(),
  seasons: z.array(SeasonSchema),
  extras: z.array(ExtraSchema),
  similar: z.array(z.string()),
});

module.exports = {
  EpisodeSchema,
  SeasonSchema,
  ExtraSchema,
  SeriesDataSchema,
};
