/* ============================================================
   DATA STORE — Loads JSON files and manages mock state
   ============================================================ */

const DataStore = (function() {
  let catalog = null;
  let geoState = null;
  let landerConfig = null;
  let versionData = null;
  const seriesCache = {};

  // ID-keyed lookup maps — built once after catalog loads (O(1) lookups)
  const _showMap       = {};
  const _channelMap    = {};
  const _collectionMap = {};
  const _cityMap       = {};

  const VERSION_FALLBACK = {
    version: 'unknown',
    buildNumber: 0,
    buildDate: null,
    gitCommit: 'unknown',
    gitBranch: 'unknown',
    phase: 'unknown',
    label: 'unknown',
  };

  async function loadJSON(path) {
    const response = await fetch(path);
    if (!response.ok) throw new Error(`Failed to load ${path}`);
    return response.json();
  }

  async function init() {
    const stored = localStorage.getItem('debug_landerConfig');
    const landerPromise = stored
      ? Promise.resolve(JSON.parse(stored))
      : loadJSON('data/lander-config.json');

    const storedCatalog = localStorage.getItem('debug_catalog');
    const catalogPromise = storedCatalog
      ? Promise.resolve(JSON.parse(storedCatalog))
      : loadJSON('data/catalog.json');

    // version.json is non-blocking — app still works if it's missing/malformed
    const versionPromise = loadJSON('data/version.json').catch(() => null);

    [catalog, geoState, landerConfig, versionData] = await Promise.all([
      catalogPromise,
      loadJSON('data/geo-state.json'),
      landerPromise,
      versionPromise,
    ]);

    // Build ID-keyed maps for O(1) lookups
    catalog.shows.forEach(s       => { _showMap[s.id]       = s; });
    catalog.channels.forEach(c    => { _channelMap[c.id]    = c; });
    catalog.collections.forEach(c => { _collectionMap[c.id] = c; });
    catalog.cities.forEach(c      => { _cityMap[c.id]       = c; });
  }

  function getVersion() {
    return versionData || VERSION_FALLBACK;
  }

  function getShow(id) {
    return _showMap[id] || null;
  }

  function getChannel(id) {
    return _channelMap[id] || null;
  }

  function getCollection(id) {
    return _collectionMap[id] || null;
  }

  function getCity(id) {
    return _cityMap[id] || null;
  }

  function getGeoState() {
    return geoState;
  }

  function getDetectedCity() {
    return geoState ? getCity(geoState.detectedCity) : null;
  }

  function getFeaturedItems() {
    return catalog.featured.map(id => {
      if (_showMap[id])       return { ..._showMap[id],       _type: 'show' };
      if (_cityMap[id])       return { ..._cityMap[id],       _type: 'city' };
      if (_collectionMap[id]) return { ..._collectionMap[id], _type: 'collection' };
      return null;
    }).filter(Boolean);
  }

  // DEFERRED — Continue Watching requires Authentication (Phase 1 stub)
  function getContinueWatching() {
    return [];
  }

  function getAllShows() {
    return catalog.shows;
  }

  function getAllChannels() {
    return catalog.channels;
  }

  function getAllCities() {
    return catalog.cities;
  }

  function getGenres() {
    return catalog.genres;
  }

  function getTopFlix() {
    const ids = ['show-003', 'show-007', 'show-004', 'show-013', 'show-002',
                 'show-020', 'show-008', 'show-018', 'show-001', 'show-006'];
    return ids.map(id => getShow(id)).filter(Boolean);
  }

  function getMyMix() {
    const ids = ['show-005', 'show-017', 'show-014', 'show-019', 'show-009',
                 'show-010', 'show-011', 'show-012', 'show-015', 'show-016'];
    return ids.map(id => getShow(id)).filter(Boolean);
  }

  async function getSeriesData(showId) {
    if (seriesCache[showId]) return seriesCache[showId];
    try {
      const data = await loadJSON(`data/series/${showId}.json`);
      seriesCache[showId] = data;
      return data;
    } catch(e) {
      return null;
    }
  }

  function getLanderConfig() {
    return landerConfig;
  }

  return {
    init,
    getVersion,
    getShow,
    getChannel,
    getCollection,
    getCity,
    getGeoState,
    getDetectedCity,
    getFeaturedItems,
    getContinueWatching,
    getAllShows,
    getAllChannels,
    getAllCities,
    getGenres,
    getTopFlix,
    getMyMix,
    getSeriesData,
    getLanderConfig,
  };
})();
