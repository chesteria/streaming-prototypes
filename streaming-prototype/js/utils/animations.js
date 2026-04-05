/* ============================================================
   ANIMATION HELPERS
   ============================================================ */

/**
 * Scroll vertical page (lander/pdp scroll container)
 * @param {HTMLElement} scrollEl - the .lander-scroll or .pdp-scroll element
 * @param {number} targetY - target translateY value (negative)
 */
function scrollPageToY(scrollEl, targetY) {
  scrollEl.style.transform = `translateY(${targetY}px)`;
}

/**
 * Show a toast notification
 */
function showToast(message, duration = 2500) {
  const toast = document.getElementById('toast');
  if (!toast) return;
  toast.textContent = message;
  toast.classList.add('show');
  clearTimeout(toast._timer);
  toast._timer = setTimeout(() => {
    toast.classList.remove('show');
  }, duration);
}

/**
 * Cross-fade two images (for living tiles)
 * @param {HTMLElement} img1 - currently visible image
 * @param {HTMLElement} img2 - next image
 */
function crossFade(img1, img2) {
  img2.classList.add('visible');
  setTimeout(() => {
    img1.src = img2.src;
    img2.classList.remove('visible');
  }, 700);
}
