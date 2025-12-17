// PhotoUploader Component
// Handles photo selection and upload (max 3 photos for decorations)

import { validateFile, uploadPhotos } from '../api/photos.js';

export class PhotoUploader {
  constructor(containerId, maxPhotos = 3) {
    this.container = document.getElementById(containerId);
    this.maxPhotos = maxPhotos;
    this.selectedFiles = [];
    this.fileInputId = `photo-input-${Date.now()}`;
  }
  
  render() {
    if (!this.container) {
      console.error('PhotoUploader container not found');
      return;
    }
    
    const uploader = document.createElement('div');
    uploader.className = 'photo-uploader';
    
    uploader.innerHTML = `
      <div class="uploader-header">
        <label>Photos <span class="optional">(Optional, max ${this.maxPhotos})</span></label>
      </div>
      <div class="uploader-controls">
        <button type="button" class="btn-select-photos" id="btn-select-${this.fileInputId}">
          📤 Select Photos
        </button>
        <div class="photo-count" id="count-${this.fileInputId}">
          No photos selected
        </div>
      </div>
      <div class="photo-preview" id="preview-${this.fileInputId}"></div>
      <input 
        type="file" 
        id="${this.fileInputId}" 
        accept="image/jpeg,image/jpg,image/png,image/heic,image/heif" 
        multiple 
        style="display: none;"
      >
    `;
    
    this.container.innerHTML = '';
    this.container.appendChild(uploader);
    
    // Add event listeners
    this.attachEventListeners();
  }
  
  attachEventListeners() {
    const selectBtn = document.getElementById(`btn-select-${this.fileInputId}`);
    const fileInput = document.getElementById(this.fileInputId);
    
    if (selectBtn && fileInput) {
      selectBtn.addEventListener('click', () => {
        fileInput.click();
      });
      
      fileInput.addEventListener('change', (e) => {
        this.handleFileSelection(e);
      });
    }
  }
  
  handleFileSelection(event) {
    const files = Array.from(event.target.files);
    
    // Check max limit
    if (files.length > this.maxPhotos) {
      this.showError(`Maximum ${this.maxPhotos} photos allowed`);
      event.target.value = '';
      return;
    }
    
    // Validate each file
    try {
      files.forEach(file => validateFile(file));
      this.selectedFiles = files;
      this.updateDisplay();
    } catch (error) {
      this.showError(error.message);
      event.target.value = '';
      this.selectedFiles = [];
      this.updateDisplay();
    }
  }
  
  updateDisplay() {
    const countEl = document.getElementById(`count-${this.fileInputId}`);
    const previewEl = document.getElementById(`preview-${this.fileInputId}`);
    
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
      <strong>${this.selectedFiles.length} photo${this.selectedFiles.length > 1 ? 's' : ''} selected</strong><br>
      <span class="file-names">${fileNames}</span>
    `;
    countEl.className = 'photo-count active';
    
    // Update preview
    previewEl.innerHTML = '';
    this.selectedFiles.forEach((file, index) => {
      const preview = this.createPhotoPreview(file, index);
      previewEl.appendChild(preview);
    });
  }
  
  createPhotoPreview(file, index) {
    const preview = document.createElement('div');
    preview.className = 'photo-preview-item';
    
    const img = document.createElement('img');
    img.className = 'preview-image';
    
    // Read file and create preview
    const reader = new FileReader();
    reader.onload = (e) => {
      img.src = e.target.result;
    };
    reader.readAsDataURL(file);
    
    const info = document.createElement('div');
    info.className = 'preview-info';
    
    const name = document.createElement('div');
    name.className = 'preview-name';
    name.textContent = file.name;
    
    const size = document.createElement('div');
    size.className = 'preview-size';
    size.textContent = this.formatFileSize(file.size);
    
    const badge = document.createElement('div');
    badge.className = 'preview-badge';
    badge.textContent = index === 0 ? 'Primary' : 'Secondary';
    
    const removeBtn = document.createElement('button');
    removeBtn.type = 'button';
    removeBtn.className = 'btn-remove-photo';
    removeBtn.innerHTML = '×';
    removeBtn.addEventListener('click', () => {
      this.removePhoto(index);
    });
    
    info.appendChild(badge);
    info.appendChild(name);
    info.appendChild(size);
    
    preview.appendChild(img);
    preview.appendChild(info);
    preview.appendChild(removeBtn);
    
    return preview;
  }
  
  removePhoto(index) {
    this.selectedFiles.splice(index, 1);
    
    // Clear file input
    const fileInput = document.getElementById(this.fileInputId);
    if (fileInput) {
      fileInput.value = '';
    }
    
    this.updateDisplay();
  }
  
  formatFileSize(bytes) {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
  }
  
  showError(message) {
    // Use toast if available, otherwise alert
    if (typeof window.toast !== 'undefined') {
      window.toast.error('Photo Error', message);
    } else {
      alert(message);
    }
  }
  
  getSelectedFiles() {
    return this.selectedFiles;
  }
  
  hasPhotos() {
    return this.selectedFiles.length > 0;
  }
  
  clear() {
    this.selectedFiles = [];
    const fileInput = document.getElementById(this.fileInputId);
    if (fileInput) {
      fileInput.value = '';
    }
    this.updateDisplay();
  }
  
  async uploadPhotos(itemId, season) {
    if (this.selectedFiles.length === 0) {
      return [];
    }
    
    try {
      const uploadedPhotos = await uploadPhotos(this.selectedFiles, itemId, season.toLowerCase());
      return uploadedPhotos;
    } catch (error) {
      console.error('Failed to upload photos:', error);
      throw error;
    }
  }
}
