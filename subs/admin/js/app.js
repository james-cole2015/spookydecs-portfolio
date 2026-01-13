// Main application entry point
import { initRouter } from './utils/router.js';
import { loadConfig } from './utils/admin-api.js';

class App {
    constructor() {
        this.config = null;
        this.router = null;
    }

    async init() {
        try {
            // Load configuration
            this.config = await loadConfig();
            
            // Initialize header (assuming external component)
            this.initHeader();
            
            // Initialize router
            this.router = initRouter(this.config);
            
        } catch (error) {
            console.error('Failed to initialize app:', error);
            this.showError('Failed to load application. Please refresh the page.');
        }
    }

    initHeader() {
        // Placeholder for header component initialization
        const header = document.getElementById('spookydecs-header');
        if (header) {
            // Assuming header component will be injected externally
            // Add About link dynamically if needed
            this.addAboutLink(header);
        }
    }

    addAboutLink(header) {
        // Add About link to header navigation
        // This assumes header has a nav element we can append to
        const aboutLink = document.createElement('a');
        aboutLink.href = '/admin/about';
        aboutLink.className = 'header-link';
        aboutLink.textContent = 'About';
        aboutLink.setAttribute('data-navigo', '');
        
        // Try to append to header nav if it exists
        const nav = header.querySelector('nav') || header;
        nav.appendChild(aboutLink);
    }

    showError(message) {
        const container = document.getElementById('app-container');
        if (container) {
            container.innerHTML = `
                <div style="text-align: center; padding: 3rem; color: var(--error);">
                    <h2>Error</h2>
                    <p>${message}</p>
                </div>
            `;
        }
    }
}

// Initialize app when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    const app = new App();
    app.init();
});
