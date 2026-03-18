// Breadcrumb navigation utility

import { navigate } from '../utils/router.js';

/**
 * Render a breadcrumb trail into a container element.
 * items: [{ label, route? }, ...] — last item is current page (no route).
 */
export function renderBreadcrumb(container, items) {
  if (!container) return;

  const parts = items.map((item, i) => {
    const isLast = i === items.length - 1;
    if (isLast || !item.route) {
      return `<span class="bc-item bc-current">${item.label}</span>`;
    }
    return `<a class="bc-item bc-link" data-route="${item.route}">${item.label}</a>`;
  });

  container.innerHTML = `
    <nav class="breadcrumb" aria-label="breadcrumb">
      ${parts.join('<span class="bc-sep">›</span>')}
    </nav>
  `;

  container.querySelectorAll('[data-route]').forEach(link => {
    link.addEventListener('click', e => {
      e.preventDefault();
      navigate(link.dataset.route);
    });
  });
}
