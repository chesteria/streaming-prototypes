/* ============================================================
   EPG GENRE RAIL — Horizontal chip strip with wrap + anchor
   ============================================================ */

/**
 * createGenreRail(genres, onChipSelected, onAnalytics)
 *
 * Returns {
 *   element,
 *   setFocusedChip(index),
 *   setActiveChip(genreId),   // anchor auto-highlight
 *   move(dir),                // 'LEFT' | 'RIGHT', returns new index
 *   getFocusedIndex(),
 *   getGenreIdAt(index),
 * }
 */
function createGenreRail(genres, onChipSelected, onAnalytics) {
  const railEl  = document.createElement('div');
  railEl.className = 'epg-genre-rail';

  const innerEl = document.createElement('div');
  innerEl.className = 'epg-genre-rail-inner';
  railEl.appendChild(innerEl);

  // Build chips
  const chips = genres.map((genre, i) => {
    const chip = document.createElement('div');
    chip.className = 'epg-genre-chip';
    chip.textContent = genre.label;
    chip.setAttribute('data-genre-id', genre.id);
    chip.setAttribute('data-index', String(i));
    innerEl.appendChild(chip);
    return chip;
  });

  let _focusedIndex = 0;
  let _activeGenreId = genres[0]?.id || null;

  // Anchor debounce timer
  let _anchorTimer = null;
  const ANCHOR_DEBOUNCE_MS = 50;

  function _scrollRailToChip(index) {
    // Ensure the focused/active chip is visible within the rail
    const chip    = chips[index];
    if (!chip) return;
    const chipRect = chip.getBoundingClientRect();
    const railRect = railEl.getBoundingClientRect();
    const chipOffsetLeft = chip.offsetLeft;
    const railWidth      = railEl.offsetWidth;
    const padX           = 60; // --content-pad-x

    // Current inner translate
    const currentTransform = innerEl.style.transform || 'translateX(0px)';
    const currentX = parseFloat(currentTransform.replace('translateX(', '')) || 0;

    // Desired visible range
    const visibleLeft  = -currentX;
    const visibleRight = -currentX + railWidth;
    const chipLeft     = chipOffsetLeft;
    const chipRight    = chipOffsetLeft + chip.offsetWidth;

    let newX = currentX;

    if (chipLeft < visibleLeft + padX) {
      newX = -(chipLeft - padX);
    } else if (chipRight > visibleRight - padX) {
      newX = -(chipRight - railWidth + padX);
    }

    innerEl.style.transform = `translateX(${newX}px)`;
  }

  function setFocusedChip(index) {
    chips.forEach((c, i) => c.classList.toggle('is-focused', i === index));
    _focusedIndex = index;
    _scrollRailToChip(index);

    if (typeof onAnalytics === 'function') {
      onAnalytics('epg_genre_chip_focused', {
        genre_id:    genres[index]?.id,
        genre_index: index,
      });
    }
  }

  function setActiveChip(genreId) {
    clearTimeout(_anchorTimer);
    _anchorTimer = setTimeout(() => {
      const prevGenreId = _activeGenreId;
      _activeGenreId = genreId;
      const activeIndex = genres.findIndex(g => g.id === genreId);

      chips.forEach((c, i) => c.classList.toggle('is-active', i === activeIndex));
      if (activeIndex >= 0) _scrollRailToChip(activeIndex);

      if (typeof onAnalytics === 'function' && genreId !== prevGenreId) {
        onAnalytics('epg_genre_anchor_updated', {
          genre_id: genreId,
          triggering_channel_id: null, // caller can override
        });
      }
    }, ANCHOR_DEBOUNCE_MS);
  }

  function move(dir) {
    const len = chips.length;
    let next  = _focusedIndex;

    if (dir === 'RIGHT') next = (_focusedIndex + 1) % len;
    if (dir === 'LEFT')  next = (_focusedIndex - 1 + len) % len;

    setFocusedChip(next);
    return next;
  }

  function select() {
    const chip  = chips[_focusedIndex];
    const genre = genres[_focusedIndex];
    if (!chip || !genre) return;

    // Momentary selected state
    chip.classList.add('is-active');

    if (typeof onAnalytics === 'function') {
      onAnalytics('epg_genre_selected', { genre_id: genre.id });
    }

    if (typeof onChipSelected === 'function') {
      onChipSelected(genre.id, _focusedIndex);
    }
  }

  // Remove visual focus from all chips without changing _focusedIndex
  function blurChips() {
    chips.forEach(c => c.classList.remove('is-focused'));
  }

  function getFocusedIndex() { return _focusedIndex; }

  function getGenreIdAt(index) {
    return genres[index]?.id || null;
  }

  // Initialize: first chip active
  if (chips.length > 0) {
    chips[0].classList.add('is-active');
  }

  return {
    element: railEl,
    setFocusedChip,
    setActiveChip,
    blurChips,
    move,
    select,
    getFocusedIndex,
    getGenreIdAt,
    chipCount: chips.length,
  };
}
