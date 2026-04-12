/* ============================================================
   EPG MORE-INFO OVERLAY — Two variants over dimmed EPG
   ============================================================ */

/**
 * createMoreInfoOverlay(onClose, onAnalytics)
 *
 * Returns {
 *   element,
 *   open(channel, program, variant),  // variant: 'currently_playing' | 'future'
 *   close(),
 *   isOpen(),
 *   handleKey(action),  // returns true if key was consumed
 * }
 */
function createMoreInfoOverlay(onClose, onAnalytics) {
  const overlayEl = document.createElement('div');
  overlayEl.className = 'epg-more-info-overlay';
  overlayEl.setAttribute('aria-modal', 'true');

  const panelEl = document.createElement('div');
  panelEl.className = 'epg-more-info-panel';
  overlayEl.appendChild(panelEl);

  let _open     = false;
  let _openTime = null;
  let _channelId = null;
  let _variant   = null;

  function _formatRemainingTime(endTime) {
    const remaining = Math.max(0, endTime - Date.now());
    const minutes   = Math.ceil(remaining / 60000);
    if (minutes < 60) return `${minutes}m left`;
    const h = Math.floor(minutes / 60);
    const m = minutes % 60;
    return m > 0 ? `${h}h ${m}m left` : `${h}h left`;
  }

  function _progressPercent(startTime, endTime) {
    const total   = endTime - startTime;
    const elapsed = Date.now() - startTime;
    return Math.min(100, Math.max(0, Math.round((elapsed / total) * 100)));
  }

  function _formatScheduledWindow(startTime, endTime) {
    function fmt(ms) {
      const d    = new Date(ms);
      const h    = d.getHours();
      const m    = d.getMinutes();
      const ampm = h >= 12 ? 'p' : 'a';
      const h12  = h % 12 || 12;
      const mStr = m === 0 ? '' : `:${String(m).padStart(2, '0')}`;
      return `${h12}${mStr}${ampm}`;
    }
    return `${fmt(startTime)}–${fmt(endTime)}`;
  }

  function open(channel, program, variant) {
    _open      = true;
    _openTime  = Date.now();
    _channelId = channel.id;
    _variant   = variant;

    const isCurrentlyPlaying = variant === 'currently_playing';

    const timeStr = isCurrentlyPlaying
      ? _formatRemainingTime(program.endTime)
      : _formatScheduledWindow(program.startTime, program.endTime);

    const metaLine = `${_escEPG(timeStr)} &nbsp;·&nbsp; ${_escEPG(program.rating)}`;

    const ctaLabel   = isCurrentlyPlaying ? 'Watch Live'    : 'Watch Channel';
    const ctaIcon    = isCurrentlyPlaying ? '&#9889;'       : '&#9654;';  // ⚡ or ▶
    const ctaType    = isCurrentlyPlaying ? 'watch_live'    : 'watch_channel';

    panelEl.innerHTML = `
      <div class="epg-more-info-thumbnail" style="background:${_escEPG(channel.color)};">
        <div class="epg-more-info-thumb-logo">${_escEPG(channel.initials)}</div>
      </div>
      <div class="epg-more-info-body">
        <div class="epg-more-info-program-title">${_escEPG(program.title)}</div>
        <div class="epg-more-info-description">${_escEPG(program.description)}</div>
        <div class="epg-more-info-meta-line">${metaLine}</div>
        <div class="epg-more-info-actions">
          <div class="epg-more-info-favorite">
            <span class="epg-more-info-favorite-icon">&#9825;</span>
            Favorite Channel
          </div>
          <button class="epg-more-info-cta is-focused" data-cta-type="${_escEPG(ctaType)}">
            <span class="epg-more-info-cta-icon">${ctaIcon}</span>
            ${_escEPG(ctaLabel)}
          </button>
        </div>
      </div>
    `;

    overlayEl.classList.add('is-open');

    if (typeof onAnalytics === 'function') {
      onAnalytics('epg_more_info_opened', {
        channel_id: channel.id,
        variant,
      });
    }
  }

  function close() {
    if (!_open) return;
    _open = false;

    const dwellMs = Date.now() - (_openTime || Date.now());
    overlayEl.classList.remove('is-open');

    if (typeof onAnalytics === 'function') {
      onAnalytics('epg_more_info_closed', {
        channel_id: _channelId,
        dwell_ms:   dwellMs,
      });
    }

    if (typeof onClose === 'function') onClose();
  }

  function isOpen() { return _open; }

  function handleKey(action) {
    if (!_open) return false;

    if (action === 'BACK') {
      close();
      return true;
    }

    if (action === 'OK') {
      // CTA is the only focusable element — fire analytics, no-op otherwise
      const ctaEl = panelEl.querySelector('.epg-more-info-cta');
      const ctaType = ctaEl ? ctaEl.getAttribute('data-cta-type') : 'unknown';

      if (typeof onAnalytics === 'function') {
        onAnalytics('epg_more_info_cta_activated', {
          channel_id: _channelId,
          cta_type:   ctaType,
        });
      }
      return true;
    }

    // All other d-pad directions are no-ops inside the overlay (focus trap)
    if (['UP', 'DOWN', 'LEFT', 'RIGHT'].includes(action)) return true;

    return false;
  }

  return {
    element: overlayEl,
    open,
    close,
    isOpen,
    handleKey,
  };
}
