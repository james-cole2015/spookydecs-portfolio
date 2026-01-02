// Loading Spinner Component

export class Spinner {
  constructor() {
    this.overlay = null;
  }

  show(message = 'Loading...') {
    // Remove existing spinner if any
    this.hide();

    this.overlay = document.createElement('div');
    this.overlay.id = 'spinner-overlay';
    this.overlay.style.cssText = `
      position: fixed;
      top: 0;
      left: 0;
      width: 100%;
      height: 100vh;
      background: rgba(0, 0, 0, 0.4);
      display: flex;
      align-items: center;
      justify-content: center;
      z-index: 9998;
      animation: fadeIn 0.2s ease;
    `;

    this.overlay.innerHTML = `
      <div style="
        background: white;
        padding: 32px 48px;
        border-radius: 12px;
        box-shadow: 0 20px 25px rgba(0,0,0,0.15);
        text-align: center;
      ">
        <div class="spinner"></div>
        <p style="
          margin: 16px 0 0 0;
          font-size: 14px;
          color: #475569;
          font-weight: 500;
        ">${message}</p>
      </div>
    `;

    // Add spinner styles if not already present
    if (!document.getElementById('spinner-styles')) {
      const style = document.createElement('style');
      style.id = 'spinner-styles';
      style.textContent = `
        @keyframes fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        
        .spinner {
          width: 48px;
          height: 48px;
          border: 4px solid #e2e8f0;
          border-top-color: #3b82f6;
          border-radius: 50%;
          animation: spin 0.8s linear infinite;
          margin: 0 auto;
        }
        
        @keyframes spin {
          to { transform: rotate(360deg); }
        }
      `;
      document.head.appendChild(style);
    }

    document.body.appendChild(this.overlay);
  }

  hide() {
    if (this.overlay && this.overlay.parentNode) {
      this.overlay.parentNode.removeChild(this.overlay);
      this.overlay = null;
    }
  }
}

// Create singleton instance
export const spinner = new Spinner();
