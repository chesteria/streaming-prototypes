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
  OK: ["Enter", "Return", "NumpadEnter", " "],
  BACK: ["Backspace", "Escape", "Exit", "XF86Back"],
  PLAYPAUSE: [
    "MediaPlayPause",
    "XF86PlayPause",
    "MediaPlay",
    "MediaPause",
    "MediaStop",
  ],
};

const KEY_CODES: Record<KeyAction, number[]> = {
  UP: [38, 29460],
  DOWN: [40, 29461],
  LEFT: [37, 4],
  RIGHT: [39, 5],
  OK: [13, 29443],
  BACK: [8, 27, 461],
  PLAYPAUSE: [179, 415, 413, 19],
};

const updateKeyDebugOverlay = (
  event: KeyboardEvent,
  action: KeyAction | null,
  phase: string,
) => {
  const overlay = document.getElementById("key-debug-overlay");
  if (!overlay) return;

  const keyCode = event.keyCode || event.which || 0;
  overlay.textContent =
    `phase=${phase} type=${event.type} ` +
    `key=${String(event.key)} code=${String(event.code)} ` +
    `keyCode=${keyCode} action=${action ?? "none"}`;
};

const handleDebugKey = (event: KeyboardEvent) => {
  updateKeyDebugOverlay(event, getKeyAction(event), "capture");
};

export const getKeyAction = (event: KeyboardEvent): KeyAction | null => {
  const key = event.key;
  const keyCode = event.keyCode || event.which || 0;

  for (const [action, keys] of Object.entries(KEYS)) {
    if (keys.includes(key)) return action as KeyAction;
  }

  for (const [action, codes] of Object.entries(KEY_CODES)) {
    if (codes.includes(keyCode)) return action as KeyAction;
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
  updateKeyDebugOverlay(event, action, "handler");
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
  document.addEventListener("keydown", handleDebugKey, true);
  document.addEventListener("keydown", handleKey, true);
  isInitialized = true;
};

export const teardown = () => {
  if (!isInitialized) return;
  document.removeEventListener("keydown", handleDebugKey, true);
  document.removeEventListener("keydown", handleKey, true);
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
