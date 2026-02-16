// Receipts Page Orchestrator

import { ReceiptsGrid } from '../components/ReceiptsGrid.js';
import { getAllCosts} from '../utils/finance-api.js';
import { toast } from '../shared/toast.js';

export class ReceiptsPage {
  constructor() {
    console.log('📄 ReceiptsPage constructor called');
    this.receipts = [];
    this.costs = [];
    this.costsMap = {}; // Map cost_id -> cost data
    this.grid = null;
    this.isLoading = false;
    
    this.init();
  }

  async init() {
    console.log('📄 ReceiptsPage init() called');
    
    // Load data
    await this.loadData();
    
    // Initialize grid
    this.initGrid();
  }

  async loadData() {
    this.isLoading = true;
    const container = document.getElementById('receipts-tab');
    
    if (container) {
      container.innerHTML = `
        <div class="receipts-loading">
          <div class="receipts-loading-spinner"></div>
        </div>
      `;
    }
    
    try {
      // Load costs
      console.log('📦 Loading costs...');
      const costsResponse = await getAllCosts();
      this.costs = Array.isArray(costsResponse) ? costsResponse : (costsResponse.costs || []);
      
      console.log('✅ Costs loaded:', this.costs.length);
      
      // Extract receipts from costs that have receipt_data
      console.log('📸 Extracting receipts from cost records...');
      this.receipts = this.costs
        .filter(cost => cost.receipt_data && cost.receipt_data.image_id)
        .map(cost => {
          const receipt = {
            image_id: cost.receipt_data.image_id,
            cloudfront_url: cost.receipt_data.cloudfront_url || cost.receipt_data.image_url,
            thumbnail_url: cost.receipt_data.thumbnail_url || cost.receipt_data.thumb_cloudfront_url || cost.receipt_data.cloudfront_url,
            s3_key: cost.receipt_data.s3_key,
            cost_id: cost.cost_id,
            vendor: cost.vendor,
            created_at: cost.cost_date || cost.created_at,
            photo_type: 'receipt'
          };
          
          // Log first receipt for debugging
          if (this.receipts.length === 0) {
            console.log('📸 Sample receipt data:', receipt);
          }
          
          return receipt;
        });
      
      // Build costs map
      this.costsMap = {};
      this.costs.forEach(cost => {
        if (cost.cost_id) {
          this.costsMap[cost.cost_id] = cost;
        }
      });
      
      // Sort by newest first (created_at desc)
      this.receipts.sort((a, b) => {
        const dateA = new Date(a.created_at || 0);
        const dateB = new Date(b.created_at || 0);
        return dateB - dateA;
      });
      
      console.log('✅ Receipts extracted:', this.receipts.length);
      
    } catch (error) {
      console.error('❌ Failed to load receipts:', error);
      toast.error('Failed to load receipts: ' + error.message);
      this.receipts = [];
    } finally {
      this.isLoading = false;
    }
  }

  initGrid() {
    const container = document.getElementById('receipts-tab');
    
    if (!container) {
      console.error('❌ receipts-tab container not found!');
      return;
    }
    
    // Clear loading state
    container.innerHTML = '<div id="receipts-grid-container"></div>';
    
    // Initialize grid
    this.grid = new ReceiptsGrid('receipts-grid-container', this.receipts, this.costsMap);
    console.log('✅ Receipts grid initialized');
  }

  async refresh() {
    console.log('🔄 Refreshing receipts...');
    await this.loadData();
    
    if (this.grid) {
      this.grid.updateData(this.receipts, this.costsMap);
    }
  }

  destroy() {
    if (this.grid) {
      this.grid.destroy();
    }
  }
}