/* ============================================================
   EPG GENRE GROUP — Header label + N channel rows
   ============================================================ */

/**
 * createGenreGroup(genre, channels, epgData, onAnalytics)
 *
 * Returns {
 *   element,
 *   genreId,
 *   rows: ChannelRow[],
 * }
 */
function createGenreGroup(genre, channels, epgData, onAnalytics) {
  const groupEl = document.createElement('div');
  groupEl.className = 'epg-genre-group';
  groupEl.setAttribute('data-genre-id', genre.id);

  // Header (non-focusable)
  const header = document.createElement('div');
  header.className = 'epg-genre-group-header';
  header.textContent = genre.label;
  groupEl.appendChild(header);

  // Channel rows
  const rows = [];
  channels.forEach(channel => {
    if (!channel) return;
    const programs            = epgData.getProgramsForChannel(channel.id);
    const currentProgramIndex = epgData.getCurrentProgramIndex(channel.id);

    // Trim programs to start from the currently-playing one (no past programs)
    const visiblePrograms = programs.slice(currentProgramIndex);

    const row = createChannelRow(
      channel,
      genre.id,
      visiblePrograms,
      0, // index 0 in visiblePrograms is always the currently-playing one
      onAnalytics
    );

    groupEl.appendChild(row.element);
    rows.push(row);
  });

  return {
    element: groupEl,
    genreId: genre.id,
    rows,
  };
}
