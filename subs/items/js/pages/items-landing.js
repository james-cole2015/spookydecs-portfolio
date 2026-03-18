// Items Landing Page

import { navigate } from '../utils/router.js';

export function renderItemsLanding() {
  const container = document.getElementById('app-container');

  container.innerHTML = `
    <div class="landing-page">
      <div class="page-header">
        <h1>Decorations and Accessories</h1>
        <p>Manage decorations, lights, and accessories across all seasons.</p>
      </div>
      <div class="option-cards">
        ${renderCard({
          id: 'decorations',
          icon: '🎃',
          title: 'Decorations',
          description: 'Inflatables, Animatronics, and Static Props.',
          route: '/items?class=Decoration'
        })}
        ${renderCard({
          id: 'lights',
          icon: '💡',
          title: 'Lights',
          description: 'String Lights, Spot Lights, and Projections.',
          route: '/items?class=Light'
        })}
        ${renderCard({
          id: 'accessories',
          icon: '🔌',
          title: 'Accessories',
          description: 'Cords, Plugs, and Receptacles.',
          route: '/items?class=Accessory'
        })}
        ${renderCard({
          id: 'create',
          icon: '🆕',
          title: 'Create Item',
          description: 'Add a new item to the inventory.',
          route: '/create'
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
