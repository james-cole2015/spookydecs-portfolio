// Receipt Modal Component - View full-size receipt image

export class ReceiptModal {
  constructor() {
    this.modal = null;
    this.isOpen = false;
  }

  show(receiptData) {
    console.log('📸 Opening receipt modal:', receiptData);
    
    this.isOpen = true;
    this.render(receiptData);
    this.attachEventListeners();
    
    // Prevent body scroll when modal is open
    document.body.style.overflow = 'hidden';
  }

  close() {
    if (!this.isOpen) return;
    
    this.isOpen = false;
    
    if (this.modal) {
      this.modal.remove();
      this.modal = null;
    }
    
    // Restore body scroll
    document.body.style.overflow = '';
  }

  render(receiptData) {
    // Remove existing modal if any
    if (this.modal) {
      this.modal.remove();
    }

    // Check if it's a PDF
    const isPDF = receiptData.cloudfront_url?.toLowerCase().endsWith('.pdf');

    // Create modal
    this.modal = document.createElement('div');
    this.modal.className = 'receipt-modal-overlay';
    this.modal.innerHTML = `
      <div class="receipt-modal">
        <div class="receipt-modal-header">
          <div class="receipt-modal-title">
            <h3>${receiptData.vendor || 'Receipt'}</h3>
            <p class="receipt-modal-subtitle">${receiptData.date || ''} • ${receiptData.amount || ''}</p>
          </div>
          <button class="receipt-modal-close" aria-label="Close">✕</button>
        </div>
        <div class="receipt-modal-content">
          ${isPDF ? `
            <div class="receipt-modal-pdf-preview">
              <div class="receipt-modal-pdf-icon">
                <svg width="80" height="80" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path d="M14 2H6C4.9 2 4 2.9 4 4V20C4 21.1 4.9 22 6 22H18C19.1 22 20 21.1 20 20V8L14 2Z" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" fill="currentColor" fill-opacity="0.1"/>
                  <path d="M14 2V8H20" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                  <path d="M10 12H14" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
                  <path d="M10 16H14" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
                  <path d="M10 20H14" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
                </svg>
              </div>
              <p class="receipt-modal-pdf-text">PDF Receipt</p>
              <p class="receipt-modal-pdf-hint">Click "Open in New Tab" to view the receipt</p>
            </div>
          ` : `
            <img 
              src="${receiptData.cloudfront_url || receiptData.image_url}" 
              alt="Receipt" 
              class="receipt-modal-image"
            />
          `}
        </div>
        <div class="receipt-modal-footer">
          ${receiptData.cost_id ? `
            <a href="/costs/${receiptData.cost_id}" class="btn-view-cost">
              View Cost Record →
            </a>
          ` : ''}
          <a 
            href="${receiptData.cloudfront_url || receiptData.image_url}" 
            target="_blank" 
            class="btn-open-new-tab"
          >
            Open in New Tab
          </a>
        </div>
      </div>
    `;

    document.body.appendChild(this.modal);

    // Fade in animation
    requestAnimationFrame(() => {
      this.modal.classList.add('active');
    });
  }

  attachEventListeners() {
    if (!this.modal) return;

    // Close button
    const closeBtn = this.modal.querySelector('.receipt-modal-close');
    if (closeBtn) {
      closeBtn.addEventListener('click', () => this.close());
    }

    // Click outside to close
    this.modal.addEventListener('click', (e) => {
      if (e.target === this.modal) {
        this.close();
      }
    });

    // ESC key to close
    this.escapeHandler = (e) => {
      if (e.key === 'Escape' && this.isOpen) {
        this.close();
      }
    };
    document.addEventListener('keydown', this.escapeHandler);
  }

  destroy() {
    this.close();
    if (this.escapeHandler) {
      document.removeEventListener('keydown', this.escapeHandler);
    }
  }
}

// CSS styles for the modal (inline for simplicity)
const style = document.createElement('style');
style.textContent = `
  .receipt-modal-overlay {
    position: fixed;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background: rgba(0, 0, 0, 0.85);
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: 10000;
    opacity: 0;
    transition: opacity 0.2s;
    padding: 20px;
  }

  .receipt-modal-overlay.active {
    opacity: 1;
  }

  .receipt-modal {
    background: white;
    border-radius: 12px;
    max-width: 900px;
    width: 100%;
    max-height: 90vh;
    display: flex;
    flex-direction: column;
    box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);
    transform: scale(0.95);
    transition: transform 0.2s;
  }

  .receipt-modal-overlay.active .receipt-modal {
    transform: scale(1);
  }

  .receipt-modal-header {
    display: flex;
    justify-content: space-between;
    align-items: flex-start;
    padding: 20px 24px;
    border-bottom: 1px solid #e2e8f0;
  }

  .receipt-modal-title h3 {
    margin: 0;
    font-size: 20px;
    font-weight: 600;
    color: #0f172a;
  }

  .receipt-modal-subtitle {
    margin: 4px 0 0 0;
    font-size: 14px;
    color: #64748b;
  }

  .receipt-modal-close {
    background: none;
    border: none;
    font-size: 24px;
    color: #64748b;
    cursor: pointer;
    padding: 4px 8px;
    line-height: 1;
    transition: color 0.2s;
  }

  .receipt-modal-close:hover {
    color: #0f172a;
  }

  .receipt-modal-content {
    flex: 1;
    overflow: auto;
    padding: 24px;
    display: flex;
    align-items: center;
    justify-content: center;
    background: #f8fafc;
  }

  .receipt-modal-image {
    max-width: 100%;
    max-height: 100%;
    object-fit: contain;
    border-radius: 8px;
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
  }

  .receipt-modal-pdf-preview {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    padding: 60px 20px;
    text-align: center;
  }

  .receipt-modal-pdf-icon {
    color: #040101ff;
    margin-bottom: 24px;
  }

  .receipt-modal-pdf-icon svg {
    filter: drop-shadow(0 2px 8px rgba(220, 38, 38, 0.2));
  }

  .receipt-modal-pdf-text {
    font-size: 18px;
    font-weight: 600;
    color: #0f172a;
    margin: 0 0 8px 0;
  }

  .receipt-modal-pdf-hint {
    font-size: 14px;
    color: #64748b;
    margin: 0;
  }

  .receipt-modal-footer {
    display: flex;
    gap: 12px;
    padding: 16px 24px;
    border-top: 1px solid #e2e8f0;
    justify-content: flex-end;
  }

  .btn-view-cost,
  .btn-open-new-tab {
    padding: 10px 20px;
    border-radius: 6px;
    font-size: 14px;
    font-weight: 500;
    text-decoration: none;
    cursor: pointer;
    transition: all 0.2s;
    border: none;
  }

  .btn-view-cost {
    background: #3b82f6;
    color: white;
  }

  .btn-view-cost:hover {
    background: #2563eb;
  }

  .btn-open-new-tab {
    background: white;
    color: #0f172a;
    border: 1px solid #e2e8f0;
  }

  .btn-open-new-tab:hover {
    background: #f8fafc;
    border-color: #cbd5e1;
  }

  @media (max-width: 768px) {
    .receipt-modal {
      max-height: 95vh;
      margin: 0;
    }

    .receipt-modal-header {
      padding: 16px;
    }

    .receipt-modal-content {
      padding: 16px;
    }

    .receipt-modal-footer {
      flex-direction: column;
      padding: 12px 16px;
    }

    .btn-view-cost,
    .btn-open-new-tab {
      width: 100%;
      text-align: center;
    }
  }
`;
document.head.appendChild(style);