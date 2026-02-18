import { navigateTo } from '../utils/router.js';
import { formatCurrency } from '../utils/finance-config.js';

export class ItemsBrowsePage {
  constructor(containerId, costs) {
    this.container = document.getElementById(containerId);
    this.costs = costs;
    this.searchQuery = '';
    this.render();
  }

  updateData(costs) {
    this.costs = costs;
    this.render();
  }

  deriveItems() {
    const map = new Map();

    this.costs.forEach(cost => {
      if (!cost.related_item_id) return;

      const id = cost.related_item_id;
      if (!map.has(id)) {
        map.set(id, {
          item_id: id,
          item_name: cost.item_name || id,
          total_cost: 0,
          record_count: 0
        });
      }

      const entry = map.get(id);
      entry.total_cost += cost.total_cost || 0;
      entry.record_count += 1;
    });

    return Array.from(map.values()).sort((a, b) => b.total_cost - a.total_cost);
  }

  render() {
    const allItems = this.deriveItems();
    const query = this.searchQuery.toLowerCase();
    const items = query
      ? allItems.filter(i =>
          i.item_name.toLowerCase().includes(query) ||
          i.item_id.toLowerCase().includes(query)
        )
      : allItems;

    this.container.innerHTML = `
      <div class="items-browse-header">
        <div class="items-browse-meta">
          <span class="items-browse-count">${allItems.length} item${allItems.length !== 1 ? 's' : ''} with costs</span>
        </div>
        <input
          type="text"
          class="filter-input items-search-input"
          placeholder="Search by item name or ID…"
          value="${this.searchQuery}"
        >
      </div>
      ${items.length === 0
        ? `<div class="items-browse-empty">
             <p>No items match your search.</p>
           </div>`
        : `<div class="items-grid">
             ${items.map(item => `
               <div class="item-card" data-item-id="${item.item_id}">
                 <div class="item-card-name">${item.item_name}</div>
                 <div class="item-card-id">${item.item_id}</div>
                 <div class="item-card-stats">
                   <span class="item-card-cost">${formatCurrency(item.total_cost)}</span>
                   <span class="item-card-records">${item.record_count} record${item.record_count !== 1 ? 's' : ''}</span>
                 </div>
               </div>
             `).join('')}
           </div>`
      }
    `;

    this.attachListeners();
  }

  attachListeners() {
    const searchInput = this.container.querySelector('.items-search-input');
    if (searchInput) {
      searchInput.addEventListener('input', (e) => {
        this.searchQuery = e.target.value;
        this.render();
      });
    }

    this.container.querySelectorAll('.item-card').forEach(card => {
      card.addEventListener('click', () => {
        navigateTo(`/${card.dataset.itemId}`);
      });
    });
  }
}
