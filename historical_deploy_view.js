// Historical Deployments View Handler
class HistoricalDeploymentsView {
  constructor() {
    this.deployments = [];
    this.itemCache = {};
    this.currentExpandedCard = null;
    this.init();
  }

  init() {
    // Initial load when historical view is activated
    this.loadCompletedDeployments();
  }

  async loadCompletedDeployments() {
    const container = document.getElementById('historical-view');
    if (!container) return;

    try {
      showToast('Loading completed deployments...', 'info');
      
      // Fetch all deployments using API service layer
      const data = await API.listDeployments();
      
      // Filter for completed deployments only
      this.deployments = data
        .filter(dep => dep.status === 'complete')
        .sort((a, b) => {
          const dateA = new Date(a.setup_completed_at || a.updated_at);
          const dateB = new Date(b.setup_completed_at || b.updated_at);
          return dateB - dateA; // Most recent first
        });

      if (this.deployments.length === 0) {
        showToast('No Completed Deployments', 'info');
        this.renderEmptyState(container);
        return;
      }

      this.renderDeploymentCards(container);
      showToast(`Loaded ${this.deployments.length} completed deployment${this.deployments.length > 1 ? 's' : ''}`, 'success');
      
    } catch (error) {
      console.error('Error loading completed deployments:', error);
      showToast('Failed to load deployments', 'error');
      this.renderEmptyState(container);
    }
  }

  renderEmptyState(container) {
    container.innerHTML = `
      <div class="bg-white rounded-lg shadow p-6">
        <div class="empty-state">
          <div class="empty-state-icon">📦</div>
          <div class="empty-state-text">No completed deployments yet</div>
        </div>
      </div>
    `;
  }

  renderDeploymentCards(container) {
    const cardsHTML = this.deployments.map(deployment => 
      this.createCardHTML(deployment)
    ).join('');

    container.innerHTML = `
      <div class="bg-white rounded-lg shadow p-6">
        <h2 class="text-2xl font-bold mb-6">Historical Deployments</h2>
        <div class="historical-cards-container">
          ${cardsHTML}
        </div>
      </div>
    `;

    // Attach event listeners
    this.attachCardListeners();
  }

  createCardHTML(deployment) {
    const seasonIcon = deployment.season === 'Halloween' ? '🎃' : '🎄';
    const zoneCounts = this.calculateZoneCounts(deployment);
    const totalItems = zoneCounts.total;
    const completedDate = this.formatDate(deployment.setup_completed_at || deployment.updated_at);

    return `
      <div class="deployment-card" data-deployment-id="${deployment.id}">
        <div class="deployment-card-header">
          <div class="deployment-title">
            <span class="season-icon">${seasonIcon}</span>
            <span class="season-text">${deployment.season} ${deployment.year}</span>
          </div>

          <div class="zone-counts">
            ${this.renderZoneCounts(zoneCounts)}
          </div>

          <div class="deployment-summary">
            <span class="total-items">Total: ${totalItems} item${totalItems !== 1 ? 's' : ''}</span>
            <span class="completed-date">Completed: ${completedDate}</span>
          </div>
        </div>

        <div class="deployment-table-section">
          <div class="table-content">
            <div class="table-loading">Loading items...</div>
          </div>
        </div>
      </div>
    `;
  }

  calculateZoneCounts(deployment) {
    const counts = {
      'Back Yard': 0,
      'Side Yard': 0,
      'Front Yard': 0,
      total: 0
    };

    if (deployment.locations && Array.isArray(deployment.locations)) {
      deployment.locations.forEach(location => {
        const itemsCount = location.items_deployed ? location.items_deployed.length : 0;
        counts[location.name] = itemsCount;
        counts.total += itemsCount;
      });
    }

    return counts;
  }

  renderZoneCounts(zoneCounts) {
    const zones = ['Back Yard', 'Side Yard', 'Front Yard'];
    return zones.map(zone => {
      const count = zoneCounts[zone];
      const emptyClass = count === 0 ? 'empty' : '';
      return `
        <div class="zone-item ${emptyClass}">
          <span class="zone-name">${zone}</span>
          <span class="zone-count">${count} item${count !== 1 ? 's' : ''}</span>
        </div>
      `;
    }).join('');
  }

  formatDate(dateString) {
    if (!dateString) return 'Unknown';
    
    const date = new Date(dateString);
    const options = { 
      month: 'short', 
      day: 'numeric', 
      year: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
      hour12: true
    };
    
    return date.toLocaleDateString('en-US', options);
  }

  attachCardListeners() {
    const cards = document.querySelectorAll('.deployment-card');
    
    cards.forEach(card => {
      const header = card.querySelector('.deployment-card-header');
      
      header.addEventListener('click', (e) => {
        // Don't toggle if clicking close button
        if (e.target.closest('.close-card-btn')) {
          return;
        }
        this.toggleCard(card);
      });
    });

    // Close card when clicking outside
    document.addEventListener('click', (e) => {
      if (this.currentExpandedCard && 
          !e.target.closest('.deployment-card')) {
        this.collapseCard(this.currentExpandedCard);
      }
    });
  }

  async toggleCard(card) {
    const isExpanded = card.classList.contains('expanded');
    
    if (isExpanded) {
      this.collapseCard(card);
    } else {
      // Close any other open card
      if (this.currentExpandedCard && this.currentExpandedCard !== card) {
        this.collapseCard(this.currentExpandedCard);
      }
      await this.expandCard(card);
    }
  }

  async expandCard(card) {
    const deploymentId = card.dataset.deploymentId;
    const deployment = this.deployments.find(d => d.id === deploymentId);
    
    if (!deployment) return;

    // Add close button to title
    const title = card.querySelector('.deployment-title');
    if (!title.querySelector('.close-card-btn')) {
      const closeBtn = document.createElement('button');
      closeBtn.className = 'close-card-btn';
      closeBtn.innerHTML = '×';
      closeBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        this.collapseCard(card);
      });
      title.appendChild(closeBtn);
    }

    card.classList.add('expanded');
    this.currentExpandedCard = card;

    // Load items if not already cached
    const cacheKey = deploymentId;
    if (!this.itemCache[cacheKey]) {
      await this.loadItemsForDeployment(card, deployment);
    } else {
      this.renderItemsTable(card, this.itemCache[cacheKey]);
    }
  }

  collapseCard(card) {
    card.classList.remove('expanded');
    
    // Remove close button
    const closeBtn = card.querySelector('.close-card-btn');
    if (closeBtn) {
      closeBtn.remove();
    }
    
    if (this.currentExpandedCard === card) {
      this.currentExpandedCard = null;
    }
  }

  async loadItemsForDeployment(card, deployment) {
    const tableSection = card.querySelector('.deployment-table-section');
    const tableContent = tableSection.querySelector('.table-content');
    
    try {
      // Collect all unique item IDs
      const itemIds = new Set();
      
      if (deployment.items && Array.isArray(deployment.items)) {
        deployment.items.forEach(id => itemIds.add(id));
      }

      if (itemIds.size === 0) {
        tableContent.innerHTML = '<div class="table-loading">No items in this deployment</div>';
        return;
      }

      // Batch fetch items
      const idsArray = Array.from(itemIds);
      const idsParam = idsArray.join(',');
      
      // Use API service layer to fetch items
      const data = await API.request(`/admin/items?ids=${idsParam}`);
      
      // Map items to zones
      const enrichedItems = this.mapItemsToZones(data.items, deployment);
      
      // Sort by class_type
      enrichedItems.sort((a, b) => {
        const typeA = a.class_type || '';
        const typeB = b.class_type || '';
        return typeA.localeCompare(typeB);
      });

      // Cache the results
      this.itemCache[deployment.id] = enrichedItems;
      
      this.renderItemsTable(card, enrichedItems);
      
    } catch (error) {
      console.error('Error loading items:', error);
      tableContent.innerHTML = '<div class="table-loading" style="color: #dc2626;">Failed to load items</div>';
    }
  }

  mapItemsToZones(items, deployment) {
    const itemsMap = {};
    
    // Create a map of item ID to item object
    items.forEach(item => {
      itemsMap[item.id] = {
        id: item.id,
        short_name: item.short_name || item.id,
        class: item.class || 'Unknown',
        class_type: item.class_type || 'Unknown',
        zone: 'Unknown'
      };
    });

    // Map items to their zones
    if (deployment.locations && Array.isArray(deployment.locations)) {
      deployment.locations.forEach(location => {
        if (location.items_deployed && Array.isArray(location.items_deployed)) {
          location.items_deployed.forEach(itemId => {
            if (itemsMap[itemId]) {
              itemsMap[itemId].zone = location.name;
            }
          });
        }
      });
    }

    return Object.values(itemsMap);
  }

  renderItemsTable(card, items) {
    const tableSection = card.querySelector('.deployment-table-section');
    const tableContent = tableSection.querySelector('.table-content');

    if (items.length === 0) {
      tableContent.innerHTML = '<div class="table-loading">No items found</div>';
      return;
    }

    const tableRows = items.map(item => `
      <tr>
        <td>${this.escapeHtml(item.short_name)}</td>
        <td>${this.escapeHtml(item.class)}</td>
        <td>${this.escapeHtml(item.class_type)}</td>
        <td>${this.escapeHtml(item.zone)}</td>
      </tr>
    `).join('');

    tableContent.innerHTML = `
      <div class="items-table-container">
        <table class="items-table">
          <thead>
            <tr>
              <th>Short Name</th>
              <th>Class</th>
              <th>Type</th>
              <th>Zone</th>
            </tr>
          </thead>
          <tbody>
            ${tableRows}
          </tbody>
        </table>
      </div>
    `;
  }

  escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }

  refresh() {
    this.itemCache = {};
    this.currentExpandedCard = null;
    this.loadCompletedDeployments();
  }
}

// Initialize when the historical view tab is clicked
let historicalView = null;

function initHistoricalView() {
  if (!historicalView) {
    historicalView = new HistoricalDeploymentsView();
  } else {
    historicalView.refresh();
  }
}

// Export for use in main app.js
if (typeof module !== 'undefined' && module.exports) {
  module.exports = { initHistoricalView };
}