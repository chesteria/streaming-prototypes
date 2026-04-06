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

  // Init all sections
  await initRailEditor();
  await initCatalogEditor();
  updateExportPreview();

  // Show default section
  showSection('rails');
});
