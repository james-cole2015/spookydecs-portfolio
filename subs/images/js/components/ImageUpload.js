// Image Upload Component
import { IMAGES_CONFIG, validateCategory, getPhotoType } from '../utils/images-config.js';
import { getPresignedUrls, uploadToS3, confirmUpload } from '../utils/images-api.js';
import { showToast } from '../shared/toast.js';
import { navigate } from '../utils/router.js';
import { Autocomplete } from './Autocomplete.js';

export function ImageUpload() {
  const container = document.createElement('div');
  container.className = 'upload-container';
  
  container.innerHTML = `
    <div class="upload-header">
      <h1>Upload Images</h1>
    </div>
    
    <form class="upload-form">
      <div class="form-group">
        <label>Category <span class="required">*</span></label>
        <select name="category" class="form-control" required>
          <option value="">Select category...</option>
          ${Object.entries(IMAGES_CONFIG.CATEGORIES).map(([key, config]) => `
            <option value="${key}">${config.label}</option>
          `).join('')}
        </select>
        <div class="required-fields-notice"></div>
      </div>
      
      <div class="form-group">
        <label>Season <span class="required">*</span></label>
        <select name="season" class="form-control" required>
          ${IMAGES_CONFIG.SEASONS.map(s => `
            <option value="${s.value}">${s.label}</option>
          `).join('')}
        </select>
      </div>
      
      <div class="form-group">
        <label>Year</label>
        <input type="number" name="year" class="form-control" value="${new Date().getFullYear()}" min="2020" max="2030" />
      </div>
      
      <div class="dynamic-fields"></div>
      
      <div class="form-group">
        <label>Caption</label>
        <textarea name="caption" class="form-control" rows="2"></textarea>
      </div>
      
      <div class="form-group">
        <label>Tags</label>
        <input type="text" name="tags" class="form-control" placeholder="Comma-separated tags" />
      </div>
      
      <div class="form-group checkbox-group">
        <label>
          <input type="checkbox" name="is_public" />
          Make public
        </label>
      </div>
      
      <div class="form-group">
        <label>Select Files <span class="required">*</span></label>
        <input type="file" name="files" class="form-control" multiple accept="image/*" required />
        <small>Select one or more images</small>
      </div>
      
      <div class="upload-preview"></div>
      
      <div class="form-actions">
        <button type="button" class="btn btn-secondary" data-action="cancel">Cancel</button>
        <button type="submit" class="btn btn-primary">Upload</button>
      </div>
    </form>
    
    <div class="upload-progress" style="display: none;">
      <div class="progress-bar">
        <div class="progress-fill"></div>
      </div>
      <div class="progress-text">Uploading...</div>
    </div>
  `;
  
  setupUploadHandlers(container);
  
  return container;
}

function setupUploadHandlers(container) {
  const form = container.querySelector('.upload-form');
  const categorySelect = form.querySelector('[name="category"]');
  const dynamicFieldsContainer = form.querySelector('.dynamic-fields');
  const requiredNotice = form.querySelector('.required-fields-notice');
  const fileInput = form.querySelector('[name="files"]');
  const preview = container.querySelector('.upload-preview');
  
  // Handle category change
  categorySelect.addEventListener('change', (e) => {
    const category = e.target.value;
    if (!category) {
      dynamicFieldsContainer.innerHTML = '';
      requiredNotice.textContent = '';
      return;
    }

    const config = IMAGES_CONFIG.CATEGORIES[category];

    // Update required fields notice
    if (config.requiredFields.length > 0) {
      requiredNotice.textContent = `Required: ${config.requiredFields.join(', ')}`;
      requiredNotice.className = 'required-fields-notice active';
    } else {
      requiredNotice.textContent = '';
      requiredNotice.className = 'required-fields-notice';
    }

    // Render dynamic fields
    dynamicFieldsContainer.innerHTML = '';
    renderDynamicUploadFields(config, dynamicFieldsContainer);
  });
  
  // Handle file selection
  fileInput.addEventListener('change', (e) => {
    const files = Array.from(e.target.files);
    preview.innerHTML = files.map((file, i) => `
      <div class="preview-item">
        <img src="${URL.createObjectURL(file)}" alt="Preview ${i + 1}" />
        <span class="preview-name">${file.name}</span>
      </div>
    `).join('');
  });
  
  // Handle form submission
  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    await handleUpload(container, form);
  });
  
  // Cancel button
  const cancelBtn = container.querySelector('[data-action="cancel"]');
  cancelBtn.addEventListener('click', () => {
    navigate('/images');
  });
}

function renderDynamicUploadFields(config, container) {
  config.requiredFields.forEach(field => {
    const label = field === 'item_id' ? 'Item ID' :
                  field === 'storage_id' ? 'Storage ID' :
                  field === 'idea_id' ? 'Idea ID' :
                  field === 'deployment_id' ? 'Deployment ID' :
                  field === 'cost_record_id' ? 'Cost Record ID' :
                  field.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase());

    // Use Autocomplete for item_id, idea_id, and storage_id
    if (field === 'item_id') {
      const autocomplete = Autocomplete({
        name: field,
        label: label,
        placeholder: 'Type to search for items...',
        required: true,
        searchType: 'item',
        onSelect: (id, item) => {
          console.log('Item selected:', id, item);
        }
      });
      container.appendChild(autocomplete);
    } else if (field === 'idea_id') {
      const autocomplete = Autocomplete({
        name: field,
        label: label,
        placeholder: 'Type to search for ideas...',
        required: true,
        searchType: 'idea',
        onSelect: (id, item) => {
          console.log('Idea selected:', id, item);
        }
      });
      container.appendChild(autocomplete);
    } else if (field === 'storage_id') {
      const autocomplete = Autocomplete({
        name: field,
        label: label,
        placeholder: 'Type to search for storage...',
        required: true,
        searchType: 'storage',
        onSelect: (id, item) => {
          console.log('Storage selected:', id, item);
        }
      });
      container.appendChild(autocomplete);
    } else {
      // Regular text input for other fields
      const fieldDiv = document.createElement('div');
      fieldDiv.className = 'form-group';
      fieldDiv.innerHTML = `
        <label>${label} <span class="required">*</span></label>
        <input
          type="text"
          name="${field}"
          class="form-control"
          placeholder="${label}"
          required
        />
        <small>Enter ${label}</small>
      `;
      container.appendChild(fieldDiv);
    }
  });
}

async function handleUpload(container, form) {
  const formData = new FormData(form);
  const category = formData.get('category');
  const season = formData.get('season');
  const year = formData.get('year') || new Date().getFullYear();
  const files = form.querySelector('[name="files"]').files;
  
  if (!category || !season || files.length === 0) {
    showToast('Please fill in all required fields', 'error');
    return;
  }
  
  // Collect data
  const data = {
    category,
    season,
    year: parseInt(year),
    caption: formData.get('caption') || '',
    tags: formData.get('tags') ? formData.get('tags').split(',').map(t => t.trim()) : [],
    is_public: formData.get('is_public') === 'on'
  };
  
  // Collect dynamic fields
  const config = IMAGES_CONFIG.CATEGORIES[category];
  config.requiredFields.forEach(field => {
    // For autocomplete fields, get the value from the hidden input with _selected suffix
    let value;
    if (field === 'item_id' || field === 'idea_id' || field === 'storage_id') {
      value = formData.get(`${field}_selected`) || formData.get(field);
    } else {
      value = formData.get(field);
    }

    if (field === 'item_id') {
      // item_id is now a single value, but API expects item_ids array
      data.item_ids = value ? [value.trim()] : [];
    } else if (field === 'idea_id') {
      data.idea_id = value ? value.trim() : '';
    } else if (field === 'storage_id') {
      data.storage_id = value ? value.trim() : '';
    } else {
      data[field] = value ? value.trim() : '';
    }
  });
  
  // Validate
  const validation = validateCategory(category, data);
  if (!validation.valid) {
    showToast(validation.errors.join('\n'), 'error');
    return;
  }
  
  // Show progress
  const formSection = container.querySelector('.upload-form');
  const progressSection = container.querySelector('.upload-progress');
  formSection.style.display = 'none';
  progressSection.style.display = 'block';
  
  try {
    // Step 1: Get presigned URLs
    const filesList = Array.from(files).map(f => ({
      filename: f.name,
      content_type: f.type
    }));
    
    const uploadData = {
      context: category,
      photo_type: getPhotoType(category),
      season,
      year,
      files: filesList,
      item_ids: data.item_ids,
      idea_id: data.idea_id,
      storage_id: data.storage_id,
      deployment_id: data.deployment_id,
      is_public: data.is_public
    };
    
    const uploads = await getPresignedUrls(uploadData);
    
    // Step 2: Upload to S3
    for (let i = 0; i < uploads.length; i++) {
      const upload = uploads[i];
      const file = files[i];
      
      await uploadToS3(upload.presigned_url, file, file.type);
      
      // Update progress
      const progress = ((i + 1) / uploads.length) * 100;
      const progressFill = progressSection.querySelector('.progress-fill');
      progressFill.style.width = `${progress}%`;
    }
    
    // Step 3: Confirm upload
    const confirmData = {
      context: category,
      photo_type: getPhotoType(category),
      season,
      year,
      photos: uploads.map(u => ({
        cloudfront_url: u.cloudfront_url,
        thumb_cloudfront_url: u.thumb_cloudfront_url,
        s3_key: u.s3_key,
        thumb_s3_key: u.thumb_s3_key,
        metadata: {
          content_type: u.content_type,
          original_filename: u.original_filename
        }
      })),
      item_ids: data.item_ids,
      idea_id: data.idea_id,
      storage_id: data.storage_id,
      deployment_id: data.deployment_id,
      caption: data.caption,
      tags: data.tags,
      is_public: data.is_public
    };
    
    await confirmUpload(confirmData);
    
    // Navigate back to list
    navigate('/images');
    
  } catch (error) {
    console.error('Upload error:', error);
    formSection.style.display = 'block';
    progressSection.style.display = 'none';
  }
}