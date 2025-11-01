// Modal management functions

// Show view modal
function showViewModal(imageId) {
  const image = allImages.find(img => img.imageId === imageId);
  if (!image) {
    showToast('Image not found', 'error');
    return;
  }
  
  const modal = document.getElementById('editModal');
  const body = document.getElementById('editModalBody');
  
  body.innerHTML = `
    <div class="modal-thumbnail">
      <img src="${image.thumbnailUrl}" alt="${image.title}">
      <div style="margin-top: 8px;">
        <a href="${image.originalUrl}" target="_blank" style="color: #3b82f6; text-decoration: none; font-size: 13px;">
          🔍 View Full Size Image
        </a>
      </div>
    </div>
    
    <div class="modal-content-grid">
      <div class="form-section">
        <h3>Image Attributes</h3>
        
        <div class="metadata-item">
          <span class="metadata-label">Title:</span>
          <span class="metadata-value">${image.title}</span>
        </div>
        
        <div class="metadata-item">
          <span class="metadata-label">Year:</span>
          <span class="metadata-value">${image.year}</span>
        </div>
        
        <div class="metadata-item">
          <span class="metadata-label">Category:</span>
          <span class="metadata-value">${image.category}</span>
        </div>
        
        <div class="metadata-item">
          <span class="metadata-label">Season:</span>
          <span class="metadata-value">${image.season}</span>
        </div>
        
        <div class="metadata-item">
          <span class="metadata-label">Tags:</span>
          <span class="metadata-value">${(image.tags || []).join(', ') || 'None'}</span>
        </div>
        
        <div class="metadata-item">
          <span class="metadata-label">Visible:</span>
          <span class="metadata-value">${image.isVisible ? 'Yes' : 'No'}</span>
        </div>
      </div>
      
      <div class="metadata-section">
        <h3>Image Metadata</h3>
        <div class="metadata-item">
          <span class="metadata-label">Image ID:</span>
          <span class="metadata-value">${image.imageId}</span>
        </div>
        <div class="metadata-item">
          <span class="metadata-label">Dimensions:</span>
          <span class="metadata-value">${image.metadata?.dimensions || 'N/A'}</span>
        </div>
        <div class="metadata-item">
          <span class="metadata-label">Format:</span>
          <span class="metadata-value">${image.metadata?.format || 'N/A'}</span>
        </div>
        <div class="metadata-item">
          <span class="metadata-label">File Size:</span>
          <span class="metadata-value">${formatFileSize(image.metadata?.originalSize)}</span>
        </div>
        <div class="metadata-item">
          <span class="metadata-label">Upload Date:</span>
          <span class="metadata-value">${new Date(image.uploadDate).toLocaleDateString()}</span>
        </div>
        <div class="metadata-item">
          <span class="metadata-label">Sequence:</span>
          <span class="metadata-value">${image.sequence}</span>
        </div>
      </div>
    </div>
    
    <div class="modal-actions">
      <button class="btn-secondary" onclick="closeEditModal()">Close</button>
      <button class="btn-primary" onclick="closeEditModal(); showEditModal('${imageId}')">Edit</button>
    </div>
  `;
  
  modal.style.display = 'flex';
}

// Show edit modal
function showEditModal(imageId) {
  const image = allImages.find(img => img.imageId === imageId);
  if (!image) {
    showToast('Image not found', 'error');
    return;
  }
  
  const modal = document.getElementById('editModal');
  const body = document.getElementById('editModalBody');
  
  // Generate year options (current year - 5 to current year + 10)
  const currentYear = new Date().getFullYear();
  const yearOptions = [];
  for (let y = currentYear - 5; y <= currentYear + 10; y++) {
    yearOptions.push(`<option value="${y}" ${y === image.year ? 'selected' : ''}>${y}</option>`);
  }
  
  body.innerHTML = `
    <div class="modal-thumbnail">
      <img src="${image.thumbnailUrl}" alt="${image.title}">
    </div>
    
    <div class="modal-content-grid">
      <div class="form-section">
        <h3>Edit Attributes</h3>
        
        <div class="form-group">
          <label>Title *</label>
          <input type="text" id="editTitle" value="${image.title}" maxlength="25" required>
        </div>
        
        <div class="form-group">
          <label>Year *</label>
          <select id="editYear" required>
            ${yearOptions.join('')}
          </select>
        </div>
        
        <div class="form-group">
          <label>Category *</label>
          <select id="editCategory" required>
            <option value="myDisplay" ${image.category === 'myDisplay' ? 'selected' : ''}>My Display</option>
            <option value="community" ${image.category === 'community' ? 'selected' : ''}>Community</option>
            <option value="buildProgress" ${image.category === 'buildProgress' ? 'selected' : ''}>Build Progress</option>
          </select>
        </div>
        
        <div class="form-group">
          <label>Season *</label>
          <select id="editSeason" required>
            <option value="halloween" ${image.season === 'halloween' ? 'selected' : ''}>Halloween</option>
            <option value="christmas" ${image.season === 'christmas' ? 'selected' : ''}>Christmas</option>
          </select>
        </div>
        
        <div class="form-group">
          <label>Tags (comma-separated)</label>
          <input type="text" id="editTags" value="${(image.tags || []).join(', ')}">
        </div>
        
        <div class="form-group">
          <label>
            <input type="checkbox" id="editVisible" ${image.isVisible ? 'checked' : ''}>
            Visible on Gallery
          </label>
        </div>
      </div>
      
      <div class="metadata-section">
        <h3>Metadata (Read-only)</h3>
        <div class="metadata-item">
          <span class="metadata-label">Image ID:</span>
          <span class="metadata-value">${image.imageId}</span>
        </div>
        <div class="metadata-item">
          <span class="metadata-label">Dimensions:</span>
          <span class="metadata-value">${image.metadata?.dimensions || 'N/A'}</span>
        </div>
        <div class="metadata-item">
          <span class="metadata-label">Format:</span>
          <span class="metadata-value">${image.metadata?.format || 'N/A'}</span>
        </div>
        <div class="metadata-item">
          <span class="metadata-label">File Size:</span>
          <span class="metadata-value">${formatFileSize(image.metadata?.originalSize)}</span>
        </div>
        <div class="metadata-item">
          <span class="metadata-label">Upload Date:</span>
          <span class="metadata-value">${new Date(image.uploadDate).toLocaleDateString()}</span>
        </div>
        <div class="metadata-item">
          <span class="metadata-label">Sequence:</span>
          <span class="metadata-value">${image.sequence}</span>
        </div>
      </div>
    </div>
    
    <div class="modal-actions">
      <button class="btn-danger" onclick="confirmDelete('${imageId}')">Delete Image</button>
      <button class="btn-secondary" onclick="closeEditModal()">Cancel</button>
      <button class="btn-primary" onclick="confirmUpdate('${imageId}')">Save Changes</button>
    </div>
  `;
  
  modal.style.display = 'flex';
}

function closeEditModal() {
  document.getElementById('editModal').style.display = 'none';
}

// Confirm update
function confirmUpdate(imageId) {
  const title = document.getElementById('editTitle').value.trim();
  const year = parseInt(document.getElementById('editYear').value);
  const category = document.getElementById('editCategory').value;
  const season = document.getElementById('editSeason').value;
  const tagsInput = document.getElementById('editTags').value.trim();
  const isVisible = document.getElementById('editVisible').checked;
  
  // Validation
  if (!title || title.length > 25) {
    showToast('Title is required (max 25 characters)', 'error');
    return;
  }
  
  const tags = tagsInput ? tagsInput.split(',').map(t => t.trim()).filter(t => t) : [];
  
  const updates = { title, year, category, season, tags, isVisible };
  
  showConfirmModal(
    'Confirm Changes',
    `Are you sure you want to update this image?`,
    () => performUpdate(imageId, updates)
  );
}

async function performUpdate(imageId, updates) {
  try {
    await API.updateImage(imageId, updates);
    showToast('Image updated successfully', 'success');
    closeEditModal();
    closeConfirmModal();
    
    // Reload images
    await loadImages();
  } catch (error) {
    console.error('Error updating image:', error);
    showToast('Failed to update image: ' + error.message, 'error');
  }
}

// Confirm delete
function confirmDelete(imageId) {
  const image = allImages.find(img => img.imageId === imageId);
  
  showConfirmModal(
    'Delete Image',
    `Are you sure you want to delete "${image.title}"? This will remove the image from both DynamoDB and S3. This action cannot be undone.`,
    () => performDelete(imageId)
  );
}

async function performDelete(imageId) {
  try {
    await API.deleteImage(imageId);
    showToast('Image deleted successfully', 'success');
    closeEditModal();
    closeConfirmModal();
    
    // Reload images
    await loadImages();
  } catch (error) {
    console.error('Error deleting image:', error);
    showToast('Failed to delete image: ' + error.message, 'error');
  }
}

// Upload modal
function showUploadModal() {
  const modal = document.getElementById('uploadModal');
  const body = document.getElementById('uploadModalBody');
  
  const currentYear = new Date().getFullYear();
  const yearOptions = [];
  for (let y = currentYear - 5; y <= currentYear + 10; y++) {
    yearOptions.push(`<option value="${y}" ${y === currentYear ? 'selected' : ''}>${y}</option>`);
  }
  
  body.innerHTML = `
    <form id="uploadForm">
      <div class="form-group">
        <label>Image File *</label>
        <input type="file" id="uploadFile" accept="image/jpeg,image/jpg,image/png" required>
      </div>
      
      <div class="form-group">
        <label>Title * (max 25 characters)</label>
        <input type="text" id="uploadTitle" maxlength="25" required>
      </div>
      
      <div class="form-group">
        <label>Year *</label>
        <select id="uploadYear" required>
          ${yearOptions.join('')}
        </select>
      </div>
      
      <div class="form-group">
        <label>Category *</label>
        <select id="uploadCategory" required>
          <option value="myDisplay">My Display</option>
          <option value="community">Community</option>
          <option value="buildProgress">Build Progress</option>
        </select>
      </div>
      
      <div class="form-group">
        <label>Season *</label>
        <select id="uploadSeason" required>
          <option value="halloween">Halloween</option>
          <option value="christmas">Christmas</option>
        </select>
      </div>
      
      <div class="form-group">
        <label>Tags (comma-separated)</label>
        <input type="text" id="uploadTags" placeholder="e.g., inflatable, lights, skeleton">
      </div>
      
      <div class="modal-actions">
        <button type="button" class="btn-secondary" onclick="closeUploadModal()">Cancel</button>
        <button type="submit" class="btn-primary">Upload</button>
      </div>
    </form>
  `;
  
  document.getElementById('uploadForm').addEventListener('submit', handleUpload);
  modal.style.display = 'flex';
}

function closeUploadModal() {
  document.getElementById('uploadModal').style.display = 'none';
}

async function handleUpload(e) {
  e.preventDefault();
  showToast('Upload functionality is not yet implemented', 'warning');
  // TODO: Implement S3 upload
}

// Confirmation modal
function showConfirmModal(title, message, onConfirm) {
  document.getElementById('confirmTitle').textContent = title;
  document.getElementById('confirmMessage').textContent = message;
  document.getElementById('confirmBtn').onclick = onConfirm;
  document.getElementById('confirmModal').style.display = 'flex';
}

function closeConfirmModal() {
  document.getElementById('confirmModal').style.display = 'none';
}

// Utility
function formatFileSize(bytes) {
  if (!bytes) return 'N/A';
  const kb = bytes / 1024;
  if (kb < 1024) return kb.toFixed(1) + ' KB';
  return (kb / 1024).toFixed(1) + ' MB';
}