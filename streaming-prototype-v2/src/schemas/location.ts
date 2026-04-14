import { z } from 'zod';

export const CitySchema = z.object({
  id: z.string(),
  displayName: z.string(),
  region: z.string(),
  state: z.string(),
  coordinates: z.object({
    lat: z.number(),
    lng: z.number(),
  }),
});

export const CitiesArraySchema = z.array(CitySchema);

export const LocationStateSchema = z.object({
  detectedCityId: z.string().optional(),
  selectedCityId: z.string().optional(),
  lastUpdated: z.string().datetime(),
});
