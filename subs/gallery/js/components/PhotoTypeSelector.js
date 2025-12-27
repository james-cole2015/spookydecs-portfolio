/**
 * PhotoTypeSelector Component
 * 
 * Dropdown for selecting photo type with automatic context mapping
 */

import { 
  PHOTO_TYPES, 
  PHOTO_TYPE_LABELS, 
  getContextForPhotoType,
  requiresItemSelection,
  requiresStorageSelection,
  requiresDeploymentSelection,
  requiresIdeaSelection
} from '../utils/images-config.js';

/**
 * Render photo type selector
 * @param {HTMLElement} container - Container element
 * @param {string} defaultValue - Default photo type
 * @param {Function} onChange - Change callback
 */
export function renderPhotoTypeSelector(container, defaultValue = PHOTO_TYPES.GALLERY, onChange) {
  container.innerHTML = `
    <div class="form-group">
      <label for="photo-type-select">Photo Type *</label>
      <select id="photo-type-select" class="form-select" required>
        ${Object.values(PHOTO_TYPES).map(type => `
          <option value="${type}" ${defaultValue === type ? 'selected' : ''}>
            ${PHOTO_TYPE_LABELS[type]}
          </option>
        `).join('')}
      </select>
      <p class="form-help">
        Select the type of photo you're uploading. This determines which entities you can link.
      </p>
    </div>
  `;
  
  // Attach change listener
  const select = container.querySelector('#photo-type-select');
  if (select && onChange) {
    select.addEventListener('change', () => {
      const photoType = select.value;
      const context = getContextForPhotoType(photoType);
      onChange(photoType, context);
    });
  }
  
  // Trigger initial change
  if (onChange) {
    const initialType = select.value;
    const initialContext = getContextForPhotoType(initialType);
    onChange(initialType, initialContext);
  }
}

/**
 * Get current photo type value
 * @param {HTMLElement} container - Container element
 * @returns {string} Photo type
 */
export function getPhotoType(container) {
  const select = container.querySelector('#photo-type-select');
  return select ? select.value : null;
}

/**
 * Get entity requirements for photo type
 * @param {string} photoType - Photo type
 * @returns {Object} Requirements object
 */
export function getEntityRequirements(photoType) {
  return {
    needsItems: requiresItemSelection(photoType),
    needsStorage: requiresStorageSelection(photoType),
    needsDeployment: requiresDeploymentSelection(photoType),
    needsIdea: requiresIdeaSelection(photoType),
    context: getContextForPhotoType(photoType)
  };
}
