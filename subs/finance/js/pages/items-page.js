// Items Browse Page (routed wrapper)

import { ItemsBrowsePage } from '../components/ItemsBrowsePage.js';
import { getAllCosts, getItems } from '../utils/finance-api.js';
import { toast } from '../shared/toast.js';
import { navigateTo } from '../utils/router.js';

export async function renderItemsPage(container) {
  container.innerHTML = `
    <button class="back-btn">&#8592; Back to Finance</button>
    <div id="items-container"></div>
  `;
  container.querySelector('.back-btn').addEventListener('click', () => navigateTo('/'));

  try {
    const [costsResponse, itemsResponse] = await Promise.all([getAllCosts(), getItems({})]);
    const costs = costsResponse.costs || costsResponse || [];
    const allItems = Array.isArray(itemsResponse) ? itemsResponse : (itemsResponse.items || []);
    const nonRetiredIds = new Set(
      allItems.filter(item => item.status !== 'Retired').map(item => item.id)
    );
    const filteredCosts = costs.filter(
      cost => !cost.related_item_id || nonRetiredIds.has(cost.related_item_id)
    );
    new ItemsBrowsePage('items-container', filteredCosts);
  } catch (error) {
    console.error('Failed to load items:', error);
    toast.error('Failed to load items');
    container.innerHTML = '<p style="padding:20px;color:#64748b;">Failed to load items.</p>';
  }
}
