import { City } from '../../types/location';
import { PILOT_SIMULATED_DETECTION_DELAY_MS } from '../../config/pilot-flags';
import citiesData from '../../data/cities.json';
import { logEvent } from '../../core/analytics';

export const renderDetection = (
  container: HTMLElement,
  onComplete: (city: City) => void
) => {
  logEvent({ type: 'v2_location_detection_started' });

  container.innerHTML = `
    <div class="flex flex-col items-center justify-center h-full space-y-8 animate-in fade-in duration-700">
      <div class="w-16 h-16 border-4 border-v2-accent border-t-transparent rounded-full animate-spin"></div>
      <div class="text-center space-y-2">
        <h1 class="text-3xl font-bold">Detecting your location...</h1>
        <p class="text-v2-text-secondary">This helps us show you the right local content.</p>
      </div>
    </div>
  `;

  // Simulated detection
  setTimeout(() => {
    const randomCity = citiesData[Math.floor(Math.random() * citiesData.length)];
    logEvent({ type: 'v2_location_detection_completed', city: randomCity as City });
    onComplete(randomCity as City);
  }, PILOT_SIMULATED_DETECTION_DELAY_MS);
};
