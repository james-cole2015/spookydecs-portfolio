// Illumination Selector
// Allows selection of items to be illuminated by a spotlight

const IlluminationSelector = {
    currentLocation: null,
    allItems: [],
    selectedItems: [],
    onSelectCallback: null,
    maxSelections: 2,
    
    /**
     * Open illumination selector
     * @param {Object} location - Current location
     * @param {Array} allItems - All items from inventory
     * @param {Function} onSelect - Callback when items are selected
     */
    open(location, allItems, onSelect) {
        this.currentLocation = location;
        this.allItems = allItems;
        this.selectedItems = [];
        this.onSelectCallback = onSelect;
        
        // Check if there are any illuminatable items
        const illuminatableItems = this.getIlluminatableItems();
        
        if (illuminatableItems.length === 0) {
            // Show warning and don't open selector
            UIUtils.showToast(
                '⚠️ No items available to illuminate. Add static props or inflatables to this zone first.',
                'warning'
            );
            
            // Still allow connection but with 0 illuminated items
            if (this.onSelectCallback) {
                this.onSelectCallback([]);
            }
            return;
        }
        
        // Show modal
        document.getElementById('illumination-selector-modal').classList.remove('hidden');
        
        // Render items
        this.renderItems();
        this.updateConfirmButton();
    },
    
    /**
     * Close illumination selector
     */
    close() {
        document.getElementById('illumination-selector-modal').classList.add('hidden');
        this.selectedItems = [];
    },
    
    /**
     * Get items that can be illuminated
     * Must be: inflatable, static_prop, or animatronic
     * Must be in current location's items_deployed
     */
    getIlluminatableItems() {
        const itemsDeployed = this.currentLocation?.items_deployed || [];
        const illuminatableClasses = ['inflatable', 'static_prop', 'animatronic'];
        
        return this.allItems.filter(item => {
            return illuminatableClasses.includes(item.class) && 
                   itemsDeployed.includes(item.id);
        });
    },
    
    /**
     * Render illuminatable items
     */
    renderItems() {
        const container = document.getElementById('illumination-selector-list');
        container.innerHTML = '';
        
        const items = this.getIlluminatableItems();
        
        items.forEach(item => {
            const itemEl = this.createItemElement(item);
            container.appendChild(itemEl);
        });
    },
    
    /**
     * Create an item element
     */
    createItemElement(item) {
        const div = document.createElement('div');
        const isSelected = this.selectedItems.includes(item.id);
        const isDisabled = !isSelected && this.selectedItems.length >= this.maxSelections;
        
        div.className = `illumination-item-card p-4 border-2 rounded-lg transition-all ${
            isSelected 
                ? 'bg-orange-50 border-orange-500' 
                : isDisabled
                    ? 'bg-gray-100 border-gray-300 opacity-60 cursor-not-allowed'
                    : 'bg-white border-gray-300 hover:border-orange-400 cursor-pointer'
        }`;
        
        if (!isDisabled || isSelected) {
            div.addEventListener('click', () => this.toggleItem(item.id));
        }
        
        const checkbox = isSelected 
            ? '<span class="text-2xl">☑</span>' 
            : '<span class="text-2xl">☐</span>';
        
        const classIcon = this.getClassIcon(item.class);
        
        div.innerHTML = `
            <div class="flex items-center gap-3">
                ${checkbox}
                <div class="flex-1">
                    <div class="flex items-center gap-2">
                        ${classIcon}
                        <span class="font-semibold text-gray-900">${item.short_name || item.name}</span>
                    </div>
                    <div class="text-sm text-gray-600 mt-1">${item.name}</div>
                    <div class="text-xs text-gray-500 mt-1 capitalize">${item.class.replace('_', ' ')}</div>
                </div>
            </div>
        `;
        
        return div;
    },
    
    /**
     * Get icon for item class
     */
    getClassIcon(itemClass) {
        const icons = {
            'inflatable': '🎈',
            'static_prop': '🎭',
            'animatronic': '🤖'
        };
        return `<span class="text-xl">${icons[itemClass] || '📦'}</span>`;
    },
    
    /**
     * Toggle item selection
     */
    toggleItem(itemId) {
        const index = this.selectedItems.indexOf(itemId);
        
        if (index > -1) {
            // Deselect
            this.selectedItems.splice(index, 1);
        } else {
            // Select (if not at max)
            if (this.selectedItems.length < this.maxSelections) {
                this.selectedItems.push(itemId);
            }
        }
        
        this.renderItems();
        this.updateConfirmButton();
    },
    
    /**
     * Update confirm button text
     */
    updateConfirmButton() {
        const button = document.getElementById('illumination-confirm-btn');
        const count = this.selectedItems.length;
        button.textContent = `Confirm (${count}/${this.maxSelections})`;
        
        // Enable button even if 0 selected (allow spotlights with no illumination)
        button.disabled = false;
    },
    
    /**
     * Confirm selection
     */
    confirm() {
        this.close();
        if (this.onSelectCallback) {
            this.onSelectCallback(this.selectedItems);
        }
    },
    
    /**
     * Cancel selection
     */
    cancel() {
        this.close();
        
        // Still need to complete the workflow, just with no illuminated items
        if (this.onSelectCallback) {
            this.onSelectCallback([]);
        }
    }
};