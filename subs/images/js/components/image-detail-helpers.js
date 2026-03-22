// ImageDetail helper functions — extracted from ImageDetail.js
import { IMAGES_CONFIG, validateCategory } from '../utils/images-config.js';
import { updateImage, deleteImage } from '../utils/images-api.js';
import { navigate } from '../utils/router.js';
import { confirmAction } from '../shared/modal.js';

export function renderEntityRefs(photo, financeUrl = '', maintUrl = '', category = '', ideasUrl = '') {
  const parts = [];

  const ids = photo.item_ids || [];
  if (ids.length) {
    const links = ids.map(id =>
      `<a class="entity-link breadcrumb-link" data-entity-id="${id}" data-entity-type="item" href="#">${id}</a>`
    ).join(', ');
    parts.push(`
      <div class="form-group">
        <label>Item IDs</label>
        <div class="readonly-value">${links}</div>
      </div>
    `);
  }

  if (category === 'maintenance' && photo.record_id && maintUrl) {
    const itemId = (photo.item_ids || [])[0] || '';
    parts.push(`
      <div class="form-group">
        <label>Repair Record</label>
        <div class="readonly-value">
          <a class="breadcrumb-link" href="${maintUrl}/${itemId}/${photo.record_id}" target="_blank" rel="noopener noreferrer">${photo.record_id}</a>
        </div>
      </div>
    `);
  }

  if (photo.storage_id) {
    parts.push(`
      <div class="form-group">
        <label>Storage ID</label>
        <div class="readonly-value">
          <a class="entity-link breadcrumb-link" data-entity-id="${photo.storage_id}" data-entity-type="storage" href="#">${photo.storage_id}</a>
        </div>
      </div>
    `);
  }

  const costId = (photo.cost_ids || [])[0];
  if (costId) {
    parts.push(`
      <div class="form-group">
        <label>Cost Record</label>
        <div class="readonly-value">
          <a class="breadcrumb-link" href="${financeUrl}/costs/${costId}" target="_blank" rel="noopener noreferrer">${costId}</a>
        </div>
      </div>
    `);
  }

  if (photo.idea_id) {
    parts.push(`
      <div class="form-group">
        <label>Idea</label>
        <div class="readonly-value">
          <a class="entity-link breadcrumb-link" data-entity-id="${photo.idea_id}" data-entity-type="idea" href="#">${photo.idea_id}</a>
        </div>
      </div>
    `);
  }

  return parts.join('');
}

export function renderDynamicFields(photo, categoryConfig, isEditMode) {
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

    let readonlyHtml;
    if (!isEditMode) {
      if (field === 'item_id') {
        const ids = photo.item_ids || [];
        const links = ids.length
          ? ids.map(id =>
              `<a class="entity-link breadcrumb-link" data-entity-id="${id}" data-entity-type="item" href="#">${id}</a>`
            ).join(', ')
          : 'Not set';
        readonlyHtml = `<div class="readonly-value">${links}</div>`;
      } else if (field === 'storage_id') {
        const sid = photo.storage_id || '';
        readonlyHtml = sid
          ? `<div class="readonly-value"><a class="entity-link breadcrumb-link" data-entity-id="${sid}" data-entity-type="storage" href="#">${sid}</a></div>`
          : `<div class="readonly-value">Not set</div>`;
      } else {
        readonlyHtml = `<div class="readonly-value">${value || 'Not set'}</div>`;
      }
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
        ` : readonlyHtml}
      </div>
    `);
  });

  return fields.join('');
}

export function setupButtonHandlers(container, photo, isEditMode, from = '') {
  const fromSuffix = from ? `?from=${from}` : '';

  if (!isEditMode) {
    const viewFullBtn = container.querySelector('[data-action="view-full"]');
    const editBtn = container.querySelector('[data-action="edit"]');
    const deleteBtn = container.querySelector('[data-action="delete"]');

    viewFullBtn.addEventListener('click', () => {
      window.open(photo.cloudfront_url, '_blank', 'noopener,noreferrer');
    });

    editBtn.addEventListener('click', () => {
      navigate(`/images/${photo.photo_id}/edit${fromSuffix}`);
    });

    deleteBtn.addEventListener('click', () => {
      confirmAction(
        `Are you sure you want to delete this image? This action cannot be undone.`,
        async () => {
          await deleteImage(photo.photo_id);
          navigate('/images/list');
        }
      );
    });
  } else {
    const cancelBtn = container.querySelector('[data-action="cancel"]');
    const saveBtn = container.querySelector('[data-action="save"]');

    cancelBtn.addEventListener('click', () => {
      navigate(`/images/${photo.photo_id}${fromSuffix}`);
    });

    saveBtn.addEventListener('click', async () => {
      const updates = collectFormData(container);

      if ('gallery_display_name' in updates || 'gallery_location' in updates) {
        const existingGalleryData = photo.gallery_data || {};
        updates.gallery_data = {
          ...existingGalleryData,
          display_name: updates.gallery_display_name ?? existingGalleryData.display_name,
          location: updates.gallery_location ?? existingGalleryData.location,
        };
        delete updates.gallery_display_name;
        delete updates.gallery_location;
      }

      const validation = validateCategory(updates.category, updates);
      if (!validation.valid) {
        alert('Validation errors:\n' + validation.errors.join('\n'));
        return;
      }

      try {
        await updateImage(photo.photo_id, updates);
        navigate(`/images/${photo.photo_id}${fromSuffix}`);
      } catch (error) {
        console.error('Error saving:', error);
      }
    });
  }
}

export function collectFormData(container) {
  const data = {};

  // Tags are stored in a hidden input (pill UI) — read it directly
  const tagsHidden = container.querySelector('input[name="tags"]');
  if (tagsHidden) {
    data.tags = tagsHidden.value.split(',').map(t => t.trim()).filter(Boolean);
  }

  container.querySelectorAll('.form-control, input[type="checkbox"]').forEach(input => {
    if (input.type === 'checkbox') {
      data[input.name] = input.checked;
    } else if (input.name === 'tags') {
      // Handled above via hidden input — skip
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
