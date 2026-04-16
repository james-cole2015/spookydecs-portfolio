// Record detail view - event handlers and actions

import { deleteRecord, fetchItemCosts, getCostsUrl } from '../api.js';
import { appState } from '../state.js';
import { navigateTo } from '../router.js';
import { isMobile } from '../utils/responsive.js';
import { RecordDetailTabs } from './RecordDetailTabs.js';

export class RecordDetailActions {
  constructor(view) {
    this.view = view;
  }

  /**
   * Attach all event listeners to the container
   */
  attachEventListeners(container) {
    this.attachTabListeners(container);
    this.attachDeleteListener(container);

    // Collapsible section listeners (mobile)
    if (isMobile() && this.view.activeTab === 'details') {
      this.attachCollapsibleListeners(container);
    }

    // Mount photo gallery if starting on photos tab
    if (this.view.activeTab === 'photos') {
      const contentDiv = container.querySelector('.detail-content');
      if (contentDiv) {
        this.mountPhotoGallery(contentDiv);
      }
    }

    // Initialize costs if starting on costs tab
    if (this.view.activeTab === 'costs') {
      const contentDiv = container.querySelector('.detail-content');
      if (contentDiv) this.loadCostsForTab(contentDiv);
    }
  }

  /**
   * Attach tab switching listeners
   */
  attachTabListeners(container) {
    const tabBtns = container.querySelectorAll('.tab-btn');

    tabBtns.forEach(btn => {
      btn.addEventListener('click', async () => {
        this.view.activeTab = btn.getAttribute('data-tab');
        const contentDiv = container.querySelector('.detail-content');

        if (contentDiv) {
          contentDiv.innerHTML = this.view.renderTabContent();

          // Re-attach collapsible listeners if on details tab
          if (this.view.activeTab === 'details' && isMobile()) {
            this.attachCollapsibleListeners(contentDiv);
          }

          // Mount CDN gallery if on photos tab
          if (this.view.activeTab === 'photos') {
            this.mountPhotoGallery(contentDiv);
          }

          // Load costs if on costs tab
          if (this.view.activeTab === 'costs') {
            await this.loadCostsForTab(contentDiv);
          }
        }

        // Update active tab button
        tabBtns.forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
      });
    });
  }

  /**
   * Attach delete button listener
   */
  attachDeleteListener(container) {
    const deleteBtn = container.querySelector('[data-action="delete"]');

    if (deleteBtn) {
      deleteBtn.addEventListener('click', () => {
        this.handleDelete();
      });
    }
  }

  /**
   * Attach collapsible section listeners (mobile)
   */
  attachCollapsibleListeners(container) {
    const headers = container.querySelectorAll('.detail-section-header');

    headers.forEach(header => {
      header.addEventListener('click', () => {
        const sectionId = header.getAttribute('data-section');
        const content = header.nextElementSibling;
        const toggle = header.querySelector('.detail-section-toggle');

        // Toggle state
        this.view.expandedSections[sectionId] = !this.view.expandedSections[sectionId];

        // Toggle classes
        content.classList.toggle('open');
        toggle.classList.toggle('open');
      });
    });
  }

  /**
   * Handle record deletion
   */
  async handleDelete() {
    const confirmed = confirm(
      `Are you sure you want to delete this ${this.view.record.record_type} record?\n\n` +
      `Title: ${this.view.record.title}\n\n` +
      `This action cannot be undone.`
    );

    if (!confirmed) return;

    try {
      await deleteRecord(this.view.recordId);
      appState.removeRecord(this.view.recordId);

      if (window.toast) {
        window.toast.success('Success', 'Record deleted successfully');
      }

      // Navigate back to main view
      navigateTo('/');

    } catch (error) {
      console.error('Failed to delete record:', error);

      if (window.toast) {
        window.toast.error('Error', 'Failed to delete record: ' + error.message);
      } else {
        alert('Failed to delete record: ' + error.message);
      }
    }
  }

  /**
   * Mount the CDN <photo-gallery> element into the photos tab container
   */
  mountPhotoGallery(contentDiv) {
    const slot = contentDiv.querySelector('#photo-gallery-container');
    if (!slot) return;
    const gallery = document.createElement('photo-gallery');
    gallery.setAttribute('context', 'maintenance');
    gallery.setAttribute('record-id', this.view.record.record_id);
    gallery.setAttribute('season', this.view.item?.season || 'shared');
    gallery.setAttribute('photo-type', this.view.record.record_type || 'maintenance');
    slot.appendChild(gallery);
  }

  /**
   * Fetch and render maintenance costs for the costs tab
   */
  async loadCostsForTab(container) {
    const loadingEl = container.querySelector('#costs-loading');
    const contentEl = container.querySelector('#costs-content');
    if (!contentEl) return;

    try {
      const [data, costsUrl] = await Promise.all([
        fetchItemCosts(this.view.itemId),
        getCostsUrl().catch(() => '')
      ]);
      const maintenanceCosts = (data.costs || [])
        .filter(c => c.cost_type === 'maintenance')
        .sort((a, b) => (b.cost_date || '').localeCompare(a.cost_date || ''));

      const total = maintenanceCosts.reduce(
        (sum, c) => sum + (c.total_cost || 0), 0
      );

      contentEl.innerHTML = RecordDetailTabs.renderCostsContent(maintenanceCosts, total, costsUrl);
      if (loadingEl) loadingEl.style.display = 'none';
      contentEl.style.display = 'block';

    } catch (error) {
      console.error('Failed to load costs:', error);
      if (loadingEl) loadingEl.innerHTML = '<p class="error-message">Failed to load cost records.</p>';
    }
  }
}
