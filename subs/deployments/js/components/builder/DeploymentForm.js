// Deployment Form Component
// Renders the deployment creation form

import { DEPLOYMENT_CONFIG } from '../../utils/deployment-config.js';

export class DeploymentForm {
  constructor() {
    this.submitCallback = null;
  }

  render() {
    const container = document.createElement('div');
    container.className = 'deployment-form';

    const currentYear = new Date().getFullYear();

    container.innerHTML = `
      <form id="deploymentForm" class="form">
        <div class="form-section">
          <h2>Basic Information</h2>
          
          <div class="form-row">
            <div class="form-group">
              <label for="season" class="form-label">
                Season <span class="required">*</span>
              </label>
              <select id="season" name="season" class="form-control" required>
                <option value="">Select a season</option>
                ${DEPLOYMENT_CONFIG.SEASONS.map(season => `
                  <option value="${season.value}">${season.label}</option>
                `).join('')}
              </select>
            </div>

            <div class="form-group">
              <label for="year" class="form-label">
                Year <span class="required">*</span>
              </label>
              <input 
                type="number" 
                id="year" 
                name="year" 
                class="form-control"
                min="${DEPLOYMENT_CONFIG.MIN_YEAR}"
                max="${DEPLOYMENT_CONFIG.MAX_YEAR}"
                value="${currentYear}"
                required
              />
              <span class="form-help">
                Valid range: ${DEPLOYMENT_CONFIG.MIN_YEAR} - ${DEPLOYMENT_CONFIG.MAX_YEAR}
              </span>
            </div>
          </div>

          <div class="form-group">
            <label for="notes" class="form-label">
              Notes <span class="optional">(Optional)</span>
            </label>
            <textarea 
              id="notes" 
              name="notes" 
              class="form-control"
              rows="3"
              placeholder="Add any notes about this deployment..."
            ></textarea>
          </div>
        </div>

        <div class="form-section">
          <h2>Zones</h2>
          <p class="section-description">
            Three predefined zones will be created for this deployment.
          </p>

          <div class="zones-preview">
            ${DEPLOYMENT_CONFIG.ZONES.map(zone => `
              <div class="zone-preview-card">
                <div class="zone-icon">📍</div>
                <div class="zone-info">
                  <h3>${zone.zone_name}</h3>
                  <p class="zone-code">${zone.zone_code}</p>
                  <p class="zone-receptacle">${zone.receptacle_id}</p>
                </div>
              </div>
            `).join('')}
          </div>
        </div>

        <div class="form-actions">
          <button type="submit" class="btn btn-primary btn-submit">
            Create Deployment
          </button>
        </div>
      </form>
    `;

    // Attach form submit handler
    const form = container.querySelector('#deploymentForm');
    form.addEventListener('submit', (e) => {
      e.preventDefault();
      this.handleSubmit(e);
    });

    // Add input validation feedback
    this.attachInputValidation(container);

    return container;
  }

  attachInputValidation(container) {
    const inputs = container.querySelectorAll('.form-control');
    
    inputs.forEach(input => {
      input.addEventListener('blur', () => {
        this.validateInput(input);
      });

      input.addEventListener('input', () => {
        // Clear error on input
        input.classList.remove('error');
        const errorEl = input.parentElement.querySelector('.field-error');
        if (errorEl) errorEl.remove();
      });
    });
  }

  validateInput(input) {
    const value = input.value.trim();
    
    if (input.hasAttribute('required') && !value) {
      this.showInputError(input, 'This field is required');
      return false;
    }

    if (input.name === 'year') {
      const year = parseInt(value);
      if (isNaN(year) || year < DEPLOYMENT_CONFIG.MIN_YEAR || year > DEPLOYMENT_CONFIG.MAX_YEAR) {
        this.showInputError(
          input, 
          `Year must be between ${DEPLOYMENT_CONFIG.MIN_YEAR} and ${DEPLOYMENT_CONFIG.MAX_YEAR}`
        );
        return false;
      }
    }

    return true;
  }

  showInputError(input, message) {
    input.classList.add('error');
    
    // Remove existing error
    const existingError = input.parentElement.querySelector('.field-error');
    if (existingError) existingError.remove();

    // Add new error
    const errorEl = document.createElement('div');
    errorEl.className = 'field-error';
    errorEl.textContent = message;
    input.parentElement.appendChild(errorEl);
  }

  handleSubmit(e) {
    const form = e.target;
    const formData = new FormData(form);
    
    const data = {
      season: formData.get('season'),
      year: formData.get('year'),
      notes: formData.get('notes')
    };

    // Trigger callback if set
    if (this.submitCallback) {
      this.submitCallback(data);
    }
  }

  onSubmit(callback) {
    this.submitCallback = callback;
  }
}
