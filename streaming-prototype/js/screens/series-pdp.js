/* ============================================================
   SERIES PDP SCREEN — Series detail page
   ============================================================ */

const SeriesPDPScreen = {
  id: 'series-pdp',

  _container: null,
  _scrollEl: null,
  _show: null,
  _seriesData: null,
  _isReturning: false,
  _cwItem: null,

  // Focus zones: 'buttons' | 'seasons' | 'episodes' | 'extras' | 'similar' | 'more-info'
  _activeZone: 'buttons',
  _btnIdx: 0,
  _seasonIdx: 0,
  _episodeIdx: 0,
  _extrasIdx: 0,
  _similarIdx: 0,
  _scrollY: 0,

  async init(container, params) {
    this._container = container;
    this._container.className = 'screen screen-series-pdp';
    this._scrollY = 0;
    this._activeZone = 'buttons';
    this._btnIdx = 0;
    this._seasonIdx = 0;
    this._episodeIdx = 0;

    const showId = params.showId;
    this._show = DataStore.getShow(showId);
    if (!this._show) {
      container.innerHTML = '<div style="padding:100px;color:#fff;font-size:24px;">Show not found.</div>';
      return;
    }

    this._isReturning = DataStore.hasWatchHistory(showId);
    this._cwItem = DataStore.getContinueWatchingItem(showId);
    this._seriesData = await DataStore.getSeriesData(showId);

    this._render();
  },

  _render() {
    const show = this._show;
    const isReturning = this._isReturning;
    const cwItem = this._cwItem;
    const inMyStuff = DataStore.isInMyStuff(show.id);

    // Build action buttons list
    const buttons = this._buildButtonList(isReturning, inMyStuff, cwItem);
    this._buttons = buttons;

    const heroHTML = this._buildHeroHTML(show, isReturning, cwItem, buttons);
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
    this._attachEvents();
  },

  _buildButtonList(isReturning, inMyStuff, cwItem) {
    if (!isReturning) {
      return [
        { id: 'my-stuff', label: `+ Add To My Stuff` },
        { id: 'play', label: '▶ Play S1:E1', primary: true },
      ];
    } else {
      const episodeLabel = cwItem ? `▶ Resume ${cwItem.episodeId.toUpperCase().replace('S','S').replace('E',':E')}` : '▶ Resume';
      return [
        { id: 'remove-history', label: '✕ Remove From Watch History' },
        { id: 'my-stuff', label: inMyStuff ? '✓ Added To My Stuff' : '+ Add To My Stuff' },
        { id: 'restart', label: '↻ Restart Episode' },
        { id: 'resume', label: episodeLabel, primary: true },
      ];
    }
  },

  _buildHeroHTML(show, isReturning, cwItem, buttons) {
    const posterHTML = isReturning ? `
      <div class="pdp-poster-art">
        <img src="${show.posterImage}" alt="${show.title}" />
      </div>
    ` : '';

    const episodeSubtitle = isReturning && this._seriesData ? (() => {
      // Find current episode title
      for (const season of (this._seriesData.seasons || [])) {
        for (const ep of season.episodes) {
          if (ep.id === (cwItem?.episodeId)) return ep.title;
        }
      }
      return '';
    })() : '';

    const buttonsHTML = buttons.map((btn, i) => `
      <button class="pdp-btn${btn.primary ? ' primary' : ''}" data-btn-id="${btn.id}" data-btn-idx="${i}">${btn.label}</button>
    `).join('');

    return `
      <div class="pdp-hero">
        <img class="pdp-hero-bg" src="${show.heroImage}" alt="${show.title}" />
        <div class="pdp-hero-gradient"></div>
        <div class="pdp-hero-gradient-bottom"></div>
        ${posterHTML}
        <div class="pdp-hero-content">
          ${show.badges && show.badges.length ? `<div class="pdp-badge"><span class="badge">${show.badges[0]}</span></div>` : ''}
          <div class="pdp-title">${show.title}</div>
          ${episodeSubtitle ? `<div class="pdp-episode-subtitle">"${episodeSubtitle}"</div>` : ''}
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
            ${buttonsHTML}
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
        ${i === 0 ? `Season 1&nbsp;<span style="font-weight:400;font-size:12px;">${s.episodeCount}ep</span>` : `S${s.number}`}
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
    return season.episodes.map((ep, i) => {
      const isWatched = DataStore.hasWatchHistory
        ? DataStore.hasWatchHistory(`${this._show.id}-${ep.id}`)
        : false;
      return `
        <div class="episode-item" data-ep-idx="${i}">
          <div class="episode-tile" data-ep-id="${ep.id}">
            <img src="${ep.thumbnail}" alt="${ep.title}" loading="lazy" />
            <div class="progress-bar-container" style="height:3px;"><div class="progress-bar-fill" style="width:0%;"></div></div>
            ${isWatched ? '<div class="episode-watched-badge">✓</div>' : ''}
          </div>
          <div class="episode-tile-below">
            <div class="episode-meta">S${ep.season}:E${ep.episode} · ${ep.airDate} · ${ep.duration}</div>
            <div class="episode-title">${ep.title}</div>
            <div class="episode-desc">${ep.description}</div>
          </div>
        </div>
      `;
    }).join('');
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

  _attachEvents() {
    // No additional events needed; all handled by focus engine
  },

  onFocus() {
    FocusEngine.setHandler((action) => this._handleKey(action));
    this._activateZone(this._activeZone);
  },

  onBlur() {
    this._deactivateAllZones();
  },

  destroy() {},

  _activateZone(zone) {
    this._activeZone = zone;
    this._deactivateAllZones();

    if (zone === 'buttons') {
      this._focusBtn(this._btnIdx);
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

  _deactivateAllZones() {
    const btns = this._container.querySelectorAll('.pdp-btn');
    btns.forEach(b => b.classList.remove('focused'));
    const seasons = this._container.querySelectorAll('.season-pill');
    seasons.forEach(s => s.classList.remove('focused'));
    const epTiles = this._container.querySelectorAll('.episode-tile');
    epTiles.forEach(t => t.classList.remove('focused'));
    const simTiles = this._container.querySelectorAll('#similar-track .portrait-tile');
    simTiles.forEach(t => t.classList.remove('focused'));
    const card = this._container.querySelector('#more-info-card');
    if (card) card.classList.remove('focused');
  },

  _focusBtn(idx) {
    const btns = Array.from(this._container.querySelectorAll('.pdp-btn'));
    btns.forEach(b => b.classList.remove('focused'));
    if (btns[idx]) btns[idx].classList.add('focused');
    this._btnIdx = idx;
  },

  _focusSeason(idx) {
    const pills = Array.from(this._container.querySelectorAll('.season-pill'));
    pills.forEach(p => p.classList.remove('focused'));
    if (pills[idx]) pills[idx].classList.add('focused');
    this._seasonIdx = idx;
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
    this._scrollRail('extras-track', idx, 456, 16);
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
    let translateX = -(idx * (itemW + gap) - 60);
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
      const btns = Array.from(this._container.querySelectorAll('.pdp-btn'));
      if (action === 'UP') {
        if (this._btnIdx > 0) {
          this._focusBtn(this._btnIdx - 1);
        }
        // At top — stay here (first button)
        return;
      }
      if (action === 'DOWN') {
        if (this._btnIdx < btns.length - 1) {
          this._focusBtn(this._btnIdx + 1);
        } else {
          // Move to seasons zone
          if (this._seriesData) {
            this._activateZone('seasons');
            this._scrollToSection('season-selector');
          }
        }
        return;
      }
      if (action === 'OK') {
        const btnId = btns[this._btnIdx]?.dataset?.btnId;
        this._handleButtonAction(btnId);
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
        // Switch season — update active pill
        pills.forEach((p, i) => {
          p.classList.toggle('active', i === this._seasonIdx);
        });
        showToast(`Switched to Season ${this._seasonIdx + 1}`);
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
        const hasExtras = !!this._container.querySelector('#extras-track');
        if (hasExtras) {
          this._activateZone('extras');
          this._scrollToSection('extras-rail-section');
        } else {
          const hasSimilar = !!this._container.querySelector('#similar-track');
          if (hasSimilar) {
            this._activateZone('similar');
            this._scrollToSection('similar-rail-section');
          } else {
            this._activateZone('more-info');
            this._scrollToSection('more-info-card');
          }
        }
        return;
      }
      if (action === 'LEFT') {
        if (this._episodeIdx > 0) this._focusEpisode(this._episodeIdx - 1);
        return;
      }
      if (action === 'RIGHT') {
        if (this._episodeIdx < tiles.length - 1) this._focusEpisode(this._episodeIdx + 1);
        return;
      }
      if (action === 'OK') {
        const season = this._seriesData?.seasons[this._seasonIdx];
        const ep = season?.episodes[this._episodeIdx];
        if (ep) {
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
        const hasSimilar = !!this._container.querySelector('#similar-track');
        if (hasSimilar) {
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
        return;
      }
      if (action === 'RIGHT') {
        if (this._extrasIdx < tiles.length - 1) this._focusExtra(this._extrasIdx + 1);
        return;
      }
      if (action === 'OK') {
        const extra = this._seriesData?.extras[this._extrasIdx];
        if (extra) App.navigate('player', { showId: this._show.id, episodeId: extra.id, isExtra: true });
        return;
      }
    }

    if (zone === 'similar') {
      const tiles = Array.from(this._container.querySelectorAll('#similar-track .portrait-tile'));
      if (action === 'UP') {
        this._activateZone('extras');
        this._scrollToSection('extras-rail-section');
        return;
      }
      if (action === 'DOWN') {
        this._activateZone('more-info');
        this._scrollToSection('more-info-card');
        return;
      }
      if (action === 'LEFT') {
        if (this._similarIdx > 0) this._focusSimilar(this._similarIdx - 1);
        return;
      }
      if (action === 'RIGHT') {
        if (this._similarIdx < tiles.length - 1) this._focusSimilar(this._similarIdx + 1);
        return;
      }
      if (action === 'OK') {
        const showId = tiles[this._similarIdx]?.dataset?.showId;
        if (showId) App.navigate('series-pdp', { showId });
        return;
      }
    }

    if (zone === 'more-info') {
      if (action === 'UP') {
        const hasSimilar = !!this._container.querySelector('#similar-track');
        if (hasSimilar) {
          this._activateZone('similar');
          this._scrollToSection('similar-rail-section');
        } else {
          this._activateZone('extras');
          this._scrollToSection('extras-rail-section');
        }
        return;
      }
      // At bottom, no further DOWN
    }
  },

  _handleButtonAction(btnId) {
    const show = this._show;
    if (btnId === 'play') {
      const firstEp = this._seriesData?.seasons[0]?.episodes[0];
      App.navigate('player', {
        showId: show.id,
        episodeId: firstEp?.id || 'movie',
        episodeData: firstEp,
      });
    } else if (btnId === 'resume') {
      const cwItem = this._cwItem;
      App.navigate('player', {
        showId: show.id,
        episodeId: cwItem?.episodeId || 'movie',
        progress: cwItem?.progress || 0,
      });
    } else if (btnId === 'my-stuff') {
      const isNowAdded = DataStore.toggleMyStuff(show.id);
      // Re-render buttons
      this._isReturning = DataStore.hasWatchHistory(show.id);
      const buttons = this._buildButtonList(this._isReturning, isNowAdded, this._cwItem);
      this._buttons = buttons;
      const actionsEl = this._container.querySelector('#pdp-actions');
      if (actionsEl) {
        actionsEl.innerHTML = buttons.map((btn, i) => `
          <button class="pdp-btn${btn.primary ? ' primary' : ''}" data-btn-id="${btn.id}" data-btn-idx="${i}">${btn.label}</button>
        `).join('');
        this._focusBtn(this._btnIdx);
      }
      showToast(isNowAdded ? `Added to My Stuff` : `Removed from My Stuff`);
    } else if (btnId === 'remove-history') {
      DataStore.removeFromHistory(show.id);
      this._isReturning = false;
      this._cwItem = null;
      this._render();
      FocusEngine.setHandler((action) => this._handleKey(action));
      this._activateZone('buttons');
      showToast('Removed from watch history');
    } else if (btnId === 'restart') {
      App.navigate('player', { showId: show.id, episodeId: 's1e1', progress: 0 });
    }
  },
};
