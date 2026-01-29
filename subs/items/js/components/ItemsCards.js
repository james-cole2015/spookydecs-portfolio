// ItemsCards Component
// Renders grid of item cards with photo, status, and actions

import { getStatusColor, getSeasonIcon, getPlaceholderIcon } from '../utils/item-config.js';
import { navigate } from '../utils/router.js';

export class ItemsCards {
  constructor(containerId) {
    this.container = document.getElementById(containerId);
  }
  
  render(items) {
    if (!this.container) return;
    
    if (!items || items.length === 0) {
      this.renderEmpty();
      return;
    }
    
    const grid = document.createElement('div');
    grid.className = 'items-grid';
    
    items.forEach(item => {
      const card = this.createCard(item);
      grid.appendChild(card);
    });
    
    this.container.innerHTML = '';
    this.container.appendChild(grid);
  }
  
  createCard(item) {
    const card = document.createElement('div');
    card.className = 'item-card';
    card.onclick = () => navigate(`/${item.id}`);
    
    // Get photo URL
    const photoUrl = this.getPhotoUrl(item);
    const placeholderIcon = getPlaceholderIcon(item.class, item.season);
    const seasonIcon = getSeasonIcon(item.season);

    // Build badges
    const badges = this.buildBadges(item);

    // Build details
    const details = this.buildDetails(item);

    card.innerHTML = `
      <div class="item-card-body">
        <div class="item-card-header">
          ${photoUrl ? `
            <img src="${photoUrl}" alt="${item.short_name}" class="item-photo">
          ` : `
            <div class="item-photo-placeholder">${placeholderIcon}</div>
          `}
          
          <div class="item-card-info">
            <div class="item-name">${this.escapeHtml(item.short_name)}</div>
            <div class="item-type">${item.class_type} • ${seasonIcon} ${item.season}</div>
            <div class="item-badges">
              ${badges}
            </div>
          </div>
        </div>
        
        ${details ? `
          <div class="item-details">
            ${details}
          </div>
        ` : ''}
      </div>
      
      <div class="item-card-actions">
        <button class="btn-view" onclick="event.stopPropagation(); itemsPage.handleView('${item.id}')">
          View Details
        </button>
        <button class="btn-edit" onclick="event.stopPropagation(); itemsPage.handleEdit('${item.id}')">
          Edit
        </button>
      </div>
    `;
    
    return card;
  }
  
  buildBadges(item) {
    const badges = [];
    
    // Deployment status
    if (item.deployment_data?.deployed) {
      badges.push(`<span class="item-badge badge-deployed">Deployed</span>`);
    }
    
    // Item status
    if (item.status === 'Active') {
      badges.push(`<span class="item-badge badge-active">Active</span>`);
    } else if (item.status === 'Packed') {
      badges.push(`<span class="item-badge badge-packed">Packed</span>`);
    }
    
    // Repair status
    if (item.repair_status?.needs_repair) {
      badges.push(`<span class="item-badge badge-repair">Needs Repair</span>`);
    } else if (item.repair_status?.status === 'Operational') {
      badges.push(`<span class="item-badge badge-operational">Operational</span>`);
    }
    
    return badges.join('');
  }
  
  buildDetails(item) {
    const lines = [];
    
    // Deployment location
    if (item.deployment_data?.deployed) {
      const depId = item.deployment_data.last_deployment_id || 'Unknown';
      lines.push(`
        <div class="item-detail-row">
          <span class="item-detail-icon">📍</span>
          <span>${depId}</span>
        </div>
      `);
    }
    
    // Storage location
    if (item.packing_data?.tote_id) {
      const location = item.packing_data.tote_location ?
        ` • ${item.packing_data.tote_location}` : '';
      lines.push(`
        <div class="item-detail-row">
          <span class="item-detail-icon">📦</span>
          <span>${item.packing_data.tote_id}${location}</span>
        </div>
      `);
    }

    return lines.join('');
  }
  
  getPhotoUrl(item) {
    // Return cloudfront_url if resolved
    if (item.images?.cloudfront_url) {
      return item.images.cloudfront_url;
    }
    return null;
  }
  
  renderEmpty() {
    this.container.innerHTML = `
      <div class="items-empty">
        <div class="items-empty-icon">📦</div>
        <h3>No Items Found</h3>
        <p>Try adjusting your filters or create a new item.</p>
        <button class="btn-primary" onclick="itemsPage.handleCreate()">
          + Create Item
        </button>
      </div>
    `;
  }
  
  escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }
}