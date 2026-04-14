/**
 * Literal port of streaming-prototype/js/focus-engine.js to TypeScript.
 * Maintains behavioral parity with Phase 1.
 */

export type KeyAction =
  | "UP"
  | "DOWN"
  | "LEFT"
  | "RIGHT"
  | "OK"
  | "BACK"
  | "PLAYPAUSE";

const KEYS: Record<KeyAction, string[]> = {
  UP: ["ArrowUp", "Up"],
  DOWN: ["ArrowDown", "Down"],
  LEFT: ["ArrowLeft", "Left"],
  RIGHT: ["ArrowRight", "Right"],
  OK: ["Enter", "Return", " "],
  BACK: ["Backspace", "Escape", "XF86Back"],
  PLAYPAUSE: ["MediaPlayPause", "XF86PlayPause", "MediaPlay", "MediaPause"],
};

export const getKeyAction = (event: KeyboardEvent): KeyAction | null => {
  const key = event.key;
  for (const [action, keys] of Object.entries(KEYS)) {
    if (keys.includes(key)) return action as KeyAction;
  }
  return null;
};

export interface FocusZoneOptions<T> {
  startIndex?: number;
  onFocus?: (index: number, item: T) => void;
  onBlur?: (index: number, item: T) => void;
  onSelect?: (index: number, item: T) => void;
  wrapAround?: boolean;
}

export interface FocusZone<T> {
  focus: (index: number) => boolean;
  blur: () => void;
  move: (dir: "LEFT" | "RIGHT") => boolean;
  select: () => void;
  getIndex: () => number;
  getItem: () => T;
  getItems: () => T[];
  setItems: (newItems: T[]) => void;
}

let currentHandler: ((action: KeyAction, event: KeyboardEvent) => void) | null =
  null;
let isEnabled = true;
let isInitialized = false;

export const enable = () => {
  isEnabled = true;
};
export const disable = () => {
  isEnabled = false;
};

export const setHandler = (
  handler: (action: KeyAction, event: KeyboardEvent) => void,
) => {
  currentHandler = handler;
};

export const clearHandler = () => {
  currentHandler = null;
};

const handleKey = (event: KeyboardEvent) => {
  if (!isEnabled) return;
  const action = getKeyAction(event);
  if (!action) return;

  // Prevent default browser scrolling behavior
  // EXCEPTION: Allow Left/Right in text inputs for cursor movement
  const isTextInput =
    event.target instanceof HTMLInputElement ||
    event.target instanceof HTMLTextAreaElement;
  if (["UP", "DOWN", "LEFT", "RIGHT"].includes(action)) {
    if (isTextInput && ["LEFT", "RIGHT"].includes(action)) {
      // Let the browser handle cursor movement
    } else {
      event.preventDefault();
    }
  }

  if (currentHandler) {
    currentHandler(action, event);
  }
};

export const init = () => {
  if (isInitialized) return;
  document.addEventListener("keydown", handleKey);
  isInitialized = true;
};

export const teardown = () => {
  if (!isInitialized) return;
  document.removeEventListener("keydown", handleKey);
  isInitialized = false;
};

export const createZone = <T>(
  items: T[],
  options: FocusZoneOptions<T> = {},
): FocusZone<T> => {
  let currentIndex = options.startIndex || 0;
  const { onFocus, onBlur: onItemBlur, onSelect, wrapAround = false } = options;

  function focus(index: number) {
    if (index < 0 || index >= items.length) return false;
    const prev = currentIndex;
    currentIndex = index;
    if (onItemBlur && prev !== index) onItemBlur(prev, items[prev]);
    if (onFocus) onFocus(index, items[index]);
    return true;
  }

  function blur() {
    if (onItemBlur) onItemBlur(currentIndex, items[currentIndex]);
  }

  function move(dir: "LEFT" | "RIGHT") {
    const next = dir === "RIGHT" ? currentIndex + 1 : currentIndex - 1;
    if (next < 0) {
      if (wrapAround) return focus(items.length - 1);
      return false; // Hit left edge
    }
    if (next >= items.length) {
      if (wrapAround) return focus(0);
      return false; // Hit right edge
    }
    return focus(next);
  }

  function select() {
    if (onSelect) onSelect(currentIndex, items[currentIndex]);
  }

  function getIndex() {
    return currentIndex;
  }
  function getItem() {
    return items[currentIndex];
  }
  function getItems() {
    return items;
  }
  function setItems(newItems: T[]) {
    // Update the items array in place
    items.length = 0;
    newItems.forEach((i) => items.push(i));
    if (currentIndex >= items.length)
      currentIndex = Math.max(0, items.length - 1);
  }

  return { focus, blur, move, select, getIndex, getItem, getItems, setItems };
};
