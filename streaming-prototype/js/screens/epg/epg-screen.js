/* ============================================================
   EPG SCREEN — Electronic Program Guide
   Screen module registered with App.registerScreen()
   ============================================================ */

const EPGScreen = (() => {

  // ---- Screen state ----
  let _container     = null;
  let _screenEl      = null;
  let _rail          = null;
  let _grid          = null;
  let _overlay       = null;
  let _navZone       = null;

  // Focus context: 'nav' | 'rail' | 'grid'
  let _focusContext  = 'grid';

  // Grid focus state
  let _activeRowIndex  = 0;    // flat index into _grid.allRows
  let _lastRowIndex    = 0;    // remembered for rail→grid re-entry
  let _inLogoCell      = false; // true when logo cell is focused within the active row

  let _screenEnterTime = null;

  // ---- Analytics wrapper ----
  function _track(eventName, payload = {}) {
    try {
      if (typeof Analytics !== 'undefined') {
        Analytics.track(eventName, payload);
      }
    } catch (e) { /* fail silently */ }
  }

  // ---- Nav zone (top nav for EPG screen) ----
  function _buildNavZone(navEl) {
    const tabs = Array.from(navEl.querySelectorAll('.nav-tab'));
    // Find Live tab index
    const liveIdx  = tabs.findIndex(t => t.dataset.navTab === 'live');
    const forYouIdx = tabs.findIndex(t => t.dataset.navTab === 'for-you');
    let currentIdx = liveIdx >= 0 ? liveIdx : 1;
    let focused    = false;

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
      if (dir === 'LEFT'  && currentIdx > 0)              currentIdx--;
      else if (dir === 'RIGHT' && currentIdx < tabs.length - 1) currentIdx++;
      tabs[currentIdx].classList.add('nav-focused');
    }

    function select() {
      const tab = tabs[currentIdx];
      const navTab = tab?.dataset.navTab;

      if (navTab === 'for-you') {
        _track('epg_nav_from_live', {});
        App.navigate('lander');
        return;
      }

      if (navTab === 'live') {
        // Already on Live — no-op
        return;
      }

      // All other tabs: static, show toast
      const name = tab?.textContent?.trim() || navTab;
      showToast(`${name} — coming soon`);
    }

    function resetToLive() {
      currentIdx = liveIdx >= 0 ? liveIdx : 1;
    }

    return { activate, deactivate, move, select, resetToLive };
  }

  // ---- Focus helpers ----
  function _activeRow() {
    return _grid?.allRows[_activeRowIndex]?.row || null;
  }

  // Visual-only blur — removes focus highlight but does NOT reset tile scroll position.
  // Used when navigating BACK to rail so the user's place is preserved for re-entry.
  function _blurCurrentRowVisual() {
    const row = _activeRow();
    if (!row) return;
    if (row.isLogoFocused()) {
      row.setLogoFocused(false);
    } else {
      row.setTileFocused(row.getFocusedTileIndex(), false);
    }
  }

  // Full blur — removes focus highlight AND resets tile scroll to currently-playing.
  // Used when navigating UP/DOWN between rows.
  function _blurCurrentRow() {
    _blurCurrentRowVisual();
    const row = _activeRow();
    if (row) row.returnToNow();
  }

  function _enterRow(rowIndex, startInLogo) {
    _activeRowIndex = rowIndex;
    const row = _activeRow();
    if (!row) return;
    _inLogoCell = startInLogo;

    if (startInLogo) {
      row.setLogoFocused(true);
      _track('epg_channel_logo_focused', {
        channel_id: row.channelId,
        genre_id:   row.genreId,
      });
    } else {
      const tileIdx = row.getFocusedTileIndex();
      row.setTileFocused(tileIdx, true);
      _track('epg_channel_row_focused', {
        channel_id: row.channelId,
        genre_id:   row.genreId,
        row_index:  rowIndex,
      });
      _track('epg_program_tile_focused', {
        channel_id:        row.channelId,
        genre_id:          row.genreId,
        program_id:        row.programs[tileIdx]?.id,
        tile_offset_from_now: tileIdx,
      });
    }

    // Update genre rail anchor
    const genreId = _grid.allRows[rowIndex]?.genreId;
    if (genreId && _rail) {
      _rail.setActiveChip(genreId);
    }

    // Scroll grid to keep row visible
    _grid.scrollToRow(rowIndex);
  }

  // ---- Key handler ----
  function _handleKey(action) {

    // Overlay captures all input first
    if (_overlay && _overlay.isOpen()) {
      _overlay.handleKey(action);
      return;
    }

    // Nav context
    if (_focusContext === 'nav') {
      if (action === 'LEFT' || action === 'RIGHT') {
        _navZone.move(action);
      } else if (action === 'OK') {
        _navZone.select();
      } else if (action === 'DOWN') {
        _navZone.deactivate();
        _focusContext = 'rail';
        _rail.setFocusedChip(_rail.getFocusedIndex());
      } else if (action === 'BACK') {
        // Already in nav — BACK from nav is a no-op or exits app
        // Consistent with lander: BACK from top of stack does nothing
      }
      return;
    }

    // Rail context
    if (_focusContext === 'rail') {
      if (action === 'LEFT' || action === 'RIGHT') {
        _rail.move(action);
      } else if (action === 'OK') {
        _rail.select();
      } else if (action === 'UP') {
        // Rail → Nav
        _rail.blurChips(); // remove visual focus without changing the remembered index
        _focusContext = 'nav';
        _navZone.resetToLive();
        _navZone.activate();
      } else if (action === 'DOWN') {
        // Rail → Grid
        _focusContext = 'grid';
        _enterRow(_lastRowIndex, false);
      } else if (action === 'BACK') {
        _rail.blurChips(); // remove visual focus without changing the remembered index
        _focusContext = 'nav';
        _navZone.resetToLive();
        _navZone.activate();
        _track('epg_back_to_nav', { from_surface: 'rail' });
      }
      return;
    }

    // Grid context
    if (_focusContext === 'grid') {
      const row         = _activeRow();
      const rowData     = _grid.allRows[_activeRowIndex];
      const totalRows   = _grid.allRows.length;

      if (action === 'BACK') {
        // Preserve tile scroll position — do NOT call returnToNow here.
        // User's position is restored when they press DOWN from the rail.
        _blurCurrentRowVisual();
        _lastRowIndex = _activeRowIndex;
        _focusContext = 'rail';
        _rail.setFocusedChip(_rail.getFocusedIndex());
        _track('epg_back_to_rail', { from_surface: 'grid' });
        return;
      }

      if (!row) return;

      if (action === 'UP') {
        if (_activeRowIndex === 0) {
          // Top row → genre rail
          _blurCurrentRow();
          _lastRowIndex = _activeRowIndex;
          _focusContext = 'rail';
          _rail.setFocusedChip(_rail.getFocusedIndex());
        } else {
          _blurCurrentRow();
          _enterRow(_activeRowIndex - 1, false);
        }
        return;
      }

      if (action === 'DOWN') {
        if (_activeRowIndex < totalRows - 1) {
          _blurCurrentRow();
          _enterRow(_activeRowIndex + 1, false);
        }
        // At last row: no-op
        return;
      }

      // LEFT / RIGHT / OK within a row
      if (_inLogoCell) {
        if (action === 'RIGHT') {
          // Logo cell → tile track (tile index 0)
          row.setLogoFocused(false);
          _inLogoCell = false;
          row.setTileFocused(0, true);
          row.scrollToTile(0, false);
          _track('epg_program_tile_focused', {
            channel_id:           row.channelId,
            genre_id:             row.genreId,
            program_id:           row.programs[0]?.id,
            tile_offset_from_now: 0,
          });
        }
        if (action === 'OK') {
          // Open more-info overlay
          const tileIdx = row.getFocusedTileIndex();
          const program = row.programs[tileIdx];
          const channel = EPGDataModel.getChannel(row.channelId);
          if (!program || !channel) return;

          const variant = tileIdx === 0 ? 'currently_playing' : 'future';
          _screenEl.classList.add('epg-overlay-open');
          _overlay.open(channel, program, variant);
        }
        return;
      }

      // Tile track focused
      const tileIdx = row.getFocusedTileIndex();

      if (action === 'LEFT') {
        if (tileIdx === 0) {
          // Move to logo cell
          row.setTileFocused(0, false);
          _inLogoCell = true;
          row.setLogoFocused(true);
          _track('epg_channel_logo_focused', {
            channel_id: row.channelId,
            genre_id:   row.genreId,
          });
        } else {
          // Move to previous tile
          row.setTileFocused(tileIdx, false);
          const newIdx = tileIdx - 1;
          row.setTileIndex(newIdx);
          row.setTileFocused(newIdx, true);
          row.scrollToTile(newIdx, false);
          _track('epg_program_tile_focused', {
            channel_id:           row.channelId,
            genre_id:             row.genreId,
            program_id:           row.programs[newIdx]?.id,
            tile_offset_from_now: newIdx,
          });
        }
        return;
      }

      if (action === 'RIGHT') {
        const maxIdx = row.tileCount - 1;
        if (tileIdx < maxIdx) {
          row.setTileFocused(tileIdx, false);
          const newIdx = tileIdx + 1;
          row.setTileIndex(newIdx);
          row.setTileFocused(newIdx, true);
          row.scrollToTile(newIdx, false);
          _track('epg_program_tile_scrubbed', {
            channel_id:      row.channelId,
            genre_id:        row.genreId,
            new_tile_offset: newIdx,
          });
          _track('epg_program_tile_focused', {
            channel_id:           row.channelId,
            genre_id:             row.genreId,
            program_id:           row.programs[newIdx]?.id,
            tile_offset_from_now: newIdx,
          });
        }
        // At boundary: no-op
        return;
      }

      if (action === 'OK') {
        // OK on a tile — not wired (tiles aren't selectable directly in this build)
        // Selecting tile doesn't open overlay; logo cell opens overlay.
        return;
      }
    }
  }

  // ---- Genre chip selected ----
  function _onChipSelected(genreId) {
    // Scroll grid to first row of selected genre
    _grid.scrollToGenre(genreId);
    const firstRowIdx = _grid.allRows.findIndex(r => r.genreId === genreId);
    if (firstRowIdx >= 0) {
      _lastRowIndex = firstRowIdx;
    }
    // Move focus to grid, first row of that genre
    _focusContext = 'grid';
    _enterRow(firstRowIdx >= 0 ? firstRowIdx : 0, false);
  }

  // ---- More-info close ----
  function _onOverlayClose() {
    _screenEl.classList.remove('epg-overlay-open');
    // Return focus to the logo cell of the row that opened the overlay
    const row = _activeRow();
    if (row) {
      _inLogoCell = true;
      row.setLogoFocused(true);
    }
    _focusContext = 'grid';
  }

  // ---- Screen module ----
  async function init(container, params) {
    _container       = container;
    _screenEnterTime = Date.now();
    _activeRowIndex  = 0;
    _lastRowIndex    = 0;
    _inLogoCell      = false;
    _focusContext    = 'grid';

    container.className = 'screen screen-epg';

    // Apply debug CSS toggles
    if (typeof DebugConfig !== 'undefined') {
      if (!DebugConfig.get('epgShowRatings', true))      container.classList.add('epg-hide-ratings');
      if (!DebugConfig.get('epgShowGenreHeaders', true)) container.classList.add('epg-hide-genre-headers');
    }

    // Load EPG data
    await EPGDataModel.init();

    const genres = EPGDataModel.getGenres();

    // Build nav
    container.innerHTML = `${buildEPGNav()}<div class="epg-genre-rail-placeholder"></div><div class="epg-grid-wrapper"><div class="epg-grid-wrapper-inner"></div></div>`;
    _screenEl = container;

    // Replace nav placeholder with actual nav element
    const navEl = container.querySelector('.top-nav');

    // Genre rail
    _rail = createGenreRail(
      genres,
      _onChipSelected,
      (eventName, payload) => _track(eventName, payload)
    );
    container.querySelector('.epg-genre-rail-placeholder').replaceWith(_rail.element);

    // Channel grid
    _grid = createChannelGrid(
      genres,
      EPGDataModel,
      (eventName, payload) => _track(eventName, payload)
    );
    const gridWrapper = container.querySelector('.epg-grid-wrapper');
    gridWrapper.innerHTML = '';
    gridWrapper.appendChild(_grid.element);

    // More-info overlay (appended to body to sit above everything)
    // Remove any stale overlay left from a prior mount (guards against non-destroy re-init)
    const staleOverlay = document.body.querySelector('.epg-more-info-overlay');
    if (staleOverlay) staleOverlay.parentNode.removeChild(staleOverlay);

    _overlay = createMoreInfoOverlay(
      _onOverlayClose,
      (eventName, payload) => _track(eventName, payload)
    );
    document.body.appendChild(_overlay.element);

    // Nav zone
    _navZone = _buildNavZone(navEl);

    // Mark Live tab as active
    navEl.querySelectorAll('.nav-tab').forEach(t => t.classList.remove('active'));
    const liveTab = navEl.querySelector('[data-nav-tab="live"]');
    if (liveTab) liveTab.classList.add('active');

    const entrySource = params?.entrySource || 'nav';
    _track('epg_screen_entered', { entry_source: entrySource });
  }

  function onFocus() {
    FocusEngine.setHandler((action) => _handleKey(action));
    // Set initial focus on first row's currently-playing tile
    if (_grid && _grid.allRows.length > 0) {
      _enterRow(0, false);
    }
  }

  function onBlur() {
    FocusEngine.clearHandler();
    // Blur current row
    const row = _activeRow();
    if (row) {
      if (row.isLogoFocused()) row.setLogoFocused(false);
      else row.setTileFocused(row.getFocusedTileIndex(), false);
    }
    _navZone && _navZone.deactivate();

    _track('epg_screen_exited', {
      dwell_ms:         Date.now() - (_screenEnterTime || Date.now()),
      exit_destination: 'lander',
    });
  }

  function destroy() {
    // Remove overlay from body
    if (_overlay && _overlay.element && _overlay.element.parentNode) {
      _overlay.element.parentNode.removeChild(_overlay.element);
    }
    _container  = null;
    _screenEl   = null;
    _rail       = null;
    _grid       = null;
    _overlay    = null;
    _navZone    = null;
  }

  return {
    id: 'epg',
    init,
    onFocus,
    onBlur,
    destroy,
  };

})();

/* ---- Nav HTML builder for EPG screen ---- */
function buildEPGNav() {
  // Reuses the same nav structure as the lander.
  // The active class on 'live' is set after mount.
  return `
    <nav class="top-nav" id="top-nav">
      <div class="nav-left">
        <div class="nav-tab" data-nav-tab="search">
          <svg viewBox="0 0 24 24"><path d="M21 21l-4.35-4.35M17 11A6 6 0 1 1 5 11a6 6 0 0 1 12 0z" stroke="currentColor" stroke-width="2" fill="none" stroke-linecap="round"/></svg>
        </div>
        <div class="nav-tab" data-nav-tab="for-you">For You</div>
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
