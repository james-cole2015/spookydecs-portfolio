// Item selector with autocomplete

import { searchItems, fetchItem } from '../../api.js';
import { debounce } from '../../utils/helpers.js';

export class ItemSelector {
  constructor(prefilledItemId = null, isReadonly = false) {
    this.prefilledItemId = prefilledItemId;
    this.isReadonly = isReadonly;
    this.item = null;
    this.autocompleteResults = [];
    this.debouncedSearch = debounce(this.performItemSearch.bind(this), 300);
  }
  
  setItem(item) {
    this.item = item;
  }
  
  render(itemId = null) {
    const value = itemId || this.prefilledItemId || '';
    
    return `
      <div class="form-section">
        <h3>Item Details</h3>
        
        <div class="form-group">
          <label for="item_id">Item ID <span class="required">*</span></label>
          <div class="autocomplete-container">
            <input 
              type="text" 
              id="item_id" 
              name="item_id"
              class="form-input autocomplete-input" 
              placeholder="Search for item..."
              value="${value}"
              ${this.isReadonly ? 'readonly' : ''}
              required
            >
            ${!this.isReadonly ? `
              <button 
                type="button" 
                class="autocomplete-clear" 
                id="clear-item-btn"
                style="display: ${value ? 'block' : 'none'};"
                aria-label="Clear selection"
              >×</button>
            ` : ''}
            <div class="autocomplete-results" id="item-autocomplete"></div>
          </div>
          ${this.item ? `
            <div class="item-info">
              <strong>${this.item.short_name || 'Unnamed Item'}</strong>
              <span class="item-meta">${this.item.class || ''} • ${this.item.class_type || ''} • ${this.item.season || ''}</span>
            </div>
          ` : ''}
        </div>
      </div>
    `;
  }
  
  attachEventListeners(container, onItemSelected) {
    if (this.isReadonly) return;
    
    const itemInput = container.querySelector('#item_id');
    const clearBtn = container.querySelector('#clear-item-btn');
    
    if (itemInput) {
      itemInput.addEventListener('input', (e) => {
        const query = e.target.value;
        
        if (clearBtn) {
          clearBtn.style.display = query ? 'block' : 'none';
        }
        
        if (query.length >= 2) {
          this.debouncedSearch(query, container, onItemSelected);
        } else {
          this.hideAutocomplete(container);
        }
      });
    }
    
    if (clearBtn) {
      clearBtn.addEventListener('click', () => {
        this.clearSelection(container, onItemSelected);
      });
    }
  }
  
  clearSelection(container, onItemSelected) {
    const itemInput = container.querySelector('#item_id');
    if (itemInput) {
      itemInput.value = '';
      itemInput.focus();
    }
    
    const clearBtn = container.querySelector('#clear-item-btn');
    if (clearBtn) {
      clearBtn.style.display = 'none';
    }
    
    this.prefilledItemId = null;
    this.item = null;
    this.autocompleteResults = [];
    
    this.hideAutocomplete(container);
    
    // Trigger re-render via callback
    if (onItemSelected) {
      onItemSelected(null);
    }
  }
  
  async performItemSearch(query, container, onItemSelected) {
    try {
      const result = await searchItems(query);
      this.autocompleteResults = result.items || [];
      this.showAutocomplete(container, onItemSelected);
    } catch (error) {
      console.error('Search failed:', error);
      this.hideAutocomplete(container);
    }
  }
  
  showAutocomplete(container, onItemSelected) {
    const resultsDiv = container.querySelector('#item-autocomplete');
    if (!resultsDiv) return;
    
    if (this.autocompleteResults.length === 0) {
      resultsDiv.innerHTML = '<div class="autocomplete-empty">No items found</div>';
      resultsDiv.classList.add('show');
      return;
    }
    
    const resultsHtml = this.autocompleteResults.map(item => `
      <div class="autocomplete-result" data-item-id="${item.id}">
        <strong>${item.id}</strong> - ${item.short_name || 'Unnamed Item'}
        <span class="item-meta">${item.class || ''} • ${item.season || ''}</span>
      </div>
    `).join('');
    
    resultsDiv.innerHTML = resultsHtml;
    resultsDiv.classList.add('show');
    
    const resultItems = resultsDiv.querySelectorAll('.autocomplete-result');
    resultItems.forEach(resultItem => {
      resultItem.addEventListener('click', async () => {
        const itemId = resultItem.getAttribute('data-item-id');
        const input = container.querySelector('#item_id');
        
        if (input) {
          input.value = itemId;
          this.prefilledItemId = itemId;
          
          try {
            this.item = await fetchItem(itemId);
            if (onItemSelected) {
              onItemSelected(this.item);
            }
          } catch (err) {
            console.error('Failed to fetch item:', err);
          }
        }
        
        this.hideAutocomplete(container);
      });
    });
  }
  
  hideAutocomplete(container) {
    const resultsDiv = container.querySelector('#item-autocomplete');
    if (resultsDiv) {
      resultsDiv.classList.remove('show');
      resultsDiv.innerHTML = '';
    }
  }
}