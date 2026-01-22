// Autocomplete Component
import { CONFIG, configPromise } from '../utils/images-api.js';

export function Autocomplete(options) {
  const {
    name,
    label,
    placeholder = '',
    required = false,
    searchType, // 'item', 'idea', or 'storage'
    onSelect
  } = options;

  const wrapper = document.createElement('div');
  wrapper.className = 'form-group autocomplete-wrapper';

  // Determine help text based on search type
  const helpTextMap = {
    'item': 'items',
    'idea': 'ideas',
    'storage': 'storage units'
  };
  const helpText = helpTextMap[searchType] || searchType;

  wrapper.innerHTML = `
    <label>
      ${label}
      ${required ? '<span class="required">*</span>' : ''}
    </label>
    <div class="autocomplete-container">
      <input
        type="text"
        class="form-control autocomplete-input"
        placeholder="${placeholder}"
        autocomplete="off"
      />
      <button
        type="button"
        class="autocomplete-clear"
        style="display: none;"
        aria-label="Clear selection"
      >×</button>
      <ul class="autocomplete-results" style="display: none;"></ul>
    </div>
    <input type="hidden" name="${name}_selected" class="autocomplete-value" ${required ? 'required' : ''} />
    <div class="autocomplete-item-info" style="display: none;"></div>
    <small class="autocomplete-help">Type to search for ${helpText}</small>
  `;

  const input = wrapper.querySelector('.autocomplete-input');
  const results = wrapper.querySelector('.autocomplete-results');
  const hiddenInput = wrapper.querySelector('.autocomplete-value');
  const clearBtn = wrapper.querySelector('.autocomplete-clear');
  const itemInfo = wrapper.querySelector('.autocomplete-item-info');
  const helpTextElement = wrapper.querySelector('.autocomplete-help');

  let debounceTimer;
  let selectedIndex = -1;
  let currentItems = [];
  let selectedItem = null;

  // Search function
  async function search(query) {
    if (!query || query.length < 2) {
      results.style.display = 'none';
      return;
    }

    // For ideas, if the query looks like a complete ID, show a manual entry option
    if (searchType === 'idea' && query.match(/^idea-[\w-]+$/i)) {
      results.innerHTML = `
        <li class="autocomplete-result-item manual-entry" data-manual-id="${query}">
          <div class="autocomplete-item-header">
            <strong>${query}</strong> - Use this ID
          </div>
          <div class="autocomplete-item-meta">Click or press Enter to use this idea ID</div>
        </li>
      `;
      results.style.display = 'block';

      // Add click handler for manual entry
      const manualEntry = results.querySelector('.manual-entry');
      manualEntry.addEventListener('click', () => {
        const manualIdea = {
          id: query,
          title: 'Manually entered ID'
        };
        selectItem(manualIdea);
      });

      // Continue to search API in background
    }

    try {
      await configPromise;
      const apiBase = CONFIG.API_ENDPOINT;
      
      // Build endpoint based on search type
      let endpoint;
      if (searchType === 'item') {
        endpoint = `${apiBase}/items?search=${encodeURIComponent(query)}&limit=10`;
      } else if (searchType === 'idea') {
        endpoint = `${apiBase}/ideas?search=${encodeURIComponent(query)}&limit=10`;
      } else if (searchType === 'storage') {
        endpoint = `${apiBase}/storage?search=${encodeURIComponent(query)}&limit=10`;
      } else {
        console.error('Unknown searchType:', searchType);
        return;
      }

      console.log(`Autocomplete searching ${searchType}:`, endpoint);

      const response = await fetch(endpoint);
      if (!response.ok) {
        throw new Error(`Search failed: ${response.status} ${response.statusText}`);
      }

      const data = await response.json();
      console.log(`Autocomplete ${searchType} response:`, data);

      // Handle different response formats
      let items;
      if (searchType === 'item') {
        // Items API returns: { items: [...] } or { data: { items: [...] } }
        items = data.items || data.data?.items || [];
      } else if (searchType === 'storage') {
        // Storage API returns: { success: true, data: { storage_units: [...] } }
        items = data.data?.storage_units || data.storage_units || [];
      } else if (searchType === 'idea') {
        // Ideas API returns array directly OR { ideas: [...] } OR { data: { ideas: [...] } }
        if (Array.isArray(data)) {
          items = data;
        } else {
          items = data.ideas || data.data?.ideas || data.data || [];
        }

        // Filter to ensure we only have valid idea objects with IDs
        if (Array.isArray(items)) {
          const totalIdeas = items.length;
          items = items.filter(item => item && (item.id || item.idea_id));

          if (items.length === 0 && totalIdeas > 0) {
            console.warn(`Found ${totalIdeas} ideas but none have IDs. Ideas without IDs cannot be selected.`);
            // Show helpful message to user
            results.innerHTML = `
              <li class="autocomplete-error">
                Found ${totalIdeas} idea(s) but the API didn't return IDs.<br>
                <small style="margin-top: 4px; display: block;">You can manually type an idea ID (e.g., "idea-hal-001") and press Enter to use it.</small>
              </li>`;
            results.style.display = 'block';
            return;
          }
        } else {
          items = [];
        }
      }

      console.log(`Autocomplete ${searchType} items found:`, items.length, items);

      // If we already showed a manual entry option for ideas, and we got no results from API,
      // don't overwrite the manual entry option
      if (searchType === 'idea' && items.length === 0 && results.querySelector('.manual-entry')) {
        console.log('Keeping manual entry option visible, API returned no valid results');
        return;
      }

      displayResults(items);
    } catch (error) {
      console.error('Autocomplete search error:', error);

      // If we already showed a manual entry option for ideas, don't overwrite it with error
      if (searchType === 'idea' && results.querySelector('.manual-entry')) {
        console.log('Keeping manual entry option visible despite API error');
        return;
      }

      results.innerHTML = `<li class="autocomplete-error">Search failed: ${error.message}</li>`;
      results.style.display = 'block';
    }
  }

  // Display results
  function displayResults(items) {
    currentItems = items || [];

    if (!items || items.length === 0) {
      results.innerHTML = '<li class="autocomplete-no-results">No results found</li>';
      results.style.display = 'block';
      return;
    }

    results.innerHTML = items.map((item, index) => {
      if (searchType === 'item') {
        const displayName = item.short_name || item.name || 'Unnamed item';
        const meta = [item.class, item.class_type, item.season].filter(Boolean).join(' • ');
        return `
          <li class="autocomplete-result-item" data-index="${index}" data-id="${item.id}">
            <div class="autocomplete-item-header">
              <strong>${item.id}</strong> - ${displayName}
            </div>
            ${meta ? `<div class="autocomplete-item-meta">${meta}</div>` : ''}
          </li>
        `;
      } else if (searchType === 'storage') {
        const displayName = item.short_name || 'Unnamed storage';
        const meta = [item.class_type, item.season, item.location].filter(Boolean).join(' • ');
        return `
          <li class="autocomplete-result-item" data-index="${index}" data-id="${item.id}">
            <div class="autocomplete-item-header">
              <strong>${item.id}</strong> - ${displayName}
            </div>
            ${meta ? `<div class="autocomplete-item-meta">${meta}</div>` : ''}
          </li>
        `;
      } else {
        // Ideas might use 'idea_id' instead of 'id'
        const ideaId = item.id || item.idea_id;
        return `
          <li class="autocomplete-result-item" data-index="${index}" data-id="${ideaId}">
            <div class="autocomplete-item-header">
              <strong>${ideaId}</strong> - ${item.title || item.name || 'Untitled idea'}
            </div>
          </li>
        `;
      }
    }).join('');

    results.style.display = 'block';
    selectedIndex = -1;

    // Add click handlers
    results.querySelectorAll('.autocomplete-result-item').forEach((li, index) => {
      li.addEventListener('click', () => {
        const item = items[index];
        selectItem(item);
      });
    });
  }

  // Select item
  function selectItem(item) {
    selectedItem = item;
    
    let displayName;
    let itemId;
    
    if (searchType === 'item') {
      displayName = item.short_name || item.name || 'Unnamed item';
      itemId = item.id;
    } else if (searchType === 'storage') {
      displayName = item.short_name || 'Unnamed storage';
      itemId = item.id;
    } else {
      // Ideas might use 'idea_id' instead of 'id'
      displayName = item.title || item.name || 'Untitled idea';
      itemId = item.id || item.idea_id;
    }

    hiddenInput.value = itemId;
    input.value = `${itemId} - ${displayName}`;
    results.style.display = 'none';
    clearBtn.style.display = 'block';

    // Show item details
    if (searchType === 'item' && item) {
      const meta = [item.class, item.class_type, item.season].filter(Boolean).join(' • ');
      itemInfo.innerHTML = `
        <strong>${displayName}</strong>
        ${meta ? `<span class="item-meta">${meta}</span>` : ''}
      `;
      itemInfo.style.display = 'block';
      helpTextElement.style.display = 'none';
    } else if (searchType === 'storage' && item) {
      const meta = [item.class_type, item.season, item.location].filter(Boolean).join(' • ');
      itemInfo.innerHTML = `
        <strong>${displayName}</strong>
        ${meta ? `<span class="item-meta">${meta}</span>` : ''}
      `;
      itemInfo.style.display = 'block';
      helpTextElement.style.display = 'none';
    } else if (searchType === 'idea' && item) {
      itemInfo.innerHTML = `<strong>${displayName}</strong>`;
      itemInfo.style.display = 'block';
      helpTextElement.style.display = 'none';
    }

    if (onSelect) {
      onSelect(itemId, item);
    }
  }

  // Clear selection
  function clearSelection() {
    selectedItem = null;
    hiddenInput.value = '';
    input.value = '';
    results.style.display = 'none';
    clearBtn.style.display = 'none';
    itemInfo.style.display = 'none';
    itemInfo.innerHTML = '';
    helpTextElement.style.display = 'block';
    currentItems = [];

    input.focus();
  }

  // Clear button event
  clearBtn.addEventListener('click', (e) => {
    e.preventDefault();
    clearSelection();
  });

  // Input event with debounce
  input.addEventListener('input', (e) => {
    const value = e.target.value;

    // Show/hide clear button
    clearBtn.style.display = value ? 'block' : 'none';

    // Clear hidden value and item info when typing
    if (hiddenInput.value) {
      hiddenInput.value = '';
      selectedItem = null;
      itemInfo.style.display = 'none';
      helpTextElement.style.display = 'block';
    }

    clearTimeout(debounceTimer);
    debounceTimer = setTimeout(() => {
      search(value);
    }, 300);
  });

  // Keyboard navigation
  input.addEventListener('keydown', (e) => {
    const resultItems = results.querySelectorAll('.autocomplete-result-item');

    if (e.key === 'ArrowDown') {
      e.preventDefault();
      selectedIndex = Math.min(selectedIndex + 1, resultItems.length - 1);
      updateSelection(resultItems);
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      selectedIndex = Math.max(selectedIndex - 1, -1);
      updateSelection(resultItems);
    } else if (e.key === 'Enter') {
      // If an item is selected in dropdown, use it
      if (selectedIndex >= 0 && currentItems[selectedIndex]) {
        e.preventDefault();
        selectItem(currentItems[selectedIndex]);
      }
      // Check if there's a manual entry option visible
      else {
        const manualEntry = results.querySelector('.manual-entry');
        if (manualEntry && searchType === 'idea') {
          e.preventDefault();
          const manualId = manualEntry.getAttribute('data-manual-id');
          const manualIdea = {
            id: manualId,
            title: 'Manually entered ID'
          };
          selectItem(manualIdea);
          console.log('Manual idea ID entered:', manualId);
        }
        // Otherwise, for ideas, allow manual entry if it looks like an ID
        else if (searchType === 'idea' && input.value.trim()) {
          const manualId = input.value.trim();
          // Check if it looks like an idea ID (alphanumeric with dashes)
          if (manualId.match(/^[\w-]+$/) && manualId.length > 3) {
            e.preventDefault();
            // Create a minimal idea object for manual entry
            const manualIdea = {
              id: manualId,
              title: 'Manually entered ID'
            };
            selectItem(manualIdea);
            console.log('Manual idea ID entered:', manualId);
          }
        }
      }
    } else if (e.key === 'Escape') {
      results.style.display = 'none';
    }
  });

  // Update visual selection
  function updateSelection(items) {
    items.forEach((item, index) => {
      if (index === selectedIndex) {
        item.classList.add('selected');
      } else {
        item.classList.remove('selected');
      }
    });
  }

  // Click outside to close
  document.addEventListener('click', (e) => {
    if (!wrapper.contains(e.target)) {
      results.style.display = 'none';
    }
  });

  // Focus event
  input.addEventListener('focus', () => {
    if (input.value.length >= 2) {
      search(input.value);
    }
  });

  // Custom validation for hidden input
  if (required) {
    // Add custom validation message
    hiddenInput.setCustomValidity(`Please select a ${searchType} from the dropdown`);

    // Clear custom validity when a selection is made
    const originalSelectItem = selectItem;
    selectItem = function(item) {
      hiddenInput.setCustomValidity('');
      originalSelectItem.call(this, item);
    };

    // Also monitor the hidden input value changes
    const observer = new MutationObserver(() => {
      if (hiddenInput.value) {
        hiddenInput.setCustomValidity('');
      } else {
        hiddenInput.setCustomValidity(`Please select a ${searchType} from the dropdown`);
      }
    });

    observer.observe(hiddenInput, { attributes: true, attributeFilter: ['value'] });
  }

  return wrapper;
}