/* ============================================================
   DATA STORE — Loads JSON files and manages mock state
   ============================================================ */

const DataStore = (function() {
  let catalog = null;
  let userState = null;
  let landerConfig = null;
  const seriesCache = {};

  async function loadJSON(path) {
    const response = await fetch(path);
    if (!response.ok) throw new Error(`Failed to load ${path}`);
    return response.json();
  }

  async function init() {
    [catalog, userState, landerConfig] = await Promise.all([
      loadJSON('data/catalog.json'),
      loadJSON('data/user-state.json'),
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

  function getContinueWatching() {
    return userState.continueWatching.map(item => ({
      ...item,
      show: getShow(item.showId)
    })).filter(i => i.show);
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
    // A curated mix of shows for the Top Flix rail
    const ids = ['show-003', 'show-007', 'show-004', 'show-013', 'show-002',
                 'show-020', 'show-008', 'show-018', 'show-001', 'show-006'];
    return ids.map(id => getShow(id)).filter(Boolean);
  }

  function getMyMix() {
    // Based on user history + similar titles
    const ids = ['show-005', 'show-017', 'show-014', 'show-019', 'show-009',
                 'show-010', 'show-011', 'show-012', 'show-015', 'show-016'];
    return ids.map(id => getShow(id)).filter(Boolean);
  }

  function isInMyStuff(showId) {
    return userState.myStuff.includes(showId);
  }

  function toggleMyStuff(showId) {
    const idx = userState.myStuff.indexOf(showId);
    if (idx >= 0) {
      userState.myStuff.splice(idx, 1);
    } else {
      userState.myStuff.push(showId);
    }
    return isInMyStuff(showId);
  }

  function hasWatchHistory(showId) {
    return userState.watchHistory.some(h => h.startsWith(showId));
  }

  function getContinueWatchingItem(showId) {
    return userState.continueWatching.find(i => i.showId === showId) || null;
  }

  function removeFromHistory(showId) {
    userState.watchHistory = userState.watchHistory.filter(h => !h.startsWith(showId));
    userState.continueWatching = userState.continueWatching.filter(i => i.showId !== showId);
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
    getFeaturedItems,
    getContinueWatching,
    getAllShows,
    getAllChannels,
    getAllCities,
    getGenres,
    getTopFlix,
    getMyMix,
    isInMyStuff,
    toggleMyStuff,
    hasWatchHistory,
    getContinueWatchingItem,
    removeFromHistory,
    getSeriesData,
    getLanderConfig,
  };
})();
