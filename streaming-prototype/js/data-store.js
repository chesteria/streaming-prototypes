/* ============================================================
   DATA STORE — Loads JSON files and manages mock state
   ============================================================ */

const DataStore = (function() {
  let catalog = null;
  let geoState = null;
  let landerConfig = null;
  const seriesCache = {};

  async function loadJSON(path) {
    const response = await fetch(path);
    if (!response.ok) throw new Error(`Failed to load ${path}`);
    return response.json();
  }

  async function init() {
    [catalog, geoState, landerConfig] = await Promise.all([
      loadJSON('data/catalog.json'),
      loadJSON('data/geo-state.json'),
      loadJSON('data/lander-config.json'),
    ]);
  }

  function getShow(id) {
    return catalog.shows.find(s => s.id === id) || null;
  }

  function getChannel(id) {
    return catalog.channels.find(c => c.id === id) || null;
  }

  function getCollection(id) {
    return catalog.collections.find(c => c.id === id) || null;
  }

  function getCity(id) {
    return catalog.cities.find(c => c.id === id) || null;
  }

  function getGeoState() {
    return geoState;
  }

  function getDetectedCity() {
    return geoState ? getCity(geoState.detectedCity) : null;
  }

  function getFeaturedItems() {
    return catalog.featured.map(id => {
      const show = catalog.shows.find(s => s.id === id);
      if (show) return { ...show, _type: 'show' };
      const city = catalog.cities.find(c => c.id === id);
      if (city) return { ...city, _type: 'city' };
      const col = catalog.collections.find(c => c.id === id);
      if (col) return { ...col, _type: 'collection' };
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
