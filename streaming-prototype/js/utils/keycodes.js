/* ============================================================
   KEY MAPPINGS — Remote control + keyboard
   ============================================================ */

const KEYS = {
  UP:    ['ArrowUp',    'Up'],
  DOWN:  ['ArrowDown',  'Down'],
  LEFT:  ['ArrowLeft',  'Left'],
  RIGHT: ['ArrowRight', 'Right'],
  OK:    ['Enter', 'Return', ' '],
  BACK:      ['Backspace', 'Escape', 'XF86Back'],
  PLAYPAUSE: ['MediaPlayPause', 'XF86PlayPause', 'MediaPlay', 'MediaPause'],
};

function getKeyAction(event) {
  const key = event.key;
  for (const [action, keys] of Object.entries(KEYS)) {
    if (keys.includes(key)) return action;
  }
  return null;
}
