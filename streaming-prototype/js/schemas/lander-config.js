// @ts-check
// streaming-prototype/js/schemas/lander-config.js
//
// Zod schemas for lander-config.json.
// Rail types form a discriminated union on the `type` field.
// Rail types verified against current lander-config.json.

'use strict';
const { z } = require('zod');

const HeroCarouselRailSchema = z.object({
  type: z.literal('hero-carousel'),
  dataSource: z.string(),
  config: z.object({
    cycleInterval: z.number(),
    fadeDuration: z.number(),
  }),
});

const LocalCitiesRailSchema = z.object({
  type: z.literal('local-cities'),
  dataSource: z.string(),
  title: z.string(),
  config: z.object({
    cycleInterval: z.number(),
  }),
});

const LiveChannelsRailSchema = z.object({
  type: z.literal('live-channels'),
  dataSource: z.string(),
  title: z.string(),
  filter: z.record(z.string()).optional(),
});

const ScreamerRailSchema = z.object({
  type: z.literal('screamer'),
  dataSource: z.string(),
});

const StandardRailSchema = z.object({
  type: z.literal('standard-rail'),
  dataSource: z.string(),
  title: z.string(),
  tileType: z.enum(['portrait', 'landscape']),
});

const GenrePillsRailSchema = z.object({
  type: z.literal('genre-pills'),
  dataSource: z.string(),
});

const MarketingBannerRailSchema = z.object({
  type: z.literal('marketing-banner'),
  content: z.object({
    headline: z.string(),
    subtext: z.string(),
    cta: z.string(),
  }),
});

const RailSchema = z.discriminatedUnion('type', [
  HeroCarouselRailSchema,
  LocalCitiesRailSchema,
  LiveChannelsRailSchema,
  ScreamerRailSchema,
  StandardRailSchema,
  GenrePillsRailSchema,
  MarketingBannerRailSchema,
]);

const LanderConfigSchema = z.object({
  rails: z.array(RailSchema),
});

module.exports = {
  RailSchema,
  LanderConfigSchema,
};
