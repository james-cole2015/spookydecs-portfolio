// Finance Landing Page

import { navigateTo } from '../utils/router.js';

export function renderFinanceLanding(container) {
  container.innerHTML = `
    <div class="landing-page">
      <div class="page-header">
        <h1>Finance</h1>
        <p>Track cost records, browse receipts, analyze spending, and manage items.</p>
      </div>
      <div class="option-cards">
        ${renderCard({
          id: 'extract',
          icon: '✨',
          title: 'AI Assisted Cost Record Creation',
          description: 'Upload a receipt photo and let AI pull vendor, date, amount, and category automatically.',
          route: '/new?extract=true'
        })}
        ${renderCard({
          id: 'records',
          icon: '📋',
          title: 'Cost Records',
          description: 'View, filter, and manage all cost records. Add new expenses and track spending across categories.',
          route: '/records'
        })}
        ${renderCard({
          id: 'receipts',
          icon: '🧾',
          title: 'Receipts',
          description: 'Browse receipt images attached to cost records. View and download receipts by vendor or date.',
          route: '/receipts'
        })}
        ${renderCard({
          id: 'statistics',
          icon: '📊',
          title: 'Statistics',
          description: 'Analyze spending patterns, category breakdowns, and cost trends over time.',
          route: '/statistics'
        })}
        ${renderCard({
          id: 'items',
          icon: '🏷️',
          title: 'Items',
          description: 'Browse all items with associated cost history and spending summaries.',
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
