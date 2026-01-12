/**
 * StoragePhotoUploader Component
 * Simplified photo uploader for storage units (max 1 photo, no cropping)
 * Designed specifically for the storage subdomain
 */

export class StoragePhotoUploader {
  constructor(containerId, options = {}) {
    this.container = document.getElementById(containerId);
    this.maxPhotos = 1; // Storage units only need 1 photo
    this.selectedFile = null;
    this.previewUrl = null;
    this.fileInputId = `storage-photo-input-${Date.now()}`;
    this.onChange = options.onChange || (() => {});
  }
  
  render() {
    if (!this.container) {
      console.error('StoragePhotoUploader container not found');
      return;
    }
    
    const uploader = document.createElement('div');
    uploader.className = 'storage-photo-uploader';
    
    uploader.innerHTML = `
      <div class="uploader-header">
        <label class="form-label">Photo <span class="optional">(Optional)</span></label>
        <p class="form-help">JPEG, PNG, or HEIC/HEIF. Max 10MB.</p>
      </div>
      
      <div class="uploader-body">
        <div class="uploader-dropzone" id="dropzone-${this.fileInputId}">
          <div class="dropzone-content" id="dropzone-content-${this.fileInputId}">
            <div class="dropzone-icon">📷</div>
            <div class="dropzone-text">
              <strong>Click to upload</strong> or drag and drop
            </div>
            <div class="dropzone-hint">JPEG, PNG, or HEIC/HEIF (max 10MB)</div>
          </div>
          
          <div class="photo-preview-container hidden" id="preview-${this.fileInputId}">
            <img class="photo-preview-img" id="preview-img-${this.fileInputId}" alt="Photo preview">
            <div class="photo-preview-overlay">
              <button type="button" class="btn-remove-photo" id="btn-remove-${this.fileInputId}">
                <span>✕</span> Remove
              </button>
            </div>
            <div class="photo-info" id="photo-info-${this.fileInputId}"></div>
          </div>
        </div>
        
        <input 
          type="file" 
          id="${this.fileInputId}" 
          accept="image/jpeg,image/jpg,image/png,image/heic,image/heif" 
          style="display: none;"
        >
      </div>
    `;
    
    this.container.innerHTML = '';
    this.container.appendChild(uploader);
    
    // Add event listeners
    this.attachEventListeners();
  }
  
  attachEventListeners() {
    const dropzone = document.getElementById(`dropzone-${this.fileInputId}`);
    const fileInput = document.getElementById(this.fileInputId);
    const removeBtn = document.getElementById(`btn-remove-${this.fileInputId}`);
    
    if (!dropzone || !fileInput) return;
    
    // Click to upload
    dropzone.addEventListener('click', (e) => {
      // Don't trigger if clicking remove button
      if (e.target.closest('.btn-remove-photo')) return;
      fileInput.click();
    });
    
    // File input change
    fileInput.addEventListener('change', (e) => {
      this.handleFileSelection(e);
    });
    
    // Remove button
    if (removeBtn) {
      removeBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        this.removePhoto();
      });
    }
    
    // Drag and drop
    dropzone.addEventListener('dragover', (e) => {
      e.preventDefault();
      dropzone.classList.add('dragover');
    });
    
    dropzone.addEventListener('dragleave', (e) => {
      e.preventDefault();
      dropzone.classList.remove('dragover');
    });
    
    dropzone.addEventListener('drop', (e) => {
      e.preventDefault();
      dropzone.classList.remove('dragover');
      
      const files = e.dataTransfer.files;
      if (files.length > 0) {
        this.handleFile(files[0]);
      }
    });
  }
  
  async handleFileSelection(event) {
    const files = event.target.files;
    
    if (files.length === 0) return;
    
    this.handleFile(files[0]);
  }
  
  handleFile(file) {
    // Validate file
    try {
      this.validateFile(file);
    } catch (error) {
      this.showError(error.message);
      return;
    }
    
    // Set selected file
    this.selectedFile = file;
    
    // Create preview
    this.createPreview(file);
    
    // Trigger callback
    this.onChange(file);
  }
  
  validateFile(file) {
    // Check file type
    const validTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/heic', 'image/heif'];
    if (!validTypes.includes(file.type)) {
      throw new Error('Invalid file type. Please use JPEG, PNG, or HEIC/HEIF.');
    }
    
    // Check file size (10MB)
    const maxSize = 10 * 1024 * 1024;
    if (file.size > maxSize) {
      throw new Error('File too large. Maximum size is 10MB.');
    }
  }
  
  createPreview(file) {
    const dropzoneContent = document.getElementById(`dropzone-content-${this.fileInputId}`);
    const previewContainer = document.getElementById(`preview-${this.fileInputId}`);
    const previewImg = document.getElementById(`preview-img-${this.fileInputId}`);
    const photoInfo = document.getElementById(`photo-info-${this.fileInputId}`);
    
    if (!dropzoneContent || !previewContainer || !previewImg || !photoInfo) return;
    
    // Hide dropzone content, show preview
    dropzoneContent.classList.add('hidden');
    previewContainer.classList.remove('hidden');
    
    // Read file and create preview
    const reader = new FileReader();
    reader.onload = (e) => {
      this.previewUrl = e.target.result;
      previewImg.src = this.previewUrl;
    };
    reader.readAsDataURL(file);
    
    // Update photo info
    photoInfo.innerHTML = `
      <div class="photo-name">${file.name}</div>
      <div class="photo-size">${this.formatFileSize(file.size)}</div>
    `;
  }
  
  removePhoto() {
    const dropzoneContent = document.getElementById(`dropzone-content-${this.fileInputId}`);
    const previewContainer = document.getElementById(`preview-${this.fileInputId}`);
    const fileInput = document.getElementById(this.fileInputId);
    
    if (!dropzoneContent || !previewContainer || !fileInput) return;
    
    // Clear data
    this.selectedFile = null;
    this.previewUrl = null;
    fileInput.value = '';
    
    // Show dropzone content, hide preview
    dropzoneContent.classList.remove('hidden');
    previewContainer.classList.add('hidden');
    
    // Trigger callback
    this.onChange(null);
  }
  
  formatFileSize(bytes) {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
  }
  
  showError(message) {
    // Use toast if available, otherwise alert
    if (window.showError) {
      window.showError(message);
    } else if (typeof window.toast !== 'undefined') {
      window.toast.error('Photo Error', message);
    } else {
      alert(message);
    }
  }
  
  // Public methods
  
  getSelectedFile() {
    return this.selectedFile;
  }
  
  hasPhoto() {
    return this.selectedFile !== null;
  }
  
  clear() {
    this.removePhoto();
  }
}

export default StoragePhotoUploader;
