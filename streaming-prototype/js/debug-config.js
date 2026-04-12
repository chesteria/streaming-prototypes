/* ============================================================
   DEBUG CONFIG PAGE — Standalone editor for debug.html
   ============================================================ */

/* ---- State ---- */
let _landerConfig = null;
let _catalog = null;
let _currentSection = 'rails';

/* ============================================================
   SECTION NAVIGATION
   ============================================================ */

function showSection(id) {
  _currentSection = id;
  document.querySelectorAll('.dc-section').forEach(el => {
    el.classList.toggle('active', el.id === `section-${id}`);
  });
  document.querySelectorAll('.dc-nav-item').forEach(el => {
    el.classList.toggle('active', el.dataset.section === id);
  });
}

/* ============================================================
   A — LANDER RAIL EDITOR
   ============================================================ */

async function initRailEditor() {
  const stored = localStorage.getItem('debug_landerConfig');
  if (stored) {
    try { _landerConfig = JSON.parse(stored); } catch (e) { _landerConfig = null; }
  }
  if (!_landerConfig) {
    try {
      const res = await fetch('data/lander-config.json');
      _landerConfig = await res.json();
    } catch (e) {
      _landerConfig = { rails: [] };
    }
  }
  renderRailList();
}

function renderRailList() {
  const list = document.getElementById('rail-list');
  if (!list) return;

  if (!_landerConfig || !_landerConfig.rails || !_landerConfig.rails.length) {
    list.innerHTML = `
      <div class="dc-empty">
        <div class="dc-empty-icon">&#x1F6E4;</div>
        <div class="dc-empty-text">No rails configured</div>
      </div>
    `;
    return;
  }

  list.innerHTML = '';
  _landerConfig.rails.forEach((rail, idx) => {
    const item = document.createElement('li');
    item.className = 'rail-item';
    item.draggable = true;
    item.dataset.idx = idx;

    const enabled = rail.enabled !== false;

    item.innerHTML = `
      <div class="rail-drag-handle" title="Drag to reorder">&#x2807;</div>
      <div class="rail-type-badge">${escapeHtml(rail.type)}</div>
      <div class="rail-title-edit" data-idx="${idx}">${escapeHtml(rail.title || '(untitled)')}</div>
      <div class="rail-toggle${enabled ? ' on' : ''}" data-idx="${idx}" title="Enable/disable rail">
        <div class="rail-toggle-thumb"></div>
      </div>
      <div class="rail-delete-btn" data-idx="${idx}" title="Remove rail">&#x2715;</div>
    `;

    // Inline title editing
    const titleEl = item.querySelector('.rail-title-edit');
    titleEl.addEventListener('click', () => {
      titleEl.contentEditable = 'true';
      titleEl.focus();
      // Select all text
      const range = document.createRange();
      range.selectNodeContents(titleEl);
      const sel = window.getSelection();
      sel.removeAllRanges();
      sel.addRange(range);
    });
    titleEl.addEventListener('blur', () => {
      titleEl.contentEditable = 'false';
      _landerConfig.rails[idx].title = titleEl.textContent.trim();
    });
    titleEl.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') { e.preventDefault(); titleEl.blur(); }
    });

    // Toggle enabled
    const toggleEl = item.querySelector('.rail-toggle');
    toggleEl.addEventListener('click', () => {
      const i = parseInt(toggleEl.dataset.idx);
      _landerConfig.rails[i].enabled = !(_landerConfig.rails[i].enabled !== false);
      toggleEl.classList.toggle('on');
    });

    // Delete
    const deleteBtn = item.querySelector('.rail-delete-btn');
    deleteBtn.addEventListener('click', () => {
      const i = parseInt(deleteBtn.dataset.idx);
      _landerConfig.rails.splice(i, 1);
      renderRailList();
    });

    // Drag & Drop
    item.addEventListener('dragstart', (e) => {
      e.dataTransfer.effectAllowed = 'move';
      e.dataTransfer.setData('text/plain', idx);
      item.classList.add('dragging');
    });
    item.addEventListener('dragend', () => {
      item.classList.remove('dragging');
      document.querySelectorAll('.rail-item').forEach(el => el.classList.remove('drag-over'));
    });
    item.addEventListener('dragover', (e) => {
      e.preventDefault();
      e.dataTransfer.dropEffect = 'move';
      document.querySelectorAll('.rail-item').forEach(el => el.classList.remove('drag-over'));
      item.classList.add('drag-over');
    });
    item.addEventListener('dragleave', () => {
      item.classList.remove('drag-over');
    });
    item.addEventListener('drop', (e) => {
      e.preventDefault();
      item.classList.remove('drag-over');
      const fromIdx = parseInt(e.dataTransfer.getData('text/plain'));
      const toIdx = idx;
      if (fromIdx === toIdx) return;
      const moved = _landerConfig.rails.splice(fromIdx, 1)[0];
      _landerConfig.rails.splice(toIdx, 0, moved);
      renderRailList();
    });

    list.appendChild(item);
  });
}

function saveRailConfig() {
  localStorage.setItem('debug_landerConfig', JSON.stringify(_landerConfig));
  showStatus('rail-save-status', 'Saved!');
}

function resetRailConfig() {
  localStorage.removeItem('debug_landerConfig');
  initRailEditor();
  showStatus('rail-save-status', 'Reset to defaults');
}

/* ============================================================
   B — CONTENT CATALOG EDITOR
   ============================================================ */

async function initCatalogEditor() {
  const stored = localStorage.getItem('debug_catalog');
  if (stored) {
    try { _catalog = JSON.parse(stored); } catch (e) { _catalog = null; }
  }
  if (!_catalog) {
    try {
      const res = await fetch('data/catalog.json');
      _catalog = await res.json();
    } catch (e) {
      _catalog = { shows: [] };
    }
  }
  renderCatalogTable(_catalog.shows || []);
}

let _filteredShows = [];

function renderCatalogTable(shows) {
  _filteredShows = shows;
  const tbody = document.getElementById('catalog-tbody');
  if (!tbody) return;

  tbody.innerHTML = '';
  shows.forEach((show, idx) => {
    const tr = document.createElement('tr');
    tr.dataset.idx = idx;

    const thumb = show.landscapeImage || show.heroImage || `https://picsum.photos/seed/${show.id}/480/270`;
    const genres = Array.isArray(show.genres) ? show.genres.join(', ') : (show.genres || '');
    const badges = Array.isArray(show.badges) ? show.badges.map(b => `<span class="badge-pill">${escapeHtml(b)}</span>`).join('') : '';

    tr.innerHTML = `
      <td>
        <div class="catalog-title-cell">
          <img class="catalog-thumb" src="${escapeHtml(thumb)}" alt="" loading="lazy" />
          <span>${escapeHtml(show.title || '')}</span>
        </div>
      </td>
      <td>${escapeHtml(show.rating || '')}</td>
      <td>${escapeHtml(String(show.year || ''))}</td>
      <td>${escapeHtml(genres)}</td>
      <td>${badges}</td>
      <td>
        <div class="catalog-delete-btn" data-idx="${idx}" title="Delete show">&#x2715;</div>
      </td>
    `;

    // Inline editing on double-click
    const editableCells = [0, 1, 2, 3]; // title, rating, year, genres
    const keys = ['title', 'rating', 'year', 'genres'];
    editableCells.forEach((colIdx) => {
      const cell = tr.cells[colIdx];
      cell.addEventListener('dblclick', () => {
        if (colIdx === 0) {
          // Edit just the title span, not the img
          const span = cell.querySelector('span');
          if (!span) return;
          span.contentEditable = 'true';
          span.focus();
          span.addEventListener('blur', function onBlur() {
            span.contentEditable = 'false';
            show.title = span.textContent.trim();
            span.removeEventListener('blur', onBlur);
          }, { once: true });
        } else {
          cell.contentEditable = 'true';
          cell.focus();
          cell.addEventListener('blur', function onBlur() {
            cell.contentEditable = 'false';
            const newVal = cell.textContent.trim();
            if (keys[colIdx] === 'year') {
              show.year = parseInt(newVal) || show.year;
            } else if (keys[colIdx] === 'genres') {
              show.genres = newVal.split(',').map(s => s.trim()).filter(Boolean);
            } else {
              show[keys[colIdx]] = newVal;
            }
            cell.removeEventListener('blur', onBlur);
          }, { once: true });
        }
      });
      cell.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' && cell.contentEditable === 'true') {
          e.preventDefault();
          cell.blur();
        }
      });
    });

    // Delete row
    const deleteBtn = tr.querySelector('.catalog-delete-btn');
    deleteBtn.addEventListener('click', () => {
      const i = parseInt(deleteBtn.dataset.idx);
      const showInCatalog = _catalog.shows.indexOf(_filteredShows[i]);
      if (showInCatalog !== -1) {
        _catalog.shows.splice(showInCatalog, 1);
      }
      renderCatalogTable(_filteredShows.filter((_, fi) => fi !== i));
    });

    tbody.appendChild(tr);
  });
}

function addShow() {
  const newShow = {
    id: `show-custom-${Date.now()}`,
    title: 'New Show',
    rating: 'TV-PG',
    year: new Date().getFullYear(),
    genres: ['Drama'],
    badges: [],
    type: 'Series',
    seasons: 1,
    description: 'A new show.',
    landscapeImage: `https://picsum.photos/seed/new${Date.now()}/480/270`,
    heroImage: `https://picsum.photos/seed/hero${Date.now()}/1920/1080`,
    images: [],
  };
  _catalog.shows.push(newShow);
  renderCatalogTable(_catalog.shows);
}

function filterCatalog(query) {
  if (!query) {
    renderCatalogTable(_catalog.shows || []);
    return;
  }
  const q = query.toLowerCase();
  const filtered = (_catalog.shows || []).filter(s =>
    (s.title || '').toLowerCase().includes(q) ||
    (Array.isArray(s.genres) ? s.genres.join(' ') : '').toLowerCase().includes(q) ||
    String(s.year || '').includes(q)
  );
  renderCatalogTable(filtered);
}

function saveCatalog() {
  localStorage.setItem('debug_catalog', JSON.stringify(_catalog));
  showStatus('catalog-save-status', 'Saved!');
}

/* ============================================================
   D — EPG CONFIGURATION
   ============================================================ */

let _epgMockData = null;

async function _loadEPGMockData() {
  if (_epgMockData) return _epgMockData;
  try {
    const res = await fetch('data/epg-mock.json');
    _epgMockData = await res.json();
  } catch (e) {
    _epgMockData = { genres: [], channels: [], programSlots: {} };
  }
  return _epgMockData;
}

async function initEPGConfig() {
  await _loadEPGMockData();
  renderEPGGenreList();
  renderEPGChannelGenreList();
  renderEPGChannelTable();
  renderEPGToggles();
}

// ---- Genre list with drag-to-reorder, rename, enable/disable ----

function _getEPGGenreOrder() {
  try {
    const stored = localStorage.getItem('debug_epgGenreOrder');
    return stored ? JSON.parse(stored) : null;
  } catch (e) { return null; }
}

function _getEPGGenreEnabled(genreId) {
  const stored = localStorage.getItem(`debug_epgGenreEnabled_${genreId}`);
  if (stored === null) return true;
  try { return JSON.parse(stored); } catch (e) { return true; }
}

function _getEPGGenreLabel(genreId, fallback) {
  const stored = localStorage.getItem(`debug_epgGenreLabel_${genreId}`);
  return stored || fallback;
}

function renderEPGGenreList() {
  const listEl = document.getElementById('epg-genre-list');
  if (!listEl || !_epgMockData) return;

  const orderOverride = _getEPGGenreOrder();
  let genres = [..._epgMockData.genres];

  if (orderOverride) {
    genres.sort((a, b) => {
      const ai = orderOverride.indexOf(a.id);
      const bi = orderOverride.indexOf(b.id);
      if (ai === -1 && bi === -1) return a.order - b.order;
      if (ai === -1) return 1;
      if (bi === -1) return -1;
      return ai - bi;
    });
  } else {
    genres.sort((a, b) => a.order - b.order);
  }

  listEl.innerHTML = '';
  genres.forEach((genre, idx) => {
    const label   = _getEPGGenreLabel(genre.id, genre.label);
    const enabled = _getEPGGenreEnabled(genre.id);

    const item = document.createElement('li');
    item.className = 'rail-item';
    item.draggable = true;
    item.dataset.genreId = genre.id;
    item.dataset.idx = idx;

    item.innerHTML = `
      <div class="rail-drag-handle" title="Drag to reorder">&#x2807;</div>
      <div class="rail-type-badge">${escapeHtml(genre.id)}</div>
      <div class="rail-title-edit" data-genre-id="${escapeHtml(genre.id)}">${escapeHtml(label)}</div>
      <div class="rail-toggle${enabled ? ' on' : ''}" data-genre-id="${escapeHtml(genre.id)}" title="Enable/disable genre">
        <div class="rail-toggle-thumb"></div>
      </div>
    `;

    // Inline label editing
    const titleEl = item.querySelector('.rail-title-edit');
    titleEl.addEventListener('click', () => {
      titleEl.contentEditable = 'true';
      titleEl.focus();
      const range = document.createRange();
      range.selectNodeContents(titleEl);
      const sel = window.getSelection();
      sel.removeAllRanges();
      sel.addRange(range);
    });
    titleEl.addEventListener('blur', () => {
      titleEl.contentEditable = 'false';
    });
    titleEl.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') { e.preventDefault(); titleEl.blur(); }
    });

    // Toggle enabled
    const toggleEl = item.querySelector('.rail-toggle');
    toggleEl.addEventListener('click', () => {
      toggleEl.classList.toggle('on');
    });

    // Drag & Drop reorder
    item.addEventListener('dragstart', (e) => {
      e.dataTransfer.effectAllowed = 'move';
      e.dataTransfer.setData('text/plain', genre.id);
      item.classList.add('dragging');
    });
    item.addEventListener('dragend', () => {
      item.classList.remove('dragging');
      listEl.querySelectorAll('.rail-item').forEach(el => el.classList.remove('drag-over'));
    });
    item.addEventListener('dragover', (e) => {
      e.preventDefault();
      e.dataTransfer.dropEffect = 'move';
      listEl.querySelectorAll('.rail-item').forEach(el => el.classList.remove('drag-over'));
      item.classList.add('drag-over');
    });
    item.addEventListener('dragleave', () => item.classList.remove('drag-over'));
    item.addEventListener('drop', (e) => {
      e.preventDefault();
      item.classList.remove('drag-over');
      const fromId  = e.dataTransfer.getData('text/plain');
      const toId    = genre.id;
      if (fromId === toId) return;

      const items   = Array.from(listEl.querySelectorAll('.rail-item'));
      const fromEl  = items.find(el => el.dataset.genreId === fromId);
      const toEl    = item;
      if (fromEl && toEl) {
        const parent = fromEl.parentNode;
        const fromIdx2 = Array.from(parent.children).indexOf(fromEl);
        const toIdx2   = Array.from(parent.children).indexOf(toEl);
        if (fromIdx2 < toIdx2) {
          parent.insertBefore(fromEl, toEl.nextSibling);
        } else {
          parent.insertBefore(fromEl, toEl);
        }
      }
    });

    listEl.appendChild(item);
  });
}

function saveEPGGenreConfig() {
  const listEl = document.getElementById('epg-genre-list');
  if (!listEl) return;

  const items    = Array.from(listEl.querySelectorAll('.rail-item'));
  const orderIds = items.map(el => el.dataset.genreId);

  localStorage.setItem('debug_epgGenreOrder', JSON.stringify(orderIds));

  items.forEach(item => {
    const genreId  = item.dataset.genreId;
    const labelEl  = item.querySelector('.rail-title-edit');
    const toggleEl = item.querySelector('.rail-toggle');

    if (labelEl) {
      localStorage.setItem(`debug_epgGenreLabel_${genreId}`, labelEl.textContent.trim());
    }
    if (toggleEl) {
      localStorage.setItem(`debug_epgGenreEnabled_${genreId}`, JSON.stringify(toggleEl.classList.contains('on')));
    }
  });

  showStatus('epg-genre-save-status', 'Saved — reload EPG to apply');
}

function resetEPGGenreConfig() {
  if (!_epgMockData) return;
  _epgMockData.genres.forEach(g => {
    localStorage.removeItem('debug_epgGenreOrder');
    localStorage.removeItem(`debug_epgGenreLabel_${g.id}`);
    localStorage.removeItem(`debug_epgGenreEnabled_${g.id}`);
  });
  renderEPGGenreList();
  showStatus('epg-genre-save-status', 'Reset to defaults');
}

// ---- Channel-to-genre association ----

function renderEPGChannelGenreList() {
  const containerEl = document.getElementById('epg-channel-genre-list');
  if (!containerEl || !_epgMockData) return;

  const storedMap = (() => {
    try {
      const s = localStorage.getItem('debug_epgGenreMap');
      return s ? JSON.parse(s) : null;
    } catch (e) { return null; }
  })();

  // Build current genre→channel map from stored or defaults
  const currentMap = {};
  _epgMockData.genres.forEach(g => {
    currentMap[g.id] = storedMap?.[g.id] ?? [...g.channelIds];
  });

  containerEl.innerHTML = '';

  _epgMockData.channels.forEach(ch => {
    const row = document.createElement('div');
    row.style.cssText = 'display:flex;align-items:center;gap:12px;padding:8px 0;border-bottom:1px solid #1A2A3A;';

    const nameSpan = document.createElement('span');
    nameSpan.style.cssText = 'min-width:200px;font-size:13px;color:#ccc;';
    nameSpan.textContent = `${ch.initials} — ${ch.name}`;
    row.appendChild(nameSpan);

    const checkboxGroup = document.createElement('div');
    checkboxGroup.style.cssText = 'display:flex;flex-wrap:wrap;gap:8px;';

    _epgMockData.genres.forEach(g => {
      const label   = document.createElement('label');
      label.style.cssText = 'display:flex;align-items:center;gap:4px;font-size:12px;color:#8899AA;cursor:pointer;';
      const checkbox = document.createElement('input');
      checkbox.type = 'checkbox';
      checkbox.dataset.channelId = ch.id;
      checkbox.dataset.genreId   = g.id;
      checkbox.checked = currentMap[g.id]?.includes(ch.id) ?? false;
      label.appendChild(checkbox);
      label.appendChild(document.createTextNode(g.label));
      checkboxGroup.appendChild(label);
    });

    row.appendChild(checkboxGroup);
    containerEl.appendChild(row);
  });
}

function saveEPGGenreMap() {
  const containerEl = document.getElementById('epg-channel-genre-list');
  if (!containerEl || !_epgMockData) return;

  const newMap = {};
  _epgMockData.genres.forEach(g => { newMap[g.id] = []; });

  containerEl.querySelectorAll('input[type="checkbox"]').forEach(cb => {
    if (cb.checked) {
      const genreId   = cb.dataset.genreId;
      const channelId = cb.dataset.channelId;
      if (newMap[genreId]) newMap[genreId].push(channelId);
    }
  });

  localStorage.setItem('debug_epgGenreMap', JSON.stringify(newMap));
  showStatus('epg-genre-map-status', 'Saved — reload EPG to apply');
}

// ---- Channel metadata editor ----

function renderEPGChannelTable() {
  const tbody = document.getElementById('epg-channel-tbody');
  if (!tbody || !_epgMockData) return;

  const storedChannels = (() => {
    try {
      const s = localStorage.getItem('debug_epgChannels');
      return s ? JSON.parse(s) : {};
    } catch (e) { return {}; }
  })();

  tbody.innerHTML = '';

  _epgMockData.channels.forEach(ch => {
    const ov   = storedChannels[ch.id] || {};
    const name = ov.name ?? ch.name;
    const cw   = ov.currentlyWatching ?? ch.currentlyWatching;

    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td style="color:#667788;font-size:12px;">${escapeHtml(ch.id)}</td>
      <td class="epg-ch-name-cell" contenteditable="true" data-channel-id="${escapeHtml(ch.id)}" data-field="name">${escapeHtml(name)}</td>
      <td>
        <input type="checkbox" class="epg-ch-cw" data-channel-id="${escapeHtml(ch.id)}" ${cw ? 'checked' : ''} />
      </td>
    `;
    tbody.appendChild(tr);
  });
}

function saveEPGChannels() {
  const tbody = document.getElementById('epg-channel-tbody');
  if (!tbody) return;

  const result = {};

  tbody.querySelectorAll('.epg-ch-name-cell').forEach(cell => {
    const channelId = cell.dataset.channelId;
    if (!result[channelId]) result[channelId] = {};
    result[channelId].name = cell.textContent.trim();
  });

  tbody.querySelectorAll('.epg-ch-cw').forEach(cb => {
    const channelId = cb.dataset.channelId;
    if (!result[channelId]) result[channelId] = {};
    result[channelId].currentlyWatching = cb.checked;
  });

  localStorage.setItem('debug_epgChannels', JSON.stringify(result));
  showStatus('epg-channel-save-status', 'Saved — reload EPG to apply');
}

// ---- Display toggles ----

const EPG_TOGGLES = [
  { key: 'epgShowGenreHeaders', label: 'Show genre headers',       defaultVal: true  },
  { key: 'epgShowRatings',      label: 'Show rating chips',        defaultVal: true  },
  { key: 'epgReturnToNow',      label: 'Return-to-now animation',  defaultVal: true  },
];

function renderEPGToggles() {
  const area = document.getElementById('epg-toggles-area');
  if (!area) return;
  area.innerHTML = '';

  EPG_TOGGLES.forEach(t => {
    const storedRaw = localStorage.getItem(`debug_${t.key}`);
    const val = storedRaw !== null ? (storedRaw === 'true') : t.defaultVal;

    const wrapper = document.createElement('label');
    wrapper.style.cssText = 'display:flex;align-items:center;gap:8px;font-size:13px;color:#ccc;cursor:pointer;';

    const cb = document.createElement('input');
    cb.type    = 'checkbox';
    cb.checked = val;
    cb.addEventListener('change', () => {
      localStorage.setItem(`debug_${t.key}`, String(cb.checked));
      showStatus('epg-reset-status', `${t.label}: ${cb.checked ? 'on' : 'off'}`);
    });

    wrapper.appendChild(cb);
    wrapper.appendChild(document.createTextNode(t.label));
    area.appendChild(wrapper);
  });
}

function resetAllEPGConfig() {
  const keys = Object.keys(localStorage).filter(k =>
    k.startsWith('debug_epg') || EPG_TOGGLES.some(t => k === `debug_${t.key}`)
  );
  keys.forEach(k => localStorage.removeItem(k));
  initEPGConfig();
  showStatus('epg-reset-status', 'All EPG config reset');
}

/* ============================================================
   C — EXPORT / IMPORT
   ============================================================ */

function updateExportPreview() {
  const preview = document.getElementById('export-keys-preview');
  if (!preview) return;
  const keys = Object.keys(localStorage).filter(k => k.startsWith('debug_'));
  if (!keys.length) {
    preview.textContent = '(no debug_ keys in localStorage)';
    return;
  }
  preview.textContent = keys.join('\n');
}

function exportConfig() {
  const keys = Object.keys(localStorage).filter(k => k.startsWith('debug_'));
  const data = { _exportedAt: new Date().toISOString() };
  keys.forEach(k => {
    try { data[k] = JSON.parse(localStorage.getItem(k)); }
    catch (e) { data[k] = localStorage.getItem(k); }
  });

  const dateStr = new Date().toISOString().slice(0, 10).replace(/-/g, '');
  const filename = `uta-debug-config-${dateStr}.json`;
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
  showStatus('export-status', `Downloaded ${filename}`);
}

function triggerImport() {
  document.getElementById('import-file-input').click();
}

function handleImportFile(e) {
  const file = e.target.files[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = (ev) => {
    try {
      const data = JSON.parse(ev.target.result);
      let count = 0;
      Object.keys(data).forEach(k => {
        if (k === '_exportedAt') return;
        localStorage.setItem(k, JSON.stringify(data[k]));
        count++;
      });
      showStatus('import-status', `Imported ${count} keys — reloading…`);
      setTimeout(() => location.reload(), 800);
    } catch (err) {
      showStatus('import-status', 'Error: invalid JSON file');
    }
  };
  reader.readAsText(file);
  // Reset so same file can be re-selected
  e.target.value = '';
}

/* ============================================================
   UTILITIES
   ============================================================ */

function escapeHtml(str) {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function showStatus(id, msg) {
  const el = document.getElementById(id);
  if (!el) return;
  el.textContent = msg;
  el.classList.add('visible');
  setTimeout(() => el.classList.remove('visible'), 2500);
}

/* ============================================================
   INIT
   ============================================================ */

document.addEventListener('DOMContentLoaded', async () => {
  // Sidebar navigation
  document.querySelectorAll('.dc-nav-item').forEach(item => {
    item.addEventListener('click', () => showSection(item.dataset.section));
  });

  // Rail editor
  document.getElementById('btn-save-rails')?.addEventListener('click', saveRailConfig);
  document.getElementById('btn-reset-rails')?.addEventListener('click', resetRailConfig);
  document.getElementById('btn-preview-app')?.addEventListener('click', () => {
    window.open('index.html', '_blank');
  });

  // Catalog editor
  document.getElementById('btn-save-catalog')?.addEventListener('click', saveCatalog);
  document.getElementById('btn-add-show')?.addEventListener('click', addShow);
  document.getElementById('catalog-search')?.addEventListener('input', (e) => {
    filterCatalog(e.target.value);
  });

  // Export / Import
  document.getElementById('btn-export')?.addEventListener('click', exportConfig);
  document.getElementById('btn-import')?.addEventListener('click', triggerImport);
  document.getElementById('import-file-input')?.addEventListener('change', handleImportFile);

  // EPG Config
  document.getElementById('btn-save-epg-genres')?.addEventListener('click', saveEPGGenreConfig);
  document.getElementById('btn-reset-epg-genres')?.addEventListener('click', resetEPGGenreConfig);
  document.getElementById('btn-save-epg-genre-map')?.addEventListener('click', saveEPGGenreMap);
  document.getElementById('btn-save-epg-channels')?.addEventListener('click', saveEPGChannels);
  document.getElementById('btn-reset-epg-all')?.addEventListener('click', resetAllEPGConfig);

  // Init all sections
  await initRailEditor();
  await initCatalogEditor();
  await initEPGConfig();
  updateExportPreview();

  // Show default section
  showSection('rails');
});
