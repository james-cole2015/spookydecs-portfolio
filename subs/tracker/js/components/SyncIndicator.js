/**
 * SyncIndicator.js
 * Live sync status dot + conflict count badge.
 * Polls /sync/status every 30s and updates the nav indicator.
 */

const SyncIndicator = (() => {
  let pollTimer = null;
  let containerId = null;

  async function init(targetContainerId) {
    containerId = targetContainerId;
    await refresh();
    // Poll every 30s
    clearInterval(pollTimer);
    pollTimer = setInterval(refresh, 30_000);
  }

  async function refresh() {
    const container = document.getElementById(containerId);
    if (!container) { clearInterval(pollTimer); return; }

    try {
      const status = await TrackerApi.sync.status();
      render(container, status);
    } catch (_) {
      render(container, null);
    }
  }

  function render(container, status) {
    const pending   = status?.pending_push ?? 0;
    const conflicts = status?.conflicts    ?? 0;

    let dotClass = 'clean';
    let label    = 'synced';

    if (conflicts > 0) {
      dotClass = 'conflict';
      label    = `${conflicts} conflict${conflicts !== 1 ? 's' : ''}`;
    } else if (pending > 0) {
      dotClass = 'pending';
      label    = `${pending} pending`;
    }

    container.innerHTML = `
      <div class="sync-indicator">
        <span class="sync-dot ${dotClass}"></span>
        <span>${label}</span>
        ${conflicts > 0 ? `<span class="sync-badge">${conflicts}</span>` : ''}
      </div>`;
  }

  function destroy() {
    clearInterval(pollTimer);
  }

  return { init, refresh, destroy };
})();
