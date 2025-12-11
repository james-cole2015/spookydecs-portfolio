// Modal Management
import { escapeHtml, escapeAttr, getItemById } from './ui.js';
import { createIdea, updateIdea, deleteIdea, uploadImage } from './api.js';

let editingItem = null;
let itemToDelete = null;
let currentImages = []; // Array of image URLs (max 5)

// DOM references - will be initialized in setupModalListeners
let modal, previewModal, deleteModal, imgModal, viewModal;
let seasonInput, typeInput, titleInput, descInput, statusInput, linkInput;
let imagesContainer;

// These will be assigned in setupModalListeners - declare with 'let' here
let showModal, closeModal, clearModalForm;
let openNewModal, openViewModal, openEditModal, openPreview, previewConfirm;
let openDeleteModal, confirmDelete, openImageModal, closeViewModalOnBackdrop;
let addImageSlot, removeImage, moveImageUp, moveImageDown, handleImageUpload;

// Setup modal event listeners
export function setupModalListeners() {
  // Initialize all DOM references first
  modal = document.getElementById('modal');
  previewModal = document.getElementById('previewModal');
  deleteModal = document.getElementById('deleteModal');
  imgModal = document.getElementById('imgModal');
  viewModal = document.getElementById('viewModal');

  seasonInput = document.getElementById('seasonInput');
  typeInput = document.getElementById('typeInput');
  titleInput = document.getElementById('titleInput');
  descInput = document.getElementById('descInput');
  statusInput = document.getElementById('statusInput');
  linkInput = document.getElementById('linkInput');
  imagesContainer = document.getElementById('imagesContainer');

  // Now define all functions that use these DOM references
  showModal = function() {
    modal.classList.remove('hidden');
  };

  closeModal = function() {
    modal.classList.add('hidden');
    editingItem = null;
    currentImages = [];
  };

  clearModalForm = function() {
    seasonInput.value = 'Halloween';
    typeInput.value = 'Idea';
    titleInput.value = '';
    descInput.value = '';
    statusInput.value = 'Idea';
    linkInput.value = '';
    currentImages = [];
    renderImagesSummary();
  };

  function renderImagesSummary() {
    const container = document.getElementById('imagesSummaryContainer');
    if (!container) return;
    
    if (currentImages.length === 0) {
      container.innerHTML = '<span class="text-muted">No images</span>';
    } else {
      container.innerHTML = `
        <div class="images-preview-row">
          ${currentImages.slice(0, 3).map(img => `
            <img src="${escapeAttr(img)}" class="mini-preview" onclick="window.openImageModal('${escapeAttr(img)}')" />
          `).join('')}
          ${currentImages.length > 3 ? `<span class="more-images-badge">+${currentImages.length - 3} more</span>` : ''}
        </div>
      `;
    }
    
    const btn = document.getElementById('btnManageImages');
    if (btn) {
      btn.textContent = `Manage Images (${currentImages.length})`;
    }
  }

  window.updateImageUrl = function(index, url) {
    url = url.trim();
    if (url) {
      currentImages[index] = url;
    } else if (index < currentImages.length) {
      currentImages.splice(index, 1);
    }
    renderManageImagesModal();
  };

  window.openManageImagesModal = function() {
    renderManageImagesModal();
    document.getElementById('manageImagesModal').classList.remove('hidden');
  };

  window.closeManageImagesModal = function() {
    document.getElementById('manageImagesModal').classList.add('hidden');
    renderImagesSummary();
  };

  function renderManageImagesModal() {
    const container = document.getElementById('manageImagesContainer');
    if (!container) return;
    
    container.innerHTML = currentImages.map((img, idx) => `
      <div class="manage-image-slot">
        <div class="manage-slot-header">
          <span class="manage-slot-label">Image ${idx + 1} ${idx === 0 ? '(Primary)' : ''}</span>
          <div class="manage-slot-actions">
            ${idx > 0 ? `<button type="button" class="btn-icon" onclick="window.moveImageUp(${idx})" title="Move up">↑</button>` : ''}
            ${idx < currentImages.length - 1 ? `<button type="button" class="btn-icon" onclick="window.moveImageDown(${idx})" title="Move down">↓</button>` : ''}
            <button type="button" class="btn-icon btn-danger" onclick="window.removeImage(${idx})" title="Remove">✕</button>
          </div>
        </div>
        <img src="${escapeAttr(img)}" class="manage-image-preview" onclick="window.openImageModal('${escapeAttr(img)}')" />
        <input type="text" 
               class="manage-image-url-input" 
               value="${escapeAttr(img)}"
               onchange="window.updateImageUrl(${idx}, this.value)"
               placeholder="Image URL..." />
      </div>
    `).join('');
    
    // Add "Add Image" section if less than 5 images
    if (currentImages.length < 5) {
      container.innerHTML += `
        <div class="add-image-slot">
          <div class="add-image-label">Add New Image</div>
          <div class="add-image-inputs">
            <input type="text" 
                   id="newImageUrl" 
                   class="manage-image-url-input" 
                   placeholder="Enter image URL..."
                   onkeypress="if(event.key==='Enter') window.addImageFromUrl()" />
            <button type="button" class="btn-secondary" onclick="window.addImageFromUrl()">Add URL</button>
          </div>
          <div class="add-image-divider">or</div>
          <div class="add-image-upload">
            <input type="file" 
                   id="newImageUpload" 
                   accept="image/jpeg,image/jpg,image/png,image/webp" 
                   style="display: none;"
                   onchange="window.handleNewImageUpload(this.files[0])" />
            <button type="button" class="btn-secondary" onclick="document.getElementById('newImageUpload').click()">
              Upload Image
            </button>
          </div>
        </div>
      `;
    }
    
    // Update header count
    const header = document.querySelector('#manageImagesModal .modal-header h2');
    if (header) {
      header.textContent = `Manage Images (${currentImages.length}/5)`;
    }
  }

  window.addImageFromUrl = function() {
    const input = document.getElementById('newImageUrl');
    if (!input) return;
    
    const url = input.value.trim();
    if (!url) {
      alert('Please enter an image URL');
      return;
    }
    
    if (currentImages.length >= 5) {
      alert('Maximum 5 images allowed');
      return;
    }
    
    currentImages.push(url);
    input.value = '';
    renderManageImagesModal();
  };

  window.handleNewImageUpload = async function(file) {
    if (!file) return;
    
    if (currentImages.length >= 5) {
      alert('Maximum 5 images allowed');
      return;
    }
    
    const uploadBtn = document.querySelector('#newImageUpload').nextElementSibling;
    const originalText = uploadBtn.textContent;
    
    try {
      uploadBtn.textContent = 'Uploading...';
      uploadBtn.disabled = true;
      
      const finalUrl = await uploadImage(file);
      
      currentImages.push(finalUrl);
      renderManageImagesModal();
      
      uploadBtn.textContent = originalText;
      uploadBtn.disabled = false;
    } catch (error) {
      alert('Upload failed: ' + error.message);
      console.error('Upload error:', error);
      uploadBtn.textContent = originalText;
      uploadBtn.disabled = false;
    }
  };

  removeImage = function(index) {
    if (confirm('Remove this image?')) {
      currentImages.splice(index, 1);
      // Check if we're in the manage modal or main edit modal
      if (!document.getElementById('manageImagesModal').classList.contains('hidden')) {
        renderManageImagesModal();
      } else {
        renderImagesSummary();
      }
    }
  };

  moveImageUp = function(index) {
    if (index > 0) {
      [currentImages[index], currentImages[index - 1]] = [currentImages[index - 1], currentImages[index]];
      renderManageImagesModal();
    }
  };

  moveImageDown = function(index) {
    if (index < currentImages.length - 1) {
      [currentImages[index], currentImages[index + 1]] = [currentImages[index + 1], currentImages[index]];
      renderManageImagesModal();
    }
  };

  openNewModal = function() {
    editingItem = null;
    document.getElementById('modalTitle').textContent = 'New Item';
    clearModalForm();
    showModal();
  };

  openViewModal = function(id) {
    const item = getItemById(id);
    if (!item) return;
    
    document.getElementById('viewItemId').textContent = `Item ID: ${item.id}`;
    
    // Handle both old single image and new images array
    const images = item.images || (item.image ? [item.image] : []);
    const link = item.link || '';
    
    const fields = [
      { label: 'Season', value: item.season },
      { label: 'Type', value: item.type },
      { label: 'Title', value: item.title },
      { label: 'Description', value: item.description },
      { label: 'Status', value: item.status },
      { label: 'Link', value: link }
    ];
    
    const content = fields.map(field => {
      if (!field.value) return '';
      
      let displayValue = escapeHtml(field.value);
      
      if (field.label === 'Link' && field.value) {
        displayValue = `<a href="${escapeAttr(field.value)}" target="_blank">${escapeHtml(field.value)}</a>`;
      }
      
      return `
        <div class="view-field">
          <div class="view-field-label">${field.label}</div>
          <div class="view-field-value">${displayValue}</div>
        </div>
      `;
    }).filter(Boolean).join('');
    
    // Add images carousel if there are any
    let imagesHtml = '';
    if (images.length > 0) {
      imagesHtml = `
        <div class="view-field">
          <div class="view-field-label">Images (${images.length})</div>
          <div class="view-field-value">
            <div class="image-carousel-container">
              <button class="carousel-nav prev" onclick="window.carouselPrev()" ${images.length <= 3 ? 'style="display:none"' : ''}>‹</button>
              <div class="carousel-viewport">
                <div class="carousel-track" id="carouselTrack">
                  ${images.map((img, idx) => `
                    <div class="carousel-slide">
                      <img src="${escapeAttr(img)}" onclick="window.openImageModal('${escapeAttr(img)}')" />
                      ${idx === 0 ? '<span class="carousel-primary-badge">Primary</span>' : ''}
                    </div>
                  `).join('')}
                </div>
              </div>
              <button class="carousel-nav next" onclick="window.carouselNext()" ${images.length <= 3 ? 'style="display:none"' : ''}>›</button>
            </div>
            <div class="carousel-controls">
              <span class="carousel-counter" id="carouselCounter">Showing 1-${Math.min(3, images.length)} of ${images.length}</span>
              <button class="carousel-play-pause" onclick="window.toggleCarouselPlay()" id="carouselPlayBtn">⏸</button>
            </div>
          </div>
        </div>
      `;
    }
    
    document.getElementById('viewContent').innerHTML = `<div class="view-section">${content}${imagesHtml}</div>`;
    
    // Initialize carousel if images exist
    if (images.length > 0) {
      window.initCarousel(images.length);
    }
    
    viewModal.classList.remove('hidden');
  };

  openEditModal = function(id) {
    const item = getItemById(id);
    if (!item) return;
    
    editingItem = item;
    document.getElementById('modalTitle').textContent = 'Edit Item';
    
    seasonInput.value = item.season || 'Halloween';
    typeInput.value = item.type || 'Idea';
    titleInput.value = item.title || '';
    descInput.value = item.description || '';
    statusInput.value = item.status || 'Idea';
    linkInput.value = item.link || '';
    
    // Handle both old single image and new images array
    currentImages = item.images || (item.image ? [item.image] : []);
    currentImages = currentImages.filter(img => img && img.trim()); // Remove empty strings
    
    renderImagesSummary();
    showModal();
  };

  openPreview = function() {
    const title = titleInput.value.trim();
    if (!title) {
      alert('Title is required');
      return;
    }

    const previewData = {
      season: seasonInput.value,
      type: typeInput.value,
      title: title,
      description: descInput.value.trim(),
      status: statusInput.value,
      link: linkInput.value.trim(),
      images: currentImages.filter(img => img && img.trim())
    };

    const imagesHtml = previewData.images.length > 0 ? `
      <div class="view-field">
        <div class="view-field-label">Images (${previewData.images.length})</div>
        <div class="view-field-value">
          <div style="display: flex; gap: 8px; flex-wrap: wrap;">
            ${previewData.images.map((img, idx) => `
              <div style="position: relative;">
                <img src="${escapeAttr(img)}" style="max-width: 150px; border-radius: 8px; border: 2px solid #e5e7eb;" />
                ${idx === 0 ? '<div style="position: absolute; top: 4px; left: 4px; background: #10b981; color: white; padding: 2px 6px; border-radius: 4px; font-size: 10px; font-weight: bold;">PRIMARY</div>' : ''}
              </div>
            `).join('')}
          </div>
        </div>
      </div>
    ` : '';

    document.getElementById('previewContent').innerHTML = `
      <div style="border: 1px solid #e5e7eb; padding: 12px; border-radius: 8px; background: #fafafa;">
        <div class="view-field"><div class="view-field-label">Season</div><div class="view-field-value">${escapeHtml(previewData.season)}</div></div>
        <div class="view-field"><div class="view-field-label">Type</div><div class="view-field-value">${escapeHtml(previewData.type)}</div></div>
        <div class="view-field"><div class="view-field-label">Title</div><div class="view-field-value">${escapeHtml(previewData.title)}</div></div>
        <div class="view-field"><div class="view-field-label">Description</div><div class="view-field-value">${escapeHtml(previewData.description)}</div></div>
        <div class="view-field"><div class="view-field-label">Status</div><div class="view-field-value">${escapeHtml(previewData.status)}</div></div>
        ${previewData.link ? `<div class="view-field"><div class="view-field-label">Link</div><div class="view-field-value"><a href="${escapeAttr(previewData.link)}" target="_blank">${escapeHtml(previewData.link)}</a></div></div>` : ''}
        ${imagesHtml}
      </div>
    `;

    modal.classList.add('hidden');
    previewModal.classList.remove('hidden');
  };

  previewConfirm = async function() {
    const data = {
      season: seasonInput.value,
      type: typeInput.value,
      title: titleInput.value.trim(),
      description: descInput.value.trim(),
      status: statusInput.value,
      link: linkInput.value.trim(),
      images: currentImages.filter(img => img && img.trim())
    };

    try {
      let result;
      if (editingItem) {
        data.id = editingItem.id;
        result = await updateIdea(editingItem.id, data);
      } else {
        result = await createIdea(data);
      }

      if (result.status >= 200 && result.status < 300) {
        alert('Saved successfully!');
        previewModal.classList.add('hidden');
        closeModal();
        await window.loadItems();
      } else {
        console.error('Save failed:', result);
        alert('Save failed: ' + (result.text || JSON.stringify(result.json) || result.status));
      }
    } catch (e) {
      console.error('Error saving:', e);
      alert('Error saving: ' + e.message);
    }
  };

  openDeleteModal = function(id) {
    const item = getItemById(id);
    if (!item) return;
    
    itemToDelete = item;
    document.getElementById('deleteMessage').textContent = `Are you sure you want to delete "${item.title}"?`;
    deleteModal.classList.remove('hidden');
  };

  confirmDelete = async function() {
    if (!itemToDelete) return;

    try {
      const result = await deleteIdea(itemToDelete.id);

      if (result.status >= 200 && result.status < 300) {
        alert('Deleted successfully!');
        deleteModal.classList.add('hidden');
        itemToDelete = null;
        await window.loadItems();
      } else {
        console.error('Delete failed:', result);
        alert('Delete failed: ' + (result.text || JSON.stringify(result.json) || result.status));
      }
    } catch (e) {
      console.error('Error deleting:', e);
      alert('Error deleting: ' + e.message);
    }
  };

  openImageModal = function(url) {
    document.getElementById('imgModalImg').src = url;
    imgModal.classList.remove('hidden');
  };

  closeViewModalOnBackdrop = function(event) {
    if (event.target === viewModal) {
      viewModal.classList.add('hidden');
    }
  };

  // Now setup event listeners
  document.getElementById('btnCancel').addEventListener('click', closeModal);
  document.getElementById('btnClear').addEventListener('click', clearModalForm);
  document.getElementById('btnPreview').addEventListener('click', openPreview);

  document.getElementById('btnPreviewBack').addEventListener('click', () => { 
    previewModal.classList.add('hidden'); 
    showModal(); 
  });
  document.getElementById('btnPreviewConfirm').addEventListener('click', previewConfirm);

  document.getElementById('btnDeleteCancel').addEventListener('click', () => {
    deleteModal.classList.add('hidden');
    itemToDelete = null;
  });
  document.getElementById('btnDeleteConfirm').addEventListener('click', confirmDelete);

  document.getElementById('btnImgClose').addEventListener('click', () => {
    imgModal.classList.add('hidden');
  });

  document.getElementById('btnViewClose').addEventListener('click', () => {
    viewModal.classList.add('hidden');
  });

  // Make functions available globally for onclick handlers
  window.openNewModal = openNewModal;
  window.openViewModal = openViewModal;
  window.openEditModal = openEditModal;
  window.openDeleteModal = openDeleteModal;
  window.openImageModal = openImageModal;
  window.closeViewModalOnBackdrop = closeViewModalOnBackdrop;
  window.removeImage = removeImage;
  window.moveImageUp = moveImageUp;
  window.moveImageDown = moveImageDown;
}

// Carousel functionality
let carouselCurrentPage = 0;
let carouselTotalPages = 0;
let carouselAutoPlay = true;
let carouselInterval = null;

window.initCarousel = function(totalImages) {
  carouselCurrentPage = 0;
  carouselTotalPages = Math.ceil(totalImages / 3);
  carouselAutoPlay = true;
  
  updateCarouselPosition();
  startCarouselAutoPlay();
};

function updateCarouselPosition() {
  const track = document.getElementById('carouselTrack');
  if (!track) return;
  
  const offset = carouselCurrentPage * -100;
  track.style.transform = `translateX(${offset}%)`;
  
  const slides = track.querySelectorAll('.carousel-slide');
  const totalImages = slides.length;
  const startIdx = carouselCurrentPage * 3;
  const endIdx = Math.min(startIdx + 3, totalImages);
  
  const counter = document.getElementById('carouselCounter');
  if (counter) {
    counter.textContent = `Showing ${startIdx + 1}-${endIdx} of ${totalImages}`;
  }
}

window.carouselNext = function() {
  const track = document.getElementById('carouselTrack');
  if (!track) return;
  
  const totalSlides = track.querySelectorAll('.carousel-slide').length;
  const maxPage = Math.ceil(totalSlides / 3) - 1;
  
  if (carouselCurrentPage < maxPage) {
    carouselCurrentPage++;
  } else {
    carouselCurrentPage = 0; // Loop back to start
  }
  
  updateCarouselPosition();
};

window.carouselPrev = function() {
  const track = document.getElementById('carouselTrack');
  if (!track) return;
  
  const totalSlides = track.querySelectorAll('.carousel-slide').length;
  const maxPage = Math.ceil(totalSlides / 3) - 1;
  
  if (carouselCurrentPage > 0) {
    carouselCurrentPage--;
  } else {
    carouselCurrentPage = maxPage; // Loop to end
  }
  
  updateCarouselPosition();
};

window.toggleCarouselPlay = function() {
  carouselAutoPlay = !carouselAutoPlay;
  const btn = document.getElementById('carouselPlayBtn');
  
  if (carouselAutoPlay) {
    btn.textContent = '⏸';
    startCarouselAutoPlay();
  } else {
    btn.textContent = '▶';
    stopCarouselAutoPlay();
  }
};

function startCarouselAutoPlay() {
  stopCarouselAutoPlay(); // Clear any existing interval
  if (carouselAutoPlay) {
    carouselInterval = setInterval(() => {
      window.carouselNext();
    }, 3000); // 3 seconds
  }
}

function stopCarouselAutoPlay() {
  if (carouselInterval) {
    clearInterval(carouselInterval);
    carouselInterval = null;
  }
}
