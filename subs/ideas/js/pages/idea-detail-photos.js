// Idea Detail — Photo section helpers

import { getIdeaPhotos, updateIdea } from '../utils/ideas-api.js';
import { showToast } from '../shared/toast.js';

export async function loadPhotos(container, ideaId) {
  const grid = container.querySelector('#id-photos-grid');
  if (!grid) return;
  try {
    const photos = await getIdeaPhotos(ideaId);
    if (!photos.length) return;
    grid.innerHTML = photos.map(p => `
      <a href="${_escAttr(p.cloudfront_url)}" target="_blank" rel="noopener" class="bd-photo-thumb">
        <img src="${_escAttr(p.thumb_cloudfront_url || p.cloudfront_url)}" loading="lazy">
      </a>`).join('');
  } catch {
    // silently fail — photos section just stays empty
  }
}

export function attachPhotoUpload(container, idea) {
  const fileInput = container.querySelector('#id-photo-file-input');
  const addBtn    = container.querySelector('#id-add-photo-btn');
  const statusEl  = container.querySelector('#id-photo-status');
  if (!fileInput || !addBtn) return;

  addBtn.addEventListener('click', () => fileInput.click());

  fileInput.addEventListener('change', async () => {
    const files = Array.from(fileInput.files);
    if (!files.length) return;

    addBtn.disabled = true;
    statusEl.textContent = 'Uploading…';
    statusEl.style.display = 'inline';

    try {
      const service = document.createElement('photo-upload-service');
      const result = await service.upload(files, {
        context:    'idea',
        photo_type: 'inspiration',
        season:     idea.season || 'Shared',
        idea_id:    idea.id,
      });
      const newPhotos = result?.photos || [];
      if (!newPhotos.length) throw new Error('Upload failed');

      const newUrls = newPhotos.map(p => p.cloudfront_url).filter(Boolean);
      const mergedImages = [...(idea.images || []), ...newUrls];
      await updateIdea({ ...idea, images: mergedImages });
      idea.images = mergedImages;

      await loadPhotos(container, idea.id);

      // Update hero in-place
      if (newUrls.length) {
        const heroImg = container.querySelector('#hero-img');
        if (heroImg) {
          heroImg.src = idea.images[0];
        } else {
          const heroDiv = container.querySelector('.detail-hero');
          if (heroDiv) {
            heroDiv.innerHTML = `<img id="hero-img" src="${_escAttr(idea.images[0])}" alt="" loading="lazy">`;
          }
        }
      }

      statusEl.textContent = `${newPhotos.length} photo${newPhotos.length > 1 ? 's' : ''} added`;
      showToast('Photos saved', 'success');
    } catch (err) {
      statusEl.textContent = 'Upload failed';
      showToast('Photo upload failed: ' + err.message, 'error');
    } finally {
      addBtn.disabled = false;
      fileInput.value = '';
      setTimeout(() => { statusEl.style.display = 'none'; }, 3000);
    }
  });
}

function _escAttr(str) {
  return (str || '').replace(/"/g, '&quot;');
}
