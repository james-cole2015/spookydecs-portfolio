/**
 * app.js
 * Main entry point.
 *
 * Loads shared SpookyDecs infrastructure (config + auth + header),
 * then boots the Navigo router. No hardcoded config values here —
 * everything is read from window.SpookyConfig at runtime.
 *
 * TRACKER_API_ENDPOINT and GH_CLIENT_ID must be present in the
 * /admin/config response payload for this subdomain to function.
 */

document.addEventListener('DOMContentLoaded', () => {
  ThemeManager.init();
  Router.init();
});

