// Images Landing Page
// Displays 4 option cards: Images, Gallery Manager, Photo Browser, Items

import { navigate } from '../utils/router.js';

export function renderLandingPage() {
  const app = document.getElementById('app');

  const html = `
    <div class="landing-page">
      <div class="page-header">
        <h1>Image & Media Management</h1>
        <p>Browse your photo library, manage galleries, explore photos, and view your decoration items.</p>
      </div>

      <div class="option-cards">
        ${renderCard({
          id: 'images',
          icon: '🖼️',
          title: 'Images',
          description: 'Browse and manage your photo library. Filter by season, type, and more. View metadata, references, and manage individual image records.',
          active: true,
          route: '/images/list'
        })}

        ${renderCard({
          id: 'gallery',
          icon: '🎨',
          title: 'Gallery Manager',
          description: 'Organize your photos into galleries. Arrange, reorder, and curate image collections for display.',
          active: true,
          route: '/images/gallery'
        })}

        ${renderCard({
          id: 'browser',
          icon: '📷',
          title: 'Photo Browser',
          description: 'Explore your photo collection visually. Browse and search photos in an immersive layout.',
          active: true,
          route: '/images/browse'
        })}

        ${renderCard({
          id: 'items',
          icon: '📦',
          title: 'Entities',
          description: 'Browse photos organized by item or storage entity. View all photos for a given decoration or storage unit.',
          active: true,
          route: '/images/entities'
        })}
      </div>
    </div>
  `;

  app.innerHTML = html;

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
