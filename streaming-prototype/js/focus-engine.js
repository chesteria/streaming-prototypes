/* ============================================================
   FOCUS ENGINE — D-pad navigation and focus management
   ============================================================ */

const FocusEngine = (function() {

  let currentHandler = null;   // Active screen's key handler
  let isEnabled = true;

  function enable() { isEnabled = true; }
  function disable() { isEnabled = false; }

  function setHandler(handler) {
    currentHandler = handler;
  }

  function clearHandler() {
    currentHandler = null;
  }

  function handleKey(event) {
    if (!isEnabled) return;
    const action = getKeyAction(event);
    if (!action) return;

    // Prevent default browser scrolling behavior
    if (['UP','DOWN','LEFT','RIGHT'].includes(action)) {
      event.preventDefault();
    }

    if (currentHandler) {
      currentHandler(action, event);
    }
  }

  // Initialize global key listener
  function init() {
    document.addEventListener('keydown', handleKey);
  }

  /**
   * FocusZone — manages a horizontal list of focusable items
   * Usage:
   *   const zone = FocusEngine.createZone(items, { onFocus, onSelect })
   *   zone.focus(0)     // set focus to index
   *   zone.move('LEFT') // move focus
   *   zone.getIndex()   // current index
   *   zone.blur()       // remove focus
   */
  function createZone(items, options = {}) {
    let currentIndex = options.startIndex || 0;
    const { onFocus, onBlur: onItemBlur, onSelect, wrapAround = false } = options;

    function focus(index) {
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

    function move(dir) {
      const next = dir === 'RIGHT' ? currentIndex + 1 : currentIndex - 1;
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

    function getIndex() { return currentIndex; }
    function getItem() { return items[currentIndex]; }
    function getItems() { return items; }
    function setItems(newItems) {
      // Update the items array in place
      items.length = 0;
      newItems.forEach(i => items.push(i));
      if (currentIndex >= items.length) currentIndex = Math.max(0, items.length - 1);
    }

    return { focus, blur, move, select, getIndex, getItem, getItems, setItems };
  }

  return {
    init,
    enable,
    disable,
    setHandler,
    clearHandler,
    createZone,
  };
})();
