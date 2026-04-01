/**
 * theme.js
 * Light / dark mode manager.
 * Reads preference from localStorage, sets data-theme on <html>,
 * and injects a fixed toggle button into the page.
 */
const ThemeManager = (() => {
  const KEY = 'tracker-theme';

  function init() {
    const saved = localStorage.getItem(KEY) || 'dark';
    document.documentElement.setAttribute('data-theme', saved);

    const btn = document.createElement('button');
    btn.id = 'theme-toggle';
    btn.className = 'theme-toggle';
    btn.title = 'Toggle light / dark mode';
    btn.textContent = saved === 'dark' ? '☀' : '☾';
    btn.addEventListener('click', toggle);
    document.body.appendChild(btn);
  }

  function toggle() {
    const current = document.documentElement.getAttribute('data-theme') || 'dark';
    const next = current === 'dark' ? 'light' : 'dark';
    document.documentElement.setAttribute('data-theme', next);
    localStorage.setItem(KEY, next);
    const btn = document.getElementById('theme-toggle');
    if (btn) btn.textContent = next === 'dark' ? '☀' : '☾';
  }

  return { init };
})();
