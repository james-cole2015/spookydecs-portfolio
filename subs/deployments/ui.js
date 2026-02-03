// UI Utility Functions

function showToast(message, type = 'success') {
    const toast = document.getElementById('toast');
    toast.textContent = message;
    toast.className = `fixed bottom-4 right-4 px-6 py-3 rounded-lg shadow-lg transform transition-transform duration-300 z-50 ${
        type === 'success' ? 'bg-green-600 text-white' : 
        type === 'error' ? 'bg-red-600 text-white' : 
        'bg-blue-600 text-white'
    }`;
    
    setTimeout(() => {
        toast.style.transform = 'translateY(0)';
    }, 10);
    
    setTimeout(() => {
        toast.style.transform = 'translateY(8rem)';
    }, 3000);
}

function generateId() {
    return `conn_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

function getCurrentYear() {
    return new Date().getFullYear();
}

// Navigation
function initNavigation() {
    const navButtons = document.querySelectorAll('.nav-btn');
    const views = document.querySelectorAll('.view');

    navButtons.forEach(button => {
        button.addEventListener('click', () => {
            const targetView = button.getAttribute('data-view');
            
            // Update navigation button styles
            navButtons.forEach(btn => {
                btn.classList.remove('border-blue-500', 'text-blue-600');
                btn.classList.add('border-transparent', 'text-gray-500');
            });
            button.classList.remove('border-transparent', 'text-gray-500');
            button.classList.add('border-blue-500', 'text-blue-600');
            
            // Show/hide views
            views.forEach(view => {
                if (view.id === `${targetView}-view`) {
                    view.classList.remove('hidden');
                } else {
                    view.classList.add('hidden');
                }
            });

            // Hide connection builder if switching to other views
            if (targetView !== 'connection-builder') {
                document.getElementById('connection-builder-view').classList.add('hidden');
            }
            
            // Handle Graph View
            if (targetView === 'graph') {
                showGraphView();
            }

            // Handle Statistics View
            if (targetView === 'statistics') {
                initStatisticsView();
            }
            
            // Handle Historical View
            if (targetView === 'historical') {
                initHistoricalView();
            }
        });
    });
}

// Graph View Integration
let graphViewRoot = null;

function showGraphView() {
    const graphViewContainer = document.getElementById('graph-view');
    
    // Check if GraphView component is loaded
    if (typeof GraphView === 'undefined') {
        // Components not loaded yet, show loading message and retry
        graphViewContainer.innerHTML = '<div class="flex items-center justify-center h-full"><p class="text-gray-600">Loading graph components...</p></div>';
        
        // Retry after a short delay
        setTimeout(showGraphView, 100);
        return;
    }
    
    // Clear and create root element
    graphViewContainer.innerHTML = '<div id="graph-view-root"></div>';
    
    // Create React root and render GraphView component
    if (!graphViewRoot) {
        graphViewRoot = ReactDOM.createRoot(document.getElementById('graph-view-root'));
    }
    graphViewRoot.render(React.createElement(GraphView));
}

// Export functions
window.UIUtils = {
    showToast,
    generateId,
    getCurrentYear,
    initNavigation,
    showGraphView
};