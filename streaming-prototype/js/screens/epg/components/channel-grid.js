/* ============================================================
   EPG CHANNEL GRID — Vertical stack of genre groups
   Scroll managed via translateY (mirrors lander pattern)
   ============================================================ */

/**
 * createChannelGrid(genres, epgData, onAnalytics)
 *
 * Returns {
 *   element,          // .epg-grid-scroll
 *   allRows,          // flat array of all ChannelRow objects
 *   groups,           // array of GenreGroup objects
 *   scrollToRow(rowIndex),
 *   scrollToGenre(genreId),
 *   getRowGenreId(rowIndex),  // returns the genreId of a row by flat index
 * }
 */
function createChannelGrid(genres, epgData, onAnalytics) {
  const scrollEl = document.createElement('div');
  scrollEl.className = 'epg-grid-scroll';

  const groups  = [];
  const allRows = []; // flat list: [{row, genreId, groupIndex}, ...]

  genres.forEach((genre, groupIdx) => {
    const channels = epgData.getChannelsByGenre(genre.id);
    if (channels.length === 0) return;

    const group = createGenreGroup(genre, channels, epgData, onAnalytics);
    scrollEl.appendChild(group.element);
    groups.push(group);

    group.rows.forEach(row => {
      allRows.push({ row, genreId: genre.id, groupIndex: groupIdx });
    });
  });

  // Vertical scroll position
  let _scrollY = 0;
  const ROW_HEIGHT    = 168 + 8;  // row height (168px) + margin-bottom (8px)
  const HEADER_HEIGHT = 20 + 43 + 10; // padding-top + approx text height (36px font × 1.2) + padding-bottom

  // Compute approximate Y offset for a given flat row index
  function _rowY(flatIndex) {
    if (flatIndex < 0 || flatIndex >= allRows.length) return 0;

    let y = 0;
    let currentGroupIdx = -1;

    for (let i = 0; i <= flatIndex; i++) {
      const { groupIndex } = allRows[i];
      if (groupIndex !== currentGroupIdx) {
        currentGroupIdx = groupIndex;
        if (i > 0) y += HEADER_HEIGHT; // header before each new group except the first
        // First group has a header too but it's the topmost visible item
        if (i === 0) y += HEADER_HEIGHT;
      }
      if (i < flatIndex) y += ROW_HEIGHT;
    }

    return y;
  }

  function scrollToRow(flatIndex) {
    const targetY = -_rowY(flatIndex);
    _scrollY = targetY;
    scrollEl.style.transform = `translateY(${targetY}px)`;
  }

  function scrollToGenre(genreId) {
    const firstRowIdx = allRows.findIndex(r => r.genreId === genreId);
    if (firstRowIdx >= 0) scrollToRow(firstRowIdx);
  }

  function getRowGenreId(flatIndex) {
    return allRows[flatIndex]?.genreId || null;
  }

  function getGroupForGenre(genreId) {
    return groups.find(g => g.genreId === genreId) || null;
  }

  return {
    element: scrollEl,
    allRows,
    groups,
    scrollToRow,
    scrollToGenre,
    getRowGenreId,
    getGroupForGenre,
  };
}
