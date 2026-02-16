/**
 * ThemeToggle Component
 *
 * Two-state theme toggle: Dark ↔ Light
 * - Stores preference in localStorage
 * - Applies theme to body element
 * - Smooth transitions between themes
 */

export class ThemeToggle {
  constructor(container) {
    this.container = container;
    this.currentTheme = 'dark'; // dark, light, system
    this.STORAGE_KEY = 'gallery-theme-preference';
  }

  /**
   * Initialize theme toggle
   */
  init() {
    // Load saved preference or default to dark
    this.currentTheme = this.loadPreference();

    // Apply theme immediately
    this.applyTheme(this.currentTheme);

    // Render toggle button
    this.render();

    // Attach event listeners
    this.attachEventListeners();
  }

  /**
   * Render toggle button
   */
  render() {
    const icons = {
      dark: `
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"></path>
        </svg>
      `,
      light: `
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <circle cx="12" cy="12" r="5"></circle>
          <line x1="12" y1="1" x2="12" y2="3"></line>
          <line x1="12" y1="21" x2="12" y2="23"></line>
          <line x1="4.22" y1="4.22" x2="5.64" y2="5.64"></line>
          <line x1="18.36" y1="18.36" x2="19.78" y2="19.78"></line>
          <line x1="1" y1="12" x2="3" y2="12"></line>
          <line x1="21" y1="12" x2="23" y2="12"></line>
          <line x1="4.22" y1="19.78" x2="5.64" y2="18.36"></line>
          <line x1="18.36" y1="5.64" x2="19.78" y2="4.22"></line>
        </svg>
      `
    };

    const labels = {
      dark: 'Dark Mode',
      light: 'Light Mode'
    };

    this.container.innerHTML = `
      <button 
        class="theme-toggle" 
        aria-label="Toggle theme"
        title="${labels[this.currentTheme]}"
      >
        ${icons[this.currentTheme]}
      </button>
    `;

    this.injectStyles();
  }

  /**
   * Inject component styles
   */
  injectStyles() {
    if (document.getElementById('theme-toggle-styles')) return;

    const style = document.createElement('style');
    style.id = 'theme-toggle-styles';
    style.textContent = `
      .theme-toggle {
        display: flex;
        align-items: center;
        justify-content: center;
        width: 40px;
        height: 40px;
        background: transparent;
        border: 1px solid var(--border);
        border-radius: var(--radius-md);
        cursor: pointer;
        transition: all var(--transition-base);
        color: var(--text-primary);
      }

      .theme-toggle:hover {
        background: var(--gray-100);
        border-color: var(--gray-300);
        transform: scale(1.05);
      }

      .theme-toggle:active {
        transform: scale(0.95);
      }

      .theme-toggle svg {
        width: 20px;
        height: 20px;
      }

      /* Animation for icon change */
      .theme-toggle {
        position: relative;
      }

      .theme-toggle svg {
        animation: fadeIn 0.3s ease;
      }

      @keyframes fadeIn {
        from {
          opacity: 0;
          transform: scale(0.8) rotate(-45deg);
        }
        to {
          opacity: 1;
          transform: scale(1) rotate(0deg);
        }
      }

      @media (max-width: 768px) {
        .theme-toggle {
          width: 36px;
          height: 36px;
        }
      }
    `;
    document.head.appendChild(style);
  }

  /**
   * Attach event listeners
   */
  attachEventListeners() {
    const button = this.container.querySelector('.theme-toggle');
    
    button.addEventListener('click', () => {
      this.cycleTheme();
    });
  }

  /**
   * Toggle between dark and light themes
   */
  cycleTheme() {
    this.currentTheme = this.currentTheme === 'dark' ? 'light' : 'dark';
    this.savePreference(this.currentTheme);
    this.applyTheme(this.currentTheme);
    this.render();
    this.attachEventListeners();
  }

  /**
   * Apply theme to document
   */
  applyTheme(theme) {
    document.body.setAttribute('data-theme', theme);
  }

  /**
   * Load theme preference from localStorage
   */
  loadPreference() {
    try {
      const saved = localStorage.getItem(this.STORAGE_KEY);
      if (saved && ['dark', 'light'].includes(saved)) {
        return saved;
      }
    } catch (error) {
      console.error('Failed to load theme preference:', error);
    }
    return 'dark'; // Default to dark
  }

  /**
   * Save theme preference to localStorage
   */
  savePreference(theme) {
    try {
      localStorage.setItem(this.STORAGE_KEY, theme);
    } catch (error) {
      console.error('Failed to save theme preference:', error);
    }
  }

  /**
   * Get current theme
   */
  getCurrentTheme() {
    return this.currentTheme;
  }

  /**
   * Get actual applied theme (resolves 'system' to 'dark' or 'light')
   */
  getAppliedTheme() {
    return document.body.getAttribute('data-theme');
  }

  /**
   * Destroy component
   */
  destroy() {
    this.container.innerHTML = '';
  }
}