import { City } from '../types/location';
import { PILOT_LOG_ANALYTICS } from '../config/pilot-flags';

export type AnalyticsEvent =
  | { type: 'v2_location_detection_started' }
  | { type: 'v2_location_detection_completed'; city: City }
  | { type: 'v2_location_manually_selected'; city: City; query: string }
  | { type: 'v2_location_changed'; city: City };

/**
 * Typed logger for pilot analytics. 
 * Logs to console with a consistent prefix.
 */
export const logEvent = (event: AnalyticsEvent) => {
  if (!PILOT_LOG_ANALYTICS) return;

  const timestamp = new Date().toISOString();
  const { type, ...payload } = event;

  console.log(
    `%c[v2-analytics] %c${timestamp} %c${type}`,
    'color: #ff5500; font-weight: bold;',
    'color: #8899AA;',
    'color: #FFFFFF; font-weight: bold;',
    payload
  );
};
