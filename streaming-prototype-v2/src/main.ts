import "@fontsource/roboto/400.css";
import "@fontsource/roboto/700.css";
import "./styles/global.css";

import * as LocationService from "./core/location-service";
import * as FocusController from "./core/focus-controller";
import {
  locationFlowReducer,
  LocationFlowState,
  LocationFlowEvent,
} from "./app";
import { renderDetection } from "./screens/location/detection";
import { renderConfirmation } from "./screens/location/confirmation";
import { renderPicker } from "./screens/location/picker";
import { logEvent } from "./core/analytics";

const appContainer = document.getElementById("app");

let state: LocationFlowState = { kind: "detecting" };

const dispatch = (event: LocationFlowEvent) => {
  const nextState = locationFlowReducer(state, event);
  if (nextState !== state) {
    state = nextState;
    render();
  }
};

const render = () => {
  if (!appContainer) return;

  FocusController.clearZones();

  switch (state.kind) {
    case "detecting":
      renderDetection(appContainer, (city) => {
        dispatch({ type: "detection_complete", city });
      });
      break;

    case "confirming":
      renderConfirmation(
        appContainer,
        state.detectedCity,
        () => dispatch({ type: "confirm_detected" }),
        () => dispatch({ type: "reject_detected" }),
      );
      break;

    case "picking":
      renderPicker(
        appContainer,
        state.query,
        (q) => dispatch({ type: "query_changed", query: q }),
        (city) => dispatch({ type: "city_selected", city }),
        () => dispatch({ type: "picker_exit_requested" }),
      );
      break;

    case "complete": {
      const selectedCity = state.selectedCity;
      LocationService.setSelectedLocation(selectedCity);
      appContainer.innerHTML = `
        <div class="flex flex-col items-center justify-center h-full space-y-4 animate-in fade-in">
          <h1 class="text-5xl font-bold">Welcome!</h1>
          <p class="text-2xl text-v2-text-secondary">Your location: <span class="text-v2-accent">${selectedCity.displayName}</span></p>
          <div class="flex space-x-4" data-focus-zone="complete-actions">
            <button
              id="change-location"
              class="v2-button mt-8 border border-v2-surface"
              data-focusable="true"
              data-focus-id="complete-change-location"
            >
              Change Location
            </button>
            <button
              id="reset-flow"
              class="v2-button mt-8 opacity-50 text-sm"
              data-focusable="true"
              data-focus-id="complete-reset-flow"
            >
              Debug: Full Reset
            </button>
          </div>
        </div>
      `;
      FocusController.registerZone("complete-actions");
      FocusController.focusZone("complete-actions");
      document
        .getElementById("change-location")
        ?.addEventListener("click", () => {
          logEvent({ type: "v2_location_changed", city: selectedCity });
          dispatch({ type: "change_location_requested" });
        });
      document.getElementById("reset-flow")?.addEventListener("click", () => {
        LocationService.clearSelectedLocation();
        window.location.reload();
      });
      break;
    }
  }
};

// Bootstrap
const initApp = () => {
  FocusController.init();
  const savedLocation = LocationService.getSelectedLocation();
  if (savedLocation) {
    state = { kind: "complete", selectedCity: savedLocation };
  }
  render();
};

initApp();
