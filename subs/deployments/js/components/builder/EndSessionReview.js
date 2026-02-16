// EndSessionReview.js
// End session review modal with photo management

import { getItem, getRemovedConnections } from '../../utils/deployment-api.js';

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
      this.confirmEndSession(true);
    });
    
    this.container.querySelector('.btn-end-session-confirm').addEventListener('click', () => {
      this.confirmEndSession(false);
    });
  }
  
  async loadSessionData() {
    console.log('[EndSessionReview] Loading session data');
    
    try {
      // Filter active connections to only those created in THIS session
      const sessionConnections = this.connections.filter(conn => 
        conn.session_id === this.session.session_id
      );
      
      console.log('[EndSessionReview] Session connections:', sessionConnections.length);

      // Fetch removed connections for this session in parallel with item details
      const removedResponse = await getRemovedConnections(
        this.deployment.deployment_id,
        this.session.session_id
      ).catch(err => {
        console.warn('[EndSessionReview] Failed to fetch removed connections:', err);
        return { success: false, data: [] };
      });

      const removedConnections = removedResponse.success ? (removedResponse.data || []) : [];
      console.log('[EndSessionReview] Removed connections:', removedConnections.length);

      if (sessionConnections.length === 0 && removedConnections.length === 0) {
        this.renderReview([], [], {}, sessionConnections, removedConnections);
        return;
      }
      
      // Get all unique item IDs from active session connections
      const deployedItemIds = [...new Set(sessionConnections.map(c => c.to_item_id))];
      
      console.log('[EndSessionReview] Deployed item IDs:', deployedItemIds);
      
      // Fetch item details for active connections only
      const itemPromises = deployedItemIds.map(id => getItem(id));
      const itemResponses = await Promise.all(itemPromises);
      const items = itemResponses
        .filter(r => r.success && r.data)
        .map(r => r.data);
      
      console.log('[EndSessionReview] Fetched items:', items.length);
      
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
      
      this.renderReview(photoEligible, accessories, connectionItemMap, sessionConnections, removedConnections);
      
    } catch (error) {
      console.error('[EndSessionReview] Error loading session data:', error);
      const modalBody = this.container.querySelector('.review-modal-body');
      modalBody.innerHTML = `<p class="error-text">Failed to load session data</p>`;
    }
  }
  
  renderReview(photoEligible, accessories, connectionItemMap, sessionConnections, removedConnections = []) {
    const modalBody = this.container.querySelector('.review-modal-body');
    
    const connections = sessionConnections || [];
    
    // Count connections with/without photos (active only)
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

      ${removedConnections.length > 0 ? `
        <div class="review-section review-section-removed">
          <h4>Removed Items (${removedConnections.length})</h4>
          <div class="removed-connections-list">
            ${removedConnections.map(conn => this.renderRemovedConnectionItem(conn)).join('')}
          </div>
        </div>
      ` : ''}
      
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

  renderRemovedConnectionItem(conn) {
    return `
      <div class="review-connection-item review-connection-removed">
        <div class="connection-info">
          <div class="connection-flow-compact">
            <span class="flow-from">${conn.from_item_id}</span>
            <span class="flow-arrow">→</span>
            <span class="flow-to">${conn.to_item_id}</span>
          </div>
          <div class="removed-meta">
            <span class="removed-conn-id">${conn.connection_id}</span>
            ${conn.removal_reason ? `<span class="removed-reason">${conn.removal_reason}</span>` : ''}
          </div>
        </div>
        <span class="removed-badge">Removed</span>
      </div>
    `;
  }
  
  handleAddPhoto(connectionId, itemId) {
    console.log('[EndSessionReview] Adding photo for connection:', connectionId, 'item:', itemId);
    
    const modal = document.createElement('photo-upload-modal');
    modal.setAttribute('context', 'deployment');
    modal.setAttribute('photo-type', 'deployment');
    modal.setAttribute('season', this.deployment.season);
    modal.setAttribute('year', this.deployment.year);
    modal.setAttribute('deployment-id', this.deployment.deployment_id);
    modal.setAttribute('item-id', itemId);
    modal.setAttribute('max-photos', '5');
    modal.setAttribute('is-public', 'false');
    
    modal.addEventListener('upload-complete', (e) => {
      const { photo_ids } = e.detail;
      
      console.log('[EndSessionReview] Photos uploaded:', photo_ids);
      
      this.container.dispatchEvent(new CustomEvent('photos-updated', {
        detail: { connectionId, photoIds: photo_ids }
      }));
      
      this.loadSessionData();
    });
    
    document.body.appendChild(modal);
  }
  
  confirmEndSession(skipPhotos) {
    const notesTextarea = this.container.querySelector('.session-notes-input');
    const notes = notesTextarea ? notesTextarea.value.trim() : '';
    
    const confirmBtn = this.container.querySelector('.btn-end-session-confirm');
    const skipBtn = this.container.querySelector('.btn-skip-photos');
    const cancelBtn = this.container.querySelector('.btn-cancel-review');
    
    confirmBtn.disabled = true;
    skipBtn.disabled = true;
    cancelBtn.disabled = true;
    confirmBtn.textContent = skipPhotos ? 'Ending Session...' : 'Saving Photos & Ending...';
    
    this.container.dispatchEvent(new CustomEvent('end-session-confirmed', {
      detail: { notes, skipPhotos }
    }));
  }
  
  showError(message) {
    const confirmBtn = this.container.querySelector('.btn-end-session-confirm');
    const skipBtn = this.container.querySelector('.btn-skip-photos');
    const cancelBtn = this.container.querySelector('.btn-cancel-review');
    
    if (confirmBtn) confirmBtn.disabled = false;
    if (skipBtn) skipBtn.disabled = false;
    if (cancelBtn) cancelBtn.disabled = false;
    if (confirmBtn) confirmBtn.textContent = 'End Session';
    
    const modalBody = this.container.querySelector('.review-modal-body');
    if (!modalBody) return;
    
    const existingError = modalBody.querySelector('.error-message');
    if (existingError) existingError.remove();
    
    const errorDiv = document.createElement('div');
    errorDiv.className = 'error-message';
    errorDiv.style.cssText = 'background: #fee; border: 1px solid #fcc; color: #c33; padding: 1rem; margin-bottom: 1rem; border-radius: 4px;';
    errorDiv.textContent = message;
    
    modalBody.insertBefore(errorDiv, modalBody.firstChild);
  }
  
  close() {
    this.container.remove();
  }
}