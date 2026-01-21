// Breadcrumb Component
import { navigate } from '../utils/router.js';

export function Breadcrumb(items) {
  const nav = document.createElement('nav');
  nav.className = 'breadcrumb';
  nav.setAttribute('aria-label', 'Breadcrumb');

  const ol = document.createElement('ol');
  ol.className = 'breadcrumb-list';

  items.forEach((item, index) => {
    const li = document.createElement('li');
    li.className = 'breadcrumb-item';

    if (index < items.length - 1) {
      // Clickable breadcrumb
      const link = document.createElement('a');
      link.href = item.path;
      link.textContent = item.label;
      link.className = 'breadcrumb-link';

      link.addEventListener('click', (e) => {
        e.preventDefault();
        navigate(item.path);
      });

      li.appendChild(link);

      // Add separator
      const separator = document.createElement('span');
      separator.className = 'breadcrumb-separator';
      separator.textContent = '/';
      separator.setAttribute('aria-hidden', 'true');
      li.appendChild(separator);
    } else {
      // Current page (not clickable)
      const span = document.createElement('span');
      span.className = 'breadcrumb-current';
      span.textContent = item.label;
      span.setAttribute('aria-current', 'page');
      li.appendChild(span);
    }

    ol.appendChild(li);
  });

  nav.appendChild(ol);
  return nav;
}
