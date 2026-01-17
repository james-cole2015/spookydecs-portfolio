/**
 * Tab Bar Component
 * Handles tab navigation between By Rule, By Item, and Orphaned views
 */

class TabBar {
    constructor(container, onTabChange) {
        this.container = container;
        this.onTabChange = onTabChange;
        this.activeTab = getCurrentTab();
    }

    /**
     * Set active tab
     */
    setActiveTab(tab) {
        this.activeTab = tab;
        setCurrentTab(tab);
        this.render();
        
        if (this.onTabChange) {
            this.onTabChange(tab);
        }
    }

    /**
     * Render tab bar
     */
    render() {
        this.container.innerHTML = `
            <div class="tab-bar">
                <button class="tab-btn ${this.activeTab === 'by-rule' ? 'active' : ''}" 
                        data-tab="by-rule">
                    By Rule
                </button>
                <button class="tab-btn ${this.activeTab === 'by-item' ? 'active' : ''}" 
                        data-tab="by-item">
                    By Item
                </button>
                <button class="tab-btn ${this.activeTab === 'orphaned' ? 'active' : ''}" 
                        data-tab="orphaned" 
                        disabled
                        title="Coming soon">
                    Orphaned Resources
                </button>
            </div>
        `;

        // Add event listeners
        this.container.querySelectorAll('.tab-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const tab = e.target.dataset.tab;
                if (!e.target.disabled) {
                    this.setActiveTab(tab);
                }
            });
        });
    }
}
