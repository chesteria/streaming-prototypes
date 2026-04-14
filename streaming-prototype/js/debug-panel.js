// @ts-check
/* ============================================================
   DEBUG PANEL — Developer overlay for TV prototype
   ============================================================ */

/* ============================================================
   DEBUG CONFIG — CSS variable bridge + localStorage persistence
   ============================================================ */

const DEBUG_DEFAULTS = {
  heroCycleInterval: 5000,
  cityCycleInterval: 5000,
  crossfadeDuration: 600,
  controlsAutoHide: 5000,
  focusTransitionSpeed: 200,
  scrollAnimationSpeed: 300,
  playbackSpeed: 1,
  focusGlowOpacity: 0.15,
  focusGlowSpread: 24,
  focusBorderWidth: 2,
  tileCornerRadius: 12,
  tileGap: 16,
  backgroundColor: '#0F1923',
  livingTiles: true,
  heroAutoAdvance: true,
  simulatedPlayback: true,
  showFocusOutlines: false,
  showGridOverlay: false,
  authState: 'anonymous',
  forceWelcomeScreen: false,
  deviceProfileOverride: 'auto',
};

const DebugConfig = (() => {
  const PREFIX = 'debug_';

  function _storageKey(key) {
    return PREFIX + key;
  }

  function get(key, fallback) {
    const stored = localStorage.getItem(_storageKey(key));
    if (stored !== null) {
      // Parse booleans and numbers
      try {
        return JSON.parse(stored);
      } catch (e) {
        return stored;
      }
    }
    if (fallback !== undefined) return fallback;
    return DEBUG_DEFAULTS[key];
  }

  function set(key, value) {
    localStorage.setItem(_storageKey(key), JSON.stringify(value));
    _apply(key, value);
    document.dispatchEvent(new CustomEvent('debugconfig:change', { detail: { key, value } }));
  }

  function reset() {
    Object.keys(DEBUG_DEFAULTS).forEach(key => {
      localStorage.removeItem(_storageKey(key));
    });
    applyAll();
    document.dispatchEvent(new CustomEvent('debugconfig:reset'));
  }

  function applyAll() {
    Object.keys(DEBUG_DEFAULTS).forEach(key => {
      _apply(key, get(key));
    });
  }

  function _rebuildFocusShadow() {
    const opacity = get('focusGlowOpacity');
    const spread = get('focusGlowSpread');
    const width = get('focusBorderWidth');
    const root = document.documentElement;
    root.style.setProperty('--color-focus-glow', `rgba(255,255,255,${opacity})`);
    root.style.setProperty('--focus-box-shadow',
      `0 0 0 ${width}px var(--color-focus-border), 0 0 ${spread}px var(--color-focus-glow)`);
  }

  function _apply(key, value) {
    const root = document.documentElement;
    switch (key) {
      case 'tileCornerRadius':
        root.style.setProperty('--tile-radius', `${value}px`);
        break;
      case 'tileGap':
        root.style.setProperty('--rail-gap', `${value}px`);
        break;
      case 'backgroundColor':
        root.style.setProperty('--color-bg', value);
        document.body.style.background = value;
        break;
      case 'focusTransitionSpeed':
        root.style.setProperty('--t-focus', `${value}ms`);
        break;
      case 'scrollAnimationSpeed':
        root.style.setProperty('--t-scroll', `${value}ms`);
        break;
      case 'crossfadeDuration':
        root.style.setProperty('--t-fade', `${value}ms`);
        break;
      case 'focusGlowOpacity':
      case 'focusGlowSpread':
      case 'focusBorderWidth':
        _rebuildFocusShadow();
        break;
      case 'showFocusOutlines':
        document.body.classList.toggle('debug-focus-outlines', !!value);
        break;
      case 'showGridOverlay': {
        document.body.classList.toggle('debug-grid-overlay', !!value);
        const overlay = document.getElementById('debug-grid-overlay');
        if (overlay) overlay.style.display = value ? 'block' : 'none';
        break;
      }
      default:
        break;
    }
  }

  document.addEventListener('DOMContentLoaded', () => {
    applyAll();
  });

  return { get, set, reset, applyAll };
})();


/* ============================================================
   DEBUG PANEL — DOM overlay with keyboard navigation
   ============================================================ */

const PANEL_SPEC = [
  { type: 'section', label: 'A \u2014 Timing Controls' },
  { type: 'slider', key: 'heroCycleInterval', label: 'Hero Carousel Interval',
    min: 1000, max: 15000, step: 500, unit: 'ms', ref: 'HERO_CYCLE_INTERVAL_MS' },
  { type: 'slider', key: 'cityCycleInterval', label: 'City Tile Cycle',
    min: 1000, max: 15000, step: 500, unit: 'ms', ref: 'CITY_CYCLE_INTERVAL_MS' },
  { type: 'slider', key: 'crossfadeDuration', label: 'Crossfade Duration',
    min: 100, max: 2000, step: 100, unit: 'ms', ref: '--t-fade' },
  { type: 'slider', key: 'controlsAutoHide', label: 'Controls Auto-Hide',
    min: 2000, max: 30000, step: 1000, unit: 'ms', ref: 'CONTROLS_AUTO_HIDE_MS' },
  { type: 'slider', key: 'focusTransitionSpeed', label: 'Focus Transition Speed',
    min: 50, max: 500, step: 25, unit: 'ms', ref: '--t-focus' },
  { type: 'slider', key: 'scrollAnimationSpeed', label: 'Scroll Animation Speed',
    min: 100, max: 800, step: 50, unit: 'ms', ref: '--t-scroll' },
  { type: 'select', key: 'playbackSpeed', label: 'Playback Speed',
    options: [1, 2, 5, 10, 50], unit: 'x', ref: 'PLAYBACK_SPEED' },

  { type: 'section', label: 'B \u2014 Visual Controls' },
  { type: 'slider', key: 'focusGlowOpacity', label: 'Focus Glow Opacity',
    min: 0, max: 0.5, step: 0.01, unit: '', ref: '--color-focus-glow' },
  { type: 'slider', key: 'focusGlowSpread', label: 'Focus Glow Spread',
    min: 0, max: 50, step: 2, unit: 'px', ref: '--focus-box-shadow' },
  { type: 'slider', key: 'focusBorderWidth', label: 'Focus Border Width',
    min: 0, max: 4, step: 1, unit: 'px', ref: '--focus-box-shadow' },
  { type: 'slider', key: 'tileCornerRadius', label: 'Tile Corner Radius',
    min: 0, max: 24, step: 1, unit: 'px', ref: '--tile-radius' },
  { type: 'slider', key: 'tileGap', label: 'Tile Gap',
    min: 4, max: 40, step: 2, unit: 'px', ref: '--rail-gap' },
  { type: 'color', key: 'backgroundColor', label: 'Background Color',
    ref: '--color-bg' },

  { type: 'section', label: 'C \u2014 Feature Toggles' },
  { type: 'toggle', key: 'livingTiles', label: 'Living Tiles', ref: 'startLivingTile()' },
  { type: 'toggle', key: 'heroAutoAdvance', label: 'Hero Auto-Advance', ref: 'HERO_CYCLE_INTERVAL_MS' },
  { type: 'toggle', key: 'simulatedPlayback', label: 'Simulated Playback Timer', ref: 'SIMULATE_PLAYBACK' },
  { type: 'toggle', key: 'showFocusOutlines', label: 'Show Focus Outlines', ref: 'body.debug-focus-outlines' },
  { type: 'toggle', key: 'showGridOverlay', label: 'Show Grid Overlay', ref: 'body.debug-grid-overlay' },
  { type: 'toggle', key: 'forceWelcomeScreen', label: 'Force Welcome Screen On Launch', ref: 'WELCOME_SCREEN_FORCE_ON_LAUNCH' },
  { type: 'select', key: 'deviceProfileOverride', label: 'Device Profile Override',
    options: ['auto', 'desktop', 'mobile', 'vizio', 'firetv', 'androidtv', 'tizen', 'webos', 'roku'],
    unit: '', ref: 'WelcomeScreen' },

  { type: 'section', label: 'D \u2014 Auth State' },
  { type: 'radio', key: 'authState', label: 'Auth State',
    options: [{ value: 'anonymous', label: 'Anonymous (geo-detected)' }] },

  { type: 'section', label: 'E \u2014 App State Controls' },
  { type: 'button', label: 'Show Welcome Screen', action: 'showWelcomeScreen' },
  { type: 'button', label: 'Reload as New User', action: 'reloadAsNewUser' },
  { type: 'button', label: 'Reload Lander Config', action: 'reloadLander' },
  { type: 'button', label: 'Screenshot Mode', action: 'screenshotMode' },
  { type: 'button', label: 'Send Report (QR)', action: 'sendReport' },
  { type: 'button', label: 'View Analytics Log', action: 'viewAnalytics' },
  { type: 'button', label: 'Reset All to Defaults', action: 'resetAll', danger: true },

  { type: 'section', label: 'F \u2014 Version Info' },
  { type: 'info', label: 'Version',  valueKey: 'version' },
  { type: 'info', label: 'Build',    valueKey: 'buildNumber' },
  { type: 'info', label: 'Phase',    valueKey: '_phaseLabel' },
  { type: 'info', label: 'Built',    valueKey: '_builtFormatted' },
  { type: 'info', label: 'Commit',   valueKey: 'gitCommit' },
  { type: 'info', label: 'Branch',   valueKey: 'gitBranch' },

  { type: 'section', label: 'G \u2014 Viewport Diagnostics' },
  { type: 'diagnostic', label: 'Viewport Scale', elementId: 'debug-viewport-scale' },
];

const DebugPanel = (() => {
  let _panel = null;
  let _body = null;
  let _controls = []; // flat array of { spec, rowEl, ... }
  let _focusIdx = 0;
  let _built = false;
  let _open = false;
  let _eventLogEl = null;
  let _eventLogEntries = [];
  const MAX_LOG_ENTRIES = 20;

  // Category colours for the event log (matches reporting.html scheme)
  const _eventCategory = (name) => {
    if (['proto_screen_view','rail_focus','card_focus','card_select','nav_back','nav_exit'].includes(name)) return 'nav';
    if (['proto_video_start','video_pause','video_resume','video_seek','proto_video_complete','video_exit','player_error'].includes(name)) return 'player';
    if (['feedback_triggered','feedback_submitted','feedback_dismissed'].includes(name)) return 'feedback';
    return 'session';
  };

  /* ---- DOM Build ---- */

  function _build() {
    if (_built) return;
    _built = true;

    _panel = document.createElement('div');
    _panel.id = 'debug-panel';
    _panel.setAttribute('aria-label', 'Debug Panel');

    _panel.innerHTML = `
      <div class="dp-header">
        <div class="dp-header-title">Developer Tools</div>
        <div class="dp-header-name">Debug Panel</div>
        <div class="dp-header-hint">
          <kbd>\`</kbd> toggle &nbsp;
          <kbd>ESC</kbd> close &nbsp;
          <kbd>↑↓</kbd> nav &nbsp;
          <kbd>←→</kbd> adjust &nbsp;
          <kbd>↵</kbd> activate
        </div>
      </div>
      <div class="dp-session-panel" id="dp-session-panel">
        <div class="dp-section"><div class="dp-section-title">H &mdash; Research Session</div></div>
        <div class="dp-session-form">
          <input class="dp-participant-input" id="dp-participant-input"
                 type="text" placeholder="P-XXXX" maxlength="6"
                 autocomplete="off" spellcheck="false" />
          <select class="dp-device-select" id="dp-device-select">
            <option value="desktop">Desktop</option>
            <option value="mobile">Mobile</option>
            <option value="vizio">Vizio</option>
            <option value="firetv">Fire TV</option>
            <option value="androidtv">Android TV</option>
            <option value="tizen">Tizen</option>
            <option value="webos">webOS</option>
            <option value="roku">Roku</option>
          </select>
        </div>
        <div class="dp-session-actions">
          <div class="dp-btn dp-btn-start" id="dp-start-session">Start Session</div>
          <div class="dp-btn dp-btn-danger" id="dp-end-session">End Session</div>
        </div>
        <div class="dp-session-status" id="dp-session-status">No active session</div>
      </div>
      <div class="dp-body"></div>
      <div class="dp-event-log-outer">
        <div class="dp-section">
          <div class="dp-section-title" style="display:flex;justify-content:space-between;align-items:center;">
            <span>Live Events</span>
            <span class="dp-copy-log" id="dp-copy-log" title="Copy last ${MAX_LOG_ENTRIES} events as JSON">Copy</span>
          </div>
        </div>
        <div class="dp-event-log" id="dp-event-log"></div>
      </div>
    `;

    _body = _panel.querySelector('.dp-body');
    _eventLogEl = _panel.querySelector('#dp-event-log');
    _buildBody();
    _wireSessionPanel();
    _wireEventLog();
    document.body.appendChild(_panel);
  }

  function _wireSessionPanel() {
    const startBtn  = _panel.querySelector('#dp-start-session');
    const endBtn    = _panel.querySelector('#dp-end-session');
    const input     = _panel.querySelector('#dp-participant-input');
    const select    = _panel.querySelector('#dp-device-select');
    const status    = _panel.querySelector('#dp-session-status');

    // Pre-fill from sessionStorage if a session is already active
    const existing = sessionStorage.getItem('participant_id');
    if (existing) {
      input.value  = existing;
      status.textContent = `Active: ${existing}`;
      status.className   = 'dp-session-status dp-session-active';
    }

    startBtn.addEventListener('click', () => {
      const code    = input.value.trim().toUpperCase();
      const profile = select.value;
      if (!code) { input.focus(); return; }
      if (typeof initSession !== 'undefined') {
        initSession(code, profile);
        status.textContent = `Active: ${code} · ${profile}`;
        status.className   = 'dp-session-status dp-session-active';
      }
    });

    endBtn.addEventListener('click', () => {
      if (typeof endSession !== 'undefined') {
        endSession();
        status.textContent = 'Session ended';
        status.className   = 'dp-session-status';
      }
    });

    // Allow Enter in the input to start session
    input.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') startBtn.click();
      e.stopPropagation(); // prevent debug panel key nav
    });
  }

  function _wireEventLog() {
    // Subscribe to same-tab analytics events
    window.addEventListener('analytics_event', (e) => {
      const { eventName, params, ts } = /** @type {CustomEvent} */ (e).detail;
      _eventLogEntries.push({ eventName, params, ts });
      if (_eventLogEntries.length > MAX_LOG_ENTRIES) _eventLogEntries.shift();
      _appendEventRow(eventName, params, ts);
    });

    _panel.querySelector('#dp-copy-log').addEventListener('click', () => {
      navigator.clipboard.writeText(JSON.stringify(_eventLogEntries, null, 2))
        .then(() => { if (typeof showToast === 'function') showToast('Event log copied'); });
    });
  }

  function _appendEventRow(eventName, params, ts) {
    if (!_eventLogEl) return;
    const cat  = _eventCategory(eventName);
    const time = new Date(ts).toLocaleTimeString('en-US', { hour12: false, hour: '2-digit', minute: '2-digit', second: '2-digit' });
    const row  = document.createElement('div');
    row.className = `dp-event-row dp-event-${cat}`;
    row.innerHTML = `<span class="dp-event-time">${time}</span><span class="dp-event-name">${eventName}</span>`;
    _eventLogEl.appendChild(row);
    // Trim to max
    while (_eventLogEl.children.length > MAX_LOG_ENTRIES) {
      _eventLogEl.removeChild(_eventLogEl.firstChild);
    }
    _eventLogEl.scrollTop = _eventLogEl.scrollHeight;
  }

  function _buildBody() {
    _controls = [];
    _body.innerHTML = '';

    PANEL_SPEC.forEach(spec => {
      if (spec.type === 'section') {
        const sec = document.createElement('div');
        sec.className = 'dp-section';
        sec.innerHTML = `<div class="dp-section-title">${spec.label}</div>`;
        _body.appendChild(sec);
        return;
      }

      const row = document.createElement('div');
      row.className = 'dp-row';

      const controlEntry = { spec, rowEl: row };

      if (spec.type === 'slider') {
        const val = DebugConfig.get(spec.key);
        const displayVal = spec.unit ? `${val}${spec.unit}` : `${val}`;
        row.innerHTML = `
          <div class="dp-row-left">
            <div class="dp-label">${spec.label}</div>
            <div class="dp-ref">${spec.ref}</div>
          </div>
          <div class="dp-row-right">
            <input type="range" class="dp-slider"
              min="${spec.min}" max="${spec.max}" step="${spec.step}" value="${val}" />
            <div class="dp-value">${displayVal}</div>
          </div>
        `;
        const slider = /** @type {HTMLInputElement | null} */ (row.querySelector('.dp-slider'));
        const valueEl = row.querySelector('.dp-value');
        slider.addEventListener('input', () => {
          const newVal = parseFloat(slider.value);
          const disp = spec.unit ? `${newVal}${spec.unit}` : `${newVal}`;
          valueEl.textContent = disp;
          DebugConfig.set(spec.key, newVal);
        });
        controlEntry.sliderEl = slider;
        controlEntry.valueEl = valueEl;

      } else if (spec.type === 'select') {
        const curVal = DebugConfig.get(spec.key);
        row.innerHTML = `
          <div class="dp-row-left">
            <div class="dp-label">${spec.label}</div>
            <div class="dp-ref">${spec.ref}</div>
          </div>
          <div class="dp-row-right">
            <div class="dp-select-group">
              ${spec.options.map(opt => `
                <div class="dp-select-opt${opt === curVal ? ' dp-select-selected' : ''}"
                  data-val="${opt}">${opt}${spec.unit || ''}</div>
              `).join('')}
            </div>
          </div>
        `;

      } else if (spec.type === 'toggle') {
        const val = DebugConfig.get(spec.key);
        row.innerHTML = `
          <div class="dp-row-left">
            <div class="dp-label">${spec.label}</div>
            <div class="dp-ref">${spec.ref}</div>
          </div>
          <div class="dp-row-right">
            <div class="dp-toggle${val ? ' dp-on' : ''}">
              <div class="dp-toggle-thumb"></div>
            </div>
          </div>
        `;

      } else if (spec.type === 'color') {
        const val = DebugConfig.get(spec.key);
        row.innerHTML = `
          <div class="dp-row-left">
            <div class="dp-label">${spec.label}</div>
            <div class="dp-ref">${spec.ref}</div>
          </div>
          <div class="dp-row-right">
            <div class="dp-color-swatch" style="background:${val};"></div>
            <input type="color" class="dp-color-input" value="${val}" />
            <div class="dp-color-value">${val}</div>
          </div>
        `;
        const swatch = /** @type {HTMLElement | null} */ (row.querySelector('.dp-color-swatch'));
        const colorInput = /** @type {HTMLInputElement | null} */ (row.querySelector('.dp-color-input'));
        const colorValue = row.querySelector('.dp-color-value');
        swatch.addEventListener('click', () => colorInput.click());
        colorInput.addEventListener('input', () => {
          const newVal = colorInput.value;
          swatch.style.background = newVal;
          colorValue.textContent = newVal;
          DebugConfig.set(spec.key, newVal);
        });
        controlEntry.colorInputEl = colorInput;

      } else if (spec.type === 'radio') {
        const curVal = DebugConfig.get(spec.key);
        row.innerHTML = `
          <div class="dp-row-left">
            <div class="dp-label">${spec.label}</div>
          </div>
          <div class="dp-row-right">
            <div class="dp-radio-group">
              ${spec.options.map(opt => `
                <div class="dp-radio-opt${opt.value === curVal ? ' dp-radio-selected' : ''}"
                  data-val="${opt.value}">${opt.label}</div>
              `).join('')}
            </div>
          </div>
        `;

      } else if (spec.type === 'button') {
        row.innerHTML = `
          <div class="dp-row-left">
            <div class="dp-label">${spec.label}</div>
          </div>
          <div class="dp-row-right">
            <div class="dp-btn${spec.danger ? ' dp-btn-danger' : ''}">${spec.label}</div>
          </div>
        `;

      } else if (spec.type === 'info') {
        const v = (typeof DataStore !== 'undefined') ? DataStore.getVersion() : {};
        let displayVal = '—';
        if (spec.valueKey === '_phaseLabel') {
          displayVal = `${v.phase || ''} — ${v.label || ''}`.replace(/^ — | — $/, '') || '—';
        } else if (spec.valueKey === '_builtFormatted') {
          displayVal = v.buildDate
            ? new Date(v.buildDate).toLocaleString('en-US',
                { month: 'short', day: 'numeric', year: 'numeric', hour: 'numeric', minute: '2-digit' })
            : '—';
        } else {
          const raw = v[spec.valueKey];
          displayVal = (raw !== undefined && raw !== null) ? String(raw) : '—';
        }
        row.innerHTML = `
          <div class="dp-row-left">
            <div class="dp-label">${spec.label}</div>
          </div>
          <div class="dp-row-right">
            <div class="dp-info-value">${displayVal}</div>
          </div>
        `;
        // info rows are non-interactive — don't push to _controls
        _body.appendChild(row);
        return;

      } else if (spec.type === 'diagnostic') {
        // Pre-populate from ScaleEngine if available — scaleupdate fires before the
        // panel is built (lazy build on first open), so we seed the value here.
        let initialLabel = '—';
        if (typeof ScaleEngine !== 'undefined') {
          const scale = ScaleEngine.getScale();
          const vw = window.innerWidth;
          const vh = window.innerHeight;
          initialLabel = `${scale.toFixed(3)}×  (${vw} × ${vh} → 1920 × 1080)`;
        }
        row.innerHTML = `
          <div class="dp-row-left">
            <div class="dp-label">${spec.label}</div>
          </div>
          <div class="dp-row-right">
            <div class="dp-info-value"><span id="${spec.elementId}">${initialLabel}</span></div>
          </div>
        `;
        // diagnostic rows are non-interactive — don't push to _controls
        _body.appendChild(row);
        return;
      }

      _body.appendChild(row);
      _controls.push(controlEntry);
    });
  }

  /* ---- Navigation ---- */

  function _focusControl(idx) {
    _controls.forEach(c => c.rowEl.classList.remove('dp-focused'));
    if (_controls[idx]) {
      _controls[idx].rowEl.classList.add('dp-focused');
      _controls[idx].rowEl.scrollIntoView({ block: 'nearest' });
    }
    _focusIdx = idx;
  }

  function _focusNext() {
    const next = Math.min(_focusIdx + 1, _controls.length - 1);
    _focusControl(next);
  }

  function _focusPrev() {
    const prev = Math.max(_focusIdx - 1, 0);
    _focusControl(prev);
  }

  function _adjustControl(dir) {
    const entry = _controls[_focusIdx];
    if (!entry) return;
    const spec = entry.spec;

    if (spec.type === 'slider') {
      const slider = entry.sliderEl;
      const valueEl = entry.valueEl;
      let newVal = parseFloat(slider.value) + spec.step * dir;
      newVal = Math.max(spec.min, Math.min(spec.max, newVal));
      // Round to avoid floating point drift
      const decimals = String(spec.step).includes('.') ? String(spec.step).split('.')[1].length : 0;
      newVal = parseFloat(newVal.toFixed(decimals));
      slider.value = newVal;
      const disp = spec.unit ? `${newVal}${spec.unit}` : `${newVal}`;
      valueEl.textContent = disp;
      DebugConfig.set(spec.key, newVal);

    } else if (spec.type === 'select') {
      const curVal = DebugConfig.get(spec.key);
      const opts = spec.options;
      const curIdx = opts.indexOf(curVal);
      let newIdx = curIdx + dir;
      if (newIdx < 0) newIdx = 0;
      if (newIdx >= opts.length) newIdx = opts.length - 1;
      const newVal = opts[newIdx];
      DebugConfig.set(spec.key, newVal);
      // Update DOM
      const optEls = entry.rowEl.querySelectorAll('.dp-select-opt');
      optEls.forEach((el, i) => {
        el.classList.toggle('dp-select-selected', i === newIdx);
      });
    }
    // toggles: no-op for left/right
  }

  function _activateControl() {
    const entry = _controls[_focusIdx];
    if (!entry) return;
    const spec = entry.spec;

    if (spec.type === 'toggle') {
      const curVal = DebugConfig.get(spec.key);
      const newVal = !curVal;
      DebugConfig.set(spec.key, newVal);
      const toggleEl = entry.rowEl.querySelector('.dp-toggle');
      if (toggleEl) toggleEl.classList.toggle('dp-on', newVal);

    } else if (spec.type === 'color') {
      if (entry.colorInputEl) entry.colorInputEl.click();

    } else if (spec.type === 'button') {
      _handleButtonAction(spec.action);
    }
  }

  function _handleButtonAction(action) {
    if (action === 'showWelcomeScreen') {
      close();
      if (typeof WelcomeScreen !== 'undefined') {
        // Defer show() past the current keydown event. Without this, the debug panel's
        // keydown listener (registered first) calls show() — setting _isVisible=true —
        // and then the welcome screen's listener fires on the SAME event, sees
        // _isVisible=true, and immediately calls hide(). The rAF in show() then adds
        // the 'visible' class after hide() already cleared it, leaving the overlay
        // visually open but with _isVisible=false and no way to dismiss it.
        setTimeout(() => WelcomeScreen.show(), 0);
      } else {
        if (typeof showToast === 'function') showToast('Welcome screen not loaded');
      }
    } else if (action === 'reloadAsNewUser') {
      localStorage.removeItem('welcomeScreenSeen');
      localStorage.removeItem('analytics_participantId');
      location.reload();
    } else if (action === 'reloadLander') {
      location.reload();
    } else if (action === 'screenshotMode') {
      close();
      document.body.classList.add('screenshot-mode');
      if (typeof showToast === 'function') {
        showToast('Screenshot mode \u2014 press ` to restore');
      }
      // One-time backtick handler to exit screenshot mode
      const exitHandler = (e) => {
        if (e.key === '`') {
          document.body.classList.remove('screenshot-mode');
          document.removeEventListener('keydown', exitHandler, { capture: true });
        }
      };
      document.addEventListener('keydown', exitHandler, { capture: true });
    } else if (action === 'sendReport') {
      close();
      if (typeof FeedbackSystem !== 'undefined' && FeedbackSystem.showQRExport) {
        FeedbackSystem.showQRExport();
      } else {
        if (typeof showToast === 'function') showToast('Analytics system not loaded');
      }
    } else if (action === 'viewAnalytics') {
      if (typeof Analytics !== 'undefined') {
        const events = Analytics.getEvents();
        const count = events.length;
        const sessions = new Set(events.map(e => e.sessionId)).size;
        const participant = Analytics.getParticipantId() || 'not set';
        if (typeof showToast === 'function') {
          showToast(`${count} events · ${sessions} sessions · ID: ${participant}`);
        }
        console.log('[Analytics] Events stored:', events);
      } else {
        if (typeof showToast === 'function') showToast('Analytics not loaded');
      }
    } else if (action === 'resetAll') {
      DebugConfig.reset();
      location.reload();
    }
  }

  /* ---- Open / Close / Toggle ---- */

  function open() {
    _build();
    _panel.classList.add('open');
    _open = true;
    if (typeof FocusEngine !== 'undefined' && FocusEngine.disable) {
      FocusEngine.disable();
    }
    _focusIdx = 0;
    _focusControl(0);
    try { if (typeof trackEvent !== 'undefined') trackEvent('debug_panel_open', {}); } catch (e) {}
  }

  function close() {
    if (!_panel) return;
    _panel.classList.remove('open');
    _open = false;
    if (typeof FocusEngine !== 'undefined' && FocusEngine.enable) {
      FocusEngine.enable();
    }
    _controls.forEach(c => c.rowEl.classList.remove('dp-focused'));
  }

  function toggle() {
    if (_open) {
      close();
    } else {
      open();
    }
  }

  function isOpen() {
    return _open;
  }

  /* ---- Keyboard Handler ---- */

  // Triple-LEFT rapid combo to open panel from a TV remote
  // Press LEFT three times within 800ms from anywhere to toggle
  let _leftCount = 0;
  let _leftTimer = null;
  document.addEventListener('keydown', (e) => {
    if (e.key === 'ArrowLeft') {
      // Only count toward the combo when nav bar has focus
      if (!document.querySelector('.nav-tab.nav-focused')) {
        _leftCount = 0;
        return;
      }
      _leftCount++;
      clearTimeout(_leftTimer);
      if (_leftCount >= 3) {
        _leftCount = 0;
        toggle();
        return;
      }
      _leftTimer = setTimeout(() => { _leftCount = 0; }, 800);
    } else {
      // Any non-left key resets the combo
      _leftCount = 0;
      clearTimeout(_leftTimer);
    }
  }); // not capture — let it coexist with FocusEngine

  document.addEventListener('keydown', (e) => {
    // Backtick always toggles (capture phase — fires before FocusEngine)
    if (e.key === '`') {
      e.stopPropagation();
      e.preventDefault();
      toggle();
      return;
    }

    if (!_open) return;

    // Consume all keys when panel is open
    e.stopPropagation();

    if (e.key === 'Escape' || e.key === 'GoBack' || e.key === 'BrowserBack') {
      e.preventDefault();
      close();
      return;
    }
    if (e.key === 'ArrowDown' || e.key === 's' || e.key === 'S') {
      e.preventDefault();
      _focusNext();
      return;
    }
    if (e.key === 'ArrowUp' || e.key === 'w' || e.key === 'W') {
      e.preventDefault();
      _focusPrev();
      return;
    }
    if (e.key === 'ArrowLeft' || e.key === 'a' || e.key === 'A') {
      e.preventDefault();
      _adjustControl(-1);
      return;
    }
    if (e.key === 'ArrowRight' || e.key === 'd' || e.key === 'D') {
      e.preventDefault();
      _adjustControl(1);
      return;
    }
    if (e.key === 'Enter' || e.key === 'Accept') {
      e.preventDefault();
      _activateControl();
      return;
    }
  }, { capture: true });

  // Fire config_changed event whenever a debug config value changes
  document.addEventListener('debugconfig:change', (e) => {
    try {
      if (typeof trackEvent !== 'undefined') {
        const { key, value } = /** @type {CustomEvent} */ (e).detail;
        trackEvent('config_changed', { config_key: key, config_value: String(value) });
      }
    } catch (err) { /* fail silently */ }
  });

  return { open, close, toggle, isOpen };
})();

/* ---- Viewport Scale Diagnostic — updated by ScaleEngine via scaleupdate event ---- */
window.addEventListener('scaleupdate', (e) => {
  const { scale, viewportWidth, viewportHeight, forced } = /** @type {CustomEvent} */ (e).detail;
  const label = forced
    ? `${scale.toFixed(3)}× FORCED (${viewportWidth} × ${viewportHeight})`
    : `${scale.toFixed(3)}×  (${viewportWidth} × ${viewportHeight} → 1920 × 1080)`;
  const el = document.getElementById('debug-viewport-scale');
  if (el) el.textContent = label;
});
