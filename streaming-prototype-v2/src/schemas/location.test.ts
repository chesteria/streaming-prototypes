import { describe, it, expect } from 'vitest';
import { CitiesArraySchema, CitySchema, LocationStateSchema } from './location';
import citiesData from '../data/cities.json';
import cityMissingId from '../../tests/fixtures/broken/city-missing-id.json';
import locationStateBadTimestamp from '../../tests/fixtures/broken/location-state-bad-timestamp.json';

describe('Location Schemas', () => {
  describe('Positive Smoke Tests', () => {
    it('should validate the real cities.json data', () => {
      const result = CitiesArraySchema.safeParse(citiesData);
      expect(result.success).toBe(true);
    });
  });

  describe('Negative Fixture Tests', () => {
    it('should reject a city missing an id', () => {
      const result = CitySchema.safeParse(cityMissingId);
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues[0].path).toContain('id');
      }
    });

    it('should reject location state with a bad timestamp', () => {
      const result = LocationStateSchema.safeParse(locationStateBadTimestamp);
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues[0].path).toContain('lastUpdated');
      }
    });
  });
});
