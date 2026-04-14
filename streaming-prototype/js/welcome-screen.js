// @ts-check
/* ============================================================
   WELCOME SCREEN — Device-aware controls reference overlay
   Shows on first launch; re-openable via H key or debug panel.
   ============================================================ */

// === WELCOME SCREEN CONFIG ===
const WELCOME_SCREEN_ENABLED                  = true;
const WELCOME_SCREEN_AUTO_SHOW_ON_FIRST_LAUNCH = true;
const WELCOME_SCREEN_DEFAULT_PROFILE          = 'desktop';
const WELCOME_SCREEN_STORAGE_KEY              = 'welcomeScreenSeen';

// `var` required for TypeScript global-script compatibility — see data-store.js
var WelcomeScreen = (() => {

  // All known profile IDs — filenames in data/device-profiles/
  const PROFILE_IDS = ['desktop', 'mobile', 'vizio', 'firetv', 'androidtv', 'tizen', 'webos', 'roku'];

  // Loaded profile data keyed by ID
  const _profiles = {};

  // Detected profile ID for this session
  let _detectedId = null;

  // Overlay DOM element
  let _overlayEl = null;

  // Whether overlay is currently visible
  let _isVisible = false;

  // Promise resolver — resolved when overlay is dismissed
  let _resolveShow = null;

  // ---- Icon renderers ----

  const ICON_SVG = {
    dpad: `<svg viewBox="0 0 36 36" width="36" height="36" fill="none" xmlns="http://www.w3.org/2000/svg">
      <polygon points="18,2 12,10 24,10" fill="currentColor" opacity="0.9"/>
      <polygon points="18,34 12,26 24,26" fill="currentColor" opacity="0.9"/>
      <polygon points="2,18 10,12 10,24" fill="currentColor" opacity="0.9"/>
      <polygon points="34,18 26,12 26,24" fill="currentColor" opacity="0.9"/>
      <circle cx="18" cy="18" r="6" fill="currentColor" opacity="0.3"/>
    </svg>`,
    ok: `<svg viewBox="0 0 36 36" width="36" height="36" fill="none" xmlns="http://www.w3.org/2000/svg">
      <circle cx="18" cy="18" r="10" stroke="currentColor" stroke-width="2.5" opacity="0.9"/>
      <circle cx="18" cy="18" r="5" fill="currentColor" opacity="0.7"/>
    </svg>`,
    back: `<svg viewBox="0 0 36 36" width="36" height="36" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M24 12 L14 18 L24 24" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" opacity="0.9"/>
    </svg>`,
    home: `<svg viewBox="0 0 36 36" width="36" height="36" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M6 18 L18 7 L30 18" stroke="currentColor" stroke-width="2" stroke-linecap="round" opacity="0.9"/>
      <rect x="11" y="18" width="14" height="11" rx="2" stroke="currentColor" stroke-width="2" opacity="0.9"/>
    </svg>`,
    playpause: `<svg viewBox="0 0 36 36" width="36" height="36" fill="none" xmlns="http://www.w3.org/2000/svg">
      <polygon points="12,10 12,26 24,18" fill="currentColor" opacity="0.9"/>
      <rect x="26" y="10" width="3" height="16" rx="1.5" fill="currentColor" opacity="0.6"/>
      <rect x="31" y="10" width="3" height="16" rx="1.5" fill="currentColor" opacity="0.6"/>
    </svg>`,
    menu: `<svg viewBox="0 0 36 36" width="36" height="36" fill="none" xmlns="http://www.w3.org/2000/svg">
      <line x1="8" y1="12" x2="28" y2="12" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" opacity="0.9"/>
      <line x1="8" y1="18" x2="28" y2="18" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" opacity="0.9"/>
      <line x1="8" y1="24" x2="28" y2="24" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" opacity="0.9"/>
    </svg>`,
    info: `<svg viewBox="0 0 36 36" width="36" height="36" fill="none" xmlns="http://www.w3.org/2000/svg">
      <circle cx="18" cy="18" r="12" stroke="currentColor" stroke-width="2" opacity="0.9"/>
      <line x1="18" y1="16" x2="18" y2="25" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" opacity="0.9"/>
      <circle cx="18" cy="12" r="1.5" fill="currentColor" opacity="0.9"/>
    </svg>`,
    arrows: `<svg viewBox="0 0 36 36" width="36" height="36" fill="none" xmlns="http://www.w3.org/2000/svg">
      <polygon points="18,2 12,10 24,10" fill="currentColor" opacity="0.9"/>
      <polygon points="18,34 12,26 24,26" fill="currentColor" opacity="0.9"/>
      <polygon points="2,18 10,12 10,24" fill="currentColor" opacity="0.9"/>
      <polygon points="34,18 26,12 26,24" fill="currentColor" opacity="0.9"/>
    </svg>`,
    tap: `<svg viewBox="0 0 36 36" width="36" height="36" fill="none" xmlns="http://www.w3.org/2000/svg">
      <circle cx="18" cy="14" r="6" stroke="currentColor" stroke-width="2" opacity="0.6"/>
      <path d="M18 20 L18 34" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" opacity="0.4"/>
    </svg>`,
    'swipe-v': `<svg viewBox="0 0 36 36" width="36" height="36" fill="none" xmlns="http://www.w3.org/2000/svg">
      <line x1="18" y1="4" x2="18" y2="32" stroke="currentColor" stroke-width="2" stroke-linecap="round" opacity="0.5"/>
      <polygon points="18,2 12,10 24,10" fill="currentColor" opacity="0.9"/>
      <polygon points="18,34 12,26 24,26" fill="currentColor" opacity="0.9"/>
    </svg>`,
    'swipe-h': `<svg viewBox="0 0 36 36" width="36" height="36" fill="none" xmlns="http://www.w3.org/2000/svg">
      <line x1="4" y1="18" x2="32" y2="18" stroke="currentColor" stroke-width="2" stroke-linecap="round" opacity="0.5"/>
      <polygon points="2,18 10,12 10,24" fill="currentColor" opacity="0.9"/>
      <polygon points="34,18 26,12 26,24" fill="currentColor" opacity="0.9"/>
    </svg>`,
    space: `<svg viewBox="0 0 36 36" width="36" height="36" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M8 22 L8 26 L28 26 L28 22" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" opacity="0.9"/>
    </svg>`,
  };

  function _iconHtml(iconKey) {
    return ICON_SVG[iconKey] || ICON_SVG['ok'];
  }

  // ---- TV Remote SVG visual ----

  function _buildTVRemoteSVG() {
    return `
      <svg class="welcome-remote-svg" viewBox="0 0 120 260" fill="none" xmlns="http://www.w3.org/2000/svg">
        <!-- Remote body -->
        <rect x="8" y="8" width="104" height="244" rx="24" fill="currentColor" opacity="0.06"/>
        <rect x="8" y="8" width="104" height="244" rx="24" stroke="currentColor" stroke-width="1.5"/>

        <!-- D-pad cluster (centered at 60,88) -->
        <!-- Up -->
        <polygon points="60,56 47,72 73,72" fill="currentColor" opacity="0.5"/>
        <!-- Down -->
        <polygon points="60,120 47,104 73,104" fill="currentColor" opacity="0.5"/>
        <!-- Left -->
        <polygon points="28,88 44,75 44,101" fill="currentColor" opacity="0.5"/>
        <!-- Right -->
        <polygon points="92,88 76,75 76,101" fill="currentColor" opacity="0.5"/>
        <!-- D-pad center (OK) -->
        <circle cx="60" cy="88" r="14" stroke="currentColor" stroke-width="1.5" opacity="0.4"/>
        <circle cx="60" cy="88" r="7" fill="currentColor" opacity="0.25"/>

        <!-- Back button (left) -->
        <circle cx="36" cy="148" r="11" stroke="currentColor" stroke-width="1.5" opacity="0.4"/>
        <path d="M41,143 L31,148 L41,153" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" opacity="0.5"/>

        <!-- Home button (right) -->
        <circle cx="84" cy="148" r="11" stroke="currentColor" stroke-width="1.5" opacity="0.4"/>
        <path d="M79,151 L84,143 L89,151 L89,155 L79,155 Z" stroke="currentColor" stroke-width="1.2" stroke-linejoin="round" opacity="0.5" fill="none"/>

        <!-- Play/Pause button -->
        <rect x="44" y="176" width="32" height="20" rx="6" stroke="currentColor" stroke-width="1.5" opacity="0.35"/>
        <polygon points="56,180 56,192 63,186" fill="currentColor" opacity="0.4"/>
        <rect x="65" y="181" width="2.5" height="10" rx="1.25" fill="currentColor" opacity="0.35"/>
        <rect x="69.5" y="181" width="2.5" height="10" rx="1.25" fill="currentColor" opacity="0.35"/>

        <!-- Menu button -->
        <rect x="44" y="212" width="32" height="18" rx="5" stroke="currentColor" stroke-width="1.5" opacity="0.25"/>
        <line x1="51" y1="218" x2="69" y2="218" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" opacity="0.3"/>
        <line x1="51" y1="222" x2="69" y2="222" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" opacity="0.3"/>
        <line x1="51" y1="226" x2="69" y2="226" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" opacity="0.3"/>
      </svg>`;
  }

  // ---- Keyboard visual ----

  function _buildKeyboardVisual() {
    return `
      <div class="welcome-keyboard">
        <div class="welcome-arrow-cluster">
          <span></span>
          <kbd class="welcome-kbd">↑</kbd>
          <span></span>
          <kbd class="welcome-kbd">←</kbd>
          <kbd class="welcome-kbd">↓</kbd>
          <kbd class="welcome-kbd">→</kbd>
        </div>
        <div class="welcome-key-row">
          <kbd class="welcome-kbd xl">Enter ↵</kbd>
        </div>
        <div class="welcome-key-row">
          <kbd class="welcome-kbd wide">Backspace</kbd>
          <kbd class="welcome-kbd">Esc</kbd>
        </div>
        <div class="welcome-key-row">
          <kbd class="welcome-kbd xl" style="font-size:13px; letter-spacing:0.05em">␣ Space</kbd>
        </div>
        <div class="welcome-key-row">
          <kbd class="welcome-kbd">\`</kbd>
          <kbd class="welcome-kbd">H</kbd>
        </div>
      </div>`;
  }

  // ---- Touch visual ----

  function _buildTouchVisual() {
    return `
      <div class="welcome-touch">
        <div class="welcome-touch-icon">👆</div>
        <div class="welcome-touch-label">Touch-based navigation</div>
      </div>`;
  }

  // ---- Full overlay render ----

  function _render(profile) {
    const v = (typeof DataStore !== 'undefined') ? DataStore.getVersion() : { version: '—', buildNumber: '—' };

    // Visual section
    let visualHtml = '';
    if (profile.shape === 'tv-remote') {
      visualHtml = _buildTVRemoteSVG();
    } else if (profile.shape === 'keyboard') {
      visualHtml = _buildKeyboardVisual();
    } else if (profile.shape === 'touch') {
      visualHtml = _buildTouchVisual();
    }

    // Button mapping rows
    const mappingRows = profile.buttons.map(btn => {
      const iconHtml = _iconHtml(btn.icon);
      return `
        <div class="welcome-mapping-row">
          <div class="welcome-mapping-button">
            <div class="welcome-mapping-icon">${iconHtml}</div>
            <div class="welcome-mapping-label">${_esc(btn.label)}</div>
          </div>
          <div class="welcome-mapping-action">${_esc(btn.appAction)}</div>
        </div>`;
    }).join('');

    _overlayEl.innerHTML = `
      <div class="welcome-card" role="dialog" aria-modal="true" aria-label="Controls reference">
        <div class="welcome-header">
          <div class="welcome-title">Streaming Prototype</div>
          <div class="welcome-version">v${_esc(String(v.version))} &nbsp;·&nbsp; Build ${_esc(String(v.buildNumber))}</div>
          <button class="welcome-close" id="welcome-close-btn" aria-label="Close">&#x2715;</button>
        </div>
        <div class="welcome-subtitle">Welcome! Here's how to get around.</div>
        <div class="welcome-device-pill">
          <span class="welcome-device-dot"></span>
          ${_esc(profile.displayName)}
        </div>
        <div class="welcome-body">
          <div class="welcome-visual">${visualHtml}</div>
          <div class="welcome-mappings">${mappingRows}</div>
        </div>
        <div class="welcome-actions">
          <button class="welcome-got-it focused" id="welcome-got-it-btn" autofocus>Got it</button>
        </div>
        <div class="welcome-footer">
          ${_esc(profile.footerHint || 'You can see this screen again anytime from the debug panel.')}
        </div>
      </div>`;

    // Wire dismiss buttons
    const btn = _overlayEl.querySelector('#welcome-got-it-btn');
    if (btn) btn.addEventListener('click', hide);
    const closeBtn = _overlayEl.querySelector('#welcome-close-btn');
    if (closeBtn) closeBtn.addEventListener('click', hide);
  }

  // ---- Profile loading ----

  async function _loadProfiles() {
    const fetches = PROFILE_IDS.map(id =>
      fetch(`data/device-profiles/${id}.json`)
        .then(r => r.ok ? r.json() : null)
        .catch(() => null)
    );
    const results = await Promise.all(fetches);
    results.forEach((data, i) => {
      if (data) _profiles[PROFILE_IDS[i]] = data;
    });
  }

  // ---- Device detection ----

  function _detect() {
    const ua = (navigator.userAgent || '').toLowerCase();

    // Check mobile first (touch + small viewport) — before UA substring matching
    // so a mobile device with unusual UA still gets the mobile profile
    const hasTouch = navigator.maxTouchPoints > 0 || 'ontouchstart' in window;
    const isSmallScreen = window.screen.width < 1200 && window.screen.height < 900;

    // Walk loaded profiles in this order: TV profiles first, then mobile, then desktop
    const TV_PROFILES = ['vizio', 'firetv', 'androidtv', 'tizen', 'webos', 'roku'];

    for (const id of TV_PROFILES) {
      const profile = _profiles[id];
      if (!profile) continue;
      const subs = (profile.detection && profile.detection.userAgentSubstrings) || [];
      if (subs.some(sub => ua.includes(sub.toLowerCase()))) {
        return id;
      }
    }

    // Mobile: touch + small screen (after TV UA check, since TV browsers don't report touch)
    if (hasTouch && isSmallScreen) return 'mobile';

    // Fallback to desktop
    return WELCOME_SCREEN_DEFAULT_PROFILE;
  }

  // ---- Show / hide ----

  function show(profileIdOverride) {
    if (!_overlayEl) _buildOverlayEl();

    // Resolve active profile: explicit arg > debug override > detected > default
    let profileId = profileIdOverride;
    if (!profileId && typeof DebugConfig !== 'undefined') {
      const override = DebugConfig.get('deviceProfileOverride', 'auto');
      if (override && override !== 'auto') profileId = override;
    }
    if (!profileId) profileId = _detectedId || WELCOME_SCREEN_DEFAULT_PROFILE;

    const profile = _profiles[profileId] || _profiles[WELCOME_SCREEN_DEFAULT_PROFILE];
    if (!profile) {
      console.warn('[WelcomeScreen] No profile found for:', profileId);
      return Promise.resolve();
    }

    _render(profile);

    if (typeof FocusEngine !== 'undefined') FocusEngine.disable();

    // Animate in
    requestAnimationFrame(() => {
      _overlayEl.classList.add('visible');
    });

    _isVisible = true;

    return new Promise(resolve => {
      _resolveShow = resolve;
    });
  }

  function hide() {
    if (!_overlayEl || !_isVisible) return;
    _overlayEl.classList.remove('visible');
    _isVisible = false;

    // Mark as seen (only on real dismiss, not force-mode)
    const force = (typeof DebugConfig !== 'undefined') && DebugConfig.get('forceWelcomeScreen', false);
    if (!force) {
      localStorage.setItem(WELCOME_SCREEN_STORAGE_KEY, 'true');
    }

    if (typeof FocusEngine !== 'undefined') FocusEngine.enable();

    if (_resolveShow) {
      const resolve = _resolveShow;
      _resolveShow = null;
      resolve();
    }
  }

  // ---- Build overlay element ----

  function _buildOverlayEl() {
    _overlayEl = document.createElement('div');
    _overlayEl.id = 'welcome-overlay';
    _overlayEl.setAttribute('role', 'dialog');
    // Click on the backdrop (outside the card) dismisses the overlay
    _overlayEl.addEventListener('click', e => {
      if (e.target === _overlayEl) hide();
    });
    document.body.appendChild(_overlayEl);
  }

  // ---- Keyboard handling ----

  // Capture-phase listener so it fires before FocusEngine and DebugPanel
  document.addEventListener('keydown', e => {
    if (!_isVisible) {
      // H key reopens the screen (when nothing else is consuming input)
      if ((e.key === 'h' || e.key === 'H') && !_isDebugPanelOpen()) {
        e.stopPropagation();
        e.preventDefault();
        show();
      }
      return;
    }

    // Overlay is open — consume ALL key events (prevents bleed-through to app)
    e.stopPropagation();
    e.preventDefault();

    // Ignore autorepeat events — prevents the key held to trigger the debug panel
    // button from immediately re-dismissing the overlay on the next repeat cycle.
    if (e.repeat) return;

    if (
      e.key === 'Enter' || e.key === ' ' || e.key === 'Accept' ||
      e.key === 'Escape' || e.key === 'Backspace' ||
      e.key === 'BrowserBack' || e.key === 'GoBack' ||
      e.key === 'XF86Back' || e.key === 'ArrowLeft'
    ) {
      hide();
    }
  }, { capture: true });

  function _isDebugPanelOpen() {
    return (typeof DebugPanel !== 'undefined') && DebugPanel.isOpen();
  }

  // ---- Utility ----

  function _esc(str) {
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  // ---- Init (called from App.init, returns Promise) ----

  async function init() {
    if (!WELCOME_SCREEN_ENABLED) return;

    await _loadProfiles();
    _detectedId = _detect();

    if (!WELCOME_SCREEN_AUTO_SHOW_ON_FIRST_LAUNCH) return;

    const seen     = localStorage.getItem(WELCOME_SCREEN_STORAGE_KEY) === 'true';
    const force    = (typeof DebugConfig !== 'undefined') && DebugConfig.get('forceWelcomeScreen', false);

    if (seen && !force) return;

    return show();
  }

  return { init, show, hide };

})();
