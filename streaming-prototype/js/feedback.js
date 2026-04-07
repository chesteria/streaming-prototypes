/* ============================================================
   FEEDBACK — Hold-OK feedback overlay + Participant ID prompt
   Phase 2 — Insight Engine
   ============================================================ */

const FeedbackSystem = (() => {

  // ---- Config ----
  const HOLD_DURATION_MS = 3000;
  const RING_RADIUS      = 32; // px
  const RING_CIRCUMFERENCE = 2 * Math.PI * RING_RADIUS;

  // ---- Reactions ----
  const REACTIONS = [
    { key: 'love',      emoji: '😍', label: 'Love it' },
    { key: 'good',      emoji: '👍', label: 'Good' },
    { key: 'neutral',   emoji: '😐', label: 'Neutral' },
    { key: 'confusing', emoji: '😕', label: 'Confusing' },
    { key: 'dislike',   emoji: '👎', label: 'Dislike' },
  ];

  // ---- Tags ----
  const TAGS = [
    'Too slow',
    'Too fast',
    'Expected something different',
    "Couldn't find what I wanted",
    'Layout feels wrong',
    'Love this feature',
    'Text too small',
    'Navigation confusing',
  ];

  // ---- Hold state ----
  let _holdTimer    = null;
  let _holdStart    = null;
  let _holdRingEl   = null;
  let _holdTarget   = null;
  let _rafId        = null;

  // ---- Overlay state ----
  let _overlayEl    = null;
  let _overlayOpen  = false;
  let _focusZone    = 'reactions'; // 'reactions' | 'tags' | 'actions'
  let _reactionIdx  = 0;
  let _tagIdx       = 0;
  let _actionIdx    = 0; // 0=send, 1=skip
  let _selectedReaction = null;
  let _selectedTags = new Set();
  let _capturedState = null;

  // ---- Participant overlay state ----
  let _participantEl   = null;
  let _participantCode = null;
  let _participantFocusIdx = 0; // 0=accept, 1=new-code

  // ---- QR overlay state ----
  let _qrOverlayEl = null;
  let _qrOpen      = false;

  /* ============================================================
     PARTICIPANT ID PROMPT
     ============================================================ */

  function showParticipantPrompt(onComplete) {
    if (_participantEl) return;

    const code = Analytics.generateNewParticipantId();
    _participantCode = code;
    _participantFocusIdx = 0;

    _participantEl = document.createElement('div');
    _participantEl.id = 'participant-overlay';
    _participantEl.innerHTML = `
      <div class="participant-card">
        <div class="participant-welcome">Welcome to the prototype testing program.</div>
        <div class="participant-desc">
          Your feedback is anonymous. You'll be assigned a random participant code
          to help us group your sessions.
        </div>
        <div class="participant-code-label">Your code</div>
        <div class="participant-code" id="participant-code-display">${code}</div>
        <div class="participant-buttons">
          <button class="participant-btn primary focused" id="btn-accept">Accept</button>
          <button class="participant-btn" id="btn-new-code">Generate New Code</button>
        </div>
      </div>
    `;

    document.body.appendChild(_participantEl);

    // Disable FocusEngine while prompt is shown
    if (typeof FocusEngine !== 'undefined' && FocusEngine.disable) FocusEngine.disable();

    // Animate in
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        _participantEl.classList.add('visible');
      });
    });

    // Key handler
    function _keyHandler(e) {
      const key = e.key;

      if (key === 'ArrowLeft' || key === 'ArrowRight') {
        e.preventDefault();
        e.stopPropagation();
        _participantFocusIdx = _participantFocusIdx === 0 ? 1 : 0;
        _updateParticipantFocus();
      } else if (key === 'Enter' || key === 'Accept') {
        e.preventDefault();
        e.stopPropagation();
        if (_participantFocusIdx === 0) {
          _acceptParticipantId(onComplete, _keyHandler);
        } else {
          _regenerateParticipantCode();
        }
      } else if (key === 'Escape' || key === 'GoBack' || key === 'BrowserBack') {
        e.preventDefault();
        e.stopPropagation();
        // BACK = treat as Accept
        _acceptParticipantId(onComplete, _keyHandler);
      }
    }

    document.addEventListener('keydown', _keyHandler, { capture: true });
  }

  function _updateParticipantFocus() {
    const btns = _participantEl.querySelectorAll('.participant-btn');
    btns.forEach((b, i) => b.classList.toggle('focused', i === _participantFocusIdx));
  }

  function _regenerateParticipantCode() {
    _participantCode = Analytics.generateNewParticipantId();
    const display = _participantEl.querySelector('#participant-code-display');
    if (display) display.textContent = _participantCode;
  }

  function _acceptParticipantId(onComplete, keyHandler) {
    Analytics.setParticipantId(_participantCode);

    // H1 (option B): Backfill any events from this session that were stored
    // before the participant ID was known (participantId: 'unknown').
    try {
      const currentSessionId = Analytics.sessionId;
      const stored = Analytics.getEvents();
      let patched = false;
      stored.forEach(evt => {
        if (evt.sessionId === currentSessionId && evt.participantId === 'unknown') {
          evt.participantId = _participantCode;
          patched = true;
        }
      });
      if (patched) {
        localStorage.setItem('analytics_events', JSON.stringify(stored));
      }
    } catch (e) { /* fail silently */ }

    document.removeEventListener('keydown', keyHandler, { capture: true });

    _participantEl.style.opacity = '0';
    _participantEl.style.transition = 'opacity 300ms ease';

    setTimeout(() => {
      if (_participantEl) {
        _participantEl.remove();
        _participantEl = null;
      }
      if (typeof FocusEngine !== 'undefined' && FocusEngine.enable) FocusEngine.enable();
      if (onComplete) onComplete();
    }, 300);
  }

  /* ============================================================
     HOLD-OK RING
     ============================================================ */

  function _createHoldRing() {
    if (_holdRingEl) return;

    _holdRingEl = document.createElement('div');
    _holdRingEl.className = 'feedback-hold-ring';
    _holdRingEl.innerHTML = `
      <svg width="${RING_RADIUS * 2 + 12}" height="${RING_RADIUS * 2 + 12}" viewBox="0 0 ${RING_RADIUS * 2 + 12} ${RING_RADIUS * 2 + 12}">
        <circle class="feedback-hold-ring-track"
          cx="${RING_RADIUS + 6}" cy="${RING_RADIUS + 6}" r="${RING_RADIUS}"
          stroke-dasharray="${RING_CIRCUMFERENCE}"
          stroke-dashoffset="0"
        />
        <circle class="feedback-hold-ring-fill"
          cx="${RING_RADIUS + 6}" cy="${RING_RADIUS + 6}" r="${RING_RADIUS}"
          stroke-dasharray="${RING_CIRCUMFERENCE}"
          stroke-dashoffset="${RING_CIRCUMFERENCE}"
          id="hold-ring-fill"
          style="transform-origin: ${RING_RADIUS + 6}px ${RING_RADIUS + 6}px"
        />
      </svg>
    `;
    document.body.appendChild(_holdRingEl);
  }

  function _positionRingOnFocused() {
    // Find the currently focused element
    const focused = _holdTarget;
    if (!focused) return null;

    const rect = focused.getBoundingClientRect();
    const cx = rect.left + rect.width / 2;
    const cy = rect.top + rect.height / 2;

    _holdRingEl.style.left = `${cx - RING_RADIUS - 6}px`;
    _holdRingEl.style.top  = `${cy - RING_RADIUS - 6}px`;
    return { cx, cy, rect };
  }

  function _startHold(target) {
    if (_overlayOpen) return;
    _holdTarget = target;
    _holdStart = Date.now();

    _createHoldRing();
    _positionRingOnFocused();
    _holdRingEl.classList.add('active');

    _animateRing();
  }

  function _animateRing() {
    const elapsed = Date.now() - _holdStart;
    const progress = Math.min(elapsed / HOLD_DURATION_MS, 1);
    const offset = RING_CIRCUMFERENCE * (1 - progress);

    const fillEl = document.getElementById('hold-ring-fill');
    if (fillEl) fillEl.setAttribute('stroke-dashoffset', offset);

    if (progress < 1) {
      _rafId = requestAnimationFrame(_animateRing);
    } else {
      _triggerFeedbackOverlay();
    }
  }

  function _cancelHold() {
    if (_rafId) cancelAnimationFrame(_rafId);
    _rafId = null;
    _holdStart = null;
    _holdTarget = null;
    if (_holdRingEl) _holdRingEl.classList.remove('active');
  }

  /* ============================================================
     FEEDBACK OVERLAY
     ============================================================ */

  function _captureCurrentState() {
    const screen = document.querySelector('.screen.active');
    const focused = document.querySelector('.focused');

    return {
      screen: screen?.dataset?.screen || 'unknown',
      focusedElement: focused?.className?.split(' ')[0] || 'none',
      scrollPosition: screen?.scrollTop || 0,
      timestamp: new Date().toISOString(),
      // participantId intentionally omitted: it is already in the top-level
      // event envelope added by Analytics.track() — no duplication in payload.
    };
  }

  function _triggerFeedbackOverlay() {
    _cancelHold();
    _capturedState = _captureCurrentState();
    _openOverlay();
  }

  function _buildOverlayHTML() {
    const reactionsHTML = REACTIONS.map((r, i) => `
      <div class="feedback-reaction-btn${i === 0 ? ' focused' : ''}" data-reaction-idx="${i}" data-reaction="${r.key}">
        <span class="reaction-emoji">${r.emoji}</span>
        <span class="reaction-label">${r.label}</span>
      </div>
    `).join('');

    const tagsHTML = TAGS.map((tag, i) => `
      <div class="feedback-tag-btn" data-tag-idx="${i}" data-tag="${tag}">${tag}</div>
    `).join('');

    const screenName = _capturedState?.screen || 'unknown';

    return `
      <div class="feedback-header">Quick Feedback</div>
      <div class="feedback-prompt">How was that?</div>
      <div class="feedback-context">Screen: ${screenName} · ${new Date().toLocaleTimeString()}</div>
      <div class="feedback-reactions" id="feedback-reactions">
        ${reactionsHTML}
      </div>
      <div class="feedback-tags" id="feedback-tags">
        ${tagsHTML}
      </div>
      <div class="feedback-actions" id="feedback-actions">
        <button class="feedback-send-btn" id="feedback-send">Send</button>
        <button class="feedback-skip-btn" id="feedback-skip">Skip</button>
      </div>
    `;
  }

  function _openOverlay() {
    if (!_overlayEl) {
      _overlayEl = document.createElement('div');
      _overlayEl.id = 'feedback-overlay';
      document.body.appendChild(_overlayEl);
    }

    _overlayEl.innerHTML = _buildOverlayHTML();
    _focusZone = 'reactions';
    _reactionIdx = 0;
    _tagIdx = 0;
    _actionIdx = 0;
    _selectedReaction = null;
    _selectedTags = new Set();
    _overlayOpen = true;

    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        _overlayEl.classList.add('visible');
      });
    });

    if (typeof FocusEngine !== 'undefined' && FocusEngine.disable) FocusEngine.disable();

    document.addEventListener('keydown', _overlayKeyHandler, { capture: true });
  }

  function _closeOverlay() {
    _overlayOpen = false;
    document.removeEventListener('keydown', _overlayKeyHandler, { capture: true });

    if (_overlayEl) {
      _overlayEl.classList.remove('visible');
    }

    if (typeof FocusEngine !== 'undefined' && FocusEngine.enable) FocusEngine.enable();
  }

  function _overlayKeyHandler(e) {
    e.stopPropagation();
    e.preventDefault();

    const key = e.key;

    if (key === 'Escape' || key === 'GoBack' || key === 'BrowserBack') {
      _closeOverlay();
      return;
    }

    if (_focusZone === 'reactions') {
      if (key === 'ArrowLeft') {
        _reactionIdx = Math.max(0, _reactionIdx - 1);
        _updateReactionFocus();
      } else if (key === 'ArrowRight') {
        _reactionIdx = Math.min(REACTIONS.length - 1, _reactionIdx + 1);
        _updateReactionFocus();
      } else if (key === 'ArrowDown') {
        _focusZone = 'tags';
        _tagIdx = 0;
        _updateReactionFocus();
        _updateTagFocus();
      } else if (key === 'Enter' || key === 'Accept') {
        _selectReaction(_reactionIdx);
        _focusZone = 'tags';
        _tagIdx = 0;
        _updateTagFocus();
      }

    } else if (_focusZone === 'tags') {
      const tagBtns = _overlayEl.querySelectorAll('.feedback-tag-btn');
      if (key === 'ArrowLeft') {
        _tagIdx = Math.max(0, _tagIdx - 1);
        _updateTagFocus();
      } else if (key === 'ArrowRight') {
        _tagIdx = Math.min(tagBtns.length - 1, _tagIdx + 1);
        _updateTagFocus();
      } else if (key === 'ArrowUp') {
        _focusZone = 'reactions';
        _clearTagFocus();
        _updateReactionFocus();
      } else if (key === 'ArrowDown') {
        _focusZone = 'actions';
        _actionIdx = 0;
        _clearTagFocus();
        _updateActionFocus();
      } else if (key === 'Enter' || key === 'Accept') {
        _toggleTag(_tagIdx);
      }

    } else if (_focusZone === 'actions') {
      if (key === 'ArrowLeft') {
        _actionIdx = Math.max(0, _actionIdx - 1);
        _updateActionFocus();
      } else if (key === 'ArrowRight') {
        _actionIdx = Math.min(1, _actionIdx + 1);
        _updateActionFocus();
      } else if (key === 'ArrowUp') {
        _focusZone = 'tags';
        _tagIdx = 0;
        _clearActionFocus();
        _updateTagFocus();
      } else if (key === 'Enter' || key === 'Accept') {
        if (_actionIdx === 0) {
          _sendFeedback();
        } else {
          _closeOverlay();
        }
      }
    }
  }

  function _updateReactionFocus() {
    const btns = _overlayEl.querySelectorAll('.feedback-reaction-btn');
    btns.forEach((b, i) => {
      b.classList.toggle('focused', i === _reactionIdx && _focusZone === 'reactions');
    });
  }

  function _selectReaction(idx) {
    _selectedReaction = REACTIONS[idx].key;
    const btns = _overlayEl.querySelectorAll('.feedback-reaction-btn');
    btns.forEach((b, i) => {
      b.classList.toggle('selected', i === idx);
    });
  }

  function _updateTagFocus() {
    const btns = _overlayEl.querySelectorAll('.feedback-tag-btn');
    btns.forEach((b, i) => {
      b.classList.toggle('focused', i === _tagIdx && _focusZone === 'tags');
    });
  }

  function _clearTagFocus() {
    const btns = _overlayEl.querySelectorAll('.feedback-tag-btn');
    btns.forEach(b => b.classList.remove('focused'));
  }

  function _toggleTag(idx) {
    const tag = TAGS[idx];
    if (_selectedTags.has(tag)) {
      _selectedTags.delete(tag);
    } else {
      _selectedTags.add(tag);
    }
    const btns = _overlayEl.querySelectorAll('.feedback-tag-btn');
    if (btns[idx]) btns[idx].classList.toggle('selected', _selectedTags.has(tag));
  }

  function _updateActionFocus() {
    const sendBtn = _overlayEl.querySelector('#feedback-send');
    const skipBtn = _overlayEl.querySelector('#feedback-skip');
    if (sendBtn) sendBtn.classList.toggle('focused', _actionIdx === 0 && _focusZone === 'actions');
    if (skipBtn) skipBtn.classList.toggle('focused', _actionIdx === 1 && _focusZone === 'actions');
  }

  function _clearActionFocus() {
    const sendBtn = _overlayEl.querySelector('#feedback-send');
    const skipBtn = _overlayEl.querySelector('#feedback-skip');
    if (sendBtn) sendBtn.classList.remove('focused');
    if (skipBtn) skipBtn.classList.remove('focused');
  }

  function _sendFeedback() {
    try {
      if (typeof Analytics !== 'undefined') {
        Analytics.track('user_feedback', {
          reaction: _selectedReaction || 'none',
          tags: Array.from(_selectedTags),
          state: _capturedState || {},
        });
      }
    } catch (e) {
      // Fail silently
    }

    _closeOverlay();
    _showThanksToast();
  }

  function _showThanksToast() {
    const toast = document.createElement('div');
    toast.className = 'feedback-thanks';
    toast.textContent = 'Thanks for your feedback!';
    document.body.appendChild(toast);

    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        toast.classList.add('visible');
      });
    });

    setTimeout(() => {
      toast.classList.remove('visible');
      setTimeout(() => toast.remove(), 400);
    }, 2500);
  }

  /* ============================================================
     QR CODE OVERLAY
     ============================================================ */

  function showQRExport() {
    if (_qrOpen) return;

    if (!_qrOverlayEl) {
      _qrOverlayEl = document.createElement('div');
      _qrOverlayEl.id = 'qr-overlay';
      document.body.appendChild(_qrOverlayEl);
    }

    // H2 (option 1): Encode a compact session summary — not raw events.
    // Raw events were 3000–6000+ chars and produced unreadable QR codes.
    const allEvents = typeof Analytics !== 'undefined' ? Analytics.getEvents() : [];
    const summary = typeof Analytics !== 'undefined' ? Analytics.getSessionSummary() : {};
    const sessionSummary = {
      sid: (Analytics.sessionId || '').slice(0, 8),
      pid: Analytics.getParticipantId() || 'unknown',
      ts: new Date().toISOString(),
      totalEvents: allEvents.length,
      device: Analytics.getDeviceType(),
      screensVisited: summary.screensVisited || [],
      deepestScreen: summary.deepestScreen || 'lander',
      totalSelections: summary.totalSelections || 0,
      totalFocusChanges: summary.totalFocusChanges || 0,
      durationMs: summary.durationMs || 0,
    };
    const jsonStr = JSON.stringify(sessionSummary);
    const dataUri = 'data:text/plain;charset=utf-8,' + encodeURIComponent(jsonStr);

    _qrOverlayEl.innerHTML = `
      <div class="qr-title">Scan to export session data</div>
      <div class="qr-subtitle">${allEvents.length} events · ${summary.screensVisited?.length || 0} screens visited</div>
      <div id="qr-code-container"></div>
      <div class="qr-event-count">Participant: ${sessionSummary.pid} · Session: ${sessionSummary.sid}</div>
      <button class="qr-close-btn focused" id="qr-close-btn">Close</button>
    `;

    _qrOpen = true;

    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        _qrOverlayEl.classList.add('visible');
      });
    });

    // Generate QR code
    const container = _qrOverlayEl.querySelector('#qr-code-container');
    if (typeof QRCode !== 'undefined' && container) {
      try {
        new QRCode(container, {
          text: dataUri,
          width: 232,
          height: 232,
          colorDark: '#000000',
          colorLight: '#ffffff',
          correctLevel: QRCode.CorrectLevel.L,
        });
      } catch (err) {
        container.innerHTML = `<div style="color:#999;font-size:13px;text-align:center;padding:20px;">QR generation failed.<br>QRCode.js not loaded.</div>`;
        console.warn('[Analytics] QR generation failed:', err);
      }
    } else if (container) {
      container.innerHTML = `<div style="color:#999;font-size:13px;text-align:center;padding:20px;">QRCode library<br>not available.</div>`;
    }

    if (typeof FocusEngine !== 'undefined' && FocusEngine.disable) FocusEngine.disable();

    document.addEventListener('keydown', _qrKeyHandler, { capture: true });
  }

  function _qrKeyHandler(e) {
    e.stopPropagation();
    e.preventDefault();

    if (e.key === 'Escape' || e.key === 'GoBack' || e.key === 'BrowserBack' ||
        e.key === 'Enter' || e.key === 'Accept') {
      _closeQROverlay();
    }
  }

  function _closeQROverlay() {
    _qrOpen = false;
    document.removeEventListener('keydown', _qrKeyHandler, { capture: true });

    if (_qrOverlayEl) {
      _qrOverlayEl.classList.remove('visible');
      setTimeout(() => {
        if (_qrOverlayEl) {
          // Clear QR canvas for next use
          const container = _qrOverlayEl.querySelector('#qr-code-container');
          if (container) container.innerHTML = '';
        }
      }, 300);
    }

    if (typeof FocusEngine !== 'undefined' && FocusEngine.enable) FocusEngine.enable();
  }

  /* ============================================================
     KEYBOARD HOLD LISTENER (capture phase)
     ============================================================ */

  let _okHeldMs = 0;
  let _okHeldStart = null;
  let _okHeldRaf = null;

  function _isOKKey(e) {
    return e.key === 'Enter' || e.key === 'Accept';
  }

  function _onKeyDown(e) {
    // Don't start hold if overlay is open, panel is open, or not OK key
    if (_overlayOpen) return;
    if (_qrOpen) return;
    if (!_isOKKey(e)) return;
    if (e.repeat) return; // Already holding

    // Don't start if debug panel is open
    if (typeof DebugPanel !== 'undefined' && DebugPanel.isOpen && DebugPanel.isOpen()) return;

    // Don't capture — let the event also go to FocusEngine
    // We'll use a timer to detect the hold length
    _okHeldStart = Date.now();

    // Find focused element to position ring
    const target = document.querySelector('.focused') || document.activeElement;
    _startHold(target);
  }

  function _onKeyUp(e) {
    if (!_isOKKey(e)) return;
    if (_okHeldStart === null) return;

    const held = Date.now() - _okHeldStart;
    _okHeldStart = null;
    _cancelHold();
  }

  document.addEventListener('keydown', _onKeyDown);
  document.addEventListener('keyup', _onKeyUp);

  /* ============================================================
     INIT — Show participant prompt on first launch
     ============================================================ */

  function init() {
    // Show participant ID prompt if first visit
    // Defer slightly so lander is built first
    if (typeof Analytics !== 'undefined' && Analytics.isFirstVisit()) {
      setTimeout(() => {
        showParticipantPrompt(() => {
          // session_start is fired by lander.js — do NOT fire it here.
          // Firing it here caused a duplicate session_start on first visit.
          // The lander.js instrumentation handles session_start correctly
          // for both first-visit and returning participants.
        });
      }, 800);
    }
  }

  return {
    init,
    showQRExport,
    showParticipantPrompt,
  };

})();

// Auto-init when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
  FeedbackSystem.init();
});
