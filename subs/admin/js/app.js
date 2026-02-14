// Main application entry point
import { initRouter } from './utils/router.js';

class App {
    constructor() {
        this.config = null;
        this.router = null;
    }

    async init() {
        try {
            this.config = await window.SpookyConfig.get();
            this.initHeader();
            this.router = initRouter(this.config);
        } catch (error) {
            console.error('Failed to initialize app:', error);
            this.showError('Failed to load application. Please refresh the page.');
        }
    }

    initHeader() {
        const header = document.getElementById('spookydecs-header');
        if (header) {
            this.addAboutLink(header);
        }
    }

    addAboutLink(header) {
        const aboutLink = document.createElement('a');
        aboutLink.href = '/admin/about';
        aboutLink.className = 'header-link';
        aboutLink.textContent = 'About';
        aboutLink.setAttribute('data-navigo', '');
        
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

document.addEventListener('DOMContentLoaded', () => {
    const app = new App();
    app.init();
});