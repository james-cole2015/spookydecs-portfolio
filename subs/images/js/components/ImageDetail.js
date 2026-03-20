// Image Detail Component
import { IMAGES_CONFIG } from '../utils/images-config.js';
import { navigate } from '../utils/router.js';
import { renderEntityRefs, renderDynamicFields, setupButtonHandlers } from './image-detail-helpers.js';
import { suggestTags } from '../utils/images-api.js';

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

export function ImageDetail(photo, isEditMode = false, financeUrl = '', maintUrl = '', ideasUrl = '', from = '') {
  const wrapper = document.createElement('div');

  const container = document.createElement('div');
  container.className = 'image-detail';

  const category = deriveCategory(photo);
  const categoryConfig = IMAGES_CONFIG.CATEGORIES[category] || { label: 'Unknown', requiredFields: [] };
  const galleryData = photo.gallery_data || {};

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

        ${category.startsWith('gallery') ? `
          <div class="form-group">
            <label>Display Name</label>
            ${isEditMode ? `
              <input type="text" name="gallery_display_name" class="form-control" value="${galleryData.display_name || ''}" placeholder="e.g., Front Yard 2025" />
            ` : `
              <div class="readonly-value">${galleryData.display_name || 'Untitled'}</div>
            `}
          </div>

          <div class="form-group">
            <label>Location</label>
            ${isEditMode ? `
              <select name="gallery_location" class="form-control">
                <option value="">— Select location —</option>
                <option value="Front Yard" ${galleryData.location === 'Front Yard' ? 'selected' : ''}>Front Yard</option>
                <option value="Side Yard" ${galleryData.location === 'Side Yard' ? 'selected' : ''}>Side Yard</option>
                <option value="Back Yard" ${galleryData.location === 'Back Yard' ? 'selected' : ''}>Back Yard</option>
              </select>
            ` : `
              <div class="readonly-value">${galleryData.location || '—'}</div>
            `}
          </div>
        ` : ''}

        <div class="form-group">
          <label>Tags</label>
          ${isEditMode ? `
            <div class="tag-pill-field">
              <div class="tag-pills-display"></div>
              <div class="tag-input-row">
                <input type="text" class="tag-text-input form-control" placeholder="Add tag, then press , or Enter" autocomplete="off" />
                ${category.startsWith('gallery') ? `<button type="button" class="btn btn-secondary btn-sm suggest-tags-btn">Suggest Tags</button>` : ''}
              </div>
              ${category.startsWith('gallery') ? `<div class="ai-tag-suggestions" style="display:none;"></div>` : ''}
              <input type="hidden" name="tags" value="${(photo.tags || []).join(',')}" />
            </div>
            ${category.startsWith('gallery') ? `
              <div class="ai-matched-items" style="display:none;">
                <div class="ai-matched-items-header">
                  AI Matched Items
                  <button type="button" class="btn btn-xs btn-secondary ai-add-all-btn">Add All</button>
                </div>
                <div class="ai-matched-items-list"></div>
              </div>
            ` : ''}
          ` : `
            <div class="readonly-value">${(photo.tags || []).join(', ') || 'No tags'}</div>
          `}
        </div>

        <div class="dynamic-fields">
          ${renderDynamicFields(photo, categoryConfig, isEditMode)}
        </div>

        ${!isEditMode ? renderEntityRefs(photo, financeUrl, maintUrl, category, ideasUrl) : ''}

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

  // Entity link navigation (item_ids, storage_id → entity detail page)
  container.addEventListener('click', (e) => {
    const link = e.target.closest('.entity-link');
    if (link) {
      e.preventDefault();
      navigate(`/images/entities/${link.dataset.entityId}?type=${link.dataset.entityType}`);
      return;
    }
  });

  // Tag pill UX
  if (isEditMode) {
    const pillsDisplay = container.querySelector('.tag-pills-display');
    const tagTextInput = container.querySelector('.tag-text-input');
    const tagsHidden = container.querySelector('input[name="tags"]');

    if (pillsDisplay && tagTextInput && tagsHidden) {
      let currentTags = (photo.tags || []).filter(Boolean);

      const syncHidden = () => {
        tagsHidden.value = currentTags.join(',');
      };

      const renderPills = () => {
        pillsDisplay.innerHTML = currentTags.map(tag => `
          <span class="tag-pill" data-tag="${tag}">
            ${tag}
            <button type="button" class="tag-pill-remove" data-remove-tag="${tag}" aria-label="Remove ${tag}">×</button>
          </span>
        `).join('');

        pillsDisplay.querySelectorAll('.tag-pill-remove').forEach(btn => {
          btn.addEventListener('click', () => {
            currentTags = currentTags.filter(t => t !== btn.dataset.removeTag);
            renderPills();
            syncHidden();
          });
        });
      };

      renderPills();

      tagTextInput.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' || e.key === ',') {
          e.preventDefault();
          const value = tagTextInput.value.trim().replace(/,$/, '').trim().toLowerCase();
          if (value && !currentTags.includes(value)) {
            currentTags.push(value);
            renderPills();
            syncHidden();
          }
          tagTextInput.value = '';
        }
      });

      // Suggest Tags button (gallery photos only) — inside this block for closure access
      if (category.startsWith('gallery')) {
        const suggestBtn = container.querySelector('.suggest-tags-btn');
        const aiSection = container.querySelector('.ai-matched-items');
        const aiList = container.querySelector('.ai-matched-items-list');
        const aiAddAllBtn = container.querySelector('.ai-add-all-btn');
        const aiTagSuggestions = container.querySelector('.ai-tag-suggestions');

        const renderAiTagChips = (tags) => {
          if (!aiTagSuggestions || tags.length === 0) return;
          aiTagSuggestions.innerHTML = `<span class="ai-suggestions-label">Suggested:</span>` +
            tags.map(tag => `<button type="button" class="ai-tag-chip" data-tag="${tag}">${tag} <span class="ai-chip-x">×</span></button>`).join('');
          aiTagSuggestions.style.display = '';
          aiTagSuggestions.querySelectorAll('.ai-tag-chip').forEach(chip => {
            chip.addEventListener('click', (e) => {
              const tag = chip.dataset.tag;
              // Left-click on the × span = dismiss; anywhere else = add
              if (e.target.classList.contains('ai-chip-x')) {
                chip.remove();
              } else {
                if (!currentTags.includes(tag)) {
                  currentTags.push(tag);
                  renderPills();
                  syncHidden();
                }
                chip.remove();
              }
              if (!aiTagSuggestions.querySelector('.ai-tag-chip')) {
                aiTagSuggestions.style.display = 'none';
              }
            });
          });
        };

        const renderMatchedItems = (matchedItems) => {
          if (!aiSection || !aiList || matchedItems.length === 0) return;
          aiList.innerHTML = matchedItems.map(item =>
            `<div class="ai-matched-item" data-item-id="${item.item_id}">
              <span class="ai-matched-item-name">${item.short_name}</span>
              <span class="ai-matched-item-score">${Math.round(item.similarity * 100)}% match</span>
              <div class="ai-matched-item-actions">
                <button type="button" class="btn btn-xs btn-primary ai-add-item-btn">Add</button>
                <button type="button" class="btn-ghost ai-dismiss-item-btn">×</button>
              </div>
            </div>`
          ).join('');
          aiSection.style.display = '';

          const hideIfEmpty = () => {
            if (!aiList.querySelector('.ai-matched-item')) aiSection.style.display = 'none';
          };

          aiList.querySelectorAll('.ai-add-item-btn').forEach(btn => {
            btn.addEventListener('click', () => {
              const row = btn.closest('.ai-matched-item');
              const itemId = row.dataset.itemId;
              if (!currentTags.includes(itemId)) {
                currentTags.push(itemId);
                renderPills();
                syncHidden();
              }
              row.remove();
              hideIfEmpty();
            });
          });

          aiList.querySelectorAll('.ai-dismiss-item-btn').forEach(btn => {
            btn.addEventListener('click', () => {
              btn.closest('.ai-matched-item').remove();
              hideIfEmpty();
            });
          });
        };

        if (aiAddAllBtn) {
          aiAddAllBtn.addEventListener('click', () => {
            aiList.querySelectorAll('.ai-matched-item').forEach(row => {
              const itemId = row.dataset.itemId;
              if (!currentTags.includes(itemId)) {
                currentTags.push(itemId);
              }
            });
            renderPills();
            syncHidden();
            aiList.innerHTML = '';
            aiSection.style.display = 'none';
          });
        }

        if (suggestBtn) {
          suggestBtn.addEventListener('click', async () => {
            suggestBtn.disabled = true;
            suggestBtn.textContent = 'Analyzing…';

            try {
              const result = await suggestTags(photo.photo_id);
              const suggestedTags = (result.suggested_tags || []).filter(t => t && !currentTags.includes(t));
              const matchedItems = result.matched_items || [];

              renderAiTagChips(suggestedTags);
              renderMatchedItems(matchedItems);
            } catch {
              // error already surfaced via toast in suggestTags()
            } finally {
              suggestBtn.disabled = false;
              suggestBtn.textContent = 'Suggest Tags';
            }
          });
        }
      }
    }
  }

  // Auto-fill display_name from year/location changes for gallery photos
  if (isEditMode) {
    const yearInput = container.querySelector('[name="year"]');
    const locationSelect = container.querySelector('[name="gallery_location"]');
    const displayNameInput = container.querySelector('[name="gallery_display_name"]');

    if (displayNameInput && (yearInput || locationSelect)) {
      const autoFill = () => {
        const loc = locationSelect?.value || '';
        const yr = yearInput?.value || '';
        const generated = [loc, yr].filter(Boolean).join(' ');
        const currentVal = displayNameInput.value;
        const isManual = currentVal && currentVal !== displayNameInput.dataset.autoValue;
        if (!isManual) {
          displayNameInput.value = generated;
          displayNameInput.dataset.autoValue = generated;
        }
      };
      yearInput?.addEventListener('input', autoFill);
      locationSelect?.addEventListener('change', autoFill);
    }
  }

  // Handle category change in edit mode
  if (isEditMode) {
    const categorySelect = container.querySelector('[name="category"]');
    const dynamicFieldsContainer = container.querySelector('.dynamic-fields');
    const requiredNotice = container.querySelector('.required-fields-notice');

    categorySelect.addEventListener('change', (e) => {
      const newCategory = e.target.value;
      const config = IMAGES_CONFIG.CATEGORIES[newCategory];

      if (config.requiredFields.length > 0) {
        requiredNotice.textContent = `Required: ${config.requiredFields.join(', ')}`;
        requiredNotice.className = 'required-fields-notice active';
      } else {
        requiredNotice.textContent = '';
        requiredNotice.className = 'required-fields-notice';
      }

      dynamicFieldsContainer.innerHTML = renderDynamicFields(photo, config, true);
    });
  }

  setupButtonHandlers(container, photo, isEditMode, from);

  wrapper.appendChild(container);
  return wrapper;
}
