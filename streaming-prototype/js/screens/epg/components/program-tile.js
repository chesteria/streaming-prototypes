// @ts-check
/* ============================================================
   EPG PROGRAM TILE — Single tile, two render modes
   ============================================================ */

function _formatRemainingTime(endTime) {
  const remaining = Math.max(0, endTime - Date.now());
  const minutes   = Math.ceil(remaining / 60000);
  if (minutes < 60) return `${minutes}m left`;
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return m > 0 ? `${h}h ${m}m left` : `${h}h left`;
}

function _formatScheduledWindow(startTime, endTime) {
  function fmt(ms) {
    const d     = new Date(ms);
    const h     = d.getHours();
    const m     = d.getMinutes();
    const ampm  = h >= 12 ? 'p' : 'a';
    const h12   = h % 12 || 12;
    const mStr  = m === 0 ? '' : `:${String(m).padStart(2, '0')}`;
    return `${h12}${mStr}${ampm}`;
  }
  return `${fmt(startTime)}–${fmt(endTime)}`;
}

/**
 * createProgramTile(program, isCurrentlyPlaying, channel)
 *
 * Returns { element }
 * The element has data-program-id set.
 */
function createProgramTile(program, isCurrentlyPlaying, channel) {
  const el = document.createElement('div');
  el.className = `epg-program-tile ${isCurrentlyPlaying ? 'is-current' : 'is-future'}`;
  el.setAttribute('data-program-id', program.id);

  const timeStr = isCurrentlyPlaying
    ? _formatRemainingTime(program.endTime)
    : _formatScheduledWindow(program.startTime, program.endTime);

  const watchingVisible = isCurrentlyPlaying && channel && channel.currentlyWatching;

  el.innerHTML = `
    <div class="epg-tile-top">
      <div class="epg-tile-title">${_escEPG(program.title)}</div>
      <div class="epg-tile-desc">${_escEPG(program.description || '')}</div>
    </div>
    <div class="epg-tile-bottom">
      <span class="epg-tile-time">${_escEPG(timeStr)}</span>
      <div style="display:flex;align-items:center;gap:6px;">
        <span class="epg-tile-watching${watchingVisible ? ' is-visible' : ''}">
          <span class="epg-tile-watching-dot"></span>
        </span>
        <span class="epg-tile-rating">${_escEPG(program.rating)}</span>
      </div>
    </div>
  `;

  return { element: el };
}

function _escEPG(str) {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}
