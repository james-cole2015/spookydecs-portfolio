// Cost Detail Page Orchestrator

import { getCostById } from '../utils/finance-api.js';
import { CostDetailView } from '../components/CostDetailView.js';

export async function renderCostDetail(container, costId) {
  console.log('📄 renderCostDetail called:', { costId });
  
  try {
    // Fetch cost record data
    console.log('🔄 Fetching cost record...');
    const costData = await getCostById(costId);
    
    if (!costData) {
      throw new Error('Cost record not found');
    }
    
    console.log('✅ Cost record data:', costData);
    
    // Create and render the view
    const view = new CostDetailView(costData);
    await view.render(container);
    
  } catch (error) {
    console.error('❌ Error loading cost record:', error);
    
    // Show error in container
    container.innerHTML = `
      <div class="error-container">
        <div class="error-content">
          <h1>Error Loading Cost Record</h1>
          <p>${error.message}</p>
          <button onclick="window.location.href='/'" class="btn-secondary">Back to Finance</button>
        </div>
      </div>
    `;
  }
}