/* ============================================================
   REPORTING DASHBOARD — Analytics visualization logic
   Phase 2 — Insight Engine
   ============================================================ */

(function() {

  // ---- State ----
  let _events = [];
  let _filteredReaction = 'all';
  let _railDwellChart = null;
  let _railSelectChart = null;

  // ---- Emoji map ----
  const REACTION_EMOJI = {
    love:      '😍',
    good:      '👍',
    neutral:   '😐',
    confusing: '😕',
    dislike:   '👎',
    none:      '—',
  };

  const REACTION_LABEL = {
    love:      'Love it',
    good:      'Good',
    neutral:   'Neutral',
    confusing: 'Confusing',
    dislike:   'Dislike',
    none:      'No reaction',
  };

  /* ============================================================
     DATA LOADING
     ============================================================ */

  function _loadFromLocalStorage() {
    try {
      const raw = localStorage.getItem('analytics_events');
      return raw ? JSON.parse(raw) : [];
    } catch (e) {
      console.warn('[Reporting] Failed to parse localStorage events:', e);
      return [];
    }
  }

  function _loadEvents(events) {
    _events = Array.isArray(events) ? events : [];
    _updateDatasourceIndicator();
    _renderAll();
  }

  function _updateDatasourceIndicator() {
    const dot = document.getElementById('datasource-dot');
    const label = document.getElementById('datasource-label');
    if (!dot || !label) return;

    if (_events.length > 0) {
      dot.classList.remove('empty');
      const sessions = new Set(_events.map(e => e.sessionId)).size;
      label.textContent = `${_events.length} events · ${sessions} sessions`;
    } else {
      dot.classList.add('empty');
      label.textContent = 'No data loaded';
    }
  }

  /* ============================================================
     RENDER ALL
     ============================================================ */

  function _renderAll() {
    _renderOverview();
    _renderHeatmap();
    _renderFlow();
    _renderRailPerformance();
    _renderFeedback();
  }

  /* ============================================================
     A — SESSION OVERVIEW
     ============================================================ */

  function _renderOverview() {
    if (!_events.length) {
      _setStat('stat-sessions', '0');
      _setStat('stat-participants', '0');
      _setStat('stat-avg-duration', '—');
      _setStat('stat-events', '0');
      _renderDeviceList([]);
      _renderEventTypes([]);
      return;
    }

    const sessions = _getUniqueSessions();
    const participants = new Set(_events.map(e => e.participantId).filter(Boolean));

    // Avg session duration: from session_start to session_end pairs
    const durations = [];
    sessions.forEach(sid => {
      const sessionEvents = _events.filter(e => e.sessionId === sid);
      const start = sessionEvents.find(e => e.event === 'session_start');
      const end   = sessionEvents.find(e => e.event === 'session_end');
      if (start && end) {
        const ms = new Date(end.timestamp) - new Date(start.timestamp);
        if (ms > 0) durations.push(ms);
      } else if (sessionEvents.length >= 2) {
        const times = sessionEvents.map(e => new Date(e.timestamp)).sort((a,b) => a-b);
        durations.push(times[times.length-1] - times[0]);
      }
    });

    const avgDuration = durations.length
      ? _formatDuration(durations.reduce((a,b) => a+b, 0) / durations.length)
      : '—';

    _setStat('stat-sessions', String(sessions.size));
    _setStat('stat-participants', String(participants.size));
    _setStat('stat-avg-duration', avgDuration);
    _setStat('stat-events', String(_events.length));

    // Device breakdown
    const deviceCounts = {};
    sessions.forEach(sid => {
      const firstEvent = _events.find(e => e.sessionId === sid);
      const device = firstEvent?.deviceType || 'unknown';
      deviceCounts[device] = (deviceCounts[device] || 0) + 1;
    });
    _renderDeviceList(deviceCounts);

    // Event type breakdown
    const typeCounts = {};
    _events.forEach(e => {
      typeCounts[e.event] = (typeCounts[e.event] || 0) + 1;
    });
    _renderEventTypes(typeCounts);
  }

  function _setStat(id, value) {
    const el = document.getElementById(id);
    if (el) el.textContent = value;
  }

  function _getUniqueSessions() {
    return new Set(_events.map(e => e.sessionId).filter(Boolean));
  }

  function _formatDuration(ms) {
    if (!ms || ms < 0) return '—';
    const totalSec = Math.round(ms / 1000);
    const m = Math.floor(totalSec / 60);
    const s = totalSec % 60;
    if (m > 0) return `${m}m ${s}s`;
    return `${s}s`;
  }

  function _renderDeviceList(deviceCounts) {
    const el = document.getElementById('device-list');
    if (!el) return;

    const entries = Object.entries(deviceCounts).sort((a,b) => b[1] - a[1]);
    const total = entries.reduce((sum, [,c]) => sum + c, 0);

    if (!entries.length) {
      el.innerHTML = '<div style="color:var(--text-dim);font-size:13px;">No device data.</div>';
      return;
    }

    el.innerHTML = entries.map(([device, count]) => {
      const pct = total > 0 ? Math.round(count / total * 100) : 0;
      return `
        <div style="display:flex;align-items:center;gap:10px;margin-bottom:10px;">
          <span class="rpt-device-badge">${device}</span>
          <div style="flex:1;height:8px;background:var(--surface-2);border-radius:4px;overflow:hidden;">
            <div style="width:${pct}%;height:100%;background:var(--accent);border-radius:4px;"></div>
          </div>
          <span style="font-size:13px;color:var(--text-mid);min-width:60px;text-align:right;">${count} (${pct}%)</span>
        </div>
      `;
    }).join('');
  }

  function _renderEventTypes(typeCounts) {
    const el = document.getElementById('event-type-list');
    if (!el) return;

    const entries = Object.entries(typeCounts).sort((a,b) => b[1] - a[1]);
    const total = entries.reduce((sum, [,c]) => sum + c, 0);

    if (!entries.length) {
      el.innerHTML = '<div style="color:var(--text-dim);font-size:13px;">No event data.</div>';
      return;
    }

    el.innerHTML = entries.slice(0, 10).map(([type, count]) => {
      const pct = total > 0 ? Math.round(count / total * 100) : 0;
      return `
        <div style="display:flex;align-items:center;gap:10px;margin-bottom:8px;">
          <span style="font-size:12px;font-family:monospace;color:var(--text-mid);min-width:160px;">${type}</span>
          <div style="flex:1;height:6px;background:var(--surface-2);border-radius:3px;overflow:hidden;">
            <div style="width:${pct}%;height:100%;background:rgba(62,139,255,0.6);border-radius:3px;"></div>
          </div>
          <span style="font-size:12px;color:var(--text-dim);min-width:50px;text-align:right;">${count}</span>
        </div>
      `;
    }).join('');
  }

  /* ============================================================
     B — NAVIGATION HEATMAP
     ============================================================ */

  function _renderHeatmap() {
    const el = document.getElementById('heatmap-container');
    if (!el) return;

    // Aggregate dwell times from focus_change events
    const railDwells = {};
    _events
      .filter(e => e.event === 'focus_change' && e.payload?.from?.zone)
      .forEach(e => {
        const zone = e.payload.from.zone;
        const dwell = e.payload.dwellTimeMs || 0;
        if (!railDwells[zone]) railDwells[zone] = { total: 0, count: 0 };
        railDwells[zone].total += dwell;
        railDwells[zone].count += 1;
      });

    // Also aggregate from rail_engagement events
    _events
      .filter(e => e.event === 'rail_engagement' && e.payload?.rail)
      .forEach(e => {
        const zone = e.payload.rail;
        const dwell = e.payload.dwellTimeMs || 0;
        if (!railDwells[zone]) railDwells[zone] = { total: 0, count: 0 };
        railDwells[zone].total += dwell;
        railDwells[zone].count += 1;
      });

    if (!Object.keys(railDwells).length) {
      el.innerHTML = '<div style="color:var(--text-dim);font-size:13px;padding:24px 0;">No dwell data yet. Focus change events will populate this chart.</div>';
      return;
    }

    const entries = Object.entries(railDwells)
      .map(([rail, data]) => ({ rail, avg: data.count ? Math.round(data.total / data.count) : 0, count: data.count }))
      .sort((a, b) => b.avg - a.avg);

    const maxAvg = Math.max(...entries.map(e => e.avg), 1);

    el.innerHTML = `<div class="rpt-heatmap-grid">` +
      entries.map(({ rail, avg, count }) => {
        const pct = Math.round(avg / maxAvg * 100);
        // Color: low=blue, high=red via hsl interpolation
        const hue = Math.round(210 - (pct / 100) * 180); // 210 (blue) → 30 (orange-red)
        const fill = `hsl(${hue}, 80%, 55%)`;
        return `
          <div class="rpt-heatmap-row">
            <div class="rpt-heatmap-rail-label" title="${rail}">${rail}</div>
            <div class="rpt-heatmap-bar">
              <div class="rpt-heatmap-bar-fill" style="width:${pct}%;background:${fill};"></div>
            </div>
            <div class="rpt-heatmap-value">${_formatDuration(avg)} · ${count} ev</div>
          </div>
        `;
      }).join('') + `</div>`;
  }

  /* ============================================================
     C — FLOW DIAGRAM
     ============================================================ */

  function _renderFlow() {
    const tbody = document.getElementById('flow-tbody');
    if (!tbody) return;

    // Build screen paths per session
    const navEvents = _events.filter(e => e.event === 'navigation');
    if (!navEvents.length) {
      tbody.innerHTML = '<tr><td colspan="4" style="text-align:center;padding:32px;color:var(--text-dim);">No navigation data yet.</td></tr>';
      return;
    }

    // Build path per session
    const sessionPaths = {};
    navEvents.forEach(e => {
      const sid = e.sessionId;
      if (!sessionPaths[sid]) sessionPaths[sid] = ['lander'];
      const to = e.payload?.to;
      if (to && sessionPaths[sid][sessionPaths[sid].length - 1] !== to) {
        sessionPaths[sid].push(to);
      }
    });

    // Count path frequencies
    const pathCounts = {};
    Object.values(sessionPaths).forEach(path => {
      const key = path.join(' → ');
      pathCounts[key] = (pathCounts[key] || 0) + 1;
    });

    const totalSessions = Object.keys(sessionPaths).length;
    const entries = Object.entries(pathCounts).sort((a,b) => b[1] - a[1]);

    tbody.innerHTML = entries.slice(0, 20).map(([path, count], i) => {
      const pct = totalSessions > 0 ? Math.round(count / totalSessions * 100) : 0;
      return `
        <tr>
          <td class="rank">${i + 1}</td>
          <td style="font-family:monospace;font-size:12px;">${_formatPath(path)}</td>
          <td style="font-weight:600;">${count}</td>
          <td style="color:var(--text-dim);">${pct}%</td>
        </tr>
      `;
    }).join('');
  }

  function _formatPath(path) {
    return path.split(' → ').map(screen => {
      const colors = { lander: '#3E8BFF', 'series-pdp': '#28C87A', player: '#F5A623' };
      const c = colors[screen] || 'var(--text-mid)';
      return `<span style="color:${c};">${screen}</span>`;
    }).join(' <span style="color:var(--text-dim);">→</span> ');
  }

  /* ============================================================
     D — RAIL PERFORMANCE
     ============================================================ */

  function _renderRailPerformance() {
    const engEvents = _events.filter(e => e.event === 'rail_engagement');
    const tbody = document.getElementById('rail-tbody');

    if (!engEvents.length) {
      if (tbody) tbody.innerHTML = '<tr><td colspan="4" style="text-align:center;padding:24px;color:var(--text-dim);">No rail engagement data yet.</td></tr>';
      _destroyCharts();
      return;
    }

    // Aggregate per rail
    const railData = {};
    engEvents.forEach(e => {
      const rail = e.payload?.rail || 'unknown';
      if (!railData[rail]) {
        railData[rail] = { totalDwell: 0, count: 0, selected: 0 };
      }
      railData[rail].totalDwell += e.payload?.dwellTimeMs || 0;
      railData[rail].count += 1;
      if (e.payload?.selectedTile !== null && e.payload?.selectedTile !== undefined) {
        railData[rail].selected += 1;
      }
    });

    const entries = Object.entries(railData)
      .map(([rail, data]) => ({
        rail,
        avgDwell: data.count ? Math.round(data.totalDwell / data.count) : 0,
        selectRate: data.count ? Math.round(data.selected / data.count * 100) : 0,
        count: data.count,
        totalDwell: data.totalDwell,
      }))
      .sort((a, b) => b.totalDwell - a.totalDwell);

    const avgDwells = entries.map(e => {
      return railData[e.rail].count
        ? Math.round(railData[e.rail].totalDwell / railData[e.rail].count)
        : 0;
    });

    // Dwell chart
    _createOrUpdateChart('rail-dwell-chart', {
      type: 'bar',
      data: {
        labels: entries.map(e => e.rail),
        datasets: [{
          label: 'Avg Dwell (ms)',
          data: avgDwells,
          backgroundColor: 'rgba(62,139,255,0.7)',
          borderColor: 'rgba(62,139,255,1)',
          borderWidth: 1,
          borderRadius: 4,
        }],
      },
      options: _barChartOptions('Avg Dwell Time (ms)'),
    }, '_railDwellChart');

    // Selection rate chart
    _createOrUpdateChart('rail-select-chart', {
      type: 'bar',
      data: {
        labels: entries.map(e => e.rail),
        datasets: [{
          label: 'Selection Rate %',
          data: entries.map(e => e.selectRate),
          backgroundColor: 'rgba(40,200,122,0.7)',
          borderColor: 'rgba(40,200,122,1)',
          borderWidth: 1,
          borderRadius: 4,
        }],
      },
      options: _barChartOptions('Selection Rate (%)'),
    }, '_railSelectChart');

    // Table
    if (tbody) {
      tbody.innerHTML = entries.map(({ rail, count, selectRate, totalDwell }) => {
        const avgDwell = count ? Math.round(totalDwell / count) : 0;
        return `
          <tr>
            <td style="font-size:13px;">${rail}</td>
            <td style="font-variant-numeric:tabular-nums;">${_formatDuration(avgDwell)}</td>
            <td style="color:${selectRate > 30 ? 'var(--green)' : 'var(--text-mid)'};">${selectRate}%</td>
            <td style="color:var(--text-dim);">${count}</td>
          </tr>
        `;
      }).join('');
    }
  }

  function _barChartOptions(title) {
    return {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: { display: false },
        title: { display: false },
      },
      scales: {
        x: {
          ticks: {
            color: 'rgba(240,244,248,0.45)',
            font: { size: 11 },
            maxRotation: 30,
          },
          grid: { color: 'rgba(255,255,255,0.05)' },
        },
        y: {
          ticks: {
            color: 'rgba(240,244,248,0.45)',
            font: { size: 11 },
          },
          grid: { color: 'rgba(255,255,255,0.05)' },
        },
      },
    };
  }

  function _createOrUpdateChart(canvasId, chartData, refKey) {
    const canvas = document.getElementById(canvasId);
    if (!canvas) return;
    const ctx = canvas.getContext('2d');

    // Destroy existing
    if (refKey === '_railDwellChart' && _railDwellChart) {
      _railDwellChart.destroy();
      _railDwellChart = null;
    }
    if (refKey === '_railSelectChart' && _railSelectChart) {
      _railSelectChart.destroy();
      _railSelectChart = null;
    }

    if (typeof Chart === 'undefined') {
      console.warn('[Reporting] Chart.js not loaded');
      // M3: Show visible fallback instead of silently leaving the container empty
      const canvasEl = document.getElementById(canvasId);
      if (canvasEl) {
        const parent = canvasEl.parentElement;
        if (parent) parent.innerHTML = '<div style="padding:32px;text-align:center;color:var(--text-dim);font-size:14px;">Chart unavailable — Chart.js could not be loaded.<br>Check your network connection or open the dashboard online.</div>';
      }
      return;
    }

    const chart = new Chart(ctx, chartData);
    if (refKey === '_railDwellChart') _railDwellChart = chart;
    if (refKey === '_railSelectChart') _railSelectChart = chart;
  }

  function _destroyCharts() {
    if (_railDwellChart) { _railDwellChart.destroy(); _railDwellChart = null; }
    if (_railSelectChart) { _railSelectChart.destroy(); _railSelectChart = null; }
  }

  /* ============================================================
     E — FEEDBACK FEED
     ============================================================ */

  function _renderFeedback() {
    const feedbackEvents = _events.filter(e => e.event === 'user_feedback');
    const el = document.getElementById('feedback-list');
    if (!el) return;

    const filtered = _filteredReaction === 'all'
      ? feedbackEvents
      : feedbackEvents.filter(e => e.payload?.reaction === _filteredReaction);

    if (!filtered.length) {
      el.innerHTML = `
        <div class="rpt-card rpt-empty">
          <span class="rpt-empty-icon">💬</span>
          <div class="rpt-empty-title">${feedbackEvents.length > 0 ? 'No matches for this filter' : 'No feedback yet'}</div>
          <div class="rpt-empty-desc">Feedback events will appear here after testers use the hold-OK mechanism.</div>
        </div>
      `;
      return;
    }

    // Sort newest first
    const sorted = filtered.slice().sort((a, b) =>
      new Date(b.timestamp) - new Date(a.timestamp)
    );

    el.innerHTML = sorted.map(e => {
      const reaction = e.payload?.reaction || 'none';
      const emoji = REACTION_EMOJI[reaction] || '—';
      const label = REACTION_LABEL[reaction] || reaction;
      const tags = e.payload?.tags || [];
      const screen = e.payload?.state?.screen || e.screen || 'unknown';
      const focusedEl = e.payload?.state?.focusedElement || '';
      const time = new Date(e.timestamp).toLocaleString();
      const participant = e.participantId || 'unknown';
      const reactionClass = `reaction-${reaction}`;

      return `
        <div class="rpt-feedback-item">
          <div class="rpt-feedback-emoji ${reactionClass}">${emoji}</div>
          <div>
            <div class="rpt-feedback-meta">${participant} · ${screen}${focusedEl ? ' · ' + focusedEl.split(' ')[0] : ''}</div>
            <div class="rpt-feedback-screen">${label}</div>
            ${tags.length ? `
              <div class="rpt-feedback-tags">
                ${tags.map(tag => `<span class="rpt-feedback-tag">${tag}</span>`).join('')}
              </div>
            ` : ''}
          </div>
          <div class="rpt-feedback-time">${time}</div>
        </div>
      `;
    }).join('');
  }

  /* ============================================================
     IMPORT / EXPORT
     ============================================================ */

  function _exportData() {
    const json = JSON.stringify(_events, null, 2);
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `analytics-export-${new Date().toISOString().slice(0,10)}.json`;
    document.body.appendChild(a);
    a.click();
    setTimeout(() => { URL.revokeObjectURL(url); a.remove(); }, 1000);
  }

  function _handleFileImport(file) {
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = JSON.parse(e.target.result);
        const events = Array.isArray(data) ? data : [];
        _loadEvents(events);
        _closeImportOverlay();
      } catch (err) {
        alert('Failed to parse JSON file: ' + err.message);
      }
    };
    reader.readAsText(file);
  }

  function _openImportOverlay() {
    const overlay = document.getElementById('import-overlay');
    if (overlay) overlay.classList.add('visible');
  }

  function _closeImportOverlay() {
    const overlay = document.getElementById('import-overlay');
    if (overlay) overlay.classList.remove('visible');
  }

  function _clearData() {
    if (!confirm('Clear all analytics data from localStorage? This cannot be undone.')) return;
    localStorage.removeItem('analytics_events');
    _loadEvents([]);
  }

  /* ============================================================
     WIRE UP EVENTS
     ============================================================ */

  function _wireEvents() {
    // Nav items
    document.querySelectorAll('.rpt-nav-item').forEach(item => {
      item.addEventListener('click', () => {
        document.querySelectorAll('.rpt-nav-item').forEach(n => n.classList.remove('active'));
        item.classList.add('active');
      });
    });

    // Top bar buttons
    document.getElementById('btn-import')?.addEventListener('click', _openImportOverlay);
    document.getElementById('btn-export')?.addEventListener('click', _exportData);
    document.getElementById('btn-clear')?.addEventListener('click', _clearData);

    // Import overlay
    document.getElementById('btn-import-cancel')?.addEventListener('click', _closeImportOverlay);
    document.getElementById('btn-browse')?.addEventListener('click', () => {
      document.getElementById('import-file-input')?.click();
    });

    const fileInput = document.getElementById('import-file-input');
    if (fileInput) {
      fileInput.addEventListener('change', (e) => {
        _handleFileImport(e.target.files[0]);
        fileInput.value = '';
      });
    }

    const dropZone = document.getElementById('drop-zone');
    if (dropZone) {
      dropZone.addEventListener('click', () => document.getElementById('import-file-input')?.click());
      dropZone.addEventListener('dragover', (e) => { e.preventDefault(); dropZone.classList.add('drag-over'); });
      dropZone.addEventListener('dragleave', () => dropZone.classList.remove('drag-over'));
      dropZone.addEventListener('drop', (e) => {
        e.preventDefault();
        dropZone.classList.remove('drag-over');
        const file = e.dataTransfer?.files[0];
        if (file) _handleFileImport(file);
      });
    }

    // Feedback filters
    document.getElementById('feedback-filters')?.addEventListener('click', (e) => {
      const pill = e.target.closest('.rpt-filter-pill');
      if (!pill) return;
      _filteredReaction = pill.dataset.filter;
      document.querySelectorAll('.rpt-filter-pill').forEach(p => p.classList.remove('active'));
      pill.classList.add('active');
      _renderFeedback();
    });
  }

  /* ============================================================
     INIT
     ============================================================ */

  document.addEventListener('DOMContentLoaded', () => {
    _wireEvents();

    // Load from localStorage on same origin
    const events = _loadFromLocalStorage();
    _loadEvents(events);

    // M7: Auto-refresh every 30s — compare by latest timestamp, not just count,
    // so new events in the same session (same count) also trigger a refresh.
    setInterval(() => {
      const fresh = _loadFromLocalStorage();
      const freshLatest = fresh.length ? fresh[fresh.length - 1].timestamp : '';
      const curLatest = _events.length ? _events[_events.length - 1].timestamp : '';
      if (fresh.length !== _events.length || freshLatest !== curLatest) {
        _loadEvents(fresh);
      }
    }, 30000);
  });

})();
