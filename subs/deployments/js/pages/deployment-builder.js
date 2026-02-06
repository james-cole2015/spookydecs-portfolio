// Deployment Builder Page
// Handles deployment creation form
// test for push

import { navigate } from '../utils/router.js';
import { createDeployment, checkDeploymentExists, listDeployments } from '../utils/deployment-api.js';
import { 
  DEPLOYMENT_CONFIG, 
  validateDeploymentForm, 
  generateDeploymentId 
} from '../utils/deployment-config.js';
import { DeploymentForm } from '../components/builder/DeploymentForm.js';

export async function renderBuilder() {
  const app = document.getElementById('app');
  
  // Show loading state
  app.innerHTML = `
    <div class="builder-page">
      <div class="loading-container">
        <div class="spinner"></div>
        <p>Checking for active deployments...</p>
      </div>
    </div>
  `;

  try {
    // Check for active deployments (status != 'archived')
    const response = await listDeployments();
    
    console.log('Deployments API response:', response); // DEBUG
    
    if (response.success && response.data) {
      const activeDeployments = response.data.filter(d => d.status !== 'archived');
      
      console.log('Active deployments found:', activeDeployments); // DEBUG
      
      if (activeDeployments.length > 0) {
        // Active deployment exists - redirect to zones dashboard
        const deployment = activeDeployments[0];
        navigate(`/deployments/${deployment.deployment_id}/zones`);
        return;
      }
    }

    // No active deployment - show create form
    renderCreateForm();

  } catch (error) {
    console.error('Error checking deployments:', error);
    // If error checking, still show form
    renderCreateForm();
  }
}

function renderCreateForm() {
  const app = document.getElementById('app');
  
  app.innerHTML = `
    <div class="builder-page">
      <div class="builder-header">
        <button class="btn-back" id="backBtn">
          ← Back to Deployments
        </button>
        <h1>Create New Deployment</h1>
        <p>Set up a new seasonal deployment to start tracking items and zones.</p>
      </div>

      <div class="builder-container">
        <div id="deploymentForm"></div>
      </div>
    </div>
  `;

  // Attach back button
  document.getElementById('backBtn').addEventListener('click', () => {
    navigate('/deployments');
  });

  // Render form
  const formContainer = document.getElementById('deploymentForm');
  const form = new DeploymentForm();
  formContainer.appendChild(form.render());

  // Handle form submission
  form.onSubmit(async (formData) => {
    await handleFormSubmit(formData);
  });
}

async function handleFormSubmit(formData) {
  try {
    // Show loading state
    showLoading();

    // Validate form
    const validation = validateDeploymentForm(formData);
    if (!validation.valid) {
      hideLoading();
      showErrors(validation.errors);
      return;
    }

    // Check if ANY active deployment exists (not just same season/year)
    const allDeployments = await listDeployments();
    if (allDeployments.success && allDeployments.data) {
      const activeDeployments = allDeployments.data.filter(d => d.status !== 'archived');
      
      if (activeDeployments.length > 0) {
        hideLoading();
        const activeDeployment = activeDeployments[0];
        showError(
          `You have an active ${activeDeployment.season} ${activeDeployment.year} deployment. ` +
          `Please archive it before creating a new one.`
        );
        return;
      }
    }

    // Check if deployment already exists for this season/year
    const exists = await checkDeploymentExists(formData.season, formData.year);
    if (exists) {
      hideLoading();
      const deploymentId = generateDeploymentId(formData.season, formData.year);
      showError(`A deployment already exists for ${formData.season} ${formData.year} (${deploymentId})`);
      return;
    }

    // Create deployment payload
    const payload = {
      season: formData.season,
      year: parseInt(formData.year),
      zones: DEPLOYMENT_CONFIG.ZONES,
      notes: formData.notes || ''
    };

    // Create deployment
    const response = await createDeployment(payload);

    hideLoading();

    if (response.success) {
      showSuccess('Deployment created successfully!');
      
      // Navigate to zone dashboard after short delay
      setTimeout(() => {
        const deploymentId = response.data.metadata.deployment_id;
        navigate(`/deployments/${deploymentId}/zones`);
      }, 1000);
    } else {
      showError('Failed to create deployment');
    }

  } catch (error) {
    hideLoading();
    console.error('Error creating deployment:', error);
    showError(error.message || 'Failed to create deployment');
  }
}

// UI Helper Functions

function showLoading() {
  const submitBtn = document.querySelector('.btn-submit');
  if (submitBtn) {
    submitBtn.disabled = true;
    submitBtn.innerHTML = `
      <span class="spinner"></span>
      Creating...
    `;
  }
}

function hideLoading() {
  const submitBtn = document.querySelector('.btn-submit');
  if (submitBtn) {
    submitBtn.disabled = false;
    submitBtn.textContent = 'Create Deployment';
  }
}

function showErrors(errors) {
  // Clear previous errors
  document.querySelectorAll('.field-error').forEach(el => el.remove());

  // Show new errors
  Object.keys(errors).forEach(field => {
    const input = document.querySelector(`[name="${field}"]`);
    if (input) {
      const errorEl = document.createElement('div');
      errorEl.className = 'field-error';
      errorEl.textContent = errors[field];
      input.parentElement.appendChild(errorEl);
      input.classList.add('error');
    }
  });
}

function showError(message) {
  // Create toast notification
  const toast = document.createElement('div');
  toast.className = 'toast toast-error';
  toast.textContent = message;
  document.body.appendChild(toast);

  setTimeout(() => {
    toast.classList.add('show');
  }, 10);

  setTimeout(() => {
    toast.classList.remove('show');
    setTimeout(() => toast.remove(), 300);
  }, 5000);
}

function showSuccess(message) {
  // Create toast notification
  const toast = document.createElement('div');
  toast.className = 'toast toast-success';
  toast.textContent = message;
  document.body.appendChild(toast);

  setTimeout(() => {
    toast.classList.add('show');
  }, 10);

  setTimeout(() => {
    toast.classList.remove('show');
    setTimeout(() => toast.remove(), 300);
  }, 3000);
}