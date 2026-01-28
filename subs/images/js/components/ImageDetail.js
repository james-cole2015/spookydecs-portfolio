// Image Detail Component
import { IMAGES_CONFIG, validateCategory } from '../utils/images-config.js';
import { updateImage, deleteImage } from '../utils/images-api.js';
import { navigate } from '../utils/router.js';
import { confirmAction } from '../shared/modal.js';
import { Breadcrumb } from './Breadcrumb.js';

// Derive category from photo data
function deriveCategory(photo) {
  // If photo already has category field, use it
  if (photo.category && IMAGES_CONFIG.CATEGORIES[photo.category]) {
    return photo.category;
  }
  
  // Derive category from photo_type and context
  const photoType = photo.photo_type;
  
  // Check item context
  if (photo.item_ids && photo.item_ids.length > 0) {
    if (photoType === 'catalog') return 'item_catalog';
    if (photoType === 'repair') return 'maintenance';
    if (photoType === 'deployment') return 'deployments';
  }
  
  // Check storage context
  if (photo.storage_id) {
    return 'storage';
  }
  
  // Check deployment context
  if (photo.deployment_id) {
    return 'deployments';
  }
  
  // Check idea context
  if (photo.idea_id) {
    if (photoType === 'build') return 'builds';
    if (photoType === 'inspiration') return 'ideas';
    return 'ideas'; // Default for idea context
  }
  
  // Check photo_type directly
  if (photoType === 'receipt') return 'receipts';
  if (photoType === 'gallery') return 'gallery';
  
  // Fallback to misc
  return 'misc';
}

export function ImageDetail(photo, isEditMode = false) {
  const wrapper = document.createElement('div');

  // Create breadcrumb navigation
  const breadcrumbItems = isEditMode
    ? [
        { label: 'Images', path: '/images' },
        { label: 'Image Details', path: `/images/${photo.photo_id}` },
        { label: 'Edit', path: `/images/${photo.photo_id}/edit` }
      ]
    : [
        { label: 'Images', path: '/images' },
        { label: 'Image Details', path: `/images/${photo.photo_id}` }
      ];

  const breadcrumb = Breadcrumb(breadcrumbItems);
  wrapper.appendChild(breadcrumb);

  const container = document.createElement('div');
  container.className = 'image-detail';

  const category = deriveCategory(photo);
  const categoryConfig = IMAGES_CONFIG.CATEGORIES[category] || IMAGES_CONFIG.CATEGORIES.misc;

  container.innerHTML = `
    <div class="detail-header">
      <h1>${isEditMode ? 'Edit Image' : 'Image Details'}</h1>
      <div class="detail-actions">
        ${!isEditMode ? `
          <button class="btn btn-secondary" data-action="view-full">View Full Size</button>
          <button class="btn btn-primary" data-action="edit">Edit</button>
          <button class="btn btn-danger" data-action="delete">Delete</button>
        ` : `
          <button class="btn btn-secondary" data-action="cancel">Cancel</button>
          <button class="btn btn-primary" data-action="save">Save Changes</button>
        `}
      </div>
    </div>

    <div class="detail-content">
      <div class="detail-image">
        <a href="${photo.cloudfront_url}" target="_blank" rel="noopener noreferrer" class="detail-image-link">
          <img src="${photo.cloudfront_url}" alt="${photo.caption || 'Image'}" />
        </a>
      </div>
      
      <div class="detail-info">
        <div class="form-group">
          <label>Photo ID</label>
          <div class="readonly-value">${photo.photo_id}</div>
        </div>
        
        <div class="form-group">
          <label>Category</label>
          ${isEditMode ? `
            <select name="category" class="form-control" required>
              ${Object.entries(IMAGES_CONFIG.CATEGORIES).map(([key, config]) => `
                <option value="${key}" ${category === key ? 'selected' : ''}>
                  ${config.label}
                </option>
              `).join('')}
            </select>
            <div class="required-fields-notice"></div>
          ` : `
            <div class="readonly-value">${categoryConfig.label}</div>
          `}
        </div>
        
        <div class="form-group">
          <label>Season</label>
          ${isEditMode ? `
            <select name="season" class="form-control" required>
              ${IMAGES_CONFIG.SEASONS.map(s => `
                <option value="${s.value}" ${photo.season === s.value ? 'selected' : ''}>
                  ${s.label}
                </option>
              `).join('')}
            </select>
          ` : `
            <div class="readonly-value">${photo.season}</div>
          `}
        </div>
        
        <div class="form-group">
          <label>Year</label>
          ${isEditMode ? `
            <input type="number" name="year" class="form-control" value="${photo.year || new Date().getFullYear()}" min="2020" max="2030" required />
          ` : `
            <div class="readonly-value">${photo.year || 'N/A'}</div>
          `}
        </div>
        
        <div class="form-group">
          <label>Caption</label>
          ${isEditMode ? `
            <textarea name="caption" class="form-control" rows="3">${photo.caption || ''}</textarea>
          ` : `
            <div class="readonly-value">${photo.caption || 'No caption'}</div>
          `}
        </div>
        
        <div class="form-group">
          <label>Tags</label>
          ${isEditMode ? `
            <input type="text" name="tags" class="form-control" value="${(photo.tags || []).join(', ')}" placeholder="Comma-separated tags" />
          ` : `
            <div class="readonly-value">${(photo.tags || []).join(', ') || 'No tags'}</div>
          `}
        </div>
        
        <div class="dynamic-fields">
          ${renderDynamicFields(photo, categoryConfig, isEditMode)}
        </div>
        
        ${isEditMode ? `
          <div class="form-group checkbox-group">
            <label>
              <input type="checkbox" name="is_public" ${photo.is_public ? 'checked' : ''} />
              Public
            </label>
          </div>
          
          <div class="form-group checkbox-group">
            <label>
              <input type="checkbox" name="is_visible" ${photo.is_visible ? 'checked' : ''} />
              Visible
            </label>
          </div>
          
          <div class="form-group checkbox-group">
            <label>
              <input type="checkbox" name="is_primary" ${photo.is_primary ? 'checked' : ''} />
              Primary Photo
            </label>
          </div>
        ` : `
          <div class="form-group">
            <label>Visibility</label>
            <div class="readonly-value">
              ${photo.is_public ? 'Public' : 'Private'} • 
              ${photo.is_visible ? 'Visible' : 'Hidden'} • 
              ${photo.is_primary ? 'Primary' : 'Secondary'}
            </div>
          </div>
        `}
        
        <div class="form-group">
          <label>Upload Date</label>
          <div class="readonly-value">${new Date(photo.upload_date).toLocaleString()}</div>
        </div>
        
        <div class="form-group">
          <label>S3 Path</label>
          <div class="readonly-value code">${photo.s3_key}</div>
        </div>
      </div>
    </div>
  `;
  
  // Handle category change in edit mode
  if (isEditMode) {
    const categorySelect = container.querySelector('[name="category"]');
    const dynamicFieldsContainer = container.querySelector('.dynamic-fields');
    const requiredNotice = container.querySelector('.required-fields-notice');

    categorySelect.addEventListener('change', (e) => {
      const newCategory = e.target.value;
      const config = IMAGES_CONFIG.CATEGORIES[newCategory];

      // Update required fields notice
      if (config.requiredFields.length > 0) {
        requiredNotice.textContent = `Required: ${config.requiredFields.join(', ')}`;
        requiredNotice.className = 'required-fields-notice active';
      } else {
        requiredNotice.textContent = '';
        requiredNotice.className = 'required-fields-notice';
      }

      // Re-render dynamic fields
      dynamicFieldsContainer.innerHTML = renderDynamicFields(photo, config, true);
    });
  }

  // Button handlers
  setupButtonHandlers(container, photo, isEditMode);

  wrapper.appendChild(container);
  return wrapper;
}

function renderDynamicFields(photo, categoryConfig, isEditMode) {
  const fields = [];
  
  categoryConfig.requiredFields.forEach(field => {
    let value, label;
    
    if (field === 'item_id') {
      value = (photo.item_ids || []).join(', ');
      label = 'Item IDs';
    } else if (field === 'storage_id') {
      value = photo.storage_id || '';
      label = 'Storage ID';
    } else if (field === 'idea_id') {
      value = photo.idea_id || '';
      label = 'Idea ID';
    } else if (field === 'deployment_id') {
      value = photo.deployment_id || '';
      label = 'Deployment ID';
    } else if (field === 'cost_record_id') {
      value = photo.cost_record_id || '';
      label = 'Cost Record ID';
    } else {
      value = photo[field] || '';
      label = field.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase());
    }
    
    fields.push(`
      <div class="form-group">
        <label>${label} ${categoryConfig.requiredFields.includes(field) ? '<span class="required">*</span>' : ''}</label>
        ${isEditMode ? `
          <input 
            type="text" 
            name="${field}" 
            class="form-control" 
            value="${value}" 
            ${categoryConfig.requiredFields.includes(field) ? 'required' : ''}
            placeholder="${label}"
          />
        ` : `
          <div class="readonly-value">${value || 'Not set'}</div>
        `}
      </div>
    `);
  });
  
  return fields.join('');
}

function setupButtonHandlers(container, photo, isEditMode) {
  if (!isEditMode) {
    // View mode buttons
    const viewFullBtn = container.querySelector('[data-action="view-full"]');
    const editBtn = container.querySelector('[data-action="edit"]');
    const deleteBtn = container.querySelector('[data-action="delete"]');

    viewFullBtn.addEventListener('click', () => {
      window.open(photo.cloudfront_url, '_blank', 'noopener,noreferrer');
    });

    editBtn.addEventListener('click', () => {
      navigate(`/images/${photo.photo_id}/edit`);
    });

    deleteBtn.addEventListener('click', () => {
      confirmAction(
        `Are you sure you want to delete this image? This action cannot be undone.`,
        async () => {
          await deleteImage(photo.photo_id);
          navigate('/images');
        }
      );
    });
  } else {
    // Edit mode buttons
    const cancelBtn = container.querySelector('[data-action="cancel"]');
    const saveBtn = container.querySelector('[data-action="save"]');
    
    cancelBtn.addEventListener('click', () => {
      navigate(`/images/${photo.photo_id}`);
    });
    
    saveBtn.addEventListener('click', async () => {
      const updates = collectFormData(container);
      
      // Validate
      const validation = validateCategory(updates.category, updates);
      if (!validation.valid) {
        alert('Validation errors:\n' + validation.errors.join('\n'));
        return;
      }
      
      try {
        await updateImage(photo.photo_id, updates);
        navigate(`/images/${photo.photo_id}`);
      } catch (error) {
        console.error('Error saving:', error);
      }
    });
  }
}

function collectFormData(container) {
  const data = {};
  
  container.querySelectorAll('.form-control, input[type="checkbox"]').forEach(input => {
    if (input.type === 'checkbox') {
      data[input.name] = input.checked;
    } else if (input.name === 'tags') {
      data.tags = input.value.split(',').map(t => t.trim()).filter(Boolean);
    } else if (input.name === 'item_id') {
      data.item_ids = input.value.split(',').map(t => t.trim()).filter(Boolean);
    } else if (input.name === 'year') {
      data.year = parseInt(input.value);
    } else {
      data[input.name] = input.value;
    }
  });
  
  return data;
}