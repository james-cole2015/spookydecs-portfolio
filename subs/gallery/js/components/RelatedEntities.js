/**
 * RelatedEntities Component
 * 
 * Displays linked items, storage, deployments, and ideas
 */

import { fetchItemsByIds } from '../utils/items-api.js';
import { fetchStorageById } from '../utils/storage-api.js';
import { fetchDeploymentById } from '../utils/deployments-api.js';
import { navigate } from '../utils/router.js';

/**
 * Render related entities
 * @param {HTMLElement} container - Container element
 * @param {Object} photo - Photo object
 */
export async function renderRelatedEntities(container, photo) {
  container.innerHTML = `
    <div class="detail-section">
      <h3 class="section-title">Related Entities</h3>
      <div id="entities-list" class="entities-loading">
        <div class="spinner-small"></div>
        <p>Loading related entities...</p>
      </div>
    </div>
  `;
  
  const entitiesList = container.querySelector('#entities-list');
  
  try {
    const entities = await fetchRelatedEntities(photo);
    
    if (entities.length === 0) {
      entitiesList.innerHTML = `
        <p class="no-entities">No related entities linked to this photo.</p>
      `;
      return;
    }
    
    entitiesList.className = 'entities-list';
    entitiesList.innerHTML = entities.map(entity => renderEntity(entity)).join('');
    
    // Attach click handlers
    attachEntityListeners(entitiesList);
    
  } catch (error) {
    console.error('Error loading related entities:', error);
    entitiesList.innerHTML = `
      <p class="entities-error">Failed to load related entities: ${error.message}</p>
    `;
  }
}

/**
 * Fetch all related entities
 * @param {Object} photo - Photo object
 * @returns {Promise<Array>} Array of entity objects
 */
async function fetchRelatedEntities(photo) {
  const entities = [];
  
  try {
    // Fetch items
    if (photo.item_ids && photo.item_ids.length > 0) {
      const items = await fetchItemsByIds(photo.item_ids);
      items.forEach(item => {
        if (item) {
          entities.push({
            type: 'item',
            id: item.id,
            name: item.short_name || item.id,
            icon: '🎃',
            url: `/items/${item.id}`,
            metadata: `${item.class} - ${item.class_type}`
          });
        }
      });
    }
    
    // Fetch storage
    if (photo.storage_id) {
      try {
        const storage = await fetchStorageById(photo.storage_id);
        if (storage) {
          entities.push({
            type: 'storage',
            id: storage.id,
            name: storage.short_name || storage.id,
            icon: '📦',
            url: `/storage/${storage.id}`,
            metadata: `${storage.type} - ${storage.location}`
          });
        }
      } catch (error) {
        console.error('Error fetching storage:', error);
      }
    }
    
    // Fetch deployment
    if (photo.deployment_id) {
      try {
        const deployment = await fetchDeploymentById(photo.deployment_id);
        if (deployment) {
          entities.push({
            type: 'deployment',
            id: deployment.id,
            name: deployment.name || deployment.id,
            icon: '🚀',
            url: `/deployments/${deployment.id}`,
            metadata: `${deployment.season} ${deployment.year}`
          });
        }
      } catch (error) {
        console.error('Error fetching deployment:', error);
      }
    }
    
    // Note: Ideas don't have an API yet, so we just show the ID
    if (photo.idea_id) {
      entities.push({
        type: 'idea',
        id: photo.idea_id,
        name: photo.idea_id,
        icon: '💡',
        url: `/ideas/${photo.idea_id}`,
        metadata: 'Idea/Build'
      });
    }
    
  } catch (error) {
    console.error('Error fetching related entities:', error);
  }
  
  return entities;
}

/**
 * Render a single entity
 * @param {Object} entity - Entity object
 * @returns {string} HTML for entity
 */
function renderEntity(entity) {
  return `
    <div class="entity-card" data-url="${entity.url}">
      <div class="entity-icon">${entity.icon}</div>
      <div class="entity-info">
        <div class="entity-name">${entity.name}</div>
        <div class="entity-metadata">${entity.metadata}</div>
      </div>
      <div class="entity-action">→</div>
    </div>
  `;
}

/**
 * Attach click listeners to entities
 * @param {HTMLElement} container - Container element
 */
function attachEntityListeners(container) {
  const entityCards = container.querySelectorAll('.entity-card');
  
  entityCards.forEach(card => {
    card.addEventListener('click', () => {
      const url = card.dataset.url;
      navigate(url);
    });
  });
}
