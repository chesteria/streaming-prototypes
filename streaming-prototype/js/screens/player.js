/* ============================================================
   PLAYER SCREEN — Simulated video player with full controls
   ============================================================ */

// === TIMING (configurable) ===
const CONTROLS_AUTO_HIDE_MS  = 5000;
const SIMULATE_PLAYBACK      = true;
const PLAYBACK_SPEED         = 1;         // 1 = realtime, 10 = 10x speed

// === VIDEO ===
const VIDEO_STREAM_URL = 'https://test-streams.mux.dev/x36xhzz/x36xhzz.m3u8';

const PlayerScreen = {
  id: 'player',

  _container: null,
  _show: null,
  _episodeData: null,
  _isLive: false,

  // Playback state
  _duration: 2520,   // seconds (42 min default)
  _elapsed: 0,       // seconds
  _playTimer: null,
  _hideTimer: null,

  // Focus state
  // Zones: 'progress' | 'buttons' | 'episodes'
  _activeZone: 'buttons',
  _btnGroupLeft: ['start-over', 'next-episode'],
  _btnGroupRight: ['more-info', 'captions'],
  _btnGroup: 'left',   // 'left' or 'right'
  _btnIdx: 1,          // default focus: Next Episode (index 1 in left group)
  _scrubPos: 0,        // 0..1
  _epIdx: 0,
  _controlsVisible: true,
  _modalVisible: false,
  _captionsOn: false,
  _episodes: [],
  _video: null,
  _hls: null,
  _debugConfigHandler: null,

  async init(container, params) {
    this._container = container;
    this._container.className = 'screen screen-player';

    this._isLive = params.isLive || false;
    this._elapsed = params.progress ? params.progress * this._duration : 0;
    this._scrubPos = this._elapsed / this._duration;
    this._controlsVisible = true;
    this._modalVisible = false;
    this._captionsOn = false;
    this._activeZone = 'buttons';
    this._btnGroup = 'left';
    this._btnIdx = 1;
    this._epIdx = 0;

    // Load show data
    const showId = params.showId;
    this._show = DataStore.getShow(showId);

    // Load episode data
    const seriesData = await DataStore.getSeriesData(showId);
    this._episodes = [];
    if (seriesData) {
      for (const season of seriesData.seasons) {
        this._episodes.push(...season.episodes);
      }
    }

    // Find current episode
    if (params.episodeData) {
      this._episodeData = params.episodeData;
    } else if (params.episodeId && this._episodes.length) {
      this._episodeData = this._episodes.find(e => e.id === params.episodeId) || this._episodes[0];
    } else if (this._episodes.length) {
      this._episodeData = this._episodes[0];
    }

    if (this._episodeData) {
      this._duration = this._parseDuration(this._episodeData.duration || '42m');
    }

    this._debugConfigHandler = (e) => {
      if (e.detail.key === 'playbackSpeed' && this._video) {
        this._video.playbackRate = e.detail.value;
      }
    };
    document.addEventListener('debugconfig:change', this._debugConfigHandler);

    this._render();
  },

  _parseDuration(str) {
    // "42m" -> 2520, "1h 32m" -> 5520
    const hm = str.match(/(\d+)h\s*(\d+)m/);
    if (hm) return parseInt(hm[1]) * 3600 + parseInt(hm[2]) * 60;
    const m = str.match(/(\d+)m/);
    if (m) return parseInt(m[1]) * 60;
    return 2520;
  },

  _formatTime(secs) {
    const h = Math.floor(secs / 3600);
    const m = Math.floor((secs % 3600) / 60);
    const s = Math.floor(secs % 60);
    if (h > 0) return `${h}:${String(m).padStart(2,'0')}:${String(s).padStart(2,'0')}`;
    return `${m}:${String(s).padStart(2,'0')}`;
  },

  _render() {
    const show = this._show;
    const ep = this._episodeData;

    const showTitle = show ? show.title : (this._isLive ? 'Live Channel' : 'Video');
    const bgImg = ep?.thumbnail || show?.landscapeImage || 'https://picsum.photos/seed/player/1920/1080';
    const rating = show?.rating || 'TV-14';
    const epLabel = ep ? `S${ep.season}:E${ep.episode}` : '';
    const epTitle = ep?.title || '';

    // Build episode tiles
    const episodeTilesHTML = this._episodes.slice(0, 8).map((e, i) => `
      <div class="player-ep-tile" data-ep-idx="${i}">
        <img src="${e.thumbnail}" alt="${e.title}" loading="lazy" />
        <div class="player-ep-tile-overlay"></div>
        <div class="player-ep-title">${e.title}</div>
        <div class="player-ep-meta">S${e.season}:E${e.episode} · ${e.duration}</div>
        <div class="progress-bar-container" style="height:3px;"><div class="progress-bar-fill" style="width:0%;background:var(--color-progress-scrub);"></div></div>
      </div>
    `).join('');

    this._container.innerHTML = `
      <video class="player-bg" id="player-video" preload="auto" playsinline></video>
      <div class="player-bg-dim overlay-visible" id="player-dim"></div>

      <!-- Scrub thumbnails -->
      <div class="scrub-thumbnails" id="scrub-thumbs">
        ${this._buildScrubThumbs(ep)}
      </div>

      <!-- Controls Overlay -->
      <div class="player-controls" id="player-controls">
        <div class="player-content-info">
          <div class="player-show-title">${showTitle}</div>
          <div class="player-episode-info">
            <span class="badge badge-rating">${rating}</span>
            ${epLabel ? `<span class="meta-dot">·</span><span>${epLabel}</span>` : ''}
            ${epTitle ? `<span class="meta-dot">·</span><span>${epTitle}</span>` : ''}
          </div>
        </div>

        <div class="player-progress-area">
          <div class="player-time-row">
            <span id="elapsed-time">${this._formatTime(this._elapsed)}</span>
            <span id="remaining-time">-${this._formatTime(this._duration - this._elapsed)}</span>
          </div>
          <div class="player-progress-bar" id="progress-bar">
            <div class="player-progress-fill" id="progress-fill" style="width:${this._scrubPos * 100}%;"></div>
            <div class="player-progress-handle" id="progress-handle" style="left:${this._scrubPos * 100}%;"></div>
          </div>
        </div>

        <div class="player-actions">
          <div class="player-btn-group" id="btn-group-left">
            <button class="player-btn" data-btn="start-over">↻ Start Over</button>
            <button class="player-btn focused" data-btn="next-episode">Next Episode →</button>
          </div>
          <div class="player-btn-group" id="btn-group-right">
            <button class="player-btn" data-btn="more-info">More Info</button>
            <button class="player-btn" data-btn="captions">${this._captionsOn ? 'Captions On' : 'Captions Off'}</button>
          </div>
        </div>
      </div>

      <!-- More Episodes Rail -->
      ${episodeTilesHTML.length ? `
      <div class="player-episodes-area" id="episodes-area">
        <div class="player-episodes-title">More Episodes</div>
        <div class="player-episode-rail">
          <div class="player-ep-track" id="ep-track">
            ${episodeTilesHTML}
          </div>
        </div>
      </div>` : ''}

      <!-- Info Modal -->
      <div class="player-modal-overlay" id="modal-overlay">
        <div class="player-modal-panel" id="modal-panel">
          ${this._buildModalHTML()}
        </div>
      </div>
    `;

    this._attachProgressUpdates();
  },

  _buildScrubThumbs(ep) {
    const thumbs = [];
    const show = this._show;
    for (let i = -2; i <= 2; i++) {
      const seed = ep ? `${ep.id}-scrub${i}` : `scrub${i}`;
      thumbs.push(`
        <div class="scrub-thumb${i === 0 ? ' center' : ''}">
          <img src="https://picsum.photos/seed/${seed}/480/270" alt="" loading="lazy" />
        </div>
      `);
    }
    return thumbs.join('');
  },

  _buildModalHTML() {
    const show = this._show;
    const ep = this._episodeData;
    if (!show) return '';
    return `
      <div class="modal-ep-thumb">
        <img src="${ep?.thumbnail || show.landscapeImage}" alt="${show.title}" />
        <div class="progress-bar-container"><div class="progress-bar-fill" style="width:${Math.round(this._scrubPos*100)}%;background:var(--color-progress-scrub);"></div></div>
      </div>
      <div class="modal-show-title">${show.title}</div>
      ${ep ? `<div class="modal-ep-title">${ep.title}</div>` : ''}
      <div class="modal-description">${ep?.description || show.description}</div>
      <div class="modal-meta-row meta-row">
        <span class="badge badge-rating">${show.rating}</span>
        <span class="meta-dot">·</span>
        <span>${show.year}</span>
        <span class="meta-dot">·</span>
        <span>${show.genres[0]}</span>
        ${ep ? `<span class="meta-dot">·</span><span>${ep.duration}</span>` : ''}
        <span class="meta-dot">·</span>
        <span>${show.type}</span>
      </div>
      <button class="pill-btn modal-series-btn focused" id="modal-goto-series">→ Go to Series Page</button>
    `;
  },

  _attachProgressUpdates() {
    const video = this._container?.querySelector('#player-video');
    if (video) {
      this._video = video;

      video.addEventListener('loadedmetadata', () => {
        this._duration = video.duration;
        video.playbackRate = DebugConfig.get('playbackSpeed', PLAYBACK_SPEED);
        this._updateProgressUI();
      });

      video.addEventListener('timeupdate', () => {
        if (!video.duration) return;
        this._elapsed = video.currentTime;
        this._scrubPos = video.currentTime / video.duration;
        this._updateProgressUI();
      });

      video.addEventListener('ended', () => {
        this._showControls();
      });

      // Attach stream via HLS.js on Chromium (Vizio, Chrome, Firefox);
      // fall back to native src assignment on Safari / WebKit.
      if (typeof Hls !== 'undefined' && Hls.isSupported()) {
        this._hls = new Hls();
        this._hls.loadSource(VIDEO_STREAM_URL);
        this._hls.attachMedia(video);
        this._hls.on(Hls.Events.MANIFEST_PARSED, () => {
          video.play().catch(() => {});
        });
      } else if (video.canPlayType('application/vnd.apple.mpegurl')) {
        // Native HLS — Safari / WebKit smart TVs
        video.src = VIDEO_STREAM_URL;
        video.play().catch(() => {});
      }
      return;
    }

    // Fallback: simulated playback when no video element
    if (!DebugConfig.get('simulatedPlayback', SIMULATE_PLAYBACK)) return;
    clearInterval(this._playTimer);
    this._playTimer = setInterval(() => {
      this._elapsed = Math.min(
        this._elapsed + DebugConfig.get('playbackSpeed', PLAYBACK_SPEED),
        this._duration
      );
      this._scrubPos = this._elapsed / this._duration;
      this._updateProgressUI();
      if (this._elapsed >= this._duration) clearInterval(this._playTimer);
    }, 1000);
  },

  _updateProgressUI() {
    const fill = this._container.querySelector('#progress-fill');
    const handle = this._container.querySelector('#progress-handle');
    const elapsed = this._container.querySelector('#elapsed-time');
    const remaining = this._container.querySelector('#remaining-time');
    if (fill) fill.style.width = `${this._scrubPos * 100}%`;
    if (handle) handle.style.left = `${this._scrubPos * 100}%`;
    if (elapsed) elapsed.textContent = this._formatTime(this._elapsed);
    if (remaining) remaining.textContent = `-${this._formatTime(this._duration - this._elapsed)}`;
  },

  onFocus() {
    FocusEngine.setHandler((action) => this._handleKey(action));
    this._showControls();
    if (this._video?.paused) this._video.play().catch(() => {});
  },

  onBlur() {
    clearInterval(this._playTimer);
    clearTimeout(this._hideTimer);
    if (this._video) this._video.pause();
  },

  destroy() {
    clearInterval(this._playTimer);
    clearTimeout(this._hideTimer);
    if (this._debugConfigHandler) {
      document.removeEventListener('debugconfig:change', this._debugConfigHandler);
      this._debugConfigHandler = null;
    }
    if (this._hls) {
      this._hls.destroy();
      this._hls = null;
    }
    if (this._video) {
      this._video.pause();
      this._video.removeAttribute('src');
      this._video.load();
      this._video = null;
    }
  },

  _showControls() {
    this._controlsVisible = true;
    const ctrl = this._container.querySelector('#player-controls');
    const dim = this._container.querySelector('#player-dim');
    const epArea = this._container.querySelector('#episodes-area');
    if (ctrl) ctrl.classList.remove('hidden');
    if (dim) dim.classList.add('overlay-visible');
    if (epArea) {
      epArea.classList.remove('expanded');
      epArea.classList.add('peek');
    }
    this._resetHideTimer();
  },

  _hideControls() {
    this._controlsVisible = false;
    const ctrl = this._container.querySelector('#player-controls');
    const epArea = this._container.querySelector('#episodes-area');
    if (ctrl) ctrl.classList.add('hidden');
    // Fully collapse episodes when controls are dismissed
    if (epArea) epArea.classList.remove('peek', 'expanded');
    clearTimeout(this._hideTimer);
  },

  _resetHideTimer() {
    clearTimeout(this._hideTimer);
    this._hideTimer = setTimeout(() => {
      if (!this._modalVisible && this._activeZone !== 'progress' && this._activeZone !== 'episodes') {
        this._hideControls();
      }
    }, DebugConfig.get('controlsAutoHide', CONTROLS_AUTO_HIDE_MS));
  },

  _focusBtn(group, idx) {
    this._btnGroup = group;
    this._btnIdx = idx;
    const allBtns = this._container.querySelectorAll('.player-btn');
    allBtns.forEach(b => b.classList.remove('focused'));

    const groupId = group === 'left' ? 'btn-group-left' : 'btn-group-right';
    const groupEl = this._container.querySelector(`#${groupId}`);
    if (groupEl) {
      const btns = Array.from(groupEl.querySelectorAll('.player-btn'));
      if (btns[idx]) btns[idx].classList.add('focused');
    }
  },

  _focusProgressBar() {
    const bar = this._container.querySelector('#progress-bar');
    if (bar) {
      bar.classList.add('focused');
      const thumbs = this._container.querySelector('#scrub-thumbs');
      if (thumbs) thumbs.classList.add('visible');
    }
  },

  _blurProgressBar() {
    const bar = this._container.querySelector('#progress-bar');
    if (bar) {
      bar.classList.remove('focused');
      const thumbs = this._container.querySelector('#scrub-thumbs');
      if (thumbs) thumbs.classList.remove('visible');
    }
  },

  _focusEpTile(idx) {
    const tiles = this._container.querySelectorAll('.player-ep-tile');
    tiles.forEach(t => t.classList.remove('focused'));
    if (tiles[idx]) {
      tiles[idx].classList.add('focused');
      // Scroll ep track
      const track = this._container.querySelector('#ep-track');
      if (track) {
        const translateX = -(idx * (340 + 16) - 60);
        track.style.transform = `translateX(${Math.min(0, translateX)}px)`;
      }
    }
    this._epIdx = idx;
  },

  _handleKey(action) {
    if (this._modalVisible) {
      this._handleModalKey(action);
      return;
    }

    // Any key press shows controls
    if (!this._controlsVisible) {
      if (action === 'BACK') {
        App.back();
        return;
      }
      this._showControls();
      this._activateZoneDefault();
      if (this._video?.paused) this._video.play().catch(() => {});
      return;
    }

    this._resetHideTimer();

    if (action === 'PLAYPAUSE') {
      if (this._video) {
        if (this._video.paused) { this._video.play().catch(() => {}); showToast('▶ Playing'); }
        else { this._video.pause(); showToast('⏸ Paused'); }
      }
      return;
    }

    if (action === 'BACK') {
      this._hideControls();
      return;
    }

    if (this._activeZone === 'progress') {
      if (action === 'DOWN') {
        this._blurProgressBar();
        this._activeZone = 'buttons';
        this._focusBtn('left', this._btnIdx);
        return;
      }
      if (action === 'UP') return; // Nothing above progress bar
      if (action === 'LEFT') {
        this._scrubPos = Math.max(0, this._scrubPos - 0.02);
        this._elapsed = this._scrubPos * this._duration;
        if (this._video) this._video.currentTime = this._elapsed;
        this._updateProgressUI();
        this._updateScrubThumbs();
        return;
      }
      if (action === 'RIGHT') {
        this._scrubPos = Math.min(1, this._scrubPos + 0.02);
        this._elapsed = this._scrubPos * this._duration;
        if (this._video) this._video.currentTime = this._elapsed;
        this._updateProgressUI();
        this._updateScrubThumbs();
        return;
      }
      if (action === 'OK') {
        if (this._video) {
          if (this._video.paused) { this._video.play().catch(() => {}); showToast('▶ Playing'); }
          else { this._video.pause(); showToast('⏸ Paused'); }
          return;
        }
        this._blurProgressBar();
        this._activeZone = 'buttons';
        this._focusBtn('left', this._btnIdx);
        return;
      }
    }

    if (this._activeZone === 'buttons') {
      if (action === 'UP') {
        // Go to progress bar
        const allBtns = this._container.querySelectorAll('.player-btn');
        allBtns.forEach(b => b.classList.remove('focused'));
        this._activeZone = 'progress';
        this._focusProgressBar();
        return;
      }
      if (action === 'DOWN') {
        // Expand episodes rail: hide controls, slide rail up to ~30% from bottom
        const epArea = this._container.querySelector('#episodes-area');
        if (epArea && this._episodes.length) {
          const ctrl = this._container.querySelector('#player-controls');
          if (ctrl) ctrl.classList.add('hidden');
          clearTimeout(this._hideTimer);
          epArea.classList.remove('peek');
          epArea.classList.add('expanded');
          const allBtns = this._container.querySelectorAll('.player-btn');
          allBtns.forEach(b => b.classList.remove('focused'));
          this._activeZone = 'episodes';
          this._focusEpTile(this._epIdx);
        }
        return;
      }
      if (action === 'LEFT') {
        if (this._btnGroup === 'left') {
          if (this._btnIdx > 0) this._focusBtn('left', this._btnIdx - 1);
          // else: at left edge of left group — no wrap
        } else {
          // right group: go to rightmost of left group
          this._focusBtn('left', this._btnGroupLeft.length - 1);
        }
        return;
      }
      if (action === 'RIGHT') {
        if (this._btnGroup === 'left') {
          if (this._btnIdx < this._btnGroupLeft.length - 1) {
            this._focusBtn('left', this._btnIdx + 1);
          } else {
            // Jump to right group
            this._focusBtn('right', 0);
          }
        } else {
          if (this._btnIdx < this._btnGroupRight.length - 1) {
            this._focusBtn('right', this._btnIdx + 1);
          }
          // at right edge — no wrap
        }
        return;
      }
      if (action === 'OK') {
        this._handleBtnAction();
        return;
      }
    }

    if (this._activeZone === 'episodes') {
      if (action === 'UP') {
        // Collapse episodes back to peek, restore controls
        const tiles = this._container.querySelectorAll('.player-ep-tile');
        tiles.forEach(t => t.classList.remove('focused'));
        const epArea = this._container.querySelector('#episodes-area');
        if (epArea) {
          epArea.classList.remove('expanded');
          epArea.classList.add('peek');
        }
        const ctrl = this._container.querySelector('#player-controls');
        if (ctrl) ctrl.classList.remove('hidden');
        this._controlsVisible = true;
        this._activeZone = 'buttons';
        this._focusBtn(this._btnGroup, this._btnIdx);
        this._resetHideTimer();
        return;
      }
      if (action === 'DOWN') return; // Bottom of screen
      if (action === 'LEFT') {
        if (this._epIdx > 0) this._focusEpTile(this._epIdx - 1);
        return;
      }
      if (action === 'RIGHT') {
        if (this._epIdx < this._episodes.length - 1 && this._epIdx < 7) {
          this._focusEpTile(this._epIdx + 1);
        }
        return;
      }
      if (action === 'OK') {
        const ep = this._episodes[this._epIdx];
        if (ep) {
          this._switchEpisode(ep);
        }
        return;
      }
    }
  },

  _activateZoneDefault() {
    this._activeZone = 'buttons';
    this._focusBtn(this._btnGroup, this._btnIdx);
  },

  _handleBtnAction() {
    const btnKey = this._btnGroup === 'left'
      ? this._btnGroupLeft[this._btnIdx]
      : this._btnGroupRight[this._btnIdx];

    if (btnKey === 'start-over') {
      this._elapsed = 0;
      this._scrubPos = 0;
      this._updateProgressUI();
      if (this._video) {
        this._video.currentTime = 0;
        this._video.play().catch(() => {});
      } else {
        clearInterval(this._playTimer);
        this._attachProgressUpdates();
      }
      showToast('Restarting from beginning…');
    } else if (btnKey === 'next-episode') {
      const curIdx = this._episodes.findIndex(e => e.id === this._episodeData?.id);
      const nextEp = this._episodes[curIdx + 1];
      if (nextEp) this._switchEpisode(nextEp);
      else showToast('No next episode');
    } else if (btnKey === 'more-info') {
      this._openModal();
    } else if (btnKey === 'captions') {
      this._captionsOn = !this._captionsOn;
      const btn = this._container.querySelector('[data-btn="captions"]');
      if (btn) btn.textContent = this._captionsOn ? 'Captions On' : 'Captions Off';
      showToast(this._captionsOn ? 'Captions On' : 'Captions Off');
    }
  },

  _switchEpisode(ep) {
    this._episodeData = ep;
    this._elapsed = 0;
    this._scrubPos = 0;
    this._duration = this._parseDuration(ep.duration || '42m');
    if (this._video) {
      this._video.currentTime = 0;
      this._video.play().catch(() => {});
    } else {
      clearInterval(this._playTimer);
      this._attachProgressUpdates();
    }

    // Update content info
    const show = this._show;
    const titleEl = this._container.querySelector('.player-show-title');
    const epInfoEl = this._container.querySelector('.player-episode-info');
    if (titleEl) titleEl.textContent = show?.title || '';
    if (epInfoEl) epInfoEl.innerHTML = `
      <span class="badge badge-rating">${show?.rating || ''}</span>
      <span class="meta-dot">·</span>
      <span>S${ep.season}:E${ep.episode}</span>
      <span class="meta-dot">·</span>
      <span>${ep.title}</span>
    `;

    this._updateProgressUI();
    this._showControls();
  },

  _updateScrubThumbs() {
    // Visual-only update — thumbnails shift based on scrub position
    const thumbs = this._container.querySelector('#scrub-thumbs');
    if (!thumbs) return;
    const pos = Math.round(this._scrubPos * 100);
    thumbs.style.left = `${Math.round(this._scrubPos * 1700) + 110}px`;
  },

  _openModal() {
    this._modalVisible = true;
    const overlay = this._container.querySelector('#modal-overlay');
    const panel = this._container.querySelector('#modal-panel');
    if (overlay) overlay.classList.add('visible');
    if (panel) {
      panel.classList.add('visible');
      panel.innerHTML = this._buildModalHTML();
    }
    // Focus first modal item
    this._modalZone = 'link';
    this._updateModalFocus();
    clearTimeout(this._hideTimer);
  },

  _closeModal() {
    this._modalVisible = false;
    const overlay = this._container.querySelector('#modal-overlay');
    const panel = this._container.querySelector('#modal-panel');
    if (overlay) overlay.classList.remove('visible');
    if (panel) panel.classList.remove('visible');
    this._showControls();
    this._focusBtn('right', 0); // Return focus to More Info button
  },

  _updateModalFocus() {
    // Single focusable item — always focused when modal is open
  },

  _handleModalKey(action) {
    if (action === 'BACK') {
      this._closeModal();
      return;
    }
    if (action === 'OK') {
      this._closeModal();
      App.navigate('series-pdp', { showId: this._show?.id });
    }
  },
};
