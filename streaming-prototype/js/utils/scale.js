// @ts-check
/**
 * ScaleEngine
 * Scales #app to fit any viewport while preserving 1920×1080 aspect ratio.
 *
 * Approach: position:absolute centering + transform translate/scale.
 * Single compositor write per update — no layout or paint phase triggered.
 *
 * IMPORTANT: window.innerWidth/Height return CSS pixels, not physical pixels.
 * Do NOT factor in window.devicePixelRatio — the browser handles that separately.
 *
 * IMPORTANT: getBoundingClientRect() on child elements returns VISUAL (scaled) pixel
 * values, not 1920×1080 logical values. If any module needs logical coordinates,
 * divide the visual value by ScaleEngine.getScale().
 */

// `var` required for TypeScript global-script compatibility — see data-store.js
// for full explanation. Runtime behavior is identical.
var ScaleEngine = (() => {
  const DESIGN_WIDTH  = 1920;
  const DESIGN_HEIGHT = 1080;

  let _appRoot       = null;
  let _rafId         = null;
  let _currentScale  = 1;
  let _initialized   = false;

  // Phase 3 device simulation overrides — null = use window dimensions
  let _forcedWidth   = null;
  let _forcedHeight  = null;

  function scaleApp() {
    if (!_appRoot) return;

    const vw = _forcedWidth  ?? window.innerWidth;
    const vh = _forcedHeight ?? window.innerHeight;

    const scale = Math.min(vw / DESIGN_WIDTH, vh / DESIGN_HEIGHT);

    // Single write — compositor only, no layout phase
    _appRoot.style.transform = `translate(-50%, -50%) scale(${scale})`;

    // Expose to CSS custom property for any scale-aware components
    document.documentElement.style.setProperty('--app-scale', String(scale));
    _currentScale = scale;

    // Notify Debug Panel and any other listeners — decoupled via event
    window.dispatchEvent(new CustomEvent('scaleupdate', {
      detail: {
        scale,
        viewportWidth:  vw,
        viewportHeight: vh,
        canvasWidth:    DESIGN_WIDTH,
        canvasHeight:   DESIGN_HEIGHT,
        scaleMode:      'contain',
        forced:         (_forcedWidth !== null)
      }
    }));
  }

  function _onResize() {
    // Cancel pending frame before scheduling a new one
    if (_rafId) cancelAnimationFrame(_rafId);
    _rafId = requestAnimationFrame(scaleApp);
  }

  function init(options = {}) {
    if (_initialized) return;

    _appRoot = document.getElementById('app');

    if (!_appRoot) {
      console.warn('[ScaleEngine] #app not found — scaling skipped.');
      return;
    }

    // Optional config (maxScale hook for Phase 3)
    if (options.maxScale) {
      // cap upscaling — not built in this phase, hook reserved for Phase 3
    }

    // Run immediately before first paint
    scaleApp();

    // Reveal canvas now that first scale is applied
    _appRoot.classList.add('scale-ready');

    // Fire analytics event on init — page load only, not on resize
    try {
      if (typeof Analytics !== 'undefined') {
        const vw = _forcedWidth  ?? window.innerWidth;
        const vh = _forcedHeight ?? window.innerHeight;
        Analytics.track('viewport_scale_applied', {
          scale_factor:    _currentScale,
          scale_mode:      'contain',
          viewport_width:  vw,
          viewport_height: vh,
          canvas_width:    DESIGN_WIDTH,
          canvas_height:   DESIGN_HEIGHT,
          forced:          (_forcedWidth !== null)
        });
      }
    } catch (e) { /* fail silently if Analytics not yet available */ }

    // Listen for subsequent resize events
    window.addEventListener('resize', _onResize);
    _initialized = true;
  }

  /**
   * Phase 3: Force a specific viewport size regardless of actual window dimensions.
   * Used by device simulation presets (e.g. Roku Express 720p → setViewport(1280, 720)).
   * Pass null for both to return to real viewport tracking.
   */
  function setViewport(width, height) {
    _forcedWidth  = width  ?? null;
    _forcedHeight = height ?? null;
    scaleApp();
  }

  /** Remove resize listener. Call when tearing down (e.g. debug.html unload). */
  function destroy() {
    window.removeEventListener('resize', _onResize);
    if (_rafId) cancelAnimationFrame(_rafId);
    _appRoot = null;
    _initialized = false;
  }

  function getScale() {
    return _currentScale;
  }

  return { init, destroy, getScale, setViewport };
})();
