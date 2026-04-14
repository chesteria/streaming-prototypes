import { City } from "../../types/location";
import citiesData from "../../data/cities.json";
import * as FocusController from "../../core/focus-controller";
import { logEvent } from "../../core/analytics";

export const renderPicker = (
  container: HTMLElement,
  query: string,
  onQueryChange: (q: string) => void,
  onSelect: (city: City) => void,
  onBack: () => void,
) => {
  const filteredCities = (citiesData as City[]).filter(
    (city) =>
      city.displayName.toLowerCase().includes(query.toLowerCase()) ||
      city.state.toLowerCase().includes(query.toLowerCase()),
  );

  container.innerHTML = `
    <div class="flex flex-col h-full bg-v2-bg p-content-x space-y-8 animate-in slide-in-from-bottom duration-300">
      <header class="space-y-4">
        <h1 class="text-4xl font-bold">Select your location</h1>
        <div class="relative" data-focus-zone="picker-input">
           <input 
            id="picker-search"
            type="text" 
            placeholder="Search for a city..."
            value="${query}"
            class="w-full bg-v2-card-bg border-2 border-v2-surface rounded-tile px-6 py-4 text-xl focus:outline-none focus:border-v2-accent"
            data-focusable="true"
            data-focus-id="search-field"
          />
        </div>
      </header>

      <div class="flex-1 overflow-hidden">
        <div 
          id="picker-grid" 
          class="grid grid-cols-3 gap-rail-gap pb-12 overflow-y-auto h-full pr-4"
          data-focus-zone="picker-grid"
        >
          ${filteredCities
            .map(
              (city) => `
            <button 
              class="v2-card bg-v2-card-bg p-6 rounded-tile border-2 border-transparent text-left space-y-1 transition-all"
              data-focusable="true"
              data-focus-id="city-${city.id}"
            >
              <div class="text-xl font-bold">${city.displayName}</div>
              <div class="text-sm text-v2-text-secondary">${city.state}</div>
            </button>
          `,
            )
            .join("")}
          ${filteredCities.length === 0 ? '<div class="col-span-3 text-center py-12 text-v2-text-tertiary">No cities found matching "' + query + '"</div>' : ""}
        </div>
      </div>
    </div>
  `;

  const input = document.getElementById("picker-search") as HTMLInputElement;

  // Handle Query Changes
  input.addEventListener("input", (e) => {
    onQueryChange((e.target as HTMLInputElement).value);
  });

  // 1. Register Input Zone
  FocusController.registerZone("picker-input", {
    onEdge: (dir) => {
      if (dir === "DOWN" && filteredCities.length > 0) {
        FocusController.focusZone("picker-grid");
      }
      if (dir === "BACK") onBack();
    },
    onSelect: () => {
      if (filteredCities.length === 1) {
        const city = filteredCities[0];
        logEvent({ type: "v2_location_manually_selected", city, query });
        onSelect(city);
      }
    },
  });

  // 2. Register Grid Zone
  FocusController.registerZone("picker-grid", {
    onEdge: (dir) => {
      const idx = FocusController.getActiveZoneIndex();
      if (dir === "UP" && idx < 3) {
        FocusController.focusZone("picker-input");
      } else if (dir === "UP") {
        // Vertical grid navigation (3 columns)
        FocusController.focusElementById(`city-${filteredCities[idx - 3].id}`);
      } else if (dir === "DOWN" && idx + 3 < filteredCities.length) {
        // Vertical grid navigation
        FocusController.focusElementById(`city-${filteredCities[idx + 3].id}`);
      } else if (dir === "BACK") {
        onBack();
      }
    },
    onSelect: (index) => {
      const city = filteredCities[index];
      logEvent({ type: "v2_location_manually_selected", city, query });
      onSelect(city);
    },
  });

  FocusController.focusZone("picker-input");

  // Keep input cursor at end when focus returns
  input.addEventListener("focus", () => {
    input.setSelectionRange(input.value.length, input.value.length);
  });
};
