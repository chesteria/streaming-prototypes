// @ts-check
/* ============================================================
   EPG CHANNEL ROW — Logo cell + scrollable tile track
   Per-instance scroll state keyed by channelId:genreId
   ============================================================ */

const EPG_TILE_WIDTH = 725;
const EPG_TILE_GAP   = 16;  /* must match gap: 16px on .epg-tile-track in epg.css */
const EPG_TILE_STEP  = EPG_TILE_WIDTH + EPG_TILE_GAP;

/**
 * createChannelRow(channel, genreId, programs, currentProgramIndex, onAnalytics)
 *
 * Returns {
 *   element,
 *   instanceKey,      // "${channelId}:${genreId}"
 *   getFocusedTileIndex(),
 *   setLogoFocused(bool),
 *   setTileFocused(tileIndex, focused),
 *   scrollToTile(index, animate),
 *   returnToNow(),    // triggers return-to-now animation
 *   genreId,
 *   channelId,
 * }
 */
function createChannelRow(channel, genreId, programs, currentProgramIndex, onAnalytics) {
  const instanceKey = `${channel.id}:${genreId}`;

  // ---- DOM ----
  const rowEl = document.createElement('div');
  rowEl.className = 'epg-channel-row';
  rowEl.setAttribute('data-instance-key', instanceKey);

  const logoCell  = createChannelLogoCell(channel);
  const trackWrap = document.createElement('div');
  trackWrap.className = 'epg-tile-track-wrapper';

  const track = document.createElement('div');
  track.className = 'epg-tile-track';
  trackWrap.appendChild(track);

  // Pinned focus ring — never moves, tiles slide into it
  const focusRing = document.createElement('div');
  focusRing.className = 'epg-focus-ring';
  trackWrap.appendChild(focusRing);

  rowEl.appendChild(logoCell.element);
  rowEl.appendChild(trackWrap);

  // ---- Build tiles ----
  const tileEls = [];
  programs.forEach((program, i) => {
    const isCurrentlyPlaying = (i === currentProgramIndex);
    const tile = createProgramTile(program, isCurrentlyPlaying, channel);
    track.appendChild(tile.element);
    tileEls.push(tile.element);
  });

  // ---- State ----
  let focusedTileIndex = 0; // 0 = logo cell, 1+ = tile index+1 internally
                             // We'll use a cleaner model:
                             // logoFocused: boolean, tileIndex: number (0 = currently playing)
  let _logoFocused = false;
  let _tileIndex   = 0; // index into programs array; 0 = currently playing

  // ---- Scroll ----
  function _applyScroll(index, animate) {
    const offset = index * EPG_TILE_STEP;
    if (animate) {
      track.classList.add('is-returning');
      // Remove class after transition ends so it doesn't affect future instant scrolls
      const onEnd = () => {
        track.classList.remove('is-returning');
        track.removeEventListener('transitionend', onEnd);
      };
      track.addEventListener('transitionend', onEnd);
    } else {
      track.classList.remove('is-returning');
    }
    track.style.transform = `translateX(-${offset}px)`;
  }

  function scrollToTile(index, animate) {
    _applyScroll(index, animate);
  }

  // ---- Return to now ----
  function returnToNow() {
    if (_tileIndex === 0) return; // already at now
    const finalOffset = _tileIndex;
    _tileIndex = 0;

    if (typeof onAnalytics === 'function') {
      onAnalytics('epg_row_returned_to_now', {
        channel_id: channel.id,
        genre_id: genreId,
        final_offset_before_reset: finalOffset,
      });
    }

    _applyScroll(0, true);
  }

  // ---- Focus helpers ----
  function setLogoFocused(focused) {
    _logoFocused = focused;
    logoCell.setFocused(focused);
    rowEl.classList.toggle('is-row-focused', focused);
  }

  function setTileFocused(tileIndex, focused) {
    // Show/hide the pinned focus ring — individual tiles do not get the border
    focusRing.classList.toggle('is-visible', focused);
    if (focused) {
      rowEl.classList.add('is-row-focused');
    } else if (!_logoFocused) {
      rowEl.classList.remove('is-row-focused');
    }
  }

  function getFocusedTileIndex() {
    return _tileIndex;
  }

  function isLogoFocused() {
    return _logoFocused;
  }

  // ---- External tile index setter (used by grid) ----
  function setTileIndex(index) {
    _tileIndex = index;
  }

  return {
    element: rowEl,
    instanceKey,
    channelId: channel.id,
    genreId,
    programs,
    currentProgramIndex,
    getFocusedTileIndex,
    setTileIndex,
    isLogoFocused,
    setLogoFocused,
    setTileFocused,
    scrollToTile,
    returnToNow,
    tileCount: programs.length,
  };
}
