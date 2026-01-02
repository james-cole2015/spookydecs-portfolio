// Item Costs Page Orchestrator

import { getItemCosts } from '../utils/finance-api.js';
import { ItemCostView } from '../components/ItemCostView.js';
import { showToast } from '../shared/toast.js';

export async function renderItemCosts(container, itemId) {
  console.log('📄 renderItemCosts called with itemId:', itemId);
  
  try {
    // Fetch item costs data
    console.log('🔄 Fetching item costs...');
    const data = await getItemCosts(itemId);
    
    console.log('✅ Item costs data:', data);
    
    // Create and render the view
    const view = new ItemCostView(data);
    await view.render(container);
    
  } catch (error) {
    console.error('❌ Error loading item costs:', error);
    showToast('Failed to load item costs: ' + error.message, 'error');
    
    // Show error in container
    container.innerHTML = `
      <div class="error-container">
        <div class="error-content">
          <h1>Error Loading Item Costs</h1>
          <p>${error.message}</p>
          <button onclick="window.location.href='/'"class="btn-secondary">Back to Finance</button>
        </div>
      </div>
    `;
  }
}
