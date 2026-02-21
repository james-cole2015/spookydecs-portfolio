// Idea Create / Edit Page

import { getIdea, createIdea, updateIdea } from '../utils/ideas-api.js';
import { navigateTo } from '../utils/router.js';
import { renderIdeaForm } from '../components/IdeaForm.js';
import { showToast } from '../shared/toast.js';

export async function renderIdeaCreate(container, id) {
  const isEdit = !!id;

  container.innerHTML = `
    <div class="form-page">
      <div class="form-page-header">
        <button class="btn-back" id="back-link" aria-label="Back">&#8592; ${isEdit ? 'Idea' : 'Ideas'}</button>
        <h1>${isEdit ? 'Edit Idea' : 'New Idea'}</h1>
      </div>
      <div id="form-container">
        <div class="empty-state"><div class="loading-spinner" style="margin:0 auto"></div></div>
      </div>
    </div>
  `;

  container.querySelector('#back-link').addEventListener('click', () => {
    navigateTo(isEdit ? `/${id}` : '/');
  });

  let existingIdea = null;
  if (isEdit) {
    try {
      existingIdea = await getIdea(id);
      if (!existingIdea) {
        showToast('Idea not found', 'error');
        navigateTo('/list');
        return;
      }
    } catch (err) {
      showToast('Failed to load idea: ' + err.message, 'error');
      navigateTo('/list');
      return;
    }
  }

  const formContainer = container.querySelector('#form-container');

  renderIdeaForm(
    formContainer,
    existingIdea,
    data => _handleSubmit(data, existingIdea, isEdit),
    () => navigateTo(isEdit ? `/${id}` : '/list')
  );
}

async function _handleSubmit(data, existingIdea, isEdit) {
  const submitBtn = document.querySelector('#form-submit');
  if (submitBtn) {
    submitBtn.disabled = true;
    submitBtn.textContent = isEdit ? 'Saving…' : 'Creating…';
  }

  try {
    const body = {
      title:       data.title,
      season:      data.season,
      status:      data.status,
      description: data.description,
      link:        data.link,
      notes:       data.notes,
      tags:        data.tags,
      images:      data.images
    };

    let resultIdea;

    if (isEdit) {
      // PUT — id must be in body
      body.id = existingIdea.id;
      // Upload new files first if any
      if (data.selectedFiles.length > 0) {
        const newUrls = await _uploadFiles(data.selectedFiles, existingIdea);
        body.images = [...body.images, ...newUrls];
      }
      resultIdea = await updateIdea(body);
      // updateIdea may return the updated idea or just success
      const resultId = resultIdea?.id || existingIdea.id;
      showToast('Idea updated', 'success');
      navigateTo(`/${resultId}`);

    } else {
      // POST — create without images first
      resultIdea = await createIdea(body);
      const createdId = resultIdea?.id || resultIdea;

      // Upload files if any, then update with URLs
      if (data.selectedFiles.length > 0 && createdId) {
        try {
          const newUrls = await _uploadFiles(data.selectedFiles, { id: createdId, season: data.season });
          if (newUrls.length > 0) {
            await updateIdea({ id: createdId, images: newUrls });
          }
        } catch (uploadErr) {
          // Non-fatal — idea exists, photos just didn't attach
          showToast('Idea created (photo upload failed: ' + uploadErr.message + ')', 'warning');
          navigateTo(`/${createdId}`);
          return;
        }
      }

      showToast('Idea created', 'success');
      navigateTo(`/${createdId}`);
    }

  } catch (err) {
    console.error('Submit error:', err);
    showToast((isEdit ? 'Update' : 'Create') + ' failed: ' + err.message, 'error');
    if (submitBtn) {
      submitBtn.disabled = false;
      submitBtn.textContent = isEdit ? 'Save Changes' : 'Create Idea';
    }
  }
}

async function _uploadFiles(files, idea) {
  if (!files.length) return [];

  const service = document.createElement('photo-upload-service');

  const result = await service.upload(files, {
    context:    'idea',
    photo_type: 'catalog',
    category:   'inspiration',
    season:     (idea.season || '').toLowerCase(),
    idea_id:    idea.id
  });

  if (!result?.success) {
    throw new Error('Photo upload service returned failure');
  }

  return (result.photos || [])
    .map(p => p.cloudfront_url)
    .filter(Boolean);
}
