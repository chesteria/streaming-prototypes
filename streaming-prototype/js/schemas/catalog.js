// @ts-check
// streaming-prototype/js/schemas/catalog.js
//
// Zod schemas for catalog.json — shows, channels, cities, collections.
// CommonJS exports so the Node CI validator can require() this directly.
// TypeScript consumers import these via globals.d.ts (z.infer in Session 3 update).
//
// NOTE: These schemas are strict by default — unknown fields raise a clear error.
// Use .passthrough() sparingly and only with an explicit reason.

'use strict';
const { z } = require('zod');

const ShowSchema = z.object({
  id: z.string(),
  title: z.string(),
  description: z.string(),
  heroImage: z.string(),
  posterImage: z.string(),
  landscapeImage: z.string(),
  // TV-Y7 is present in current data — all five values observed
  rating: z.enum(['TV-G', 'TV-Y7', 'TV-PG', 'TV-14', 'TV-MA']),
  year: z.string(),
  genres: z.array(z.string()),
  seasons: z.number(),
  // Only 'TV-Series' and 'Movie' are present in current data
  type: z.enum(['TV-Series', 'Movie', 'Special']),
  badges: z.array(z.string()),
  duration: z.string(),
  featured: z.boolean(),
  director: z.string(),
  cast: z.array(z.string()),
});

const ChannelSchema = z.object({
  id: z.string(),
  name: z.string(),
  callSign: z.string(),
  city: z.string(),
  image: z.string(),
  logoText: z.string(),
  currentProgram: z.string(),
  timeSlot: z.string(),
  isLive: z.boolean(),
});

const CitySchema = z.object({
  id: z.string(),
  name: z.string(),
  temperature: z.string(),
  weatherIcon: z.string(),
  weatherBlurb: z.string(),
  tags: z.array(z.string()),
  images: z.array(z.string()),
});

const CollectionSchema = z.object({
  id: z.string(),
  title: z.string(),
  description: z.string(),
  heroImage: z.string(),
  items: z.array(z.string()),
  ctaText: z.string(),
});

const CatalogSchema = z.object({
  shows: z.array(ShowSchema),
  channels: z.array(ChannelSchema),
  cities: z.array(CitySchema),
  collections: z.array(CollectionSchema),
  genres: z.array(z.string()),
  featured: z.array(z.string()),
});

module.exports = {
  ShowSchema,
  ChannelSchema,
  CitySchema,
  CollectionSchema,
  CatalogSchema,
};
