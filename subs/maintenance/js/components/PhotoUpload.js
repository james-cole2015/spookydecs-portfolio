// PhotoUpload.js
// Simplified photo uploader for maintenance records
// Handles file selection, category selection, S3 upload via presigned URLs

export class PhotoUpload {
  constructor(recordData) {
    this.recordData = recordData;
    this.selectedFiles = [];
    this.category = 'documentation'; // default
    this.uploadId = `photo-upload-${Date.now()}`;
    this.isUploading = false;
  }
  
  render() {
    return `
      <div class="photo-upload" id="${this.uploadId}">
        <div class="photo-upload-header">
          <label>Upload Photos <span class="optional">(Optional, max 3)</span></label>
        </div>
        
        <div class="photo-upload-controls">
          <div class="category-selector">
            <label for="category-${this.uploadId}">Category:</label>
            <select id="category-${this.uploadId}" class="category-select">
              <option value="documentation">Documentation</option>
              <option value="before_photos">Before Photos</option>
              <option value="after_photos">After Photos</option>
            </select>
          </div>
          
          <button type="button" class="btn-select-photos" id="btn-select-${this.uploadId}">
            📤 Select Photos
          </button>
          
          <input 
            type="file" 
            id="file-input-${this.uploadId}" 
            accept="image/jpeg,image/jpg,image/png,image/gif,image/webp,image/heic,image/heif" 
            multiple 
            style="display: none;"
          >
        </div>
        
        <div class="photo-count" id="count-${this.uploadId}">
          No photos selected
        </div>
        
        <div class="photo-preview-grid" id="preview-${this.uploadId}"></div>
        
        <div class="upload-progress" id="progress-${this.uploadId}" style="display: none;">
          <div class="progress-bar">
            <div class="progress-fill" id="progress-fill-${this.uploadId}"></div>
          </div>
          <div class="progress-text" id="progress-text-${this.uploadId}">Uploading...</div>
        </div>
      </div>
    `;
  }
  
  attachEventListeners(container) {
    const selectBtn = container.querySelector(`#btn-select-${this.uploadId}`);
    const fileInput = container.querySelector(`#file-input-${this.uploadId}`);
    const categorySelect = container.querySelector(`#category-${this.uploadId}`);
    
    if (selectBtn && fileInput) {
      selectBtn.addEventListener('click', () => {
        if (this.isUploading) {
          this.showError('Upload in progress, please wait...');
          return;
        }
        fileInput.click();
      });
      
      fileInput.addEventListener('change', (e) => {
        this.handleFileSelection(e);
      });
    }
    
    if (categorySelect) {
      categorySelect.addEventListener('change', (e) => {
        this.category = e.target.value;
      });
    }
  }
  
  handleFileSelection(event) {
    const files = Array.from(event.target.files);
    
    // Validate file count
    if (files.length > 3) {
      this.showError('Maximum 3 photos allowed');
      event.target.value = '';
      return;
    }
    
    // Validate file types and sizes
    const maxSize = 10 * 1024 * 1024; // 10MB
    const validTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp', 'image/heic', 'image/heif'];
    
    for (const file of files) {
      if (!validTypes.includes(file.type)) {
        this.showError(`Invalid file type: ${file.name}. Only images allowed.`);
        event.target.value = '';
        return;
      }
      
      if (file.size > maxSize) {
        this.showError(`File too large: ${file.name}. Maximum 10MB.`);
        event.target.value = '';
        return;
      }
    }
    
    this.selectedFiles = files;
    this.updateDisplay();
  }
  
  updateDisplay() {
    const countEl = document.getElementById(`count-${this.uploadId}`);
    const previewEl = document.getElementById(`preview-${this.uploadId}`);
    
    if (!countEl || !previewEl) return;
    
    if (this.selectedFiles.length === 0) {
      countEl.textContent = 'No photos selected';
      countEl.className = 'photo-count';
      previewEl.innerHTML = '';
      return;
    }
    
    // Update count
    const fileNames = this.selectedFiles.map(f => f.name).join(', ');
    countEl.innerHTML = `
      <strong>${this.selectedFiles.length} photo${this.selectedFiles.length > 1 ? 's' : ''} selected</strong>
      <span class="file-names">${fileNames}</span>
    `;
    countEl.className = 'photo-count active';
    
    // Update preview
    previewEl.innerHTML = '';
    this.selectedFiles.forEach((file, index) => {
      const preview = this.createPreview(file, index);
      previewEl.appendChild(preview);
    });
  }
  
  createPreview(file, index) {
    const preview = document.createElement('div');
    preview.className = 'photo-preview-item';
    
    const img = document.createElement('img');
    img.className = 'preview-image';
    
    const reader = new FileReader();
    reader.onload = (e) => {
      img.src = e.target.result;
    };
    reader.readAsDataURL(file);
    
    const info = document.createElement('div');
    info.className = 'preview-info';
    info.innerHTML = `
      <div class="preview-name">${file.name}</div>
      <div class="preview-size">${this.formatFileSize(file.size)}</div>
    `;
    
    const removeBtn = document.createElement('button');
    removeBtn.type = 'button';
    removeBtn.className = 'btn-remove-photo';
    removeBtn.innerHTML = '×';
    removeBtn.addEventListener('click', () => {
      this.removePhoto(index);
    });
    
    preview.appendChild(img);
    preview.appendChild(info);
    preview.appendChild(removeBtn);
    
    return preview;
  }
  
  removePhoto(index) {
    const newFiles = Array.from(this.selectedFiles);
    newFiles.splice(index, 1);
    this.selectedFiles = newFiles;
    
    // Clear file input if no files left
    if (this.selectedFiles.length === 0) {
      const fileInput = document.getElementById(`file-input-${this.uploadId}`);
      if (fileInput) fileInput.value = '';
    }
    
    this.updateDisplay();
  }
  
  formatFileSize(bytes) {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
  }
  
  showError(message) {
    if (typeof window.toast !== 'undefined') {
      window.toast.error('Photo Error', message);
    } else {
      alert(message);
    }
  }
  
  showProgress(show, text = 'Uploading...', percent = 0) {
    const progressEl = document.getElementById(`progress-${this.uploadId}`);
    const progressFill = document.getElementById(`progress-fill-${this.uploadId}`);
    const progressText = document.getElementById(`progress-text-${this.uploadId}`);
    
    if (!progressEl) return;
    
    if (show) {
      progressEl.style.display = 'block';
      if (progressFill) progressFill.style.width = `${percent}%`;
      if (progressText) progressText.textContent = text;
    } else {
      progressEl.style.display = 'none';
    }
  }
  
  hasPhotos() {
    return this.selectedFiles.length > 0;
  }
  
  getCategory() {
    return this.category;
  }
  
  clear() {
    this.selectedFiles = [];
    const fileInput = document.getElementById(`file-input-${this.uploadId}`);
    if (fileInput) fileInput.value = '';
    this.updateDisplay();
    this.showProgress(false);
  }
  
  /**
   * Upload photos and return array of photo objects with IDs
   * @returns {Promise<Array>} Array of {photo_id, photo_type}
   */
  async uploadPhotos() {
    if (this.selectedFiles.length === 0) {
      return [];
    }
    
    this.isUploading = true;
    
    try {
      // Import API functions
      const { getPresignedUrls, uploadToS3, confirmPhotoUpload } = await import('../api.js');
      
      this.showProgress(true, 'Requesting upload URLs...', 10);
      
      // Step 1: Get presigned URLs
      const presignedData = await getPresignedUrls(this.selectedFiles, this.recordData);
      
      if (!presignedData || !presignedData.uploads) {
        throw new Error('Failed to get upload URLs');
      }
      
      this.showProgress(true, 'Uploading to S3...', 30);
      
      // Step 2: Upload each file to S3
      const uploadPromises = presignedData.uploads.map((upload, index) => {
        return uploadToS3(this.selectedFiles[index], upload.presigned_url);
      });
      
      await Promise.all(uploadPromises);
      
      this.showProgress(true, 'Confirming uploads...', 70);
      
      // Step 3: Confirm uploads and get photo_ids
      const photoIds = await confirmPhotoUpload(presignedData.uploads, this.recordData, this.category);
      
      this.showProgress(true, 'Complete!', 100);
      
      // Success
      setTimeout(() => {
        this.showProgress(false);
        this.isUploading = false;
      }, 1000);
      
      return photoIds;
      
    } catch (error) {
      console.error('Photo upload failed:', error);
      this.showProgress(false);
      this.isUploading = false;
      throw error;
    }
  }
}
