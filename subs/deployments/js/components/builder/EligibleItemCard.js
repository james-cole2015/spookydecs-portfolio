// EligibleItemCard.js
// Single card component for a source item (Accessory / Receptacle) in the connection builder

const CLASS_ICONS = {
  'Accessory': `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
    <path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83"/>
  </svg>`,
  'Decoration': `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
    <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/>
  </svg>`,
  'Light': `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
    <circle cx="12" cy="12" r="5"/><line x1="12" y1="1" x2="12" y2="3"/><line x1="12" y1="21" x2="12" y2="23"/>
    <line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/>
    <line x1="1" y1="12" x2="3" y2="12"/><line x1="21" y1="12" x2="23" y2="12"/>
    <line x1="4.22" y1="19.78" x2="5.64" y2="18.36"/><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"/>
  </svg>`,
};

/**
 * Renders a single source item card.
 *
 * @param {Object} item
 * @param {string} item.item_id
 * @param {string} item.short_name
 * @param {string} item.class           - 'Accessory' | 'Decoration' | 'Light'
 * @param {string} item.class_type      - e.g. 'Cord', 'Plug', 'Receptacle'
 * @param {number} [item.available_count]
 * @param {number} [item.total_ports]
 * @param {string} [item.other_zone]    - zone code if deployed elsewhere, e.g. 'BY'
 * @param {Function} onConnect          - called with item when card is clicked
 * @returns {HTMLElement}
 */
export function createEligibleItemCard(item, onConnect) {
  const isDisabled = !!item.other_zone;
  const showPortBadge = (item.class_type === 'Cord' || item.class_type === 'Plug' || item.class_type === 'Receptacle')
    && typeof item.available_count === 'number';

  const icon = CLASS_ICONS[item.class] || CLASS_ICONS['Accessory'];

  const card = document.createElement('div');
  card.className = `eligible-card${isDisabled ? ' eligible-card--disabled' : ''}`;
  card.dataset.itemId = item.item_id;

  card.innerHTML = `
    <div class="eligible-card__icon">${icon}</div>
    <div class="eligible-card__body">
      <span class="eligible-card__name">${item.short_name}</span>
      <span class="eligible-card__id">${item.item_id}</span>
    </div>
    ${showPortBadge ? `
      <div class="eligible-card__port-badge">
        ${item.available_count} port${item.available_count !== 1 ? 's' : ''}
      </div>
    ` : ''}
    ${isDisabled ? `
      <div class="eligible-card__zone-badge">${item.other_zone}</div>
    ` : ''}
  `;

  if (!isDisabled) {
    card.addEventListener('click', () => onConnect(item));
  }

  return card;
}
