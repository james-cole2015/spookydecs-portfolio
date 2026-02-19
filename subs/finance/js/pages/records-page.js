// Cost Records Page

import { CostRecordsTable } from '../components/CostRecordsTable.js';
import { CostDetailDrawer } from '../components/CostDetailDrawer.js';
import { getAllCosts } from '../utils/finance-api.js';
import { navigateTo } from '../utils/router.js';
import { toast } from '../shared/toast.js';

export async function renderRecordsPage(container) {
  container.innerHTML = `
    <button class="back-btn">&#8592; Back to Finance</button>
    <div id="table-container"></div>
  `;
  container.querySelector('.back-btn').addEventListener('click', () => navigateTo('/'));

  new CostDetailDrawer();

  try {
    const response = await getAllCosts();
    const costs = response.costs || response || [];
    new CostRecordsTable('table-container', costs, (costId) => navigateTo(`/costs/${costId}`));
  } catch (error) {
    console.error('Failed to load cost records:', error);
    toast.error('Failed to load cost records');
    container.innerHTML = '<p style="padding:20px;color:#64748b;">Failed to load cost records.</p>';
  }
}
