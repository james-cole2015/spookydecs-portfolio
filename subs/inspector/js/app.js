/**
 * Inspector App - Main Entry Point
 * Initializes header and router
 */

async function initializeApp() {
    const container = document.getElementById('app-container');

    try {
        container.innerHTML = '<div class="loading">Loading Inspector...</div>';

        if (typeof initRouter === 'function') {
            initRouter();
        } else {
            throw new Error('Router initialization function not found');
        }

    } catch (error) {
        console.error('Failed to initialize app:', error);
        container.innerHTML = `
            <div class="error-container">
                <h2>Failed to Initialize Application</h2>
                <p><strong>Error:</strong> ${error.message}</p>
                <p><strong>Check browser console for details</strong></p>
                <button onclick="location.reload()">Retry</button>
            </div>
        `;
    }
}

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initializeApp);
} else {
    initializeApp();
}