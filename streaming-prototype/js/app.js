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
    if (history.length === 0) return false;
    const prev = history.pop();
    navigate(prev.screenId, prev.params, true);
    return true;
  }

  /**
   * Initialize app: set up container, register screens, load data, go to lander.
   */
  async function init() {
    appEl = document.getElementById('app');

    // Initialize focus engine
    FocusEngine.init();

    // Register all screens
    registerScreen(LanderScreen);
    registerScreen(SeriesPDPScreen);
    registerScreen(PlayerScreen);

    // Load all data
    await DataStore.init();

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
