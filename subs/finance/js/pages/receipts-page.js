// Receipts Page (routed wrapper)

import { ReceiptsPage } from './receipts.js';
import { navigateTo } from '../utils/router.js';

export function renderReceiptsPage(container) {
  // ReceiptsPage targets #receipts-tab by ID internally
  container.innerHTML = `
    <button class="back-btn">&#8592; Back to Finance</button>
    <div id="receipts-tab"></div>
  `;
  container.querySelector('.back-btn').addEventListener('click', () => navigateTo('/'));
  new ReceiptsPage();
}
