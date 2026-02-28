// Receipt Upload Modal Component - With PDF → Image Conversion

import { uploadAndProcessReceipt } from '../utils/finance-api.js';
import { toast } from '../shared/toast.js';

export class ReceiptUploadModal {
  constructor() {
    this.modal = null;
    this.onComplete = null;
    this.contextData = {};
  }

  open(contextData = {}, onComplete) {
    this.contextData = contextData;
    this.onComplete = onComplete;

    this.modal = document.createElement('div');
    this.modal.className = 'receipt-upload-modal';
    this.modal.innerHTML = this.render();

    document.body.appendChild(this.modal);

    setTimeout(() => {
      this.modal.classList.add('visible');
    }, 10);

    this.attachListeners();
  }

  render() {
    return `
      <div class="receipt-upload-modal-content">
        <div class="receipt-upload-modal-header">
          <h2 class="receipt-upload-modal-title">Upload Receipt</h2>
          <button class="receipt-upload-close-btn" aria-label="Close">×</button>
        </div>

        <div class="receipt-upload-modal-body">
          <div class="upload-area" id="upload-area">
            <svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
              <polyline points="17 8 12 3 7 8"></polyline>
              <line x1="12" y1="3" x2="12" y2="15"></line>
            </svg>
            <p class="upload-text">
              <strong>Click to upload</strong> or drag and drop
            </p>
            <p class="upload-hint">
              PDF or Image files (JPEG, PNG, GIF, WebP)
            </p>
          </div>

          <input type="file" id="receipt-file-input" accept="image/jpeg,image/jpg,image/png,image/gif,image/webp,application/pdf" style="display: none;">

          <div class="processing-area" id="processing-area" style="display: none;">
            <div class="processing-spinner"></div>
            <p class="processing-text" id="processing-text">Processing...</p>
            <div class="progress-bar">
              <div class="progress-fill" id="progress-fill"></div>
            </div>
          </div>

          <div class="preview-area" id="preview-area" style="display: none;">
            <img id="preview-image" src="" alt="Receipt preview">
            <p class="preview-filename" id="preview-filename"></p>
          </div>
        </div>

        <div class="receipt-upload-modal-footer">
          <button class="btn-secondary" id="cancel-upload-btn">Cancel</button>
        </div>
      </div>
    `;
  }

  attachListeners() {
    const uploadArea = this.modal.querySelector('#upload-area');
    const fileInput = this.modal.querySelector('#receipt-file-input');
    const closeBtn = this.modal.querySelector('.receipt-upload-close-btn');
    const cancelBtn = this.modal.querySelector('#cancel-upload-btn');

    // Click to upload
    uploadArea.addEventListener('click', () => {
      fileInput.click();
    });

    // File selection
    fileInput.addEventListener('change', (e) => {
      if (e.target.files.length > 0) {
        this.handleFileSelect(e.target.files[0]);
      }
    });

    // Drag and drop
    uploadArea.addEventListener('dragover', (e) => {
      e.preventDefault();
      uploadArea.classList.add('dragover');
    });

    uploadArea.addEventListener('dragleave', () => {
      uploadArea.classList.remove('dragover');
    });

    uploadArea.addEventListener('drop', (e) => {
      e.preventDefault();
      uploadArea.classList.remove('dragover');
      
      if (e.dataTransfer.files.length > 0) {
        this.handleFileSelect(e.dataTransfer.files[0]);
      }
    });

    // Close buttons
    closeBtn.addEventListener('click', () => this.close());
    cancelBtn.addEventListener('click', () => this.close());

    // ESC key
    const escHandler = (e) => {
      if (e.key === 'Escape') {
        this.close();
        document.removeEventListener('keydown', escHandler);
      }
    };
    document.addEventListener('keydown', escHandler);

    // Click outside
    this.modal.addEventListener('click', (e) => {
      if (e.target === this.modal) {
        this.close();
      }
    });
  }

  async handleFileSelect(file) {
    console.log('📄 File selected:', file.name, file.type);

    // Validate file type
    const validTypes = [
      'image/jpeg',
      'image/jpg', 
      'image/png',
      'image/gif',
      'image/webp',
      'application/pdf'
    ];

    if (!validTypes.includes(file.type)) {
      toast.error('Invalid file type. Please upload a PDF or image file.');
      return;
    }

    // Show processing UI
    this.showProcessing('Preparing file...');

    try {
      let processedFile = file;

      // Convert PDF to Image if needed
      if (file.type === 'application/pdf') {
        console.log('🔄 PDF detected, converting to image...');
        this.updateProcessingText('Converting PDF to image...');
        
        processedFile = await this.convertPdfToImage(file);
        
        console.log('✅ PDF converted to image:', processedFile.name, processedFile.type);
      }

      // Upload and process with AI (keep processing UI visible)
      this.updateProcessingText('Uploading receipt...');
      this.updateProgress(30);
      
      const result = await uploadAndProcessReceipt(
        processedFile,
        this.contextData,
        (status) => {
          if (status === 'requesting_presign') {
            this.updateProcessingText('Preparing upload...');
            this.updateProgress(40);
          } else if (status === 'uploading_to_s3') {
            this.updateProcessingText('Uploading to cloud...');
            this.updateProgress(60);
          } else if (status === 'processing_with_ai') {
            this.updateProcessingText('AI Data Extraction In Progress..');
            this.updateProgress(80);
          }
        }
      );

      this.updateProgress(100);
      this.updateProcessingText('Complete!');
      console.log('✅ Receipt processed:', result);

      // Call completion callback with extracted data
      if (this.onComplete) {
        this.onComplete(result, result.extraction_id, result.image_id);
      }

      // Close modal
      setTimeout(() => {
        this.close();
      }, 500);

    } catch (error) {
      console.error('❌ Error processing receipt:', error);
      toast.error(`Failed to process receipt: ${error.message}`);
      
      // Reset to upload state
      this.showUploadArea();
    }
  }

  async convertPdfToImage(pdfFile) {
    // Load PDF.js library dynamically
    if (typeof pdfjsLib === 'undefined') {
      await this.loadPdfJs();
    }

    return new Promise((resolve, reject) => {
      const reader = new FileReader();

      reader.onload = async (e) => {
        try {
          const pdfData = new Uint8Array(e.target.result);

          // Load PDF document
          const pdf = await pdfjsLib.getDocument({ data: pdfData }).promise;

          // Process up to 2 pages (see issue #57 to raise this limit)
          const pageCount = Math.min(pdf.numPages, 2);
          const scale = 2.0;

          // Render each page to its own canvas
          const canvases = [];
          for (let i = 1; i <= pageCount; i++) {
            const page = await pdf.getPage(i);
            const viewport = page.getViewport({ scale });

            const canvas = document.createElement('canvas');
            canvas.width = viewport.width;
            canvas.height = viewport.height;

            await page.render({ canvasContext: canvas.getContext('2d'), viewport }).promise;
            canvases.push(canvas);
          }

          // Stitch pages into a single tall canvas
          const totalWidth = canvases[0].width;
          const totalHeight = canvases.reduce((sum, c) => sum + c.height, 0);
          const stitched = document.createElement('canvas');
          stitched.width = totalWidth;
          stitched.height = totalHeight;
          const ctx = stitched.getContext('2d');
          let y = 0;
          for (const c of canvases) {
            ctx.drawImage(c, 0, y);
            y += c.height;
          }

          // Convert stitched canvas to blob (JPEG, 0.92 quality)
          stitched.toBlob((blob) => {
            if (!blob) {
              reject(new Error('Failed to convert PDF to image'));
              return;
            }

            const imageFile = new File(
              [blob],
              pdfFile.name.replace(/\.pdf$/i, '.jpg'),
              { type: 'image/jpeg' }
            );

            resolve(imageFile);
          }, 'image/jpeg', 0.92);

        } catch (error) {
          reject(new Error(`PDF conversion failed: ${error.message}`));
        }
      };

      reader.onerror = () => {
        reject(new Error('Failed to read PDF file'));
      };

      reader.readAsArrayBuffer(pdfFile);
    });
  }

  async loadPdfJs() {
    return new Promise((resolve, reject) => {
      // Load PDF.js from CDN
      const script = document.createElement('script');
      script.src = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js';
      script.onload = () => {
        // Set worker path
        pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';
        resolve();
      };
      script.onerror = () => {
        reject(new Error('Failed to load PDF.js library'));
      };
      document.head.appendChild(script);
    });
  }

  showProcessing(text) {
    if (!this.modal) return;
    
    const uploadArea = this.modal.querySelector('#upload-area');
    const processingArea = this.modal.querySelector('#processing-area');
    const previewArea = this.modal.querySelector('#preview-area');

    if (uploadArea) uploadArea.style.display = 'none';
    if (processingArea) processingArea.style.display = 'block';
    if (previewArea) previewArea.style.display = 'none';

    this.updateProcessingText(text);
    this.updateProgress(0);
  }

  updateProcessingText(text) {
    if (!this.modal) return;
    
    const processingText = this.modal.querySelector('#processing-text');
    if (processingText) {
      processingText.textContent = text;
    }
  }

  updateProgress(percent) {
    if (!this.modal) return;
    
    const progressFill = this.modal.querySelector('#progress-fill');
    if (progressFill) {
      progressFill.style.width = `${percent}%`;
    }
  }

  showPreview(file) {
    if (!this.modal) return;
    
    const processingArea = this.modal.querySelector('#processing-area');
    const previewArea = this.modal.querySelector('#preview-area');
    const previewImage = this.modal.querySelector('#preview-image');
    const previewFilename = this.modal.querySelector('#preview-filename');

    if (!previewImage || !previewFilename) return;

    // Create preview URL
    const previewUrl = URL.createObjectURL(file);
    previewImage.src = previewUrl;
    previewFilename.textContent = file.name;

    // Hide processing, show preview
    if (processingArea) processingArea.style.display = 'none';
    if (previewArea) previewArea.style.display = 'block';

    // Clean up URL after image loads
    previewImage.onload = () => {
      URL.revokeObjectURL(previewUrl);
    };
  }

  showUploadArea() {
    if (!this.modal) return;
    
    const uploadArea = this.modal.querySelector('#upload-area');
    const processingArea = this.modal.querySelector('#processing-area');
    const previewArea = this.modal.querySelector('#preview-area');

    if (uploadArea) uploadArea.style.display = 'block';
    if (processingArea) processingArea.style.display = 'none';
    if (previewArea) previewArea.style.display = 'none';
  }

  close() {
    if (this.modal) {
      this.modal.classList.remove('visible');
      setTimeout(() => {
        if (this.modal && this.modal.parentNode) {
          this.modal.parentNode.removeChild(this.modal);
        }
        this.modal = null;
      }, 200);
    }
  }
}