// Items Placeholder Page

import { navigate } from '../utils/router.js';
import { Breadcrumb } from '../components/Breadcrumb.js';

export function renderItemsPage() {
  const app = document.getElementById('app');

  app.innerHTML = `
    <div class="page-header">
      <h1>Items</h1>
    </div>
    <div class="empty-state">
      <p>Items page coming soon.</p>
      <button class="btn btn-secondary" id="back-btn">Back to Home</button>
    </div>
  `;

  app.prepend(Breadcrumb([
    { label: 'Images', path: '/images' },
    { label: 'Items' }
  ]));

  document.getElementById('back-btn').addEventListener('click', () => {
    navigate('/images');
  });
}
