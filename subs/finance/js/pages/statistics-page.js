// Statistics Page (routed wrapper)

import { StatsPanel } from '../components/StatsPanel.js';
import { toast } from '../shared/toast.js';
import { navigateTo } from '../utils/router.js';

export async function renderStatisticsPage(container) {
  container.innerHTML = `
    <button class="back-btn">&#8592; Back to Finance</button>
    <div id="stats-container"></div>
  `;
  container.querySelector('.back-btn').addEventListener('click', () => navigateTo('/'));

  try {
    const panel = new StatsPanel('stats-container');
    await panel.loadStats();
  } catch (error) {
    console.error('Failed to load statistics:', error);
    toast.error('Failed to load statistics');
    container.innerHTML = '<p style="padding:20px;color:#64748b;">Failed to load statistics.</p>';
  }
}
