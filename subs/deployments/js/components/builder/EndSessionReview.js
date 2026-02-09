// EndSessionReview.js
// End session review modal with photo management

import { getItem } from '../../utils/deployment-api.js';

export class EndSessionReview {
  constructor(deployment, zone, session, connections, pendingPhotoIds) {
    this.deployment = deployment;
    this.zone = zone;
    this.session = session;
    this.connections = connections;
    this.pendingPhotoIds = pendingPhotoIds;
    this.container = null;
  }
  
  render() {
    this.container = document.createElement('div');
    this.container.className = 'review-modal';
    this.container.style.display = 'flex';
    
    this.container.innerHTML = `
      <div class="modal-content review-modal-content">
        <div class="modal-header">
          <h3>End Session - Review & Add Photos</h3>
          <button class="btn-close-review">&times;</button>
        </div>
        <div class="modal-body review-modal-body">
          <div class="loading-indicator">Loading session data...</div>
        </div>
        <div class="modal-footer">
          <button class="btn btn-secondary btn-cancel-review">Cancel</button>
          <button class="btn btn-secondary btn-skip-photos">Skip Photos & End</button>
          <button class="btn btn-primary btn-end-session-confirm">End Session</button>
        </div>
      </div>
    `;
    
    this.attachEventListeners();
    this.loadSessionData();
    
    return this.container;
  }
  
  attachEventListeners() {
    this.container.querySelector('.btn-close-review').addEventListener('click', () => {
      this.close();
    });
    
    this.container.querySelector('.btn-cancel-review').addEventListener('click', () => {
      this.close();
    });
    
    this.container.querySelector('.btn-skip-photos').addEventListener('click', () => {
      this.confirmEndSession(true); // Skip photos
    });
    
    this.container.querySelector('.btn-end-session-confirm').addEventListener('click', () => {
      this.confirmEndSession(false); // Include photos
    });
  }
  
  async loadSessionData() {
    console.log('[EndSessionReview] Loading session data');
    
    try {
      // Filter connections to only those created in THIS session
      const sessionConnections = this.connections.filter(conn => 
        conn.session_id === this.session.session_id
      );
      
      console.log('[EndSessionReview] Session connections:', sessionConnections.length);
      
      if (sessionConnections.length === 0) {
        this.renderReview([], [], {}, sessionConnections);
        return;
      }
      
      // Get all unique item IDs from session connections (to_item_id)
      const deployedItemIds = [...new Set(sessionConnections.map(c => c.to_item_id))];
      
      console.log('[EndSessionReview] Deployed item IDs:', deployedItemIds);
      
      // Fetch item details
      const itemPromises = deployedItemIds.map(id => getItem(id));
      const itemResponses = await Promise.all(itemPromises);
      const items = itemResponses
        .filter(r => r.success && r.data)
        .map(r => r.data);
      
      console.log('[EndSessionReview] Fetched items:', items);
      
      // Separate by class
      const photoEligible = items.filter(item => item.class === 'Decoration');
      const accessories = items.filter(item => item.class === 'Accessory');
      
      console.log('[EndSessionReview] Photo eligible (Decorations):', photoEligible.length);
      console.log('[EndSessionReview] Accessories:', accessories.length);
      
      // Build connection -> item mapping
      const connectionItemMap = {};
      sessionConnections.forEach(conn => {
        connectionItemMap[conn.connection_id] = {
          connection: conn,
          item: items.find(i => i.id === conn.to_item_id)
        };
      });
      
      this.renderReview(photoEligible, accessories, connectionItemMap, sessionConnections);
      
    } catch (error) {
      console.error('[EndSessionReview] Error loading session data:', error);
      const modalBody = this.container.querySelector('.review-modal-body');
      modalBody.innerHTML = `<p class="error-text">Failed to load session data</p>`;
    }
  }
  
  renderReview(photoEligible, accessories, connectionItemMap, sessionConnections) {
    const modalBody = this.container.querySelector('.review-modal-body');
    
    const connections = sessionConnections || [];
    
    // Count connections with/without photos
    const connectionsWithPhotos = connections.filter(conn => {
      const photoIds = this.pendingPhotoIds[conn.connection_id] || [];
      return photoIds.length > 0;
    }).length;
    
    const totalConnections = connections.length;
    const missingPhotos = totalConnections - connectionsWithPhotos;
    
    modalBody.innerHTML = `
      <div class="review-summary">
        <p>You created <strong>${totalConnections}</strong> connection${totalConnections !== 1 ? 's' : ''} in this session</p>
        ${missingPhotos > 0 ? `<p class="review-warning">${missingPhotos} connection${missingPhotos !== 1 ? 's' : ''} missing photos</p>` : ''}
      </div>
      
      ${connections.length > 0 ? `
        <div class="review-section">
          <h4>Connections</h4>
          <div class="connections-review-list">
            ${connections.map(conn => this.renderConnectionItem(conn, connectionItemMap)).join('')}
          </div>
        </div>
      ` : `
        <div class="review-section">
          <p class="empty-hint">No connections made in this session</p>
        </div>
      `}
      
      <div class="review-section">
        <h4>Session Notes (Optional)</h4>
        <textarea class="session-notes-input" placeholder="Add notes about this session..." rows="3"></textarea>
      </div>
    `;
    
    // Attach photo button handlers
    modalBody.querySelectorAll('.btn-add-photo, .btn-add-more-photos').forEach(btn => {
      btn.addEventListener('click', () => {
        const connectionId = btn.dataset.connectionId;
        const itemId = btn.dataset.itemId;
        this.handleAddPhoto(connectionId, itemId);
      });
    });
  }
  
  renderConnectionItem(conn, connectionItemMap) {
    const item = connectionItemMap[conn.connection_id]?.item;
    const photoCount = this.pendingPhotoIds[conn.connection_id]?.length || 0;
    const isDecoration = item && item.class === 'Decoration';
    
    return `
      <div class="review-connection-item" data-connection-id="${conn.connection_id}">
        <div class="connection-info">
          <div class="connection-flow-compact">
            <span class="flow-from">${conn.from_item_id}</span>
            <span class="flow-arrow">→</span>
            <span class="flow-to">${conn.to_item_id}</span>
          </div>
          ${item ? `<div class="item-name-small">${item.short_name || item.id}</div>` : ''}
        </div>
        ${isDecoration ? `
          <div class="photo-actions">
            ${photoCount > 0 ? `
              <span class="photo-count">📷 ${photoCount}</span>
              <button class="btn-add-more-photos" data-connection-id="${conn.connection_id}" data-item-id="${conn.to_item_id}">+ More</button>
            ` : `
              <span class="photo-status-warning">⚠</span>
              <button class="btn-add-photo" data-connection-id="${conn.connection_id}" data-item-id="${conn.to_item_id}">+ Photo</button>
            `}
          </div>
        ` : `
          <span class="accessory-label">${item ? item.class : 'Item'}</span>
        `}
      </div>
    `;
  }
  
  handleAddPhoto(connectionId, itemId) {
    console.log('[EndSessionReview] Adding photo for connection:', connectionId, 'item:', itemId);
    
    // Create PhotoUploadModal
    const modal = document.createElement('photo-upload-modal');
    modal.setAttribute('context', 'deployment');
    modal.setAttribute('photo-type', 'deployment');
    modal.setAttribute('season', this.deployment.season);
    modal.setAttribute('year', this.deployment.year);
    modal.setAttribute('deployment-id', this.deployment.deployment_id);
    modal.setAttribute('item-id', itemId);
    modal.setAttribute('max-photos', '5');
    modal.setAttribute('is-public', 'false');
    
    // Listen for upload completion
    modal.addEventListener('upload-complete', (e) => {
      const { photo_ids } = e.detail;
      
      console.log('[EndSessionReview] Photos uploaded:', photo_ids);
      
      // Dispatch event to parent
      this.container.dispatchEvent(new CustomEvent('photos-updated', {
        detail: { connectionId, photoIds: photo_ids }
      }));
      
      // Refresh review
      this.loadSessionData();
    });
    
    document.body.appendChild(modal);
  }
  
  confirmEndSession(skipPhotos) {
    const notesTextarea = this.container.querySelector('.session-notes-input');
    const notes = notesTextarea ? notesTextarea.value.trim() : '';
    
    const confirmBtn = this.container.querySelector('.btn-end-session-confirm');
    const skipBtn = this.container.querySelector('.btn-skip-photos');
    
    confirmBtn.disabled = true;
    skipBtn.disabled = true;
    confirmBtn.textContent = 'Ending...';
    
    // Dispatch event to parent
    this.container.dispatchEvent(new CustomEvent('end-session-confirmed', {
      detail: { notes, skipPhotos }
    }));
  }
  
  close() {
    this.container.remove();
  }
}
