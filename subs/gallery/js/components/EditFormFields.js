/**
 * EditFormFields Component
 * 
 * Reusable form field generators for photo editing
 */

import { 
  PHOTO_TYPES, 
  PHOTO_TYPE_LABELS, 
  SEASONS, 
  SEASON_LABELS,
  requiresItemSelection,
  requiresStorageSelection,
  requiresDeploymentSelection,
  requiresIdeaSelection
} from '../utils/images-config.js';

/**
 * Render caption field
 * @param {string} value - Current value
 * @returns {string} HTML
 */
export function renderCaptionField(value = '') {
  return `
    <div class="form-group">
      <label for="caption">Caption</label>
      <input 
        type="text" 
        id="caption" 
        name="caption" 
        class="form-input"
        value="${value || ''}"
        placeholder="Enter a caption for this photo"
      />
    </div>
  `;
}

/**
 * Render photo type selector
 * @param {string} value - Current value
 * @returns {string} HTML
 */
export function renderPhotoTypeField(value = '') {
  return `
    <div class="form-group">
      <label for="photo_type">Photo Type</label>
      <select id="photo_type" name="photo_type" class="form-select">
        ${Object.values(PHOTO_TYPES).map(type => `
          <option value="${type}" ${value === type ? 'selected' : ''}>
            ${PHOTO_TYPE_LABELS[type]}
          </option>
        `).join('')}
      </select>
      <p class="form-help">
        Changing photo type may clear linked entities.
      </p>
    </div>
  `;
}

/**
 * Render season selector
 * @param {string} value - Current value
 * @returns {string} HTML
 */
export function renderSeasonField(value = '') {
  return `
    <div class="form-group">
      <label for="season">Season</label>
      <select id="season" name="season" class="form-select">
        ${Object.values(SEASONS).map(season => `
          <option value="${season}" ${value === season ? 'selected' : ''}>
            ${SEASON_LABELS[season]}
          </option>
        `).join('')}
      </select>
    </div>
  `;
}

/**
 * Render year selector
 * @param {number} value - Current value
 * @returns {string} HTML
 */
export function renderYearField(value = null) {
  const currentYear = new Date().getFullYear();
  const years = Array.from({ length: 5 }, (_, i) => currentYear - i);
  
  return `
    <div class="form-group">
      <label for="year">Year</label>
      <select id="year" name="year" class="form-select">
        ${years.map(year => `
          <option value="${year}" ${value == year ? 'selected' : ''}>
            ${year}
          </option>
        `).join('')}
      </select>
    </div>
  `;
}

/**
 * Render tags field
 * @param {Array} value - Current tags
 * @returns {string} HTML
 */
export function renderTagsField(value = []) {
  const tagsString = Array.isArray(value) ? value.join(', ') : '';
  
  return `
    <div class="form-group">
      <label for="tags">Tags</label>
      <input 
        type="text" 
        id="tags" 
        name="tags" 
        class="form-input"
        value="${tagsString}"
        placeholder="tag1, tag2, tag3"
      />
      <p class="form-help">Comma-separated tags</p>
    </div>
  `;
}

/**
 * Render visibility toggles
 * @param {boolean} isPublic - Is public
 * @param {boolean} isVisible - Is visible
 * @returns {string} HTML
 */
export function renderVisibilityFields(isPublic = false, isVisible = true) {
  return `
    <div class="form-group">
      <label class="checkbox-label">
        <input 
          type="checkbox" 
          id="is_public" 
          name="is_public"
          ${isPublic ? 'checked' : ''}
        />
        <span>Public (visible to all users)</span>
      </label>
    </div>
    
    <div class="form-group">
      <label class="checkbox-label">
        <input 
          type="checkbox" 
          id="is_visible" 
          name="is_visible"
          ${isVisible ? 'checked' : ''}
        />
        <span>Visible (show in gallery)</span>
      </label>
    </div>
  `;
}

/**
 * Get form data from fields
 * @param {HTMLElement} form - Form element
 * @returns {Object} Form data
 */
export function getFormData(form) {
  const formData = new FormData(form);
  const data = {};
  
  // Basic fields
  data.caption = formData.get('caption') || '';
  data.photo_type = formData.get('photo_type');
  data.season = formData.get('season');
  data.year = parseInt(formData.get('year'));
  
  // Tags (convert comma-separated string to array)
  const tagsString = formData.get('tags') || '';
  data.tags = tagsString
    .split(',')
    .map(tag => tag.trim())
    .filter(tag => tag.length > 0);
  
  // Checkboxes
  data.is_public = formData.get('is_public') === 'on';
  data.is_visible = formData.get('is_visible') === 'on';
  
  return data;
}

/**
 * Validate form data
 * @param {Object} data - Form data
 * @returns {Object} Validation result {isValid, errors}
 */
export function validateFormData(data) {
  const errors = [];
  
  if (!data.photo_type) {
    errors.push('Photo type is required');
  }
  
  if (!data.season) {
    errors.push('Season is required');
  }
  
  if (!data.year || data.year < 2000 || data.year > 2100) {
    errors.push('Valid year is required');
  }
  
  return {
    isValid: errors.length === 0,
    errors
  };
}
