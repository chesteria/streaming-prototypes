/* ============================================================
   LANDER SCREEN — Home screen with configurable rails
   ============================================================ */

// === TIMING (configurable) ===
const HERO_CYCLE_INTERVAL_MS   = 5000;
const CITY_CYCLE_INTERVAL_MS   = 5000;
const FADE_DURATION_MS         = 600;
const FOCUS_TRANSITION_MS      = 200;
const SCROLL_TRANSITION_MS     = 300;

// === SIZES (configurable) ===
const HERO_TILE_WIDTH          = 828;
const HERO_TILE_HEIGHT         = 493;
const HERO_SIDE_WIDTH          = 360;
const PORTRAIT_TILE_W          = 180;
const PORTRAIT_TILE_H          = 270;
const LANDSCAPE_TILE_W         = 280;
const LANDSCAPE_TILE_H         = 158;
const CHANNEL_TILE_W           = 440;
const CHANNEL_TILE_H           = 270;
const TILE_GAP                 = 16;

const LanderScreen = {
  id: 'lander',

  // ---- internal state ----
  _container: null,
  _scrollEl: null,
  _railModules: [],    // Array of rail objects, each with a focus handler
  _activeRailIdx: 0,   // Which rail zone has focus (0 = nav, 1+ = rails)
  _navZone: null,
  _scrollY: 0,
  _cityTimers: [],
  _heroTimer: null,

  async init(container, params) {
    this._container = container;
    this._container.className = 'screen screen-lander';
    this._railModules = [];
    this._cityTimers = [];
    this._screenEnterTime = Date.now();

    // Read saved state from container (set by onBlur on BACK navigation)
    const savedRailIdx = container._savedRailIdx;
    const savedScrollY = container._savedScroll;
    const isReturning  = !!savedRailIdx;
    delete container._savedRailIdx;
    delete container._savedScroll;

    this._activeRailIdx = savedRailIdx !== undefined ? savedRailIdx : 0;

    // Fire session_start on first lander init (not on BACK return)
    if (!isReturning) {
      try {
        if (typeof Analytics !== 'undefined') {
          const prevCount = parseInt(localStorage.getItem('analytics_sessionCount') || '1');
          Analytics.track('session_start', {
            deviceType: Analytics.getDeviceType(),
            screenResolution: `${window.screen.width}x${window.screen.height}`,
            configVersion: 'lander-default',
            returningParticipant: prevCount > 1,
            previousSessionCount: Math.max(0, prevCount - 1),
          });
        }
      } catch (e) { /* fail silently */ }
    }

    // Build DOM
    container.innerHTML = `
      <div class="lander-scroll" id="lander-scroll">
        <div id="lander-rails"></div>
      </div>
      ${buildNav()}
    `;

    this._scrollEl = container.querySelector('#lander-scroll');
    const railsEl = container.querySelector('#lander-rails');

    // Build nav zone
    this._navZone = buildNavZone(container.querySelector('.top-nav'));

    // Load config and build rails
    const config = DataStore.getLanderConfig();
    for (const railConfig of config.rails) {
      const module = await buildRail(railConfig, railsEl);
      if (module) this._railModules.push(module);
    }

    // Restore scroll position (no transition to avoid flash)
    if (savedScrollY) {
      this._scrollY = savedScrollY;
      this._scrollEl.style.transition = 'none';
      this._scrollEl.style.transform = `translateY(${this._scrollY}px)`;
      // Re-enable transition on next frame
      requestAnimationFrame(() => {
        this._scrollEl.style.transition = '';
      });
    }

    // Listen for debug config changes
    this._debugConfigHandler = (e) => {
      const { key } = e.detail;
      if (key === 'heroCycleInterval' || key === 'heroAutoAdvance') {
        const heroRail = this._railModules[0];
        if (heroRail && heroRail.updateTimers) heroRail.updateTimers();
      }
      if (key === 'livingTiles' || key === 'cityCycleInterval') {
        _stopAllLivingTiles();
        if (DebugConfig.get('livingTiles', true)) _restartAllLivingTiles();
      }
    };
    document.addEventListener('debugconfig:change', this._debugConfigHandler);
  },

  onFocus() {
    FocusEngine.setHandler((action) => this._handleKey(action));

    // Restore focus
    if (this._activeRailIdx === 0) {
      this._navZone.activate();
    } else {
      const rail = this._railModules[this._activeRailIdx - 1];
      if (rail) rail.onEnter && rail.onEnter();
    }

    // Restart living tile timers
    _restartAllLivingTiles();
  },

  onBlur() {
    this._navZone.deactivate();
    this._railModules.forEach(r => r.onLeave && r.onLeave());
    this._stopCityTimers();
    clearInterval(this._heroTimer);
    // Save scroll position on the params object for restoration
    if (this._container) {
      this._container._savedScroll = this._scrollY;
      this._container._savedRailIdx = this._activeRailIdx;
    }
  },

  destroy() {
    this._stopCityTimers();
    clearInterval(this._heroTimer);
    _stopAllLivingTiles();
    if (this._debugConfigHandler) {
      document.removeEventListener('debugconfig:change', this._debugConfigHandler);
    }
  },

  _handleKey(action) {
    if (this._activeRailIdx === 0) {
      // Nav is focused
      if (action === 'LEFT' || action === 'RIGHT') {
        this._navZone.move(action);
      } else if (action === 'OK') {
        this._navZone.select();
      } else if (action === 'DOWN') {
        this._navZone.deactivate();
        this._activeRailIdx = 1;
        this._enterRail(0);
      }
    } else {
      const railIdx = this._activeRailIdx - 1;
      const rail = this._railModules[railIdx];
      if (!rail) return;

      const result = rail.handleKey(action);

      if (result === 'UP') {
        // Fire rail_engagement before leaving
        try {
          if (typeof Analytics !== 'undefined' && rail._analyticsState) {
            const s = rail._analyticsState;
            Analytics.track('rail_engagement', {
              screen: 'lander',
              rail: s.railId,
              railIndex: railIdx,
              tilesViewed: s.maxTileReached + 1,
              totalTiles: s.totalTiles,
              dwellTimeMs: Date.now() - s.enterTime,
              selectedTile: s.selectedTile,
              scrolledPastWithoutEngaging: s.maxTileReached === 0 && s.selectedTile === null,
            });
          }
        } catch (e) { /* fail silently */ }

        rail.onLeave && rail.onLeave();
        if (railIdx === 0) {
          // Go back to nav
          this._activeRailIdx = 0;
          this._navZone.activate();
          this._scrollToY(0);
        } else {
          this._activeRailIdx = railIdx; // railIdx + 1 - 1
          this._enterRail(railIdx - 1);
        }
      } else if (result === 'DOWN') {
        // Fire rail_engagement before leaving
        try {
          if (typeof Analytics !== 'undefined' && rail._analyticsState) {
            const s = rail._analyticsState;
            Analytics.track('rail_engagement', {
              screen: 'lander',
              rail: s.railId,
              railIndex: railIdx,
              tilesViewed: s.maxTileReached + 1,
              totalTiles: s.totalTiles,
              dwellTimeMs: Date.now() - s.enterTime,
              selectedTile: s.selectedTile,
              scrolledPastWithoutEngaging: s.maxTileReached === 0 && s.selectedTile === null,
            });
          }
        } catch (e) { /* fail silently */ }

        rail.onLeave && rail.onLeave();
        if (railIdx < this._railModules.length - 1) {
          this._activeRailIdx = railIdx + 2;
          this._enterRail(railIdx + 1);

          // Track scroll depth
          try {
            if (typeof Analytics !== 'undefined') {
              const newRail = this._railModules[railIdx + 1];
              // H6: compute which rail elements are currently in the viewport
              const viewportH = window.innerHeight || 1080;
              const railsVisible = this._railModules
                .filter(r => {
                  if (!r.element) return false;
                  const rect = r.element.getBoundingClientRect();
                  return rect.bottom > 0 && rect.top < viewportH;
                })
                .map(r => r._analyticsState?.railId || 'unknown');
              Analytics.track('scroll_depth', {
                screen: 'lander',
                maxDepthRail: newRail?._analyticsState?.railId || `rail-${railIdx + 1}`,
                maxDepthIndex: railIdx + 1,
                totalRails: this._railModules.length,
                railsVisible,
              });
            }
          } catch (e) { /* fail silently */ }
        }
        // At the bottom — no wrap
      } else if (result && result.action === 'NAVIGATE') {
        // Track tile_select and navigation before navigating
        try {
          if (typeof Analytics !== 'undefined') {
            const s = rail._analyticsState;
            if (s) {
              Analytics.track('tile_select', {
                screen: 'lander',
                rail: s.railId,
                railIndex: railIdx,
                tileIndex: s.currentTileIdx || 0,
                itemId: result.params?.showId || result.params?.channelId || '',
                itemTitle: s.focusedItemTitle || '',
                timeOnScreenMs: Date.now() - (this._screenEnterTime || Date.now()),
                tilesViewedInRail: s.maxTileReached + 1,
              });
              if (s) s.selectedTile = s.currentTileIdx || 0;
            }
            Analytics.track('navigation', {
              from: 'lander',
              to: result.screen,
              trigger: 'tile-select',
              itemId: result.params?.showId || result.params?.channelId || '',
              sourceRail: rail._analyticsState?.railId || `rail-${railIdx}`,
              sourceIndex: rail._analyticsState?.currentTileIdx || 0,
            });
          }
        } catch (e) { /* fail silently */ }

        App.navigate(result.screen, result.params);
      }
    }
  },

  _enterRail(railIdx) {
    const rail = this._railModules[railIdx];
    if (!rail) return;
    rail.onEnter && rail.onEnter();
    this._scrollRailIntoView(railIdx);
  },

  _scrollRailIntoView(railIdx) {
    const rail = this._railModules[railIdx];
    if (!rail || !rail.element) return;
    const el = rail.element;
    const elTop = el.offsetTop;
    const targetY = -Math.max(0, elTop - 70);
    this._scrollToY(targetY);
  },

  _scrollToY(y) {
    this._scrollY = y;
    this._scrollEl.style.transition = `transform ${SCROLL_TRANSITION_MS}ms cubic-bezier(0.25,0.46,0.45,0.94)`;
    this._scrollEl.style.transform = `translateY(${y}px)`;
  },

  _stopCityTimers() {
    this._cityTimers.forEach(t => clearInterval(t));
    this._cityTimers = [];
  },
};

/* ============================================================
   NAV BUILDER
   ============================================================ */

function buildNav() {
  return `
    <nav class="top-nav" id="top-nav">
      <div class="nav-left">
        <div class="nav-tab" data-nav-tab="search">
          <svg viewBox="0 0 24 24"><path d="M21 21l-4.35-4.35M17 11A6 6 0 1 1 5 11a6 6 0 0 1 12 0z" stroke="currentColor" stroke-width="2" fill="none" stroke-linecap="round"/></svg>
        </div>
        <div class="nav-tab active" data-nav-tab="for-you">For You</div>
        <div class="nav-tab" data-nav-tab="live">Live</div>
        <div class="nav-tab" data-nav-tab="movies">Movies</div>
        <div class="nav-tab" data-nav-tab="shows">Shows</div>
        <div class="nav-tab" data-nav-tab="settings">
          <svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="3" stroke="currentColor" stroke-width="2" fill="none"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" stroke="currentColor" stroke-width="2" fill="none"/></svg>
        </div>
      </div>
      <div class="nav-right">
        <div class="nav-location">
          <svg viewBox="0 0 24 24"><path d="M21 10c0 7-9 13-9 13S3 17 3 10a9 9 0 1 1 18 0z" stroke="currentColor" stroke-width="2" fill="none"/><circle cx="12" cy="10" r="3" stroke="currentColor" stroke-width="2" fill="none"/></svg>
          ${(DataStore.getDetectedCity() || {}).name || 'Location'}
        </div>
        <div class="nav-avatar">
          <img src="https://picsum.photos/seed/avatar1/72/72" alt="Profile" />
        </div>
      </div>
    </nav>
  `;
}

function buildNavZone(navEl) {
  const tabs = Array.from(navEl.querySelectorAll('.nav-tab'));
  let currentIdx = 1; // "For You" is default active
  let focused = false;

  function activate() {
    focused = true;
    tabs[currentIdx].classList.add('nav-focused');
  }

  function deactivate() {
    focused = false;
    tabs.forEach(t => t.classList.remove('nav-focused'));
  }

  function move(dir) {
    tabs[currentIdx].classList.remove('nav-focused');
    if (dir === 'LEFT' && currentIdx > 0) currentIdx--;
    else if (dir === 'RIGHT' && currentIdx < tabs.length - 1) currentIdx++;
    tabs[currentIdx].classList.add('nav-focused');
  }

  function select() {
    const tab = tabs[currentIdx];
    const name = tab.dataset.navTab || tab.textContent.trim();
    showToast(`Navigating to ${name}…`);
  }

  return { activate, deactivate, move, select };
}

/* ============================================================
   RAIL BUILDERS — Returns a rail controller object
   ============================================================ */

async function buildRail(config, container) {
  switch (config.type) {
    case 'hero-carousel':     return buildHeroCarousel(config, container);
    case 'continue-watching': return buildContinueWatchingRail(config, container);
    case 'live-channels':     return buildLiveChannelsRail(config, container);
    case 'local-cities':      return buildLocalCitiesRail(config, container);
    case 'genre-pills':       return buildGenrePillsRail(config, container);
    case 'screamer':          return buildScreamer(config, container);
    case 'standard-rail':     return buildStandardRail(config, container);
    case 'marketing-banner':  return buildMarketingBanner(config, container);
    default:
      console.warn('Unknown rail type:', config.type);
      return null;
  }
}

/* ---- HERO CAROUSEL ---- */
function buildHeroCarousel(config, container) {
  const items = DataStore.getFeaturedItems();
  if (!items.length) return null;

  const section = document.createElement('div');
  section.className = 'hero-carousel rail-section';
  container.appendChild(section);

  // Build hero items HTML
  const trackEl = document.createElement('div');
  trackEl.className = 'hero-track';

  items.forEach((item, i) => {
    const tile = buildHeroTile(item, i === 0);
    trackEl.appendChild(tile);
  });

  section.appendChild(trackEl);

  // State
  let focusedIdx = 0;
  let isActive = false;
  let autoTimer = null;

  function getTile(i) { return trackEl.children[i]; }

  function focusTile(idx, prevIdx) {
    if (prevIdx !== undefined && prevIdx !== idx) {
      getTile(prevIdx).classList.remove('focused');
    }
    getTile(idx).classList.add('focused');
    scrollHeroToIndex(trackEl, idx, items.length);
  }

  function scrollHeroToIndex(track, idx) {
    // Center focused tile: pad-left + idx * (tileW + gap)
    const padLeft = 60;
    const tileW = HERO_TILE_WIDTH;
    const gap = 16;
    const offset = padLeft + idx * (tileW + gap);
    // Center it: (1920 - tileW) / 2 = 500
    const centerOffset = (1920 - tileW) / 2;
    let translateX = centerOffset - offset;
    if (idx === 0) translateX = 0;
    track.style.transform = `translateX(${translateX}px)`;
  }

  function startAutoAdvance() {
    clearInterval(autoTimer);
    if (!DebugConfig.get('heroAutoAdvance', true)) return;
    autoTimer = setInterval(() => {
      if (!isActive) return;
      const prev = focusedIdx;
      const prevDwell = Math.max(0, Date.now() - (heroAnalyticsState.enterTime || Date.now()));
      focusedIdx = (focusedIdx + 1) % items.length;
      heroAnalyticsState.currentTileIdx = focusedIdx;
      heroAnalyticsState.enterTime = Date.now();
      heroAnalyticsState.focusedItemTitle = items[focusedIdx]?.title || items[focusedIdx]?.name || '';
      if (focusedIdx > heroAnalyticsState.maxTileReached) heroAnalyticsState.maxTileReached = focusedIdx;
      // M2: fire focus_change on auto-advance
      try {
        if (typeof Analytics !== 'undefined') {
          Analytics.track('focus_change', {
            from: { screen: 'lander', zone: 'hero-carousel', index: prev, itemId: items[prev]?.id || '' },
            to: { screen: 'lander', zone: 'hero-carousel', index: focusedIdx, itemId: items[focusedIdx]?.id || '' },
            method: 'auto-advance',
            dwellTimeMs: prevDwell,
          });
        }
      } catch (e) { /* fail silently */ }
      focusTile(focusedIdx, prev);
    }, DebugConfig.get('heroCycleInterval', HERO_CYCLE_INTERVAL_MS));
  }

  const heroAnalyticsState = {
    railId: 'hero-carousel',
    enterTime: 0,
    currentTileIdx: focusedIdx,
    maxTileReached: 0,
    totalTiles: items.length,
    selectedTile: null,
    focusedItemTitle: items[focusedIdx]?.title || items[focusedIdx]?.name || '',
  };

  return {
    element: section,
    _analyticsState: heroAnalyticsState,
    onEnter() {
      isActive = true;
      heroAnalyticsState.enterTime = Date.now();
      heroAnalyticsState.currentTileIdx = focusedIdx;
      heroAnalyticsState.maxTileReached = focusedIdx;
      heroAnalyticsState.selectedTile = null;
      heroAnalyticsState.focusedItemTitle = items[focusedIdx]?.title || items[focusedIdx]?.name || '';
      focusTile(focusedIdx);
      startAutoAdvance();
    },
    onLeave() {
      isActive = false;
      clearInterval(autoTimer);
      getTile(focusedIdx).classList.remove('focused');
    },
    updateTimers() { if (isActive) startAutoAdvance(); },
    handleKey(action) {
      if (action === 'UP') return 'UP';
      if (action === 'DOWN') return 'DOWN';
      if (action === 'LEFT') {
        if (focusedIdx > 0) {
          const prevIdx2 = focusedIdx;
          const prevDwell = Math.max(0, Date.now() - (heroAnalyticsState.enterTime || Date.now()));
          try {
            if (typeof Analytics !== 'undefined') {
              Analytics.track('focus_change', {
                from: { screen: 'lander', zone: 'hero-carousel', index: prevIdx2, itemId: items[prevIdx2]?.id || '' },
                to: { screen: 'lander', zone: 'hero-carousel', index: focusedIdx - 1, itemId: items[focusedIdx - 1]?.id || '' },
                method: 'dpad-left',
                dwellTimeMs: prevDwell,
              });
            }
          } catch (e) { /* fail silently */ }
          focusedIdx--;
          heroAnalyticsState.currentTileIdx = focusedIdx;
          heroAnalyticsState.enterTime = Date.now();
          heroAnalyticsState.focusedItemTitle = items[focusedIdx]?.title || items[focusedIdx]?.name || '';
          focusTile(focusedIdx, prevIdx2);
          startAutoAdvance();
        } else {
          try {
            if (typeof Analytics !== 'undefined') {
              Analytics.track('dead_end', { screen: 'lander', zone: 'hero-carousel', index: focusedIdx, direction: 'left', note: 'at first item' });
            }
          } catch (e) { /* fail silently */ }
        }
        return 'HANDLED';
      }
      if (action === 'RIGHT') {
        if (focusedIdx < items.length - 1) {
          const prevIdx2 = focusedIdx;
          const prevDwell = Math.max(0, Date.now() - (heroAnalyticsState.enterTime || Date.now()));
          try {
            if (typeof Analytics !== 'undefined') {
              Analytics.track('focus_change', {
                from: { screen: 'lander', zone: 'hero-carousel', index: prevIdx2, itemId: items[prevIdx2]?.id || '' },
                to: { screen: 'lander', zone: 'hero-carousel', index: focusedIdx + 1, itemId: items[focusedIdx + 1]?.id || '' },
                method: 'dpad-right',
                dwellTimeMs: prevDwell,
              });
            }
          } catch (e) { /* fail silently */ }
          focusedIdx++;
          heroAnalyticsState.currentTileIdx = focusedIdx;
          heroAnalyticsState.enterTime = Date.now();
          heroAnalyticsState.focusedItemTitle = items[focusedIdx]?.title || items[focusedIdx]?.name || '';
          if (focusedIdx > heroAnalyticsState.maxTileReached) heroAnalyticsState.maxTileReached = focusedIdx;
          focusTile(focusedIdx, prevIdx2);
          startAutoAdvance();
        } else {
          try {
            if (typeof Analytics !== 'undefined') {
              Analytics.track('dead_end', { screen: 'lander', zone: 'hero-carousel', index: focusedIdx, direction: 'right', note: 'at last item' });
            }
          } catch (e) { /* fail silently */ }
        }
        return 'HANDLED';
      }
      if (action === 'OK') {
        const item = items[focusedIdx];
        heroAnalyticsState.selectedTile = focusedIdx;
        if (item._type === 'show') {
          return { action: 'NAVIGATE', screen: 'series-pdp', params: { showId: item.id } };
        } else if (item._type === 'city') {
          showToast(`Local content for ${item.name}`);
        } else if (item._type === 'collection') {
          showToast(`Opening ${item.title} collection`);
        }
        return 'HANDLED';
      }
      return 'HANDLED';
    }
  };
}

function buildHeroTile(item, isFocused) {
  const tile = document.createElement('div');

  if (item._type === 'show') {
    tile.className = 'hero-tile' + (isFocused ? ' focused' : '');
    tile.innerHTML = `
      <img class="hero-img" src="${item.heroImage}" alt="${item.title}" loading="lazy" />
      <div class="hero-tile-gradient"></div>
      <div class="hero-tile-content">
        ${item.badges && item.badges.length ? `<div class="hero-tile-badge"><span class="badge">${item.badges[0]}</span></div>` : ''}
        <div class="hero-tile-title">${item.title}</div>
        <div class="hero-tile-meta">
          <span class="badge badge-rating">${item.rating}</span>
          <span class="meta-dot">·</span>
          <span>${item.year}</span>
          <span class="meta-dot">·</span>
          <span>${item.genres.join(', ')}</span>
          <span class="meta-dot">·</span>
          <span>${item.seasons} Season${item.seasons !== 1 ? 's' : ''}</span>
          <span class="meta-dot">·</span>
          <span>${item.type}</span>
        </div>
      </div>
    `;
  } else if (item._type === 'city') {
    tile.className = 'hero-tile' + (isFocused ? ' focused' : '');
    const weatherEmoji = item.weatherIcon === 'sun' ? '☀️' : item.weatherIcon === 'rain' ? '🌧️' : item.weatherIcon === 'wind' ? '💨' : '⛅';
    tile.innerHTML = `
      <img class="hero-img" src="${item.images[0]}" alt="${item.name}" loading="lazy" />
      <img class="hero-img-secondary" src="${item.images[1]}" alt="${item.name}" loading="lazy" />
      <div class="hero-tile-gradient"></div>
      <div class="hero-tile-content">
        <div class="hero-city-name">${item.name}</div>
        <div class="hero-city-temp">${weatherEmoji} ${item.temperature}</div>
        <div class="hero-city-tags">
          ${item.tags.map(t => `<span>${t}</span>`).join('')}
        </div>
      </div>
    `;
    // Living tile: start cycling images when focused
    startLivingTile(tile, item.images);
  } else if (item._type === 'collection') {
    tile.className = 'hero-tile' + (isFocused ? ' focused' : '');
    tile.innerHTML = `
      <img class="hero-img" src="${item.heroImage}" alt="${item.title}" loading="lazy" />
      <div class="hero-tile-gradient"></div>
      <div class="hero-tile-content">
        <div class="hero-tile-badge"><span class="badge">Collection</span></div>
        <div class="hero-tile-title">${item.title}</div>
        <div style="font-size:15px;color:var(--color-text-secondary);margin-top:4px;">${item.description}</div>
      </div>
    `;
  }

  return tile;
}

function startLivingTile(tileEl, images) {
  if (!DebugConfig.get('livingTiles', true)) return;
  if (images.length < 2) return;
  const primaryImg = tileEl.querySelector('.hero-img');
  const secondaryImg = tileEl.querySelector('.hero-img-secondary');
  if (!primaryImg || !secondaryImg) return;

  // Clear any existing timer before starting a new one
  if (tileEl._livingTimer) { clearInterval(tileEl._livingTimer); tileEl._livingTimer = null; }

  // Store for runtime restart (cityCycleInterval / livingTiles changes)
  tileEl._livingImages = images;
  tileEl.dataset.livingTile = 'true';

  let imgIdx = 0;
  const timer = setInterval(() => {
    imgIdx = (imgIdx + 1) % images.length;
    secondaryImg.src = images[imgIdx];
    secondaryImg.classList.add('visible');
    setTimeout(() => {
      primaryImg.src = images[imgIdx];
      secondaryImg.classList.remove('visible');
    }, DebugConfig.get('crossfadeDuration', FADE_DURATION_MS));
  }, DebugConfig.get('cityCycleInterval', CITY_CYCLE_INTERVAL_MS));

  tileEl._livingTimer = timer;
}

function _stopAllLivingTiles() {
  document.querySelectorAll('[data-living-tile]').forEach(el => {
    if (el._livingTimer) { clearInterval(el._livingTimer); el._livingTimer = null; }
  });
}

function _restartAllLivingTiles() {
  document.querySelectorAll('[data-living-tile]').forEach(el => {
    if (el._livingImages) startLivingTile(el, el._livingImages);
  });
}

/* ---- CONTINUE WATCHING RAIL ---- */
// DEFERRED — Requires Authentication (Phase 1 stub)
function buildContinueWatchingRail(config, container) {
  return null;
}

/* ---- LOCAL CITIES RAIL ---- */
function buildLocalCitiesRail(config, container) {
  const cities = DataStore.getAllCities();
  if (!cities.length) return null;

  const section = document.createElement('div');
  section.className = 'rail-section local-cities-rail';
  container.appendChild(section);

  section.innerHTML = `
    ${config.title ? `<div class="rail-title">${config.title}</div>` : ''}
    <div class="rail-overflow">
      <div class="rail-inner">
        <div class="rail-scroll" id="cities-scroll"></div>
      </div>
    </div>
  `;

  const track = section.querySelector('#cities-scroll');

  cities.forEach(city => {
    const weatherEmoji = city.weatherIcon === 'sun' ? '☀️' : city.weatherIcon === 'rain' ? '🌧️' : city.weatherIcon === 'wind' ? '💨' : '⛅';
    const tile = document.createElement('div');
    tile.className = 'hero-tile';
    tile.style.cssText = `width:360px;height:220px;flex-shrink:0;border-radius:12px;overflow:hidden;position:relative;transition:box-shadow 200ms ease-out;cursor:default;`;
    tile.innerHTML = `
      <img class="hero-img" src="${city.images[0]}" alt="${city.name}" loading="lazy" style="width:100%;height:100%;object-fit:cover;position:absolute;inset:0;" />
      <img class="hero-img-secondary" src="${city.images[1]}" alt="${city.name}" loading="lazy" style="width:100%;height:100%;object-fit:cover;position:absolute;inset:0;opacity:0;transition:opacity 600ms ease-in-out;" />
      <div style="position:absolute;bottom:0;left:0;right:0;padding:12px;">
        <div style="display:inline-block;background:rgba(15,25,35,0.72);backdrop-filter:blur(8px);border-radius:10px;padding:10px 14px;">
          <div style="font-size:18px;font-weight:800;color:#fff;margin-bottom:3px;">${city.name}</div>
          <div style="font-size:13px;color:rgba(255,255,255,0.8);">${weatherEmoji} ${city.temperature} · ${city.weatherBlurb || ''}</div>
        </div>
      </div>
    `;
    startLivingTile(tile, city.images);
    track.appendChild(tile);
  });

  let focusedIdx = 0;
  const tiles = Array.from(track.children);

  const citiesAnalyticsState = {
    railId: 'local-cities',
    enterTime: 0,
    currentTileIdx: 0,
    maxTileReached: 0,
    totalTiles: tiles.length,
    selectedTile: null,
  };

  function focusTile(idx) {
    tiles.forEach(t => t.classList.remove('focused'));
    if (tiles[idx]) tiles[idx].classList.add('focused');
    scrollRailToIndex(track, idx, 360, TILE_GAP);
  }

  return {
    element: section,
    _analyticsState: citiesAnalyticsState,
    onEnter() {
      citiesAnalyticsState.enterTime = Date.now();
      citiesAnalyticsState.currentTileIdx = focusedIdx;
      citiesAnalyticsState.maxTileReached = focusedIdx;
      citiesAnalyticsState.selectedTile = null;
      focusTile(focusedIdx);
    },
    onLeave() { tiles.forEach(t => t.classList.remove('focused')); },
    handleKey(action) {
      if (action === 'UP') return 'UP';
      if (action === 'DOWN') return 'DOWN';
      if (action === 'LEFT') {
        if (focusedIdx > 0) {
          focusedIdx--;
          citiesAnalyticsState.currentTileIdx = focusedIdx;
          focusTile(focusedIdx);
        }
        return 'HANDLED';
      }
      if (action === 'RIGHT') {
        if (focusedIdx < tiles.length - 1) {
          focusedIdx++;
          citiesAnalyticsState.currentTileIdx = focusedIdx;
          if (focusedIdx > citiesAnalyticsState.maxTileReached) citiesAnalyticsState.maxTileReached = focusedIdx;
          focusTile(focusedIdx);
        }
        return 'HANDLED';
      }
      if (action === 'OK') {
        const city = cities[focusedIdx];
        citiesAnalyticsState.selectedTile = focusedIdx;
        showToast(`Local content for ${city.name}`);
        return 'HANDLED';
      }
      return 'HANDLED';
    }
  };
}

/* ---- LIVE CHANNELS RAIL ---- */
function buildLiveChannelsRail(config, container) {
  const channels = DataStore.getAllChannels();
  if (!channels.length) return null;

  const section = document.createElement('div');
  section.className = 'rail-section live-channels-rail';
  container.appendChild(section);

  section.innerHTML = `
    <div class="rail-title">${config.title || 'Local Channels'}</div>
    <div class="rail-overflow">
      <div class="rail-inner" style="display:flex;gap:${TILE_GAP}px;flex-direction:column;overflow:visible;">
        <div class="rail-scroll" id="channels-scroll"></div>
        <div class="rail-scroll" id="channels-below"></div>
      </div>
    </div>
  `;

  const track = section.querySelector('#channels-scroll');
  const below = section.querySelector('#channels-below');

  channels.forEach(ch => {
    const tile = document.createElement('div');
    tile.className = 'channel-tile';
    tile.innerHTML = `
      <img src="${ch.image}" alt="${ch.name}" loading="lazy" />
      <div class="channel-tile-overlay"></div>
      <div class="channel-live-badge">⚡ LIVE</div>
      <div class="channel-logo-overlay">
        <div class="channel-logo-text">${ch.logoText}</div>
      </div>
      <div class="progress-bar-container">
        <div class="progress-bar-fill" style="width:${30 + Math.random() * 60 | 0}%"></div>
      </div>
    `;
    track.appendChild(tile);

    // Metadata below tile
    const meta = document.createElement('div');
    meta.className = 'channel-tile-below';
    meta.innerHTML = `
      <div class="channel-meta-line">${ch.callSign} · ${ch.timeSlot}</div>
      <div class="channel-program-title">${ch.currentProgram}</div>
    `;
    below.appendChild(meta);
  });

  let focusedIdx = 0;
  const tiles = Array.from(track.children);

  const liveAnalyticsState = {
    railId: 'live-channels',
    enterTime: 0,
    currentTileIdx: 0,
    maxTileReached: 0,
    totalTiles: tiles.length,
    selectedTile: null,
  };

  function focusTile(idx) {
    tiles.forEach(t => t.classList.remove('focused'));
    if (tiles[idx]) tiles[idx].classList.add('focused');
    scrollRailToIndex(track, idx, CHANNEL_TILE_W, TILE_GAP);
    below.style.transform = track.style.transform;
  }

  return {
    element: section,
    _analyticsState: liveAnalyticsState,
    onEnter() {
      liveAnalyticsState.enterTime = Date.now();
      liveAnalyticsState.currentTileIdx = focusedIdx;
      liveAnalyticsState.maxTileReached = focusedIdx;
      liveAnalyticsState.selectedTile = null;
      focusTile(focusedIdx);
    },
    onLeave() { tiles.forEach(t => t.classList.remove('focused')); },
    handleKey(action) {
      if (action === 'UP') return 'UP';
      if (action === 'DOWN') return 'DOWN';
      if (action === 'LEFT') {
        if (focusedIdx > 0) {
          focusedIdx--;
          liveAnalyticsState.currentTileIdx = focusedIdx;
          focusTile(focusedIdx);
        }
        return 'HANDLED';
      }
      if (action === 'RIGHT') {
        if (focusedIdx < tiles.length - 1) {
          focusedIdx++;
          liveAnalyticsState.currentTileIdx = focusedIdx;
          if (focusedIdx > liveAnalyticsState.maxTileReached) liveAnalyticsState.maxTileReached = focusedIdx;
          focusTile(focusedIdx);
        }
        return 'HANDLED';
      }
      if (action === 'OK') {
        const ch = channels[focusedIdx];
        liveAnalyticsState.selectedTile = focusedIdx;
        return { action: 'NAVIGATE', screen: 'player', params: {
          showId: ch.id,
          channelName: ch.name,
          isLive: true,
        }};
      }
      return 'HANDLED';
    }
  };
}

/* ---- GENRE PILLS RAIL ---- */
function buildGenrePillsRail(config, container) {
  const genres = DataStore.getGenres();

  const section = document.createElement('div');
  section.className = 'genre-pills-section';
  container.appendChild(section);

  const scrollWrapper = document.createElement('div');
  scrollWrapper.style.overflow = 'hidden';
  section.appendChild(scrollWrapper);

  const track = document.createElement('div');
  track.className = 'genre-pills-scroll';
  scrollWrapper.appendChild(track);

  genres.forEach(genre => {
    const pill = document.createElement('div');
    pill.className = 'genre-pill';
    pill.textContent = genre;
    track.appendChild(pill);
  });

  let focusedIdx = 0;
  const pills = Array.from(track.children);

  function focusPill(idx) {
    pills.forEach(p => p.classList.remove('focused'));
    if (pills[idx]) pills[idx].classList.add('focused');
    const targetPill = pills[idx];
    if (targetPill) {
      const offset = -(targetPill.offsetLeft - 60);
      track.style.transform = `translateX(${Math.min(0, offset)}px)`;
    }
  }

  const genreAnalyticsState = {
    railId: 'genre-pills',
    enterTime: 0,
    currentTileIdx: 0,
    maxTileReached: 0,
    totalTiles: pills.length,
    selectedTile: null,
  };

  return {
    element: section,
    _analyticsState: genreAnalyticsState,
    onEnter() {
      genreAnalyticsState.enterTime = Date.now();
      genreAnalyticsState.currentTileIdx = focusedIdx;
      genreAnalyticsState.maxTileReached = focusedIdx;
      genreAnalyticsState.selectedTile = null;
      focusPill(focusedIdx);
    },
    onLeave() { pills.forEach(p => p.classList.remove('focused')); },
    handleKey(action) {
      if (action === 'UP') return 'UP';
      if (action === 'DOWN') return 'DOWN';
      if (action === 'LEFT') {
        if (focusedIdx > 0) {
          focusedIdx--;
          genreAnalyticsState.currentTileIdx = focusedIdx;
          focusPill(focusedIdx);
        }
        return 'HANDLED';
      }
      if (action === 'RIGHT') {
        if (focusedIdx < pills.length - 1) {
          focusedIdx++;
          genreAnalyticsState.currentTileIdx = focusedIdx;
          if (focusedIdx > genreAnalyticsState.maxTileReached) genreAnalyticsState.maxTileReached = focusedIdx;
          focusPill(focusedIdx);
        }
        return 'HANDLED';
      }
      if (action === 'OK') {
        genreAnalyticsState.selectedTile = focusedIdx;
        showToast(`Filtering by ${genres[focusedIdx]}…`);
        return 'HANDLED';
      }
      return 'HANDLED';
    }
  };
}

/* ---- COLLECTION SCREAMER ---- */
function buildScreamer(config, container) {
  const collection = DataStore.getCollection(config.dataSource);
  if (!collection) return null;

  const collectionItems = collection.items.map(id => DataStore.getShow(id)).filter(Boolean);

  const section = document.createElement('div');
  section.className = 'screamer-section';
  container.appendChild(section);

  section.innerHTML = `
    <div class="screamer-banner" id="screamer-banner">
      <img class="screamer-bg" src="${collection.heroImage}" alt="${collection.title}" loading="lazy" />
      <div class="screamer-gradient"></div>
      <div class="screamer-content">
        <div class="screamer-label">Collection</div>
        <div class="screamer-title">${collection.description}</div>
        <button class="screamer-cta" id="screamer-cta">${collection.ctaText} →</button>
      </div>
      <div class="screamer-tiles-area">
        <div class="screamer-tiles-track" id="screamer-tiles-track"></div>
      </div>
    </div>
  `;

  const bannerEl = section.querySelector('#screamer-banner');
  const ctaEl = section.querySelector('#screamer-cta');
  const tileTrack = section.querySelector('#screamer-tiles-track');

  // Build collection tiles
  collectionItems.forEach(show => {
    const tile = document.createElement('div');
    tile.className = 'portrait-tile';
    tile.innerHTML = `
      <img src="${show.posterImage}" alt="${show.title}" loading="lazy" />
    `;
    tileTrack.appendChild(tile);
  });

  // Focus zones: 0 = CTA, 1+ = tiles
  let subZone = 0; // 0 = CTA, 1 = tiles
  let tileIdx = 0;
  const tiles = Array.from(tileTrack.children);

  function focusCTA() {
    subZone = 0;
    ctaEl.classList.add('focused');
    bannerEl.classList.add('has-focus');
    tiles.forEach(t => t.classList.remove('focused'));
  }

  function focusTile(idx) {
    subZone = 1;
    ctaEl.classList.remove('focused');
    bannerEl.classList.remove('has-focus');
    tiles.forEach(t => t.classList.remove('focused'));
    if (tiles[idx]) tiles[idx].classList.add('focused');
    scrollRailToIndex(tileTrack, idx, PORTRAIT_TILE_W, TILE_GAP);
  }

  const screamerAnalyticsState = {
    railId: collection?.id ? `screamer-${collection.id}` : 'screamer',
    enterTime: 0,
    currentTileIdx: 0,
    maxTileReached: 0,
    totalTiles: tiles.length,
    selectedTile: null,
  };

  return {
    element: section,
    _analyticsState: screamerAnalyticsState,
    onEnter() {
      screamerAnalyticsState.enterTime = Date.now();
      screamerAnalyticsState.currentTileIdx = 0;
      screamerAnalyticsState.maxTileReached = 0;
      screamerAnalyticsState.selectedTile = null;
      focusCTA();
    },
    onLeave() {
      ctaEl.classList.remove('focused');
      bannerEl.classList.remove('has-focus');
      tiles.forEach(t => t.classList.remove('focused'));
    },
    handleKey(action) {
      if (subZone === 0) {
        // CTA focused
        if (action === 'UP') return 'UP';
        if (action === 'DOWN') return 'DOWN';
        if (action === 'RIGHT') { focusTile(tileIdx); return 'HANDLED'; }
        if (action === 'LEFT') return 'HANDLED';
        if (action === 'OK') {
          showToast(`Browsing ${collection.title}`);
          return 'HANDLED';
        }
      } else {
        // Tiles focused
        if (action === 'UP') { focusCTA(); return 'HANDLED'; }
        if (action === 'DOWN') return 'DOWN';
        if (action === 'LEFT') {
          if (tileIdx > 0) { tileIdx--; screamerAnalyticsState.currentTileIdx = tileIdx; focusTile(tileIdx); }
          else { focusCTA(); }
          return 'HANDLED';
        }
        if (action === 'RIGHT') {
          if (tileIdx < tiles.length - 1) {
            tileIdx++;
            screamerAnalyticsState.currentTileIdx = tileIdx;
            if (tileIdx > screamerAnalyticsState.maxTileReached) screamerAnalyticsState.maxTileReached = tileIdx;
            focusTile(tileIdx);
          }
          return 'HANDLED';
        }
        if (action === 'OK') {
          const show = collectionItems[tileIdx];
          if (show) {
            screamerAnalyticsState.selectedTile = tileIdx;
            return { action: 'NAVIGATE', screen: 'series-pdp', params: { showId: show.id } };
          }
          return 'HANDLED';
        }
      }
      return 'HANDLED';
    }
  };
}

/* ---- STANDARD RAIL (portrait or landscape) ---- */
function buildStandardRail(config, container) {
  let shows;
  if (config.dataSource === 'top-flix') shows = DataStore.getTopFlix();
  else if (config.dataSource === 'my-mix') shows = DataStore.getMyMix();
  else shows = DataStore.getAllShows().slice(0, 10);

  if (!shows.length) return null;

  const isLandscape = config.tileType === 'landscape';
  const tileW = isLandscape ? LANDSCAPE_TILE_W : PORTRAIT_TILE_W;
  const tileH = isLandscape ? LANDSCAPE_TILE_H : PORTRAIT_TILE_H;
  const imgSrc = isLandscape ? 'landscapeImage' : 'posterImage';

  const section = document.createElement('div');
  section.className = `rail-section ${isLandscape ? 'landscape-rail' : 'portrait-rail'}`;
  container.appendChild(section);

  section.innerHTML = `
    <div class="rail-title">${config.title || ''}</div>
    <div class="rail-overflow">
      <div class="rail-inner">
        <div class="rail-scroll" id="std-rail-${config.title.replace(/\s+/g, '-').toLowerCase()}"></div>
      </div>
    </div>
  `;

  const track = section.querySelector('.rail-scroll');

  shows.forEach(show => {
    const tile = document.createElement('div');
    tile.className = isLandscape ? 'landscape-tile' : 'portrait-tile';
    tile.innerHTML = `
      <img src="${show[imgSrc] || show.landscapeImage}" alt="${show.title}" loading="lazy" />
      ${show.badges && show.badges.length ? `<div class="${isLandscape ? 'landscape-tile-badge' : 'portrait-tile-badge'}"><span class="badge" style="font-size:11px;">${show.badges[0]}</span></div>` : ''}
    `;
    track.appendChild(tile);
  });

  let focusedIdx = 0;
  const tiles = Array.from(track.children);
  const railId = config.title ? config.title.replace(/\s+/g, '-').toLowerCase() : 'standard-rail';

  const stdAnalyticsState = {
    railId,
    enterTime: 0,
    currentTileIdx: 0,
    maxTileReached: 0,
    totalTiles: tiles.length,
    selectedTile: null,
    focusedItemTitle: shows[0]?.title || '',
  };

  function focusTile(idx) {
    tiles.forEach(t => t.classList.remove('focused'));
    if (tiles[idx]) tiles[idx].classList.add('focused');
    scrollRailToIndex(track, idx, tileW, TILE_GAP);
  }

  return {
    element: section,
    _analyticsState: stdAnalyticsState,
    onEnter() {
      stdAnalyticsState.enterTime = Date.now();
      stdAnalyticsState.currentTileIdx = focusedIdx;
      stdAnalyticsState.maxTileReached = focusedIdx;
      stdAnalyticsState.selectedTile = null;
      stdAnalyticsState.focusedItemTitle = shows[focusedIdx]?.title || '';
      focusTile(focusedIdx);
    },
    onLeave() { tiles.forEach(t => t.classList.remove('focused')); },
    handleKey(action) {
      if (action === 'UP') return 'UP';
      if (action === 'DOWN') return 'DOWN';
      if (action === 'LEFT') {
        if (focusedIdx > 0) {
          const prevDwell = Math.max(0, Date.now() - (stdAnalyticsState.enterTime || Date.now()));
          try {
            if (typeof Analytics !== 'undefined') {
              Analytics.track('focus_change', {
                from: { screen: 'lander', zone: railId, index: focusedIdx, itemId: shows[focusedIdx]?.id || '' },
                to: { screen: 'lander', zone: railId, index: focusedIdx - 1, itemId: shows[focusedIdx - 1]?.id || '' },
                method: 'dpad-left', dwellTimeMs: prevDwell,
              });
            }
          } catch (e) { /* fail silently */ }
          focusedIdx--;
          stdAnalyticsState.currentTileIdx = focusedIdx;
          stdAnalyticsState.enterTime = Date.now();
          stdAnalyticsState.focusedItemTitle = shows[focusedIdx]?.title || '';
          focusTile(focusedIdx);
        } else {
          try {
            if (typeof Analytics !== 'undefined') {
              Analytics.track('dead_end', { screen: 'lander', zone: railId, index: focusedIdx, direction: 'left', note: 'at first item' });
            }
          } catch (e) { /* fail silently */ }
        }
        return 'HANDLED';
      }
      if (action === 'RIGHT') {
        if (focusedIdx < tiles.length - 1) {
          const prevDwell = Math.max(0, Date.now() - (stdAnalyticsState.enterTime || Date.now()));
          try {
            if (typeof Analytics !== 'undefined') {
              Analytics.track('focus_change', {
                from: { screen: 'lander', zone: railId, index: focusedIdx, itemId: shows[focusedIdx]?.id || '' },
                to: { screen: 'lander', zone: railId, index: focusedIdx + 1, itemId: shows[focusedIdx + 1]?.id || '' },
                method: 'dpad-right', dwellTimeMs: prevDwell,
              });
            }
          } catch (e) { /* fail silently */ }
          focusedIdx++;
          stdAnalyticsState.currentTileIdx = focusedIdx;
          stdAnalyticsState.enterTime = Date.now();
          stdAnalyticsState.focusedItemTitle = shows[focusedIdx]?.title || '';
          if (focusedIdx > stdAnalyticsState.maxTileReached) stdAnalyticsState.maxTileReached = focusedIdx;
          focusTile(focusedIdx);
        } else {
          try {
            if (typeof Analytics !== 'undefined') {
              Analytics.track('dead_end', { screen: 'lander', zone: railId, index: focusedIdx, direction: 'right', note: 'at last item' });
            }
          } catch (e) { /* fail silently */ }
        }
        return 'HANDLED';
      }
      if (action === 'OK') {
        stdAnalyticsState.selectedTile = focusedIdx;
        return { action: 'NAVIGATE', screen: 'series-pdp', params: { showId: shows[focusedIdx].id } };
      }
      return 'HANDLED';
    }
  };
}

/* ---- MARKETING BANNER ---- */
function buildMarketingBanner(config, container) {
  const content = config.content;
  const decorShows = DataStore.getAllShows().slice(0, 12);

  const section = document.createElement('div');
  section.className = 'marketing-banner-section';
  container.appendChild(section);

  // Build decorative poster columns
  const cols = [[], [], [], []];
  decorShows.forEach((s, i) => cols[i % 4].push(s));

  const colsHTML = cols.map(col => `
    <div class="marketing-poster-col">
      ${col.map(s => `<img class="marketing-poster-img" src="${s.landscapeImage}" alt="" loading="lazy" />`).join('')}
    </div>
  `).join('');

  section.innerHTML = `
    <div class="marketing-banner">
      <div class="marketing-bg-posters">${colsHTML}</div>
      <div class="marketing-gradient"></div>
      <div class="marketing-content">
        <div class="marketing-headline">${content.headline}</div>
        <div class="marketing-subtext">${content.subtext}</div>
        <button class="pill-btn marketing-cta" id="marketing-cta">${content.cta} →</button>
      </div>
    </div>
  `;

  const ctaEl = section.querySelector('#marketing-cta');
  const bannerEl = section.querySelector('.marketing-banner');

  const mktAnalyticsState = {
    railId: 'marketing-banner',
    enterTime: 0,
    currentTileIdx: 0,
    maxTileReached: 0,
    totalTiles: 1,
    selectedTile: null,
  };

  return {
    element: section,
    _analyticsState: mktAnalyticsState,
    onEnter() {
      mktAnalyticsState.enterTime = Date.now();
      mktAnalyticsState.selectedTile = null;
      ctaEl.classList.add('focused');
      bannerEl.classList.add('has-focus');
    },
    onLeave() { ctaEl.classList.remove('focused'); bannerEl.classList.remove('has-focus'); },
    handleKey(action) {
      if (action === 'UP') return 'UP';
      if (action === 'DOWN') return 'DOWN';
      if (action === 'OK') {
        mktAnalyticsState.selectedTile = 0;
        showToast('Opening signup flow…');
        return 'HANDLED';
      }
      return 'HANDLED';
    }
  };
}

/* ============================================================
   SHARED UTILITY: Scroll a rail track to bring index into view
   ============================================================ */
function scrollRailToIndex(track, idx, itemW, gap, leadPad = 0) {
  // leadPad=0 because rail-inner already provides padding-left:60px via CSS.
  const totalBefore = idx * (itemW + gap);
  let translateX = -(totalBefore - leadPad);

  // Don't go past start
  if (translateX > 0) translateX = 0;

  track.style.transform = `translateX(${translateX}px)`;
}
