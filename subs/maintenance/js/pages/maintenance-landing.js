// Maintenance Landing Page

import { navigateTo } from '../router.js';

export function renderMaintenanceLanding(container) {
  container.innerHTML = `
    <div class="landing-page">
      <div class="page-header">
        <h1>Maintenance</h1>
        <p>Track maintenance records, manage schedules, and browse items.</p>
      </div>
      <div class="option-cards">
        ${renderCard({
          id: 'records',
          icon: '🔧',
          title: 'Maintenance Records',
          description: 'View, filter, and manage all maintenance records. Track repairs, inspections, and routine maintenance across items.',
          route: '/records'
        })}
        ${renderCard({
          id: 'schedules',
          icon: '📅',
          title: 'Schedules',
          description: 'Browse and manage maintenance schedules. Create reusable templates and apply them to items.',
          route: '/schedules'
        })}
        ${renderCard({
          id: 'items',
          icon: '🏷️',
          title: 'Items',
          description: 'Browse all items with associated maintenance history and record summaries.',
          route: '/items'
        })}
      </div>
    </div>
  `;

  document.querySelectorAll('.option-card.active').forEach(card => {
    card.addEventListener('click', () => navigateTo(card.dataset.route));
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
