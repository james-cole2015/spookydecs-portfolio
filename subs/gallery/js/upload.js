/**
 * Upload Modal Component
 * Handles photo uploads with tab-specific forms and validation
 */

import { getState } from './state.js';
import { presignUpload, confirmUpload, fetchItems } from './api.js';

const MAX_FILES = 10;
const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB
const ALLOWED_TYPES = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp', 'image/heic', 'image/heif'];

export class UploadModal {
  constructor() {
    this.modal = document.getElementById('upload-modal');
    this.formContainer = document.getElementById('upload-form-container');
    this.progressContainer = document.getElementById('upload-progress');
    this.progressText = document.getElementById('progress-text');
    this.uploadBtn = this.modal.querySelector('.btn-upload-confirm');
    this.cancelBtn = this.modal.querySelector('.btn-cancel');
    this.fileInput = null;
    this.selectedFiles = [];
    this.currentTab = null;
    this.deployments = null;
    this.ideas = null;
    
    this.setupEventListeners();
  }

  setupEventListeners() {
    // Close modal on cancel
    this.cancelBtn.addEventListener('click', () => this.close());
    
    // Upload button
    this.uploadBtn.addEventListener('click', () => this.handleUpload());
    
    // Close on backdrop click (only via close button per requirements)
    // this.modal.addEventListener('click', (e) => {
    //   if (e.target === this.modal) this.close();
    // });
  }

  async open(tab) {
    this.currentTab = tab;
    
    // Fetch deployments if needed
    if (tab === 'deployments' && !this.deployments) {
      await this.loadDeployments();
    }
    
    // Fetch ideas if needed
    if ((tab === 'ideas' || tab === 'build') && !this.ideas) {
      await this.loadIdeas();
    }
    
    // Load items if needed (for Items tab)
    if (tab === 'items') {
      await this.ensureItemsLoaded();
    }
    
    // Render form
    this.render();
    
    // Show modal
    this.modal.classList.add('active');
    document.body.style.overflow = 'hidden';
  }

  close() {
    this.modal.classList.remove('active');
    document.body.style.overflow = '';
    this.reset();
  }

  reset() {
    this.selectedFiles = [];
    this.formContainer.innerHTML = '';
    this.hideProgress();
  }

  async loadDeployments() {
    try {
      // Fetch deployments from API
      const response = await fetch(`${window.config.API_ENDPOINT}/admin/deployments`);
      const data = await response.json();
      this.deployments = Array.isArray(data) ? data : (data.deployments || []);
    } catch (error) {
      console.error('Failed to load deployments:', error);
      this.deployments = [];
      this.showToast('Failed to load deployments', 'error');
    }
  }

  async loadIdeas() {
    try {
      // Fetch ideas from API
      const response = await fetch(`${window.config.API_ENDPOINT}/ideas`);
      const data = await response.json();
      this.ideas = Array.isArray(data) ? data : (data.ideas || []);
    } catch (error) {
      console.error('Failed to load ideas:', error);
      this.ideas = [];
      this.showToast('Failed to load ideas', 'error');
    }
  }

  async ensureItemsLoaded() {
    const state = getState();
    
    // Check if items are already loaded in state
    const hasChristmas = state.items.christmas && state.items.christmas.length > 0;
    const hasHalloween = state.items.halloween && state.items.halloween.length > 0;
    
    if (!hasChristmas || !hasHalloween) {
      try {
        // Load items from API if not in state
        if (!hasChristmas) {
          await fetchItems('christmas');
        }
        if (!hasHalloween) {
          await fetchItems('halloween');
        }
      } catch (error) {
        console.error('Failed to load items:', error);
        this.showToast('Failed to load items', 'error');
      }
    }
  }

  render() {
    const modalTitle = this.modal.querySelector('.modal-title');
    modalTitle.textContent = `Upload Photo - ${this.capitalizeTab(this.currentTab)}`;
    
    let formHTML = '';
    
    switch (this.currentTab) {
      case 'items':
        formHTML = this.renderItemsForm();
        break;
      case 'deployments':
        formHTML = this.renderDeploymentsForm();
        break;
      case 'ideas':
      case 'build':
        formHTML = this.renderIdeasForm();
        break;
      case 'gallery':
        formHTML = this.renderGalleryForm();
        break;
      default:
        formHTML = '<p class="error">Invalid tab</p>';
    }
    
    this.formContainer.innerHTML = formHTML;
    this.attachFormListeners();
  }

  renderItemsForm() {
    const state = getState();
    const allItems = this.getAllItems(state);
    
    return `
      <div class="form-group">
        <label for="item-select">Item <span class="required">*</span></label>
        <div class="searchable-dropdown">
          <input 
            type="text" 
            id="item-search" 
            placeholder="Search items by name..."
            autocomplete="off"
          />
          <select id="item-select" size="8" style="display:none;">
            <option value="">-- Select an item --</option>
            ${allItems.map(item => 
              `<option value="${item.id}" data-season="${item.season}" data-year="${item.year || ''}">${item.short_name} (${item.season})</option>`
            ).join('')}
          </select>
          <div class="dropdown-results" id="item-results"></div>
        </div>
      </div>
      
      <div class="form-row">
        <div class="form-group">
          <label for="season-display">Season</label>
          <input type="text" id="season-display" readonly disabled />
        </div>
        <div class="form-group">
          <label for="year-display">Year</label>
          <input type="text" id="year-display" readonly disabled />
        </div>
      </div>
      
      <div class="form-group">
        <label for="tags-input">Tags (comma-separated)</label>
        <input type="text" id="tags-input" placeholder="outdoor, inflatable, front yard" />
      </div>
      
      <div class="form-group">
        <label for="file-input">Photos <span class="required">*</span></label>
        <input 
          type="file" 
          id="file-input" 
          accept="image/jpeg,image/jpg,image/png,image/gif,image/webp,image/heic,image/heif"
          multiple
        />
        <p class="help-text">Max ${MAX_FILES} files, 10MB each. JPEG, PNG, GIF, WebP, HEIC/HEIF supported.</p>
        <div id="file-preview" class="file-preview"></div>
      </div>
    `;
  }

  renderDeploymentsForm() {
    const deployments = this.deployments || [];
    
    return `
      <div class="form-group">
        <label for="deployment-select">Deployment <span class="required">*</span></label>
        <div class="searchable-dropdown">
          <input 
            type="text" 
            id="deployment-search" 
            placeholder="Search deployments..."
            autocomplete="off"
          />
          <select id="deployment-select" size="8" style="display:none;">
            <option value="">-- Select a deployment --</option>
            ${deployments.map(dep => 
              `<option value="${dep.id}" data-season="${dep.season}" data-year="${dep.year}">${dep.id} - ${dep.season} ${dep.year}</option>`
            ).join('')}
          </select>
          <div class="dropdown-results" id="deployment-results"></div>
        </div>
      </div>
      
      <div class="form-row">
        <div class="form-group">
          <label for="season-display">Season</label>
          <input type="text" id="season-display" readonly disabled />
        </div>
        <div class="form-group">
          <label for="year-display">Year</label>
          <input type="text" id="year-display" readonly disabled />
        </div>
      </div>
      
      <div class="form-group">
        <label for="tags-input">Tags (comma-separated)</label>
        <input type="text" id="tags-input" placeholder="setup, teardown, front yard" />
      </div>
      
      <div class="form-group">
        <label for="file-input">Photos <span class="required">*</span></label>
        <input 
          type="file" 
          id="file-input" 
          accept="image/jpeg,image/jpg,image/png,image/gif,image/webp,image/heic,image/heif"
          multiple
        />
        <p class="help-text">Max ${MAX_FILES} files, 10MB each. JPEG, PNG, GIF, WebP, HEIC/HEIF supported.</p>
        <div id="file-preview" class="file-preview"></div>
      </div>
    `;
  }

  renderIdeasForm() {
    const ideas = this.ideas || [];
    
    // Filter ideas by status/type based on tab
    let filteredIdeas;
    if (this.currentTab === 'build') {
      // Build tab: Only show Planning or Building status
      filteredIdeas = ideas.filter(idea => 
        idea.status === 'Planning' || idea.status === 'Building'
      );
    } else if (this.currentTab === 'ideas') {
      // Ideas tab: Only show type = Idea (case-insensitive)
      filteredIdeas = ideas.filter(idea => 
        idea.type && idea.type.toLowerCase() === 'idea'
      );
    } else {
      // Fallback: Show all ideas
      filteredIdeas = ideas;
    }
    
    return `
      <div class="form-group">
        <label for="idea-select">Idea <span class="required">*</span></label>
        <div class="searchable-dropdown">
          <input 
            type="text" 
            id="idea-search" 
            placeholder="Search ideas by title..."
            autocomplete="off"
          />
          <select id="idea-select" size="8" style="display:none;">
            <option value="">-- Select an idea --</option>
            ${filteredIdeas.map(idea => 
              `<option value="${idea.id}" data-season="${idea.season}" data-year="">${idea.title} (${idea.season})</option>`
            ).join('')}
          </select>
          <div class="dropdown-results" id="idea-results"></div>
        </div>
      </div>
      
      <div class="form-row">
        <div class="form-group">
          <label for="season-display">Season</label>
          <input type="text" id="season-display" readonly disabled />
        </div>
        <div class="form-group">
          <label for="year-display">Year</label>
          <input type="text" id="year-display" readonly disabled />
        </div>
      </div>
      
      <div class="form-group">
        <label for="tags-input">Tags (comma-separated)</label>
        <input type="text" id="tags-input" placeholder="workbench, materials, wiring" />
      </div>
      
      <div class="form-group">
        <label for="file-input">Photos <span class="required">*</span></label>
        <input 
          type="file" 
          id="file-input" 
          accept="image/jpeg,image/jpg,image/png,image/gif,image/webp,image/heic,image/heif"
          multiple
        />
        <p class="help-text">Max ${MAX_FILES} files, 10MB each. JPEG, PNG, GIF, WebP, HEIC/HEIF supported.</p>
        <div id="file-preview" class="file-preview"></div>
      </div>
    `;
  }

  renderGalleryForm() {
    const currentYear = new Date().getFullYear();
    const years = Array.from({ length: 5 }, (_, i) => currentYear - i);
    
    const categoryMap = {
      'ideas': 'Ideas',
      'build': 'Build',
      'gallery': 'Gallery'
    };
    
    return `
      <div class="form-group">
        <label for="category-display">Category</label>
        <input 
          type="text" 
          id="category-display" 
          value="${categoryMap[this.currentTab]}" 
          readonly 
          disabled 
        />
      </div>
      
      <div class="form-row">
        <div class="form-group">
          <label for="season-select">Season <span class="required">*</span></label>
          <select id="season-select">
            <option value="">-- Select season --</option>
            <option value="christmas">Christmas</option>
            <option value="halloween">Halloween</option>
          </select>
        </div>
        <div class="form-group">
          <label for="year-select">Year <span class="required">*</span></label>
          <select id="year-select">
            <option value="">-- Select year --</option>
            ${years.map(year => `<option value="${year}">${year}</option>`).join('')}
          </select>
        </div>
      </div>
      
      <div class="form-group">
        <label for="tags-input">Tags (comma-separated)</label>
        <input type="text" id="tags-input" placeholder="workbench, repair, wiring" />
      </div>
      
      <div class="form-group">
        <label for="file-input">Photos <span class="required">*</span></label>
        <input 
          type="file" 
          id="file-input" 
          accept="image/jpeg,image/jpg,image/png,image/gif,image/webp,image/heic,image/heif"
          multiple
        />
        <p class="help-text">Max ${MAX_FILES} files, 10MB each. JPEG, PNG, GIF, WebP, HEIC/HEIF supported.</p>
        <div id="file-preview" class="file-preview"></div>
      </div>
    `;
  }

  attachFormListeners() {
    // File input
    this.fileInput = document.getElementById('file-input');
    this.fileInput.addEventListener('change', (e) => this.handleFileSelect(e));
    
    // Searchable dropdowns
    if (this.currentTab === 'items') {
      this.setupSearchableDropdown('item-search', 'item-select', 'item-results', 'short_name');
      document.getElementById('item-select').addEventListener('change', (e) => this.handleItemSelect(e));
    } else if (this.currentTab === 'deployments') {
      this.setupSearchableDropdown('deployment-search', 'deployment-select', 'deployment-results', 'id');
      document.getElementById('deployment-select').addEventListener('change', (e) => this.handleDeploymentSelect(e));
    } else if (this.currentTab === 'ideas' || this.currentTab === 'build') {
      this.setupSearchableDropdown('idea-search', 'idea-select', 'idea-results', 'title');
      document.getElementById('idea-select').addEventListener('change', (e) => this.handleIdeaSelect(e));
    }
  }

  setupSearchableDropdown(searchId, selectId, resultsId, searchField) {
    const searchInput = document.getElementById(searchId);
    const select = document.getElementById(selectId);
    const resultsDiv = document.getElementById(resultsId);
    
    // Show all results when input is focused
    searchInput.addEventListener('focus', (e) => {
      const query = e.target.value.toLowerCase();
      this.updateDropdownResults(select, resultsDiv, query);
    });
    
    // Filter results as user types
    searchInput.addEventListener('input', (e) => {
      const query = e.target.value.toLowerCase();
      this.updateDropdownResults(select, resultsDiv, query);
    });
    
    // Hide results when clicking outside
    document.addEventListener('click', (e) => {
      if (!searchInput.contains(e.target) && !resultsDiv.contains(e.target)) {
        resultsDiv.style.display = 'none';
      }
    });
  }
  
  updateDropdownResults(select, resultsDiv, query) {
    resultsDiv.innerHTML = '';
    
    const options = Array.from(select.options).slice(1); // Skip first option
    
    // If no query, show all results
    const filtered = query.length === 0 
      ? options 
      : options.filter(opt => opt.textContent.toLowerCase().includes(query));
    
    if (filtered.length === 0) {
      resultsDiv.innerHTML = '<div class="dropdown-item no-results">No results found</div>';
      resultsDiv.style.display = 'block';
      return;
    }
    
    filtered.forEach(opt => {
      const div = document.createElement('div');
      div.className = 'dropdown-item';
      div.textContent = opt.textContent;
      div.dataset.value = opt.value;
      div.dataset.season = opt.dataset.season;
      div.dataset.year = opt.dataset.year || '';
      
      div.addEventListener('click', () => {
        select.value = opt.value;
        document.getElementById(select.id.replace('-select', '-search')).value = opt.textContent;
        resultsDiv.style.display = 'none';
        select.dispatchEvent(new Event('change'));
      });
      
      resultsDiv.appendChild(div);
    });
    
    resultsDiv.style.display = 'block';
  }

  handleItemSelect(e) {
    const selectedOption = e.target.selectedOptions[0];
    if (!selectedOption || !selectedOption.value) return;
    
    const season = selectedOption.dataset.season;
    const year = selectedOption.dataset.year || new Date().getFullYear();
    
    document.getElementById('season-display').value = season;
    document.getElementById('year-display').value = year;
  }

  handleDeploymentSelect(e) {
    const selectedOption = e.target.selectedOptions[0];
    if (!selectedOption || !selectedOption.value) return;
    
    const season = selectedOption.dataset.season;
    const year = selectedOption.dataset.year;
    
    document.getElementById('season-display').value = season;
    document.getElementById('year-display').value = year;
  }

  handleIdeaSelect(e) {
    const selectedOption = e.target.selectedOptions[0];
    if (!selectedOption || !selectedOption.value) return;
    
    const season = selectedOption.dataset.season;
    const year = new Date().getFullYear(); // Use current year for ideas
    
    document.getElementById('season-display').value = season;
    document.getElementById('year-display').value = year;
  }

  handleFileSelect(e) {
    const files = Array.from(e.target.files);
    
    // Validate file count
    if (files.length > MAX_FILES) {
      this.showToast(`Maximum ${MAX_FILES} files allowed`, 'error');
      e.target.value = '';
      return;
    }
    
    // Validate each file
    const validFiles = [];
    const errors = [];
    
    files.forEach(file => {
      const validation = this.validateFile(file);
      if (validation.valid) {
        validFiles.push(file);
      } else {
        errors.push(`${file.name}: ${validation.error}`);
      }
    });
    
    if (errors.length > 0) {
      this.showToast(errors.join('\n'), 'error');
    }
    
    this.selectedFiles = validFiles;
    this.renderFilePreview();
  }

  validateFile(file) {
    // Check file type
    if (!ALLOWED_TYPES.includes(file.type.toLowerCase())) {
      return { valid: false, error: 'Invalid file type' };
    }
    
    // Check file size
    if (file.size > MAX_FILE_SIZE) {
      return { valid: false, error: 'File too large (max 10MB)' };
    }
    
    return { valid: true };
  }

  renderFilePreview() {
    const preview = document.getElementById('file-preview');
    if (this.selectedFiles.length === 0) {
      preview.innerHTML = '';
      return;
    }
    
    preview.innerHTML = `
      <div class="file-count">${this.selectedFiles.length} file(s) selected</div>
      <ul class="file-list">
        ${this.selectedFiles.map(file => `
          <li>${file.name} (${this.formatFileSize(file.size)})</li>
        `).join('')}
      </ul>
    `;
  }

  formatFileSize(bytes) {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
  }

  async handleUpload() {
    // Validate form
    const validation = this.validateForm();
    if (!validation.valid) {
      this.showToast(validation.error, 'error');
      return;
    }
    
    const metadata = this.getFormData();
    
    // Show progress
    this.showProgress(0, this.selectedFiles.length);
    this.uploadBtn.disabled = true;
    
    try {
      await this.uploadSequentially(metadata);
    } catch (error) {
      console.error('Upload failed:', error);
      this.showToast(`Upload failed: ${error.message}`, 'error');
    } finally {
      this.uploadBtn.disabled = false;
      this.hideProgress();
    }
  }

  validateForm() {
    if (this.selectedFiles.length === 0) {
      return { valid: false, error: 'Please select at least one file' };
    }
    
    if (this.currentTab === 'items') {
      const itemSelect = document.getElementById('item-select');
      if (!itemSelect.value) {
        return { valid: false, error: 'Please select an item' };
      }
    } else if (this.currentTab === 'deployments') {
      const deploymentSelect = document.getElementById('deployment-select');
      if (!deploymentSelect.value) {
        return { valid: false, error: 'Please select a deployment' };
      }
    } else if (this.currentTab === 'ideas' || this.currentTab === 'build') {
      const ideaSelect = document.getElementById('idea-select');
      if (!ideaSelect.value) {
        return { valid: false, error: 'Please select an idea' };
      }
    } else if (this.currentTab === 'gallery') {
      const seasonSelect = document.getElementById('season-select');
      const yearSelect = document.getElementById('year-select');
      if (!seasonSelect.value || !yearSelect.value) {
        return { valid: false, error: 'Please select season and year' };
      }
    }
    
    return { valid: true };
  }

  getFormData() {
    const contextMap = {
      'items': 'item',
      'deployments': 'deployment',
      'ideas': 'idea',
      'build': 'idea',
      'gallery': 'gallery'
    };
    
    const photoTypeMap = {
      'items': 'catalog',
      'deployments': 'deployment',
      'ideas': 'inspiration',
      'build': 'build',
      'gallery': 'gallery'
    };
    
    const data = {
      context: contextMap[this.currentTab],
      photo_type: photoTypeMap[this.currentTab]
    };
    
    // Get tags
    const tagsInput = document.getElementById('tags-input');
    data.tags = tagsInput.value
      .split(',')
      .map(t => t.trim())
      .filter(t => t.length > 0);
    
    // Tab-specific data
    if (this.currentTab === 'items') {
      const itemSelect = document.getElementById('item-select');
      const selectedOption = itemSelect.selectedOptions[0];
      data.item_ids = [itemSelect.value];
      data.season = selectedOption.dataset.season.toLowerCase();
      data.year = parseInt(selectedOption.dataset.year) || new Date().getFullYear();
    } else if (this.currentTab === 'deployments') {
      const deploymentSelect = document.getElementById('deployment-select');
      const selectedOption = deploymentSelect.selectedOptions[0];
      data.deployment_id = deploymentSelect.value;
      data.season = selectedOption.dataset.season.toLowerCase();
      data.year = parseInt(selectedOption.dataset.year);
    } else if (this.currentTab === 'ideas' || this.currentTab === 'build') {
      const ideaSelect = document.getElementById('idea-select');
      const selectedOption = ideaSelect.selectedOptions[0];
      data.idea_id = ideaSelect.value;
      data.season = selectedOption.dataset.season.toLowerCase();
      data.year = new Date().getFullYear();
    } else if (this.currentTab === 'gallery') {
      const seasonSelect = document.getElementById('season-select');
      const yearSelect = document.getElementById('year-select');
      data.season = seasonSelect.value;
      data.year = parseInt(yearSelect.value);
    }
    
    return data;
  }

  async uploadSequentially(metadata) {
    const results = [];
    
    for (let i = 0; i < this.selectedFiles.length; i++) {
      const file = this.selectedFiles[i];
      this.showProgress(i + 1, this.selectedFiles.length);
      
      try {
        // 1. Get presigned URL
        const presignPayload = {
          context: metadata.context,
          photo_type: metadata.photo_type,
          season: metadata.season,
          files: [{
            filename: file.name,
            content_type: file.type
          }],
          ...(metadata.item_ids && { item_ids: metadata.item_ids }),
          ...(metadata.deployment_id && { deployment_id: metadata.deployment_id }),
          ...(metadata.idea_id && { idea_id: metadata.idea_id })
        };
        
        const presignData = await presignUpload(presignPayload);
        const upload = presignData.uploads[0];
        
        // 2. Upload to S3
        const s3Response = await fetch(upload.presigned_url, {
          method: 'PUT',
          body: file,
          headers: {
            'Content-Type': file.type
          }
        });
        
        if (!s3Response.ok) {
          throw new Error(`S3 upload failed: ${s3Response.statusText}`);
        }
        
        results.push({
          success: true,
          cloudfront_url: upload.cloudfront_url,
          thumb_cloudfront_url: upload.thumb_cloudfront_url,
          s3_key: upload.s3_key,
          thumb_s3_key: upload.thumb_s3_key
        });
        
      } catch (error) {
        console.error(`Failed to upload ${file.name}:`, error);
        results.push({
          success: false,
          filename: file.name,
          error: error.message
        });
      }
    }
    
    // 3. Confirm successful uploads
    const successfulUploads = results.filter(r => r.success);
    
    if (successfulUploads.length > 0) {
      const confirmPayload = {
        context: metadata.context,
        photo_type: metadata.photo_type,
        season: metadata.season,
        year: metadata.year,
        photos: successfulUploads,
        tags: metadata.tags,
        ...(metadata.item_ids && { item_ids: metadata.item_ids }),
        ...(metadata.deployment_id && { deployment_id: metadata.deployment_id }),
        ...(metadata.idea_id && { idea_id: metadata.idea_id })
      };
      
      await confirmUpload(confirmPayload);
    }
    
    // 4. Show results
    const failedUploads = results.filter(r => !r.success);
    
    if (failedUploads.length > 0) {
      const failedNames = failedUploads.map(f => f.filename).join(', ');
      this.showToast(`${failedUploads.length} of ${this.selectedFiles.length} uploads failed: ${failedNames}`, 'error');
    } else {
      this.showToast(`Successfully uploaded ${this.selectedFiles.length} photo(s)`, 'success');
    }
    
    // 5. Refresh grid
    window.dispatchEvent(new CustomEvent('refreshPhotos'));
    
    // 6. Close modal
    setTimeout(() => this.close(), 1000);
  }

  getAllItems(state) {
    const christmas = state.items.christmas || [];
    const halloween = state.items.halloween || [];
    
    return [...christmas, ...halloween]
      .filter(item => item.class === 'Decoration') // Only show Decoration class items
      .map(item => ({
        ...item,
        year: item.date_acquired || new Date().getFullYear()
      }))
      .sort((a, b) => a.short_name.localeCompare(b.short_name));
  }

  showProgress(current, total) {
    this.progressText.textContent = `Uploading ${current} of ${total}...`;
    this.progressContainer.style.display = 'flex';
  }

  hideProgress() {
    this.progressContainer.style.display = 'none';
  }

  showToast(message, type = 'info') {
    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;
    toast.textContent = message;
    
    document.body.appendChild(toast);
    
    setTimeout(() => toast.classList.add('show'), 10);
    
    setTimeout(() => {
      toast.classList.remove('show');
      setTimeout(() => toast.remove(), 300);
    }, 4000);
  }

  capitalizeTab(tab) {
    return tab.charAt(0).toUpperCase() + tab.slice(1);
  }
}