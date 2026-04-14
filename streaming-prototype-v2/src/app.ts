import { City } from "./types/location";

export type LocationFlowState =
  | { kind: "detecting" }
  | { kind: "confirming"; detectedCity: City }
  | {
      kind: "picking";
      query: string;
      selectedIndex: number;
      detectedCity: City | null;
    }
  | { kind: "complete"; selectedCity: City };

export type LocationFlowEvent =
  | { type: "detection_complete"; city: City }
  | { type: "confirm_detected" }
  | { type: "reject_detected" }
  | { type: "picker_exit_requested" }
  | { type: "query_changed"; query: string }
  | { type: "picker_selection_changed"; index: number }
  | { type: "city_selected"; city: City }
  | { type: "change_location_requested" };

/**
 * Pure reducer for LocationFlow state transitions.
 */
export const locationFlowReducer = (
  state: LocationFlowState,
  event: LocationFlowEvent,
): LocationFlowState => {
  switch (state.kind) {
    case "detecting":
      if (event.type === "detection_complete") {
        return { kind: "confirming", detectedCity: event.city };
      }
      break;

    case "confirming":
      if (event.type === "confirm_detected") {
        return { kind: "complete", selectedCity: state.detectedCity };
      }
      if (event.type === "reject_detected") {
        return {
          kind: "picking",
          query: "",
          selectedIndex: 0,
          detectedCity: state.detectedCity,
        };
      }
      break;

    case "picking":
      if (event.type === "picker_exit_requested") {
        if (state.detectedCity) {
          return { kind: "confirming", detectedCity: state.detectedCity };
        }
        return { kind: "detecting" };
      }
      if (event.type === "query_changed") {
        return { ...state, query: event.query, selectedIndex: 0 };
      }
      if (event.type === "picker_selection_changed") {
        return { ...state, selectedIndex: event.index };
      }
      if (event.type === "city_selected") {
        return { kind: "complete", selectedCity: event.city };
      }
      break;

    case "complete":
      if (event.type === "change_location_requested") {
        return {
          kind: "picking",
          query: "",
          selectedIndex: 0,
          detectedCity: state.selectedCity,
        };
      }
      break;
  }

  return state;
};
