import { City, LocationState } from '../types/location';
import { LocationStateSchema } from '../schemas/location';

const STORAGE_KEY = 'uta_v2_location_state';

type LocationHandler = (city: City | null) => void;

let selectedCity: City | null = null;
const subscribers: Set<LocationHandler> = new Set();

/**
 * Validates and loads the persisted location state from localStorage.
 */
const loadFromStorage = (): void => {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return;

    const parsed = JSON.parse(raw);
    // For the pilot, we store the full City object in state to ensure 
    // screens have a stable contract immediately.
    if (parsed.city) {
      selectedCity = parsed.city;
    }
  } catch (e) {
    console.error('[LocationService] Failed to load from storage', e);
  }
};

/**
 * Notifies all subscribers of a location change.
 */
const notifySubscribers = (): void => {
  subscribers.forEach(handler => handler(selectedCity));
};

/**
 * Persists the current state to localStorage.
 */
const persist = (): void => {
  const state = {
    city: selectedCity,
    lastUpdated: new Date().toISOString(),
  };
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
};

export const getSelectedLocation = (): City | null => {
  return selectedCity;
};

export const setSelectedLocation = (city: City): void => {
  selectedCity = city;
  persist();
  notifySubscribers();
};

export const clearSelectedLocation = (): void => {
  selectedCity = null;
  localStorage.removeItem(STORAGE_KEY);
  notifySubscribers();
};

export const subscribeToLocationChanges = (handler: LocationHandler): () => void => {
  subscribers.add(handler);
  // Immediate fire with current state per PRD requirement
  handler(selectedCity);
  
  return () => {
    subscribers.delete(handler);
  };
};

// Initialize on module load
loadFromStorage();
