// Items Browse Page (routed wrapper)

import { ItemsBrowsePage } from '../components/ItemsBrowsePage.js';
import { getAllCosts } from '../utils/finance-api.js';
import { toast } from '../shared/toast.js';
import { navigateTo } from '../utils/router.js';

export async function renderItemsPage(container) {
  container.innerHTML = `
    <button class="back-btn">&#8592; Back to Finance</button>
    <div id="items-container"></div>
  `;
  container.querySelector('.back-btn').addEventListener('click', () => navigateTo('/'));

  try {
    const response = await getAllCosts();
    const costs = response.costs || response || [];
    new ItemsBrowsePage('items-container', costs);
  } catch (error) {
    console.error('Failed to load items:', error);
    toast.error('Failed to load items');
    container.innerHTML = '<p style="padding:20px;color:#64748b;">Failed to load items.</p>';
  }
}
