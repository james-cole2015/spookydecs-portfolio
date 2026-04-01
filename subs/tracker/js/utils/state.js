/**
 * state.js
 * URL state management — read/write filter state to query params
 * so filters survive page refresh and are shareable via URL.
 */

const State = (() => {
  function get(key, fallback = null) {
    const params = new URLSearchParams(window.location.search);
    return params.has(key) ? params.get(key) : fallback;
  }

  function set(updates = {}) {
    const params = new URLSearchParams(window.location.search);
    Object.entries(updates).forEach(([k, v]) => {
      if (v == null || v === '' || v === 'all') {
        params.delete(k);
      } else {
        params.set(k, v);
      }
    });
    const qs = params.toString();
    const newUrl = `${window.location.pathname}${qs ? `?${qs}` : ''}`;
    window.history.replaceState(null, '', newUrl);
  }

  function clear() {
    window.history.replaceState(null, '', window.location.pathname);
  }

  return { get, set, clear };
})();
