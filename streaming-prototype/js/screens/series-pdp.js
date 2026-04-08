/* ============================================================
   SERIES PDP SCREEN — Series detail page
   Phase 1: Anonymous / first-visit state only.
   Auth-gated features (Add to My Stuff, Resume, Watch History)
   are deferred to the Authentication phase.
   ============================================================ */

const SeriesPDPScreen = {
  id: 'series-pdp',

  _container: null,
  _scrollEl: null,
  _show: null,
  _seriesData: null,

  // Focus zones: 'buttons' | 'seasons' | 'episodes' | 'extras' | 'similar' | 'more-info'
  _activeZone: 'buttons',
  _seasonIdx: 0,
  _episodeIdx: 0,
  _extrasIdx: 0,
  _similarIdx: 0,
  _scrollY: 0,

  async init(container, params) {
    this._container = container;
    this._container.className = 'screen screen-series-pdp';
    this._screenEnterTime = Date.now();

    // Read saved state from container (set by onBlur on BACK navigation)
    const savedZone      = container._savedZone;
    const savedSeasonIdx = container._savedSeasonIdx;
    const savedEpisodeIdx = container._savedEpisodeIdx;
    const savedExtrasIdx = container._savedExtrasIdx;
    const savedSimilarIdx = container._savedSimilarIdx;
    const savedScrollY   = container._savedScrollY;
    delete container._savedZone;
    delete container._savedSeasonIdx;
    delete container._savedEpisodeIdx;
    delete container._savedExtrasIdx;
    delete container._savedSimilarIdx;
    delete container._savedScrollY;

    this._scrollY = 0;
    this._activeZone = savedZone || 'buttons';
    this._seasonIdx = savedSeasonIdx || 0;
    this._episodeIdx = savedEpisodeIdx || 0;
    this._extrasIdx = savedExtrasIdx || 0;
    this._similarIdx = savedSimilarIdx || 0;

    const showId = params.showId;
    this._show = DataStore.getShow(showId);
    if (!this._show) {
      container.innerHTML = '<div style="padding:100px;color:#fff;font-size:24px;">Show not found.</div>';
      return;
    }

    this._seriesData = await DataStore.getSeriesData(showId);
    this._render();

    // Navigation is tracked by the source screen before calling App.navigate() — no duplicate here.

    // Restore scroll position (no transition to avoid flash)
    if (savedScrollY) {
      this._scrollY = savedScrollY;
      this._scrollEl.style.transition = 'none';
      this._scrollEl.style.transform = `translateY(${savedScrollY}px)`;
      requestAnimationFrame(() => { this._scrollEl.style.transition = ''; });
    }

    // Re-apply season state if not on season 0
    if (this._seasonIdx > 0) {
      this._applySeasonState(this._seasonIdx);
    }
  },

  _render() {
    const show = this._show;
    const heroHTML = this._buildHeroHTML(show);
    const contentHTML = this._buildContentHTML(show);

    this._container.innerHTML = `
      <div class="pdp-scroll" id="pdp-scroll">
        ${heroHTML}
        <div class="pdp-content-area" id="pdp-content-area">
          ${contentHTML}
        </div>
      </div>
    `;

    this._scrollEl = this._container.querySelector('#pdp-scroll');
  },

  _buildHeroHTML(show) {
    return `
      <div class="pdp-hero">
        <img class="pdp-hero-bg" src="${show.heroImage}" alt="${show.title}" />
        <div class="pdp-hero-gradient"></div>
        <div class="pdp-hero-gradient-bottom"></div>
        <div class="pdp-hero-content">
          ${show.badges && show.badges.length ? `<div class="pdp-badge"><span class="badge">${show.badges[0]}</span></div>` : ''}
          <div class="pdp-title">${show.title}</div>
          <div class="pdp-description">${show.description}</div>
          <div class="pdp-meta-row meta-row">
            <span class="badge badge-rating">${show.rating}</span>
            <span class="meta-dot">·</span>
            <span>${show.year}</span>
            <span class="meta-dot">·</span>
            <span>${show.genres.join(', ')}</span>
            <span class="meta-dot">·</span>
            <span>${show.seasons} Season${show.seasons !== 1 ? 's' : ''}</span>
            <span class="meta-dot">·</span>
            <span>${show.type}</span>
          </div>
          <div class="pdp-actions" id="pdp-actions">
            <button class="pdp-btn primary" data-btn-id="play">▶ Play S1:E1</button>
          </div>
        </div>
      </div>
    `;
  },

  _buildContentHTML(show) {
    if (!this._seriesData) {
      return `<div class="pdp-pinned-title">${show.title}</div>`;
    }

    const sd = this._seriesData;

    // Season pills
    const seasonPills = sd.seasons.map((s, i) => `
      <div class="season-pill${i === 0 ? ' active' : ''}" data-season-idx="${i}">
        ${i === 0
          ? `Season 1&nbsp;<span style="font-weight:400;font-size:12px;">${s.episodeCount}ep</span>`
          : `S${s.number}`}
      </div>
    `).join('');

    // Episode tiles for season 1
    const episodesHTML = this._buildEpisodeTiles(sd.seasons[0]);

    // Extras
    const extrasHTML = sd.extras ? this._buildExtraTiles(sd.extras) : '';

    // Similar titles
    const similarShows = (sd.similar || []).map(id => DataStore.getShow(id)).filter(Boolean);
    const similarHTML = similarShows.length ? this._buildSimilarTiles(similarShows) : '';

    // More info card
    const moreInfoHTML = `
      <div class="more-info-card" id="more-info-card">
        <div>
          <div class="more-info-label">Rating</div>
          <div class="more-info-value"><span class="badge badge-rating">${show.rating}</span></div>
          <div class="more-info-label">Release Date</div>
          <div class="more-info-value">${show.year}</div>
          <div class="more-info-label">Seasons</div>
          <div class="more-info-value">${show.seasons}</div>
          <div class="more-info-label">Genre</div>
          <div class="more-info-value">${show.genres.join(', ')}</div>
        </div>
        <div>
          <div class="more-info-label">Director</div>
          <div class="more-info-value">${show.director || '—'}</div>
          <div class="more-info-label">Cast</div>
          <div class="more-info-value">${(show.cast || []).join(', ')}</div>
        </div>
        <div>
          <div class="more-info-desc">${show.description}</div>
        </div>
      </div>
    `;

    return `
      <div class="pdp-pinned-title">${show.title}</div>

      <div class="season-selector" id="season-selector">
        ${seasonPills}
      </div>

      <div class="rail-section" id="episodes-rail-section">
        <div class="rail-title">Episodes</div>
        <div class="rail-overflow">
          <div class="rail-inner">
            <div class="rail-scroll" id="episodes-track">${episodesHTML}</div>
          </div>
        </div>
      </div>

      ${extrasHTML ? `
      <div class="rail-section" id="extras-rail-section">
        <div class="rail-title">Extras</div>
        <div class="rail-overflow">
          <div class="rail-inner">
            <div class="rail-scroll" id="extras-track">${extrasHTML}</div>
          </div>
        </div>
      </div>` : ''}

      ${similarHTML ? `
      <div class="rail-section" id="similar-rail-section">
        <div class="rail-title">You May Also Like</div>
        <div class="rail-overflow">
          <div class="rail-inner">
            <div class="rail-scroll" id="similar-track">${similarHTML}</div>
          </div>
        </div>
      </div>` : ''}

      ${moreInfoHTML}
    `;
  },

  _buildEpisodeTiles(season) {
    if (!season) return '';
    return season.episodes.map((ep, i) => `
      <div class="episode-item" data-ep-idx="${i}">
        <div class="episode-tile" data-ep-id="${ep.id}">
          <img src="${ep.thumbnail}" alt="${ep.title}" loading="lazy" />
        </div>
        <div class="episode-tile-below">
          <div class="episode-meta">S${ep.season}:E${ep.episode} · ${ep.airDate} · ${ep.duration}</div>
          <div class="episode-title">${ep.title}</div>
          <div class="episode-desc">${ep.description}</div>
        </div>
      </div>
    `).join('');
  },

  _buildExtraTiles(extras) {
    return extras.map((extra, i) => `
      <div class="episode-item" data-ep-idx="${i}">
        <div class="episode-tile" data-extra-id="${extra.id}">
          <img src="${extra.thumbnail}" alt="${extra.title}" loading="lazy" />
        </div>
        <div class="episode-tile-below">
          <div class="episode-meta">${extra.duration}</div>
          <div class="episode-title">${extra.title}</div>
          <div class="episode-desc">${extra.description}</div>
        </div>
      </div>
    `).join('');
  },

  _buildSimilarTiles(shows) {
    return shows.map(show => `
      <div class="portrait-tile" data-show-id="${show.id}">
        <img src="${show.posterImage}" alt="${show.title}" loading="lazy" />
      </div>
    `).join('');
  },

  onFocus() {
    FocusEngine.setHandler((action) => this._handleKey(action));
    this._activateZone(this._activeZone);
  },

  onBlur() {
    this._deactivateAllZones();
    if (this._container) {
      this._container._savedZone = this._activeZone;
      this._container._savedSeasonIdx = this._seasonIdx;
      this._container._savedEpisodeIdx = this._episodeIdx;
      this._container._savedExtrasIdx = this._extrasIdx;
      this._container._savedSimilarIdx = this._similarIdx;
      this._container._savedScrollY = this._scrollY;
    }
  },

  destroy() {},

  _activateZone(zone) {
    // Track focus_change between zones
    const prevZone = this._activeZone;
    if (prevZone !== zone && prevZone) {
      try {
        if (typeof Analytics !== 'undefined') {
          Analytics.track('focus_change', {
            from: { screen: 'series-pdp', zone: prevZone, index: this._getZoneIndex(prevZone) },
            to: { screen: 'series-pdp', zone: zone, index: 0 },
            method: 'dpad',
            dwellTimeMs: Date.now() - (this._zoneEnterTime || Date.now()),
          });
        }
      } catch (e) { /* fail silently */ }
    }
    this._zoneEnterTime = Date.now();
    this._activeZone = zone;
    this._deactivateAllZones();

    if (zone === 'buttons') {
      const btn = this._container.querySelector('.pdp-btn');
      if (btn) btn.classList.add('focused');
    } else if (zone === 'seasons') {
      this._focusSeason(this._seasonIdx);
    } else if (zone === 'episodes') {
      this._focusEpisode(this._episodeIdx);
    } else if (zone === 'extras') {
      this._focusExtra(this._extrasIdx);
    } else if (zone === 'similar') {
      this._focusSimilar(this._similarIdx);
    } else if (zone === 'more-info') {
      const card = this._container.querySelector('#more-info-card');
      if (card) card.classList.add('focused');
    }
  },

  _getZoneIndex(zone) {
    if (zone === 'seasons') return this._seasonIdx;
    if (zone === 'episodes') return this._episodeIdx;
    if (zone === 'extras') return this._extrasIdx;
    if (zone === 'similar') return this._similarIdx;
    return 0;
  },

  _deactivateAllZones() {
    this._container.querySelectorAll('.pdp-btn').forEach(b => b.classList.remove('focused'));
    this._container.querySelectorAll('.season-pill').forEach(s => s.classList.remove('focused'));
    this._container.querySelectorAll('.episode-tile').forEach(t => t.classList.remove('focused'));
    this._container.querySelectorAll('#similar-track .portrait-tile').forEach(t => t.classList.remove('focused'));
    const card = this._container.querySelector('#more-info-card');
    if (card) card.classList.remove('focused');
  },

  _focusSeason(idx) {
    const pills = Array.from(this._container.querySelectorAll('.season-pill'));
    pills.forEach(p => p.classList.remove('focused'));
    if (pills[idx]) pills[idx].classList.add('focused');
    this._seasonIdx = idx;
  },

  _applySeasonState(idx) {
    const sd = this._seriesData;
    if (!sd) return;
    // Update pill labels and active state
    const pills = Array.from(this._container.querySelectorAll('.season-pill'));
    pills.forEach((pill, i) => {
      const season = sd.seasons[i];
      const isActive = i === idx;
      pill.classList.toggle('active', isActive);
      if (isActive) {
        pill.innerHTML = `Season ${season.number}&nbsp;<span style="font-weight:400;font-size:12px;">${season.episodeCount}ep</span>`;
      } else {
        pill.innerHTML = `S${season.number}`;
      }
    });
    // Rebuild episode track for the selected season
    const track = this._container.querySelector('#episodes-track');
    if (track) {
      track.innerHTML = this._buildEpisodeTiles(sd.seasons[idx]);
      track.style.transform = 'translateX(0)';
    }
    this._episodeIdx = 0;
  },

  _selectSeason(idx) {
    this._applySeasonState(idx);
    // Re-focus the selected pill to preserve highlight
    this._focusSeason(idx);
    showToast(`Season ${idx + 1}`);
  },

  _focusEpisode(idx) {
    const tiles = Array.from(this._container.querySelectorAll('#episodes-track .episode-tile'));
    tiles.forEach(t => t.classList.remove('focused'));
    if (tiles[idx]) tiles[idx].classList.add('focused');
    this._episodeIdx = idx;
    this._scrollRail('episodes-track', idx, 440, 16);
  },

  _focusExtra(idx) {
    const tiles = Array.from(this._container.querySelectorAll('#extras-track .episode-tile'));
    tiles.forEach(t => t.classList.remove('focused'));
    if (tiles[idx]) tiles[idx].classList.add('focused');
    this._extrasIdx = idx;
    this._scrollRail('extras-track', idx, 440, 16);
  },

  _focusSimilar(idx) {
    const tiles = Array.from(this._container.querySelectorAll('#similar-track .portrait-tile'));
    tiles.forEach(t => t.classList.remove('focused'));
    if (tiles[idx]) tiles[idx].classList.add('focused');
    this._similarIdx = idx;
    this._scrollRail('similar-track', idx, 180, 16);
  },

  _scrollRail(trackId, idx, itemW, gap) {
    const track = this._container.querySelector(`#${trackId}`);
    if (!track) return;
    let translateX = -(idx * (itemW + gap));
    if (translateX > 0) translateX = 0;
    track.style.transform = `translateX(${translateX}px)`;
  },

  _scrollToSection(sectionId) {
    const el = this._container.querySelector(`#${sectionId}`);
    if (!el) return;
    const targetY = -Math.max(0, el.offsetTop - 80);
    this._scrollY = targetY;
    this._scrollEl.style.transform = `translateY(${targetY}px)`;
  },

  _handleKey(action) {
    const zone = this._activeZone;

    if (action === 'BACK') {
      App.back();
      return;
    }

    if (zone === 'buttons') {
      // Only one button (Play S1:E1) — DOWN goes straight to seasons
      if (action === 'UP') {
        try {
          if (typeof Analytics !== 'undefined') {
            Analytics.track('dead_end', { screen: 'series-pdp', zone: 'buttons', direction: 'up', note: 'already at top' });
          }
        } catch (e) { /* fail silently */ }
        return;
      }
      if (action === 'DOWN') {
        if (this._seriesData) {
          this._activateZone('seasons');
          this._scrollToSection('season-selector');
        }
        return;
      }
      if (action === 'OK') {
        const firstEp = this._seriesData?.seasons[0]?.episodes[0];
        App.navigate('player', {
          showId: this._show.id,
          episodeId: firstEp?.id || 'movie',
          episodeData: firstEp,
        });
        return;
      }
    }

    if (zone === 'seasons') {
      const pills = Array.from(this._container.querySelectorAll('.season-pill'));
      if (action === 'UP') {
        this._activateZone('buttons');
        this._scrollY = 0;
        this._scrollEl.style.transform = 'translateY(0)';
        return;
      }
      if (action === 'DOWN') {
        this._activateZone('episodes');
        this._scrollToSection('episodes-rail-section');
        return;
      }
      if (action === 'LEFT') {
        if (this._seasonIdx > 0) this._focusSeason(this._seasonIdx - 1);
        return;
      }
      if (action === 'RIGHT') {
        if (this._seasonIdx < pills.length - 1) this._focusSeason(this._seasonIdx + 1);
        return;
      }
      if (action === 'OK') {
        this._selectSeason(this._seasonIdx);
        try {
          if (typeof Analytics !== 'undefined') {
            Analytics.track('feature_interaction', {
              feature: 'season-selector',
              screen: 'series-pdp',
              seasonIndex: this._seasonIdx,
              showId: this._show?.id,
            });
          }
        } catch (e) { /* fail silently */ }
        return;
      }
    }

    if (zone === 'episodes') {
      const tiles = Array.from(this._container.querySelectorAll('#episodes-track .episode-item'));
      if (action === 'UP') {
        this._activateZone('seasons');
        this._scrollToSection('season-selector');
        return;
      }
      if (action === 'DOWN') {
        if (this._container.querySelector('#extras-track')) {
          this._activateZone('extras');
          this._scrollToSection('extras-rail-section');
        } else if (this._container.querySelector('#similar-track')) {
          this._activateZone('similar');
          this._scrollToSection('similar-rail-section');
        } else {
          this._activateZone('more-info');
          this._scrollToSection('more-info-card');
        }
        return;
      }
      if (action === 'LEFT') {
        if (this._episodeIdx > 0) this._focusEpisode(this._episodeIdx - 1);
        else { try { if (typeof Analytics !== 'undefined') Analytics.track('dead_end', { screen: 'series-pdp', zone: 'episodes', direction: 'left', note: 'at first episode' }); } catch (e) {} }
        return;
      }
      if (action === 'RIGHT') {
        if (this._episodeIdx < tiles.length - 1) this._focusEpisode(this._episodeIdx + 1);
        else { try { if (typeof Analytics !== 'undefined') Analytics.track('dead_end', { screen: 'series-pdp', zone: 'episodes', direction: 'right', note: 'at last episode' }); } catch (e) {} }
        return;
      }
      if (action === 'OK') {
        const ep = this._seriesData?.seasons[this._seasonIdx]?.episodes[this._episodeIdx];
        if (ep) {
          try {
            if (typeof Analytics !== 'undefined') {
              Analytics.track('tile_select', {
                screen: 'series-pdp',
                rail: 'episodes',
                tileIndex: this._episodeIdx,
                itemId: ep.id,
                itemTitle: ep.title,
                timeOnScreenMs: Date.now() - (this._screenEnterTime || Date.now()),
              });
              Analytics.track('navigation', { from: 'series-pdp', to: 'player', trigger: 'tile-select', itemId: ep.id });
            }
          } catch (e) { /* fail silently */ }
          App.navigate('player', { showId: this._show.id, episodeId: ep.id, episodeData: ep });
        }
        return;
      }
    }

    if (zone === 'extras') {
      const tiles = Array.from(this._container.querySelectorAll('#extras-track .episode-item'));
      if (action === 'UP') {
        this._activateZone('episodes');
        this._scrollToSection('episodes-rail-section');
        return;
      }
      if (action === 'DOWN') {
        if (this._container.querySelector('#similar-track')) {
          this._activateZone('similar');
          this._scrollToSection('similar-rail-section');
        } else {
          this._activateZone('more-info');
          this._scrollToSection('more-info-card');
        }
        return;
      }
      if (action === 'LEFT') {
        if (this._extrasIdx > 0) this._focusExtra(this._extrasIdx - 1);
        else { try { if (typeof Analytics !== 'undefined') Analytics.track('dead_end', { screen: 'series-pdp', zone: 'extras', direction: 'left', note: 'at first extra' }); } catch (e) {} }
        return;
      }
      if (action === 'RIGHT') {
        if (this._extrasIdx < tiles.length - 1) this._focusExtra(this._extrasIdx + 1);
        else { try { if (typeof Analytics !== 'undefined') Analytics.track('dead_end', { screen: 'series-pdp', zone: 'extras', direction: 'right', note: 'at last extra' }); } catch (e) {} }
        return;
      }
      if (action === 'OK') {
        const extra = this._seriesData?.extras[this._extrasIdx];
        if (extra) {
          try {
            if (typeof Analytics !== 'undefined') {
              Analytics.track('tile_select', {
                screen: 'series-pdp',
                rail: 'extras',
                tileIndex: this._extrasIdx,
                itemId: extra.id,
                itemTitle: extra.title,
                timeOnScreenMs: Date.now() - (this._screenEnterTime || Date.now()),
              });
              Analytics.track('navigation', { from: 'series-pdp', to: 'player', trigger: 'tile-select', itemId: extra.id });
            }
          } catch (e) { /* fail silently */ }
          App.navigate('player', { showId: this._show.id, episodeId: extra.id, isExtra: true });
        }
        return;
      }
    }

    if (zone === 'similar') {
      const tiles = Array.from(this._container.querySelectorAll('#similar-track .portrait-tile'));
      if (action === 'UP') {
        if (this._container.querySelector('#extras-track')) {
          this._activateZone('extras');
          this._scrollToSection('extras-rail-section');
        } else {
          this._activateZone('episodes');
          this._scrollToSection('episodes-rail-section');
        }
        return;
      }
      if (action === 'DOWN') {
        this._activateZone('more-info');
        this._scrollToSection('more-info-card');
        return;
      }
      if (action === 'LEFT') {
        if (this._similarIdx > 0) this._focusSimilar(this._similarIdx - 1);
        else { try { if (typeof Analytics !== 'undefined') Analytics.track('dead_end', { screen: 'series-pdp', zone: 'similar', direction: 'left', note: 'at first title' }); } catch (e) {} }
        return;
      }
      if (action === 'RIGHT') {
        if (this._similarIdx < tiles.length - 1) this._focusSimilar(this._similarIdx + 1);
        else { try { if (typeof Analytics !== 'undefined') Analytics.track('dead_end', { screen: 'series-pdp', zone: 'similar', direction: 'right', note: 'at last title' }); } catch (e) {} }
        return;
      }
      if (action === 'OK') {
        const showId = tiles[this._similarIdx]?.dataset?.showId;
        if (showId) {
          try {
            if (typeof Analytics !== 'undefined') {
              Analytics.track('tile_select', {
                screen: 'series-pdp',
                rail: 'similar',
                tileIndex: this._similarIdx,
                itemId: showId,
                timeOnScreenMs: Date.now() - (this._screenEnterTime || Date.now()),
              });
              Analytics.track('navigation', { from: 'series-pdp', to: 'series-pdp', trigger: 'similar-title', itemId: showId });
            }
          } catch (e) { /* fail silently */ }
          App.navigate('series-pdp', { showId });
        }
        return;
      }
    }

    if (zone === 'more-info') {
      if (action === 'UP') {
        if (this._container.querySelector('#similar-track')) {
          this._activateZone('similar');
          this._scrollToSection('similar-rail-section');
        } else if (this._container.querySelector('#extras-track')) {
          this._activateZone('extras');
          this._scrollToSection('extras-rail-section');
        } else {
          this._activateZone('episodes');
          this._scrollToSection('episodes-rail-section');
        }
        return;
      }
      if (action === 'DOWN') {
        try {
          if (typeof Analytics !== 'undefined') {
            Analytics.track('dead_end', { screen: 'series-pdp', zone: 'more-info', direction: 'down', note: 'at bottom of page' });
          }
        } catch (e) { /* fail silently */ }
        return;
      }
    }
  },
};
