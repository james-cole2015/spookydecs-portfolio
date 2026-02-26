// Storage Landing Page

import { navigate } from '../utils/router.js';

export function renderStorageLanding() {
  const app = document.getElementById('app');

  app.innerHTML = `
    <div class="landing-page">
      <div class="page-header">
        <h1>Storage</h1>
        <p>Manage storage units, pack items, and track inventory across all seasons.</p>
      </div>
      <div class="option-cards">
        ${renderCard({
          id: 'totes',
          icon: '📦',
          title: 'Totes',
          description: 'Browse and manage all storage units. Filter by season, location, and packing status.',
          route: '/storage'
        })}
        ${renderCard({
          id: 'create',
          icon: '➕',
          title: 'Create Storage',
          description: 'Add a new storage unit to the inventory with photos and location details.',
          route: '/new'
        })}
        ${renderCard({
          id: 'statistics',
          icon: '📊',
          title: 'Statistics',
          description: 'Overview of storage units and items by season. Track unpacked inventory at a glance.',
          route: '/statistics'
        })}
        ${renderCard({
          id: 'pack',
          icon: '🧳',
          title: 'Packing Wizard',
          description: 'Step through the packing workflow to assign items to storage units efficiently.',
          route: '/storage/pack'
        })}
      </div>
    </div>
  `;

  document.querySelectorAll('.option-card.active').forEach(card => {
    card.addEventListener('click', () => navigate(card.dataset.route));
  });
}

function renderCard({ id, icon, title, description, route }) {
  return `
    <div class="option-card active" data-route="${route}" data-card-id="${id}">
      <div class="card-icon">${icon}</div>
      <div class="card-header">
        <h3>${title}</h3>
      </div>
      <div class="card-body">
        <p>${description}</p>
      </div>
    </div>
  `;
}
