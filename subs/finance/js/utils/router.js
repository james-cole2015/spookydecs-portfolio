// Finance Main Page Orchestration

import { TabBar } from '../components/TabBar.js';
import { CostRecordsTable } from '../components/CostRecordsTable.js';
import { CostDetailDrawer } from '../components/CostDetailDrawer.js';
import { CostFormFields } from '../components/CostFormFields.js';
import { CostReviewModal } from '../components/CostReviewModal.js';
import { StatsPanel } from '../components/StatsPanel.js';
import { getAllCosts, createCost, updateCost } from '../utils/finance-api.js';
import { toast } from '../shared/toast.js';
import { stateManager } from '../utils/state.js';
import { navigateTo } from '../utils/router.js';

export class FinanceMainPage {
  constructor() {
    console.log('FinanceMainPage constructor called');
    this.costs = [];
    this.tabBar = null;
    this.table = null;
    this.drawer = null;
    this.form = null;
    this.statsPanel = null;
    this.isLoading = false;
    this.backToTopBtn = null;
    
    this.init();
  }

  async init() {
    console.log('FinanceMainPage init() called');
    
    // Initialize components
    this.tabBar = new TabBar('tab-bar');
    console.log('TabBar initialized');
    
    this.drawer = new CostDetailDrawer();
    console.log('Drawer initialized');
    
    // Add "Add New Cost" button before stats container
    this.renderAddCostButton();
    
    this.statsPanel = new StatsPanel('stats-container');
    console.log('StatsPanel initialized');
    
    // Load initial data
    console.log('Loading costs...');
    await this.loadCosts();
    console.log('Costs loaded:', this.costs.length);
    
    // Initialize table and form
    this.initTable();
    console.log('Table initialized');
    
    this.initForm();
    console.log('Form initialized');
    
    // Initialize back-to-top button
    this.initBackToTopButton();
    console.log('Back-to-top button initialized');
    
    // Subscribe to state changes
    stateManager.subscribe((state) => {
      if (state.tab === 'stats') {
        this.statsPanel.loadStats();
      }
    });

    // Check if there's a selected cost in URL
    const state = stateManager.getState();
    if (state.selectedCostId) {
      const cost = this.costs.find(c => c.cost_id === state.selectedCostId);
      if (cost) {
        this.handleRowClick(cost.cost_id);
      }
    }
  }

  renderAddCostButton() {
    const statsContainer = document.getElementById('stats-container');
    if (!statsContainer) return;
    
    // Create button container
    const buttonContainer = document.createElement('div');
    buttonContainer.style.marginBottom = '2rem';
    buttonContainer.style.display = 'flex';
    buttonContainer.style.justifyContent = 'flex-end';
    
    // Create button
    const addButton = document.createElement('button');
    addButton.className = 'btn-primary';
    addButton.textContent = '+ Add New Cost';
    addButton.addEventListener('click', () => {
      navigateTo('/new');
    });
    
    buttonContainer.appendChild(addButton);
    statsContainer.parentNode.insertBefore(buttonContainer, statsContainer);
  }

  initBackToTopButton() {
    // Create the button element
    this.backToTopBtn = document.createElement('button');
    this.backToTopBtn.className = 'back-to-top';
    this.backToTopBtn.innerHTML = '↑';
    this.backToTopBtn.setAttribute('aria-label', 'Back to top');
    this.backToTopBtn.setAttribute('title', 'Back to top');
    
    // Add to body
    document.body.appendChild(this.backToTopBtn);
    
    // Show/hide on scroll
    let scrollTimeout;
    window.addEventListener('scroll', () => {
      clearTimeout(scrollTimeout);
      
      scrollTimeout = setTimeout(() => {
        if (window.scrollY > 300) {
          this.backToTopBtn.classList.add('visible');
        } else {
          this.backToTopBtn.classList.remove('visible');
        }
      }, 100);
    });
    
    // Scroll to top on click
    this.backToTopBtn.addEventListener('click', () => {
      window.scrollTo({
        top: 0,
        behavior: 'smooth'
      });
    });
  }

  async loadCosts() {
    this.isLoading = true;
    
    try {
      const response = await getAllCosts();
      this.costs = response.costs || response || [];
    } catch (error) {
      console.error('Failed to load costs:', error);
      toast.error('Failed to load cost records');
      this.costs = [];
    } finally {
      this.isLoading = false;
    }
  }

  initTable() {
    this.table = new CostRecordsTable('table-container', this.costs, (costId) => {
      this.handleRowClick(costId);
    });
  }

  initForm() {
    // Form moved to separate /finance/new page
    // Hide the form container on main page
    const formContainer = document.getElementById('form-container');
    if (formContainer) {
      formContainer.style.display = 'none';
    }
  }

  handleRowClick(costId) {
    // Navigate to the cost detail page using the router
    navigateTo(`/costs/${costId}`);
  }

  handleFormSubmit(formData) {
    const reviewModal = new CostReviewModal();
    
    reviewModal.show(formData, {
      onConfirm: async () => {
        await this.submitCost(formData);
      },
      onCancel: () => {
        // User wants to go back and edit
        console.log('User cancelled review');
      }
    });
  }

  async submitCost(costData) {
    try {
      const isEditing = !!costData.cost_id;
      
      // Add metadata
      const payload = {
        ...costData,
        created_by: 'Admin', // TODO: Get from auth
        created_at: costData.created_at || new Date().toISOString(),
        updated_at: new Date().toISOString()
      };

      if (isEditing) {
        await updateCost(costData.cost_id, payload);
        toast.success('Cost record updated successfully');
      } else {
        await createCost(payload);
        toast.success('Cost record created successfully');
      }

      // Reload data
      await this.loadCosts();
      this.table.updateData(this.costs);
      this.form.reset();
      
      // Refresh stats if on stats tab
      const state = stateManager.getState();
      if (state.tab === 'stats') {
        this.statsPanel.loadStats();
      }

    } catch (error) {
      console.error('Failed to submit cost:', error);
      toast.error(`Failed to ${costData.cost_id ? 'update' : 'create'} cost record: ${error.message}`);
    }
  }

  handleEditCost(cost) {
    // Navigate to edit page with cost data
    navigateTo(`/new?cost_id=${cost.cost_id}`);
  }

  async handleDeleteCost(costId) {
    // Reload data after delete
    await this.loadCosts();
    this.table.updateData(this.costs);
    
    // Refresh stats if on stats tab
    const state = stateManager.getState();
    if (state.tab === 'stats') {
      this.statsPanel.loadStats();
    }

    // Clear URL state
    stateManager.setState({ selectedCostId: null });
  }
}