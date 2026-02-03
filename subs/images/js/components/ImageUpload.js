// Image Upload Component - Updated with Gallery Support
import { IMAGES_CONFIG, validateCategory, getPhotoType, isGalleryCategory } from '../utils/images-config.js';
import { getPresignedUrls, uploadToS3, confirmUpload } from '../utils/images-api.js';
import { showToast } from '../shared/toast.js';
import { navigate } from '../utils/router.js';
import { Autocomplete } from './Autocomplete.js';

export function ImageUpload() {
  const container = document.createElement('div');
  container.className = 'upload-container';
  
  // Get category from URL if present
  const urlParams = new URLSearchParams(window.location.search);
  const preselectedCategory = urlParams.get('category') || '';
  
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
            <option value="${key}" ${key === preselectedCategory ? 'selected' : ''}>${config.label}</option>
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
  
  // Trigger category change if preselected
  if (preselectedCategory) {
    const categorySelect = container.querySelector('[name="category"]');
    categorySelect.dispatchEvent(new Event('change'));
  }
  
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
    if (isGalleryCategory(category)) {
      requiredNotice.textContent = 'Gallery photos require Display Name';
      requiredNotice.className = 'required-fields-notice active';
    } else if (config.requiredFields.length > 0) {
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
  // Gallery-specific fields (for all gallery categories)
  if (config.gallerySection) {
    const galleryFields = document.createElement('div');
    galleryFields.className = 'gallery-fields';
    galleryFields.innerHTML = `
      <div class="form-group">
        <label>Display Name <span class="required">*</span></label>
        <input
          type="text"
          name="display_name"
          class="form-control"
          placeholder="e.g., Halloween 2025 - Front Yard"
          required
        />
        <small>Name shown in public gallery</small>
      </div>
      
      <div class="form-group">
        <label>Location</label>
        <input
          type="text"
          name="location"
          class="form-control"
          placeholder="e.g., Front Yard, Driveway, etc."
        />
        <small>Optional location description</small>
      </div>
      
      <div class="form-group checkbox-group">
        <label>
          <input type="checkbox" name="is_featured" />
          Mark as Featured
        </label>
        <small>Featured photos appear first in gallery</small>
      </div>
      
      <div class="form-group">
        <label>Sort Order</label>
        <input
          type="number"
          name="sort_order"
          class="form-control"
          value="0"
          min="0"
          max="999"
        />
        <small>Lower numbers appear first (0-999)</small>
      </div>
      
      ${config.gallerySection === 'community' ? `
        <div class="form-group checkbox-group">
          <label>
            <input type="checkbox" name="visitor_uploaded" />
            Visitor Uploaded
          </label>
          <small>Check if this was submitted by a visitor</small>
        </div>
      ` : ''}
    `;
    container.appendChild(galleryFields);
  }
  
  // Regular required fields
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
  
  const config = IMAGES_CONFIG.CATEGORIES[category];
  
  // Collect data
  const data = {
    context: 'gallery',
    category,
    season,
    year: parseInt(year),
    caption: formData.get('caption') || '',
    tags: formData.get('tags') ? formData.get('tags').split(',').map(t => t.trim()) : [],
    is_public: formData.get('is_public') === 'on'
  };
  
  // Collect gallery_data fields if gallery category
  if (config.gallerySection) {
    data.gallery_data = {
      display_name: formData.get('display_name') || '',
      location: formData.get('location') || '',
      is_featured: formData.get('is_featured') === 'on',
      sort_order: parseInt(formData.get('sort_order') || '0'),
      visitor_uploaded: formData.get('visitor_uploaded') === 'on'
    };
    
    // Validate display_name
    if (!data.gallery_data.display_name) {
      showToast('Display Name is required for gallery photos', 'error');
      return;
    }
  }
  
  // Collect dynamic fields
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
      context: config.gallerySection ? 'gallery' : category,
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

            // DEBUG — remove after
      console.log('DEBUG presigned_url:', upload.presigned_url);
      console.log('DEBUG file.type:', file.type, 'file.size:', file.size);
      console.log('DEBUG full upload object:', JSON.stringify(upload, null, 2));
      
      await uploadToS3(upload.presigned_url, file, file.type);
      
      // Upload thumbnail if present
      if (upload.thumb_presigned_url) {
        const thumbnail = await createThumbnail(file);
        await uploadToS3(upload.thumb_presigned_url, thumbnail, 'image/jpeg');
      }
      
      // Update progress
      const progress = ((i + 1) / uploads.length) * 100;
      const progressFill = progressSection.querySelector('.progress-fill');
      progressFill.style.width = `${progress}%`;
    }
    
    // Step 3: Confirm upload
    const confirmData = {
      context: config.gallerySection ? 'gallery' : category,
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
    
    // Add gallery_data if present
    if (data.gallery_data) {
      confirmData.display_name = data.gallery_data.display_name;
      confirmData.location = data.gallery_data.location;
      confirmData.is_featured = data.gallery_data.is_featured;
      confirmData.sort_order = data.gallery_data.sort_order;
      confirmData.visitor_uploaded = data.gallery_data.visitor_uploaded;
    }
    
    await confirmUpload(confirmData);
    
    // Navigate back to appropriate page
    if (config.gallerySection) {
      navigate('/images/gallery');
    } else {
      navigate('/images');
    }
    
  } catch (error) {
    console.error('Upload error:', error);
    formSection.style.display = 'block';
    progressSection.style.display = 'none';
  }
}

// Create thumbnail helper
async function createThumbnail(file, maxWidth = 300, maxHeight = 300) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    
    reader.onload = (e) => {
      const img = new Image();
      
      img.onload = () => {
        const canvas = document.createElement('canvas');
        let width = img.width;
        let height = img.height;
        
        // Calculate new dimensions
        if (width > height) {
          if (width > maxWidth) {
            height *= maxWidth / width;
            width = maxWidth;
          }
        } else {
          if (height > maxHeight) {
            width *= maxHeight / height;
            height = maxHeight;
          }
        }
        
        canvas.width = width;
        canvas.height = height;
        
        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0, width, height);
        
        canvas.toBlob((blob) => {
          if (blob) {
            resolve(blob);
          } else {
            reject(new Error('Failed to create thumbnail'));
          }
        }, 'image/jpeg', 0.85);
      };
      
      img.onerror = () => reject(new Error('Failed to load image'));
      img.src = e.target.result;
    };
    
    reader.onerror = () => reject(new Error('Failed to read file'));
    reader.readAsDataURL(file);
  });
}