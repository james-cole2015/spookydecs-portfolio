// CropModal Component
// Modal interface for cropping photos to square format using Cropper.js

export class CropModal {
  constructor() {
    this.modal = null;
    this.cropper = null;
    this.currentFile = null;
    this.resolvePromise = null;
    this.rejectPromise = null;
    this.isInitialized = false;
  }
  
  /**
   * Initialize the modal (call once on page load)
   */
  init() {
    if (this.isInitialized) return;
    
    // Create modal HTML
    this.modal = document.createElement('div');
    this.modal.className = 'crop-modal';
    this.modal.innerHTML = `
      <div class="crop-modal-backdrop"></div>
      <div class="crop-modal-content">
        <div class="crop-modal-header">
          <h3 class="crop-modal-title">Crop Photo</h3>
          <button type="button" class="crop-modal-close" aria-label="Close">×</button>
        </div>
        <div class="crop-modal-body">
          <div class="crop-container">
            <img id="crop-image" alt="Image to crop">
          </div>
        </div>
        <div class="crop-modal-footer">
          <button type="button" class="btn-secondary crop-skip">Skip Crop</button>
          <button type="button" class="btn-primary crop-confirm">Crop & Continue</button>
        </div>
      </div>
    `;
    
    document.body.appendChild(this.modal);
    
    // Attach event listeners
    this.attachEventListeners();
    
    this.isInitialized = true;
  }
  
  attachEventListeners() {
    // Close button
    const closeBtn = this.modal.querySelector('.crop-modal-close');
    closeBtn.addEventListener('click', () => this.cancel());
    
    // Backdrop click to close
    const backdrop = this.modal.querySelector('.crop-modal-backdrop');
    backdrop.addEventListener('click', () => this.cancel());
    
    // Skip button
    const skipBtn = this.modal.querySelector('.crop-skip');
    skipBtn.addEventListener('click', () => this.skip());
    
    // Confirm button
    const confirmBtn = this.modal.querySelector('.crop-confirm');
    confirmBtn.addEventListener('click', () => this.confirm());
    
    // ESC key to close
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && this.modal.classList.contains('active')) {
        this.cancel();
      }
    });
  }
  
  /**
   * Open modal with a file to crop
   * @param {File} file - Image file to crop
   * @returns {Promise<Blob|File>} - Cropped image blob or original file if skipped
   */
  open(file) {
    return new Promise((resolve, reject) => {
      if (!this.isInitialized) {
        this.init();
      }
      
      this.currentFile = file;
      this.resolvePromise = resolve;
      this.rejectPromise = reject;
      
      // Load image into cropper
      this.loadImage(file);
      
      // Show modal
      this.modal.classList.add('active');
      document.body.style.overflow = 'hidden';
    });
  }
  
  loadImage(file) {
    const img = document.getElementById('crop-image');
    const reader = new FileReader();
    
    reader.onload = (e) => {
      img.src = e.target.result;
      
      // Initialize Cropper.js
      if (this.cropper) {
        this.cropper.destroy();
      }
      
      this.cropper = new Cropper(img, {
        aspectRatio: 1, // Square crop
        viewMode: 1, // Restrict crop box to within the canvas
        dragMode: 'move',
        autoCropArea: 0.8, // Start with 80% of image
        restore: false,
        guides: true,
        center: true,
        highlight: false,
        cropBoxMovable: true,
        cropBoxResizable: true,
        toggleDragModeOnDblclick: false,
        responsive: true,
        background: false,
        modal: true, // Show dark overlay outside crop box
      });
    };
    
    reader.onerror = () => {
      this.rejectPromise(new Error('Failed to load image'));
      this.close();
    };
    
    reader.readAsDataURL(file);
  }
  
  async confirm() {
    if (!this.cropper) {
      this.rejectPromise(new Error('Cropper not initialized'));
      this.close();
      return;
    }
    
    try {
      // Get cropped canvas
      const canvas = this.cropper.getCroppedCanvas({
        width: 800,
        height: 800,
        imageSmoothingEnabled: true,
        imageSmoothingQuality: 'high',
        fillColor: '#ffffff',
      });
      
      // Convert to blob
      canvas.toBlob((blob) => {
        if (!blob) {
          this.rejectPromise(new Error('Failed to generate cropped image'));
          this.close();
          return;
        }
        
        // Create a new File object from blob with original filename
        const croppedFile = new File([blob], this.currentFile.name, {
          type: 'image/jpeg',
          lastModified: Date.now()
        });
        
        this.resolvePromise(croppedFile);
        this.close();
      }, 'image/jpeg', 0.9);
      
    } catch (error) {
      this.rejectPromise(error);
      this.close();
    }
  }
  
  skip() {
    // Return original file without cropping
    this.resolvePromise(this.currentFile);
    this.close();
  }
  
  cancel() {
    // User cancelled - reject the promise
    this.rejectPromise(new Error('Crop cancelled'));
    this.close();
  }
  
  close() {
    // Destroy cropper
    if (this.cropper) {
      this.cropper.destroy();
      this.cropper = null;
    }
    
    // Hide modal
    this.modal.classList.remove('active');
    document.body.style.overflow = '';
    
    // Clear state
    this.currentFile = null;
    this.resolvePromise = null;
    this.rejectPromise = null;
  }
}