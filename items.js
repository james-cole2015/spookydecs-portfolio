// Item Selector Modal Functions

function openItemSelector(selectorType) {
    const modal = document.getElementById('item-selector-modal');
    const classTypeSelect = document.getElementById('modal-class-type');
    
    modal.dataset.selectorType = selectorType;
    
    // Set class type options based on selector type
    if (selectorType === 'source') {
        classTypeSelect.innerHTML = `
            <option value="">Select class type...</option>
            <option value="Receptacle">Receptacle</option>
            <option value="Outlet">Outlet</option>
            <option value="Plug">Plug</option>
            <option value="Cord">Cord</option>
        `;
    } else {
        classTypeSelect.innerHTML = `
            <option value="">Select class type...</option>
            <option value="Outlet">Outlet</option>
            <option value="Plug">Plug</option>
            <option value="Cord">Cord</option>
            <option value="Inflatable">Inflatable</option>
            <option value="Static Prop">Static Prop</option>
            <option value="Animatronic">Animatronic</option>
            <option value="Spot Light">Spot Light</option>
            <option value="String Light">String Light</option>
        `;
    }
    
    modal.classList.remove('hidden');
    document.getElementById('item-search').value = '';
    document.getElementById('items-table-body').innerHTML = '';
}

function closeItemSelector() {
    document.getElementById('item-selector-modal').classList.add('hidden');
}

function filterItemsByClassType() {
    const classType = document.getElementById('modal-class-type').value;
    const selectorType = document.getElementById('item-selector-modal').dataset.selectorType;
    
    if (!classType) {
        document.getElementById('items-table-body').innerHTML = '<tr><td colspan="4" class="text-center py-4 text-gray-500">Please select a class type</td></tr>';
        return;
    }
    
    let filteredItems = AppState.allItems.filter(item => item.class_type === classType);
    
    if (selectorType === 'source') {
        // Source items must have female_ends > 0 and available ports
        filteredItems = filteredItems.filter(item => {
            const femaleEnds = parseInt(item.female_ends) || 0;
            if (femaleEnds === 0) return false;
            
            const availablePorts = PortUtils.getAvailableFemalePorts(item, AppState.connections);
            if (availablePorts.length === 0) return false;
            
            // If receptacle, must be this zone's receptacle
            if (item.class_type === 'Receptacle') {
                const designatedReceptacle = ZONE_RECEPTACLES[AppState.currentZone];
                return item.id === designatedReceptacle;
            }
            
            return true;
        });
    } else {
        // Destination items
        filteredItems = filteredItems.filter(item => {
            // Exclude source item (no self-connection)
            if (AppState.sourceItem && item.id === AppState.sourceItem.id) return false;
            
            // End-of-line items (have power_inlet)
            if (item.power_inlet === true) return true;
            
            // Other items need male_ends > 0 and Male_1 available
            const maleEnds = parseInt(item.male_ends) || 0;
            if (maleEnds === 0) return false;
            
            // Check if Male_1 is available
            const usedPorts = PortUtils.getUsedPorts(item.id, AppState.connections);
            return !usedPorts.male.includes('Male_1');
        });
    }
    
    renderItemsTable(filteredItems, selectorType);
}

function searchItems() {
    const searchTerm = document.getElementById('item-search').value.toLowerCase();
    const classType = document.getElementById('modal-class-type').value;
    const selectorType = document.getElementById('item-selector-modal').dataset.selectorType;
    
    if (!classType) return;
    
    let filteredItems = AppState.allItems.filter(item => {
        return item.class_type === classType && 
               (item.short_name?.toLowerCase().includes(searchTerm) || 
                item.id.toLowerCase().includes(searchTerm));
    });
    
    if (selectorType === 'source') {
        filteredItems = filteredItems.filter(item => {
            const femaleEnds = parseInt(item.female_ends) || 0;
            if (femaleEnds === 0) return false;
            
            const availablePorts = PortUtils.getAvailableFemalePorts(item, AppState.connections);
            if (availablePorts.length === 0) return false;
            
            if (item.class_type === 'Receptacle') {
                const designatedReceptacle = ZONE_RECEPTACLES[AppState.currentZone];
                return item.id === designatedReceptacle;
            }
            
            return true;
        });
    } else {
        filteredItems = filteredItems.filter(item => {
            // Exclude source item
            if (AppState.sourceItem && item.id === AppState.sourceItem.id) return false;
            
            // End-of-line items (have power_inlet)
            if (item.power_inlet === true) return true;
            
            // Other items need male_ends > 0 and Male_1 available
            const maleEnds = parseInt(item.male_ends) || 0;
            if (maleEnds === 0) return false;
            
            const usedPorts = PortUtils.getUsedPorts(item.id, AppState.connections);
            return !usedPorts.male.includes('Male_1');
        });
    }
    
    renderItemsTable(filteredItems, selectorType);
}

function renderItemsTable(items, selectorType) {
    const tbody = document.getElementById('items-table-body');
    
    if (items.length === 0) {
        tbody.innerHTML = '<tr><td colspan="4" class="text-center py-4 text-gray-500">No items found</td></tr>';
        return;
    }
    
    tbody.innerHTML = items.map(item => {
        const availablePorts = PortUtils.getAvailableFemalePorts(item, AppState.connections);
        const deployed = item.deployment_data?.deployed || false;
        
        let statusBadge = '';
        if (item.class_type === 'Receptacle' && item.id === ZONE_RECEPTACLES[AppState.currentZone]) {
            statusBadge = '<span class="text-yellow-600">⭐ Zone receptacle</span>';
        } else if (deployed && availablePorts.length > 0) {
            statusBadge = `<span class="text-blue-600">⚡ ${availablePorts.length} ports</span>`;
        }
        
        return `
            <tr class="hover:bg-gray-50 cursor-pointer" onclick="selectItem('${item.id}', '${selectorType}')">
                <td class="px-4 py-3 text-sm">${item.short_name || 'N/A'}</td>
                <td class="px-4 py-3 text-sm">${item.id}</td>
                <td class="px-4 py-3 text-sm">${item.class_type}</td>
                <td class="px-4 py-3 text-sm">${statusBadge}</td>
            </tr>
        `;
    }).join('');
}

function selectItem(itemId, selectorType) {
    const item = AppState.allItems.find(i => i.id === itemId);
    
    if (selectorType === 'source') {
        AppState.sourceItem = item;
        updateSourceDisplay();
        populateSourcePortDropdown();
    } else {
        AppState.destinationItem = item;
        updateDestinationDisplay();
        
        // Check if spotlight
        if (item.class_type === 'Spot Light') {
            setTimeout(async () => {
                const illuminates = await promptSpotlightIllumination();
                if (illuminates) {
                    AppState.destinationItem.illuminates = illuminates;
                }
            }, 300);
        }
    }
    
    closeItemSelector();
}

function updateSourceDisplay() {
    const display = document.getElementById('source-item-display');
    if (AppState.sourceItem) {
        display.textContent = `${AppState.sourceItem.short_name} (${AppState.sourceItem.id}) - ${AppState.sourceItem.class_type}`;
    } else {
        display.textContent = 'Click to select';
    }
}

function updateDestinationDisplay() {
    const display = document.getElementById('destination-item-display');
    if (AppState.destinationItem) {
        display.textContent = `${AppState.destinationItem.short_name} (${AppState.destinationItem.id}) - ${AppState.destinationItem.class_type}`;
    } else {
        display.textContent = 'Click to select';
    }
}

function populateSourcePortDropdown() {
    const portSelect = document.getElementById('source-port');
    
    if (!AppState.sourceItem) {
        portSelect.innerHTML = '<option value="">Select source item first</option>';
        portSelect.disabled = true;
        return;
    }
    
    const ports = PortUtils.generatePortOptions(AppState.sourceItem, AppState.connections, 'female');
    
    if (ports.length === 0) {
        portSelect.innerHTML = '<option value="">No output ports available</option>';
        portSelect.disabled = true;
        return;
    }
    
    portSelect.disabled = false;
    portSelect.innerHTML = '<option value="">Select port...</option>' + 
        ports.map(port => {
            const status = port.available ? '✓ Available' : '⚠️ In use';
            return `<option value="${port.name}" ${!port.available ? 'disabled' : ''}>${port.name} ${status}</option>`;
        }).join('');
}

async function promptSpotlightIllumination() {
    const deployedDecorations = AppState.allItems.filter(item => {
        const itemClass = item.class_type || '';
        return ['Inflatable', 'Static Prop', 'Animatronic'].includes(itemClass);
    });

    if (deployedDecorations.length === 0) {
        return null;
    }

    return new Promise((resolve) => {
        const modal = document.createElement('div');
        modal.className = 'fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4';
        modal.innerHTML = `
            <div class="bg-white rounded-lg p-6 max-w-md w-full mx-auto max-h-[80vh] overflow-y-auto">
                <h3 class="text-lg font-semibold mb-2">What does this spotlight illuminate?</h3>
                <p class="text-sm text-gray-600 mb-4">Select up to 2 decorations (optional)</p>
                <div class="space-y-2 mb-4">
                    ${deployedDecorations.map(dec => `
                        <label class="flex items-center space-x-2 p-2 hover:bg-gray-50 rounded cursor-pointer">
                            <input type="checkbox" value="${dec.id}" class="spotlight-decoration-check w-5 h-5">
                            <span class="text-sm">${dec.short_name} (${dec.id}) - ${dec.class_type}</span>
                        </label>
                    `).join('')}
                </div>
                <div class="flex justify-end space-x-2">
                    <button class="px-4 py-2 bg-gray-200 rounded hover:bg-gray-300" onclick="this.closest('.fixed').remove(); window.resolveSpotlight(null);">
                        Skip
                    </button>
                    <button class="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700" onclick="window.confirmSpotlight()">
                        Confirm
                    </button>
                </div>
            </div>
        `;
        
        document.body.appendChild(modal);
        
        window.resolveSpotlight = resolve;
        window.confirmSpotlight = () => {
            const checkboxes = modal.querySelectorAll('.spotlight-decoration-check:checked');
            
            if (checkboxes.length > 2) {
                UIUtils.showToast('Maximum 2 decorations can be illuminated', 'error');
                return;
            }
            
            const selected = Array.from(checkboxes).map(cb => cb.value);
            modal.remove();
            resolve(selected.length > 0 ? selected : null);
        };
    });
}

// Export functions
window.ItemSelector = {
    openItemSelector,
    closeItemSelector,
    filterItemsByClassType,
    searchItems,
    selectItem,
    updateSourceDisplay,
    updateDestinationDisplay,
    populateSourcePortDropdown
};

// Make functions available globally for onclick handlers
window.selectItem = selectItem;