/* ============================================================
   APP — Router and screen manager
   ============================================================ */

const App = (function() {

  // Registry of all screens
  const screens = {};

  // Navigation history stack
  const history = [];

  // Current active screen
  let activeScreen = null;

  // Container element
  let appEl = null;

  /**
   * Register a screen module.
   * Each screen must export: { id, init, onFocus, onBlur, destroy }
   */
  function registerScreen(screenModule) {
    screens[screenModule.id] = screenModule;
  }

  /**
   * Navigate to a screen by id, passing optional params.
   * Pushes to history so BACK works.
   */
  async function navigate(screenId, params = {}, replace = false) {
    if (!screens[screenId]) {
      console.error(`Screen not found: ${screenId}`);
      return;
    }

    // Blur current screen
    if (activeScreen) {
      activeScreen.onBlur && activeScreen.onBlur();
      if (replace) activeScreen.destroy?.();
      const currentEl = appEl.querySelector(`.screen[data-screen="${activeScreen.id}"]`);
      if (currentEl) {
        currentEl.classList.remove('active');
      }
    }

    // Push to history (unless replace mode)
    if (!replace && activeScreen) {
      history.push({ screenId: activeScreen.id, params: activeScreen._params });
    }

    // Get or create the screen DOM element
    let screenEl = appEl.querySelector(`.screen[data-screen="${screenId}"]`);
    if (screenEl) {
      // Destroy and re-create to ensure fresh state
      screenEl.innerHTML = '';
    } else {
      screenEl = document.createElement('div');
      screenEl.className = 'screen';
      screenEl.setAttribute('data-screen', screenId);
      appEl.appendChild(screenEl);
    }

    // Initialize the screen
    const screenModule = screens[screenId];
    screenModule._params = params;
    await screenModule.init(screenEl, params);

    // Show it
    screenEl.classList.add('active');
    activeScreen = screenModule;

    // Give focus
    screenModule.onFocus && screenModule.onFocus();
  }

  /**
   * Go back to previous screen in history.
   */
  function back() {
    if (history.length === 0) {
      // No history — user pressed BACK from lander (top of stack)
      try {
        if (typeof Analytics !== 'undefined') {
          const summary = Analytics.getSessionSummary();
          Analytics.track('session_end', summary);
        }
      } catch (e) { /* fail silently */ }
      return false;
    }
    const prev = history.pop();
    navigate(prev.screenId, prev.params, true);
    return true;
  }

  /**
   * Initialize app: set up container, register screens, load data, go to lander.
   */
  // === VERSIONING CONFIG ===
  const LOG_VERSION_ON_LAUNCH = true;

  function _initVersionDisplay() {
    const v = DataStore.getVersion();

    // Console log
    if (LOG_VERSION_ON_LAUNCH) {
      const built = v.buildDate
        ? new Date(v.buildDate).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })
        : 'unknown date';
      console.log(
        `[app] Streaming Prototype v${v.version} (Build ${v.buildNumber}) — ${v.phase} — ${v.label}`
      );
      console.log(
        `[app] Built ${built} from commit ${v.gitCommit} on ${v.gitBranch}`
      );
    }

    // Update the #build-stamp element
    const stamp = document.getElementById('build-stamp');
    if (stamp) {
      stamp.textContent = `v${v.version} \u00b7 Build ${v.buildNumber}`;
    }

    // Update HTML meta tags
    const metaVersion = document.querySelector('meta[name="app-version"]');
    const metaBuild   = document.querySelector('meta[name="app-build"]');
    if (metaVersion) metaVersion.setAttribute('content', v.version);
    if (metaBuild)   metaBuild.setAttribute('content', String(v.buildNumber));
  }

  async function init() {
    appEl = document.getElementById('app');

    // Initialize focus engine
    FocusEngine.init();

    // Register all screens
    registerScreen(LanderScreen);
    registerScreen(SeriesPDPScreen);
    registerScreen(PlayerScreen);

    // Load all data (includes version.json)
    await DataStore.init();

    // Display version info
    _initVersionDisplay();

    // Show welcome screen if first launch (awaited — lander loads after dismiss)
    await WelcomeScreen.init();

    // Show participant ID prompt on first visit, sequenced AFTER the welcome
    // screen resolves so both overlays never appear simultaneously.
    if (typeof Analytics !== 'undefined' && Analytics.isFirstVisit() &&
        typeof FeedbackSystem !== 'undefined') {
      await new Promise(resolve => FeedbackSystem.showParticipantPrompt(resolve));
    }

    // Navigate to lander
    navigate('lander', {}, true);
  }

  return {
    init,
    navigate,
    back,
    registerScreen,
  };

})();

// Boot when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
  App.init().catch(err => {
    console.error('App init failed:', err);
  });
});
