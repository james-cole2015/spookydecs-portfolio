// Create Season View

import { createSeason } from './api.js';
import { validateSeasonData } from './utils.js';
import { navigateTo } from './router.js';
import { toast } from './toast.js';
import { spinner } from './spinner.js';

export async function renderCreateSeason() {
  const container = document.getElementById('app-container');

  // Generate default season name based on current year
  const currentYear = new Date().getFullYear();
  const nextYear = currentYear + 1;
  const defaultSeasonName = `off-season_${nextYear}`;

  container.innerHTML = `
    <div class="create-season-view">
      <div class="create-season-header">
        <button id="back-btn" class="back-btn">← Back to Workbench</button>
        <h1>Create New Season</h1>
      </div>

      <div class="create-season-form">
        <div class="form-section">
          <h2>Season Information</h2>
          
          <div class="form-field">
            <label for="season-name">Season Name *</label>
            <input 
              type="text" 
              id="season-name" 
              class="form-input" 
              value="${defaultSeasonName}"
              placeholder="e.g., off-season_2026"
              required
            >
            <small>Use format: off-season_YYYY</small>
          </div>

          <div class="form-row">
            <div class="form-field">
              <label for="start-date">Start Date *</label>
              <input 
                type="date" 
                id="start-date" 
                class="form-input"
                value="${nextYear}-04-01"
                required
              >
            </div>

            <div class="form-field">
              <label for="end-date">End Date *</label>
              <input 
                type="date" 
                id="end-date" 
                class="form-input"
                value="${nextYear}-09-30"
                required
              >
            </div>
          </div>

          <div class="form-field">
            <label for="season-status">Initial Status</label>
            <select id="season-status" class="form-input">
              <option value="draft">Draft</option>
              <option value="active" selected>Active</option>
              <option value="closed">Closed</option>
            </select>
          </div>
        </div>

        <div class="form-actions">
          <button id="cancel-btn" class="btn-secondary">Cancel</button>
          <button id="create-btn" class="btn-primary">Create Season</button>
        </div>
      </div>

      <div class="create-season-info">
        <h3>What happens next?</h3>
        <ul>
          <li>Season will be created in the workbench</li>
          <li>You can import maintenance and idea items</li>
          <li>Track all off-season work in one place</li>
          <li>Season runs from April through September by default</li>
        </ul>
      </div>
    </div>
  `;

  attachEventListeners();
}

function attachEventListeners() {
  document.getElementById('back-btn')?.addEventListener('click', () => {
    navigateTo('/');
  });

  document.getElementById('cancel-btn')?.addEventListener('click', () => {
    navigateTo('/');
  });

  document.getElementById('create-btn')?.addEventListener('click', handleCreateSeason);

  // Auto-update season name when dates change
  document.getElementById('start-date')?.addEventListener('change', updateSeasonNameFromDates);
  document.getElementById('end-date')?.addEventListener('change', updateSeasonNameFromDates);
}

function updateSeasonNameFromDates() {
  const startDate = document.getElementById('start-date').value;
  if (!startDate) return;

  const year = new Date(startDate).getFullYear();
  const seasonNameInput = document.getElementById('season-name');
  
  // Only auto-update if it follows the pattern
  if (seasonNameInput.value.startsWith('off-season_')) {
    seasonNameInput.value = `off-season_${year}`;
  }
}

async function handleCreateSeason() {
  const seasonData = {
    season_name: document.getElementById('season-name').value.trim(),
    start_date: document.getElementById('start-date').value,
    end_date: document.getElementById('end-date').value,
    status: document.getElementById('season-status').value,
    total_items: 0,
    completed_items: 0,
    total_estimated_cost: 0,
    total_actual_cost: 0,
    ai_generated: false
  };

  // Validate
  const errors = validateSeasonData(seasonData);
  if (errors.length > 0) {
    toast.error(errors[0]);
    return;
  }

  try {
    spinner.show('Creating season...');
    const result = await createSeason(seasonData);
    
    toast.success('Season created successfully');
    
    // Navigate to the new season
    navigateTo(`/season/${result.season_id}`);
  } catch (error) {
    spinner.hide();
    console.error('Error creating season:', error);
    toast.error(error.message || 'Failed to create season');
  }
}
