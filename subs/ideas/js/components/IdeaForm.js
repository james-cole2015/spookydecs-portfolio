// IdeaForm — Create / Edit form component

import { SEASONS, USER_STATUSES } from '../utils/ideas-config.js';

// Module-level state for pending uploads
let _selectedFiles = [];
let _removedImages = [];

/**
 * Render the idea create/edit form into container.
 * @param {HTMLElement} container
 * @param {object|null} idea - existing idea for edit mode, null for create
 * @param {function} onSubmit - called with { title, season, status, description, link, notes, tags, images, selectedFiles }
 * @param {function} onCancel - called when cancel button clicked
 */
export function renderIdeaForm(container, idea, onSubmit, onCancel) {
  _selectedFiles = [];
  _removedImages = [];

  const isEdit = !!idea;
  const existingImages = idea?.images ? [...idea.images] : [];

  const seasonOptions = SEASONS.map(s =>
    `<option value="${s}"${idea?.season === s ? ' selected' : ''}>${s}</option>`
  ).join('');

  const statusOptions = USER_STATUSES.map(s =>
    `<option value="${s}"${(idea?.status || 'Considering') === s ? ' selected' : ''}>${s}</option>`
  ).join('');

  container.innerHTML = `
    <form id="idea-form" novalidate>

      <!-- Core Fields -->
      <div class="form-section">
        <div class="form-section-title">Details</div>

        <div class="form-group">
          <label class="form-label" for="f-title">Title <span class="required">*</span></label>
          <input class="form-input" id="f-title" type="text" maxlength="150"
            value="${escapeAttr(idea?.title || '')}" placeholder="Idea title…" required>
          <div class="form-error" id="f-title-error" style="display:none"></div>
        </div>

        <div class="form-row">
          <div class="form-group">
            <label class="form-label" for="f-season">Season <span class="required">*</span></label>
            <select class="form-select" id="f-season" required>
              <option value="">— select —</option>
              ${seasonOptions}
            </select>
            <div class="form-error" id="f-season-error" style="display:none"></div>
          </div>

          <div class="form-group">
            <label class="form-label" for="f-status">Status</label>
            <select class="form-select" id="f-status">
              ${statusOptions}
            </select>
          </div>
        </div>

        <div class="form-group">
          <label class="form-label" for="f-description">Description</label>
          <textarea class="form-textarea" id="f-description" rows="4"
            placeholder="What is this idea about?">${escapeHtml(idea?.description || '')}</textarea>
        </div>

        <div class="form-group">
          <label class="form-label" for="f-link">Reference Link</label>
          <input class="form-input" id="f-link" type="url"
            value="${escapeAttr(idea?.link || '')}" placeholder="https://…">
          <div class="form-hint">Optional URL to a product page, tutorial, or inspiration.</div>
        </div>

        <div class="form-group">
          <label class="form-label" for="f-tags">Tags</label>
          <input class="form-input" id="f-tags" type="text"
            value="${escapeAttr((idea?.tags || []).join(', '))}"
            placeholder="tag1, tag2, tag3">
          <div class="form-hint">Comma-separated list of tags.</div>
        </div>
      </div>

      <!-- Notes -->
      <div class="form-section">
        <div class="form-section-title">Notes</div>
        <div class="form-group">
          <textarea class="form-textarea" id="f-notes" rows="5"
            placeholder="Internal notes, build details, materials…">${escapeHtml(idea?.notes || '')}</textarea>
        </div>
      </div>

      <!-- Images -->
      <div class="form-section">
        <div class="form-section-title">Images</div>
        <div class="form-images-grid" id="images-grid"></div>
        <label class="form-file-input-label">
          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/>
          </svg>
          Choose images
          <input class="form-file-input" id="f-images" type="file" multiple accept="image/*">
        </label>
        <div class="form-hint" style="margin-top:8px">
          ${isEdit ? 'Add more images or remove existing ones.' : 'Images will be uploaded after the idea is saved.'}
        </div>
      </div>

      <!-- Actions -->
      <div class="form-actions">
        <button type="button" class="btn btn-secondary" id="form-cancel">Cancel</button>
        <button type="submit" class="btn btn-primary" id="form-submit">
          ${isEdit ? 'Save Changes' : 'Create Idea'}
        </button>
      </div>

    </form>
  `;

  // Render existing image thumbnails
  _renderImageGrid(container.querySelector('#images-grid'), existingImages);

  // File picker → local preview
  container.querySelector('#f-images').addEventListener('change', e => {
    const files = Array.from(e.target.files);
    _selectedFiles = [..._selectedFiles, ...files];
    _renderImageGrid(container.querySelector('#images-grid'), existingImages, _selectedFiles);
    e.target.value = ''; // reset so same files can be re-selected
  });

  // Cancel
  container.querySelector('#form-cancel').addEventListener('click', () => onCancel());

  // Submit
  container.querySelector('#idea-form').addEventListener('submit', e => {
    e.preventDefault();
    _handleSubmit(container, existingImages, onSubmit);
  });
}

function _renderImageGrid(grid, existingImages, pendingFiles = []) {
  grid.innerHTML = '';

  // Existing (non-removed) images
  existingImages
    .filter(url => !_removedImages.includes(url))
    .forEach(url => {
      const thumb = _makeThumb(url, () => {
        _removedImages.push(url);
        _renderImageGrid(grid, existingImages, _selectedFiles);
      });
      grid.appendChild(thumb);
    });

  // Pending file previews
  pendingFiles.forEach((file, idx) => {
    const url = URL.createObjectURL(file);
    const thumb = _makeThumb(url, () => {
      _selectedFiles.splice(idx, 1);
      _renderImageGrid(grid, existingImages, _selectedFiles);
    }, true);
    grid.appendChild(thumb);
  });
}

function _makeThumb(src, onRemove, isBlob = false) {
  const wrap = document.createElement('div');
  wrap.className = 'form-image-thumb';
  wrap.innerHTML = `
    <img src="${src}" alt="image preview" loading="lazy">
    <button class="form-image-remove" type="button" title="Remove">×</button>
  `;
  wrap.querySelector('button').addEventListener('click', () => {
    if (isBlob) URL.revokeObjectURL(src);
    onRemove();
  });
  return wrap;
}

function _handleSubmit(container, existingImages, onSubmit) {
  // Collect values
  const title = container.querySelector('#f-title').value.trim();
  const season = container.querySelector('#f-season').value;
  const status = container.querySelector('#f-status').value;
  const description = container.querySelector('#f-description').value.trim();
  const link = container.querySelector('#f-link').value.trim();
  const notes = container.querySelector('#f-notes').value.trim();
  const tagsRaw = container.querySelector('#f-tags').value;
  const tags = tagsRaw.split(',').map(t => t.trim()).filter(Boolean);

  // Kept existing images
  const images = existingImages.filter(url => !_removedImages.includes(url));

  // Clear previous errors
  container.querySelectorAll('.form-error').forEach(el => {
    el.style.display = 'none';
    el.textContent = '';
  });
  container.querySelectorAll('.form-input, .form-select, .form-textarea').forEach(el => {
    el.classList.remove('error');
  });

  // Validate
  let hasError = false;

  if (!title) {
    _showError(container, 'f-title', 'f-title-error', 'Title is required.');
    hasError = true;
  } else if (title.length > 150) {
    _showError(container, 'f-title', 'f-title-error', 'Title must be 150 characters or fewer.');
    hasError = true;
  }

  if (!season) {
    _showError(container, 'f-season', 'f-season-error', 'Season is required.');
    hasError = true;
  }

  if (hasError) return;

  onSubmit({
    title,
    season,
    status,
    description,
    link,
    notes,
    tags,
    images,
    selectedFiles: [..._selectedFiles]
  });
}

function _showError(container, fieldId, errorId, message) {
  const field = container.querySelector(`#${fieldId}`);
  const error = container.querySelector(`#${errorId}`);
  if (field) field.classList.add('error');
  if (error) { error.textContent = message; error.style.display = 'block'; }
}

function escapeHtml(str) {
  return (str || '').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
}

function escapeAttr(str) {
  return (str || '').replace(/"/g, '&quot;');
}
