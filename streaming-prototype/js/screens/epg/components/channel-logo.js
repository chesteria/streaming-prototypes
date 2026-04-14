// @ts-check
/* ============================================================
   EPG CHANNEL LOGO CELL — Fixed left column
   ============================================================ */

/**
 * createChannelLogoCell(channel)
 *
 * Returns { element, setFocused(bool) }
 */
function createChannelLogoCell(channel) {
  const el = document.createElement('div');
  el.className = 'epg-logo-cell';
  el.setAttribute('data-channel-id', channel.id);

  el.innerHTML = `
    <div class="epg-logo-placeholder" style="background:${_escEPG(channel.color)};">
      ${_escEPG(channel.initials)}
    </div>
    <div class="epg-logo-name">${_escEPG(channel.name)}</div>
    <span class="epg-logo-heart" aria-hidden="true">&#9825;</span>
  `;

  function setFocused(focused) {
    el.classList.toggle('is-focused', focused);
  }

  return { element: el, setFocused };
}
