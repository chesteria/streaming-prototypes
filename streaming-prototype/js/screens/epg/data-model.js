// @ts-check
/* ============================================================
   EPG DATA MODEL — Loads mock data and computes program schedules
   ============================================================ */

// `var` required for TypeScript global-script compatibility — see data-store.js
var EPGDataModel = (() => {

  let _genres    = [];
  let _channels  = [];
  let _channelMap = {};
  let _programsByChannel = {}; // channelId -> Program[]
  let _initTime  = null;

  // Round down to the nearest minute for clean time display
  function _roundToMinute(ms) {
    return Math.floor(ms / 60000) * 60000;
  }

  // Generate a full 24h program schedule for a channel by cycling through its slots
  function _generatePrograms(channelId, slots, startTime) {
    const endBoundary = startTime + 24 * 60 * 60 * 1000;
    const programs    = [];
    let t   = startTime;
    let idx = 0;

    while (t < endBoundary) {
      const slot = slots[idx % slots.length];
      programs.push({
        id:          `${channelId}-p${String(idx).padStart(3, '0')}`,
        channelId,
        title:       slot.title,
        description: slot.description,
        rating:      slot.rating,
        startTime:   t,
        endTime:     t + slot.durationMinutes * 60000,
      });
      t += slot.durationMinutes * 60000;
      idx++;
    }

    return programs;
  }

  function _getDebugValue(key) {
    try {
      const stored = localStorage.getItem(`debug_${key}`);
      return stored ? JSON.parse(stored) : null;
    } catch (e) {
      return null;
    }
  }

  async function init() {
    _initTime = _roundToMinute(Date.now());

    const response = await fetch('data/epg-mock.json');
    if (!response.ok) throw new Error('[EPGDataModel] Failed to load epg-mock.json');
    const data = await response.json();

    // --- Apply channel overrides from debug ---
    const channelOverrides = _getDebugValue('epgChannels') || {};
    _channels = data.channels.map(ch => {
      const ov = channelOverrides[ch.id];
      return ov ? { ...ch, ...ov } : ch;
    });
    _channels.forEach(ch => { _channelMap[ch.id] = ch; });

    // --- Apply genre overrides from debug ---
    const genreMapOverride = _getDebugValue('epgGenreMap') || {};
    const genreOrderOverride = _getDebugValue('epgGenreOrder') || null; // array of genre IDs in desired order

    _genres = data.genres.map(g => {
      const channelIds = genreMapOverride[g.id] !== undefined
        ? genreMapOverride[g.id]
        : g.channelIds;
      const label = (_getDebugValue(`epgGenreLabel_${g.id}`)) || g.label;
      const enabled = (_getDebugValue(`epgGenreEnabled_${g.id}`)) !== false && g.enabled !== false;
      return { ...g, label, channelIds, enabled };
    });

    // Apply order override if set
    if (genreOrderOverride && Array.isArray(genreOrderOverride)) {
      _genres.sort((a, b) => {
        const ai = genreOrderOverride.indexOf(a.id);
        const bi = genreOrderOverride.indexOf(b.id);
        if (ai === -1 && bi === -1) return a.order - b.order;
        if (ai === -1) return 1;
        if (bi === -1) return -1;
        return ai - bi;
      });
    } else {
      _genres.sort((a, b) => a.order - b.order);
    }

    // Filter disabled genres
    _genres = _genres.filter(g => g.enabled !== false);

    // --- Generate programs for each channel ---
    data.channels.forEach(ch => {
      const slots = data.programSlots[ch.id];
      if (slots && slots.length > 0) {
        _programsByChannel[ch.id] = _generatePrograms(ch.id, slots, _initTime);
      }
    });
  }

  function getGenres() {
    return _genres;
  }

  function getChannelsByGenre(genreId) {
    const genre = _genres.find(g => g.id === genreId);
    if (!genre) return [];
    return genre.channelIds.map(id => _channelMap[id]).filter(Boolean);
  }

  function getChannel(id) {
    return _channelMap[id] || null;
  }

  function getProgramsForChannel(channelId) {
    return _programsByChannel[channelId] || [];
  }

  // Returns the currently-playing program (the first program whose window contains now)
  function getCurrentProgram(channelId) {
    const programs = _programsByChannel[channelId] || [];
    const now = Date.now();
    return programs.find(p => p.startTime <= now && p.endTime > now) || programs[0] || null;
  }

  // Returns the index of the currently-playing program in the channel's program array
  function getCurrentProgramIndex(channelId) {
    const programs = _programsByChannel[channelId] || [];
    const now = Date.now();
    const idx = programs.findIndex(p => p.startTime <= now && p.endTime > now);
    return idx >= 0 ? idx : 0;
  }

  function getInitTime() {
    return _initTime;
  }

  return {
    init,
    getGenres,
    getChannelsByGenre,
    getChannel,
    getProgramsForChannel,
    getCurrentProgram,
    getCurrentProgramIndex,
    getInitTime,
  };

})();
