import * as FocusEngine from "./focus-engine";
import { KeyAction } from "./focus-engine";

export interface ControllerZoneOptions {
  onFocus?: (index: number, element: HTMLElement) => void;
  onBlur?: (index: number, element: HTMLElement) => void;
  onSelect?: (index: number, element: HTMLElement) => void;
  wrapAround?: boolean;
  onEdge?: (dir: KeyAction) => void;
}

interface InternalZone {
  name: string;
  engineZone: FocusEngine.FocusZone<HTMLElement>;
  options: ControllerZoneOptions;
}

let zones: Map<string, InternalZone> = new Map();
let activeZone: InternalZone | null = null;
let globalActionHandler:
  | ((action: KeyAction, event: KeyboardEvent) => void)
  | null = null;

const focusDomElement = (element: HTMLElement) => {
  if (
    element instanceof HTMLInputElement ||
    element instanceof HTMLTextAreaElement ||
    element.isContentEditable
  ) {
    element.focus();
  }
};

const blurDomElement = (element: HTMLElement) => {
  if (
    element instanceof HTMLInputElement ||
    element instanceof HTMLTextAreaElement ||
    element.isContentEditable
  ) {
    element.blur();
  }
};

/**
 * Discovers focusable elements in the DOM for a specific zone name.
 */
const discoverElements = (zoneName: string): HTMLElement[] => {
  const container = document.querySelector(`[data-focus-zone="${zoneName}"]`);
  if (!container) return [];

  const elements = Array.from(
    container.querySelectorAll('[data-focusable="true"]'),
  ) as HTMLElement[];

  return elements;
};

export const registerZone = (
  name: string,
  options: ControllerZoneOptions = {},
) => {
  const elements = discoverElements(name);

  const engineZone = FocusEngine.createZone(elements, {
    onFocus: (idx, el) => {
      el.setAttribute("data-focused", "true");
      focusDomElement(el);
      options.onFocus?.(idx, el);
    },
    onBlur: (idx, el) => {
      el.removeAttribute("data-focused");
      blurDomElement(el);
      options.onBlur?.(idx, el);
    },
    onSelect: options.onSelect,
    wrapAround: options.wrapAround,
  });

  const zone: InternalZone = { name, engineZone, options };
  zones.set(name, zone);
  return zone;
};

export const focusZone = (name: string, startIndex: number = 0) => {
  const zone = zones.get(name);
  if (!zone) return false;

  activeZone?.engineZone.blur();
  activeZone = zone;
  zone.engineZone.focus(startIndex);
  return true;
};

export const focusElementById = (id: string) => {
  for (const zone of zones.values()) {
    const elements = zone.engineZone.getItems();
    const index = elements.findIndex(
      (el) => el.getAttribute("data-focus-id") === id,
    );
    if (index !== -1) {
      activeZone?.engineZone.blur();
      activeZone = zone;
      zone.engineZone.focus(index);
      return true;
    }
  }
  return false;
};

export const onAction = (
  handler: (action: KeyAction, event: KeyboardEvent) => void,
) => {
  globalActionHandler = handler;
};

export const getActiveZoneIndex = (): number => {
  return activeZone?.engineZone.getIndex() ?? -1;
};

const handleKey = (action: KeyAction, event: KeyboardEvent) => {
  if (!activeZone) {
    globalActionHandler?.(action, event);
    return;
  }

  if (action === "OK") {
    activeZone.engineZone.select();
  } else if (action === "LEFT" || action === "RIGHT") {
    // If we're in a text input, skip FocusEngine movement (already handled by browser)
    const isTextInput =
      event.target instanceof HTMLInputElement ||
      event.target instanceof HTMLTextAreaElement;
    if (isTextInput) {
      // Input cursor movement
    } else {
      const moved = activeZone.engineZone.move(action);
      if (!moved) {
        activeZone.options.onEdge?.(action);
      }
    }
  } else {
    // For UP/DOWN/BACK/PLAYPAUSE, trigger onEdge
    activeZone.options.onEdge?.(action);
  }

  globalActionHandler?.(action, event);
};

export const init = () => {
  FocusEngine.init();
  FocusEngine.setHandler(handleKey);
};

export const destroy = () => {
  FocusEngine.teardown();
  FocusEngine.clearHandler();
  zones.clear();
  activeZone = null;
  globalActionHandler = null;
};

export const clearZones = () => {
  FocusEngine.clearHandler();
  zones.clear();
  activeZone = null;
  globalActionHandler = null;
  FocusEngine.setHandler(handleKey);
};

/**
 * Re-scans the DOM for a zone's elements. Useful after re-renders.
 */
export const refreshZone = (name: string) => {
  const zone = zones.get(name);
  if (!zone) return;

  const elements = discoverElements(name);
  zone.engineZone.setItems(elements);
};
