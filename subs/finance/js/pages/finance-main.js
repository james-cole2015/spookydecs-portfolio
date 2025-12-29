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

export class FinanceMainPage {
  constructor() {
    this.costs = [];
    this.tabBar = null;
    this.table = null;
    this.drawer = null;
    this.form = null;
    this.statsPanel = null;
    this.isLoading = false;
    
    this.init();
  }

  async init() {
    // Initialize components
    this.tabBar = new TabBar('tab-bar');
    this.drawer = new CostDetailDrawer();
    this.statsPanel = new StatsPanel('stats-container');
    
    // Load initial data
    await this.loadCosts();
    
    // Initialize table and form
    this.initTable();
    this.initForm();
    
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
    this.form = new CostFormFields('form-container');
    
    this.form.onSubmit = (formData) => {
      this.handleFormSubmit(formData);
    };

    this.form.onCancel = () => {
      this.form.reset();
    };
  }

  handleRowClick(costId) {
    const cost = this.costs.find(c => c.cost_id === costId);
    if (!cost) return;

    this.drawer.open(cost, {
      onEdit: (cost) => this.handleEditCost(cost),
      onDelete: (costId) => this.handleDeleteCost(costId)
    });

    // Update URL state
    stateManager.setState({ selectedCostId: costId });
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
    // Populate form with cost data
    this.form.setData(cost);
    
    // Scroll to form
    const formContainer = document.getElementById('form-container');
    if (formContainer) {
      formContainer.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }

    // Switch to records tab if not already there
    const state = stateManager.getState();
    if (state.tab !== 'records') {
      this.tabBar.switchTab('records');
    }
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
