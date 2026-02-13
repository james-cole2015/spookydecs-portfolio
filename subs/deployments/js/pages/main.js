// Main Landing Page
// Displays 4 option cards: Builder, Historical, Graphs, Stats

import { navigate } from '../utils/router.js';

export function renderMainPage() {
  const app = document.getElementById('app');
  
  const html = `
    <div class="landing-page">
      <div class="page-header">
        <h1>Deployment Management</h1>
        <p>Manage your seasonal deployments, track historical data, and analyze performance metrics.</p>
      </div>

      <div class="option-cards">
        ${renderCard({
          id: 'builder',
          icon: '🏗️',
          title: 'Deployment Builder',
          description: 'Create and manage seasonal deployments by selecting items and organizing them into zones. Track deployment sessions and manage item placement throughout your display.',
          active: true,
          route: '/deployments/builder'
        })}

        ${renderCard({
          id: 'historical',
          icon: '📋',
          title: 'Historical Deployments',
          description: 'Browse past deployments and review how your displays have evolved over time. Filter by season and year to find specific deployment records.',
          active: true,
          route: '/deployments/historical'
        })}

        ${renderCard({
          id: 'graphs',
          icon: '📊',
          title: 'Deployment Graphs',
          description: 'Visualize deployment trends and patterns with interactive charts. Analyze item usage, deployment timelines, and seasonal comparisons.',
          active: false,
          route: '/deployments/graphs'
        })}

        ${renderCard({
          id: 'stats',
          icon: '📈',
          title: 'Deployment Stats',
          description: 'View comprehensive statistics about your deployments including average times, item counts, and performance metrics across all seasons.',
          active: false,
          route: '/deployments/stats'
        })}
      </div>
    </div>
  `;

  app.innerHTML = html;

  // Attach event listeners for active cards
  attachCardListeners();
}

function renderCard({ id, icon, title, description, active, route }) {
  return `
    <div class="option-card ${active ? 'active' : ''}" data-route="${route}" data-card-id="${id}">
      <span class="card-status">${active ? 'Available' : 'Coming Soon'}</span>
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

function attachCardListeners() {
  const cards = document.querySelectorAll('.option-card.active');
  
  cards.forEach(card => {
    card.addEventListener('click', () => {
      const route = card.getAttribute('data-route');
      if (route) {
        navigate(route);
      }
    });
  });
}
