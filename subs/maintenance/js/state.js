// Global state management with event emitter

import { groupBy } from './utils/helpers.js';
import { fetchRecordsByItem, fetchMultipleRecordsByItems, fetchAllRecords } from './api.js';

class AppState {
  constructor() {
    this.state = {
      records: [],
      filteredRecords: [],
      items: {},
      itemsWithRecords: new Set(),
      filters: {
        season: [],
        recordType: [],
        status: [],
        criticality: [],
        itemId: '',
        dateRange: { start: null, end: null }
      },
      activeTab: 'all',
      loading: false,
      error: null,
      
      // Schedule state
      schedules: [],
      currentSchedule: null,
      scheduleRecords: [],
      scheduleFilters: {
        status: 'all',
        task_type: 'all',
        item_id: 'all',
        enabled: 'all'
      }
    };
    
    this.listeners = [];
  }
  
  subscribe(callback) {
    this.listeners.push(callback);
    return () => {
      this.listeners = this.listeners.filter(cb => cb !== callback);
    };
  }
  
  notify() {
    this.listeners.forEach(callback => callback(this.state));
  }
  
  setState(updates) {
    this.state = { ...this.state, ...updates };
    this.notify();
  }
  
  setFilter(filterName, value) {
    this.state.filters[filterName] = value;
    this.applyFilters();
    this.notify();
  }
  
  clearFilters() {
    this.state.filters = {
      season: [],
      recordType: [],
      status: [],
      criticality: [],
      itemId: '',
      dateRange: { start: null, end: null }
    };
    this.applyFilters();
    this.notify();
  }
  
  setActiveTab(tab) {
    this.state.activeTab = tab;
    this.applyFilters();
    this.notify();
  }
  
  /**
   * Deduplicate records by record_id
   * Keeps the most recently added version of each record
   */
  deduplicateRecords(records) {
    const recordMap = new Map();
    
    // Use Map to automatically handle duplicates - last one wins
    records.forEach(record => {
      if (record && record.record_id) {
        recordMap.set(record.record_id, record);
      }
    });
    
    const deduplicated = Array.from(recordMap.values());
    
    // Log if duplicates were found
    if (deduplicated.length < records.length) {
      console.warn(`Deduplication: Removed ${records.length - deduplicated.length} duplicate record(s)`);
      
      // Find which record_ids were duplicated
      const counts = {};
      records.forEach(r => {
        if (r && r.record_id) {
          counts[r.record_id] = (counts[r.record_id] || 0) + 1;
        }
      });
      
      const duplicates = Object.entries(counts)
        .filter(([_, count]) => count > 1)
        .map(([id, count]) => `${id.substring(0, 8)}... (${count} times)`);
      
      if (duplicates.length > 0) {
        console.warn('Duplicate record_ids found:', duplicates.join(', '));
      }
    }
    
    return deduplicated;
  }
  
  async loadAllRecords() {
    this.setState({ loading: true, error: null });
    
    try {
      const data = await fetchAllRecords();
      const records = data.records || [];
      
      // Deduplicate records from API response
      this.state.records = this.deduplicateRecords(records);
      
      console.log(`Loaded ${this.state.records.length} unique records from API`);
      
      this.applyFilters();
      this.setState({ loading: false });
      
      return this.state.records;
    } catch (error) {
      console.error('Failed to load all records:', error);
      this.setState({ loading: false, error: error.message });
      throw error;
    }
  }
  
  async loadRecordsByItem(itemId) {
    this.setState({ loading: true, error: null });
    
    try {
      const data = await fetchRecordsByItem(itemId);
      const records = data.records || [];
      
      // Merge new records with existing ones
      const allRecords = [...this.state.records, ...records];
      
      // Deduplicate the combined array
      this.state.records = this.deduplicateRecords(allRecords);
      this.state.itemsWithRecords.add(itemId);
      
      this.applyFilters();
      this.setState({ loading: false });
      
      return records;
    } catch (error) {
      console.error('Failed to load records:', error);
      this.setState({ loading: false, error: error.message });
      throw error;
    }
  }
  
  async loadAllRecordsForItems(itemIds) {
    this.setState({ loading: true, error: null });
    
    try {
      const data = await fetchMultipleRecordsByItems(itemIds);
      const records = data.records || [];
      
      // Deduplicate records from API response
      this.state.records = this.deduplicateRecords(records);
      
      // Track which items have records
      itemIds.forEach(id => this.state.itemsWithRecords.add(id));
      
      this.applyFilters();
      this.setState({ loading: false });
      
      return this.state.records;
    } catch (error) {
      console.error('Failed to load records:', error);
      this.setState({ loading: false, error: error.message });
      throw error;
    }
  }
  
  addRecord(record) {
    // Check if record already exists
    const existingIndex = this.state.records.findIndex(r => r.record_id === record.record_id);
    
    if (existingIndex !== -1) {
      console.warn(`Record ${record.record_id} already exists, updating instead of adding`);
      this.state.records[existingIndex] = record;
    } else {
      this.state.records.push(record);
    }
    
    this.state.itemsWithRecords.add(record.item_id);
    this.applyFilters();
    this.notify();
  }
  
  updateRecord(recordId, updates) {
    const index = this.state.records.findIndex(r => r.record_id === recordId);
    if (index !== -1) {
      this.state.records[index] = { ...this.state.records[index], ...updates };
      this.applyFilters();
      this.notify();
    }
  }
  
  removeRecord(recordId) {
    this.state.records = this.state.records.filter(r => r.record_id !== recordId);
    this.applyFilters();
    this.notify();
  }
  
  cacheItem(itemId, itemData) {
    this.state.items[itemId] = itemData;
  }
  
  getItem(itemId) {
    return this.state.items[itemId];
  }
  
  applyFilters() {
    let filtered = [...this.state.records];
    const { filters, activeTab } = this.state;
    
    // Apply tab filter
    if (activeTab !== 'all' && activeTab !== 'items') {
      filtered = filtered.filter(r => r.record_type === activeTab.replace('s', ''));
    }
    
    // Apply season filter
    if (filters.season.length > 0) {
      filtered = filtered.filter(r => {
        const item = this.state.items[r.item_id];
        return item && filters.season.includes(item.season);
      });
    }
    
    // Apply record type filter
    if (filters.recordType.length > 0) {
      filtered = filtered.filter(r => filters.recordType.includes(r.record_type));
    }
    
    // Apply status filter
    if (filters.status.length > 0) {
      filtered = filtered.filter(r => filters.status.includes(r.status));
    }
    
    // Apply criticality filter
    if (filters.criticality.length > 0) {
      filtered = filtered.filter(r => {
        if (filters.criticality.includes('none')) {
          return !r.criticality || r.criticality === 'null' || filters.criticality.includes(r.criticality);
        }
        return filters.criticality.includes(r.criticality);
      });
    }
    
    // Apply item ID filter
    if (filters.itemId) {
      filtered = filtered.filter(r => 
        r.item_id.toLowerCase().includes(filters.itemId.toLowerCase())
      );
    }
    
    // Apply date range filter
    if (filters.dateRange.start) {
      const startDate = new Date(filters.dateRange.start);
      filtered = filtered.filter(r => new Date(r.created_at) >= startDate);
    }
    
    if (filters.dateRange.end) {
      const endDate = new Date(filters.dateRange.end);
      filtered = filtered.filter(r => new Date(r.created_at) <= endDate);
    }
    
    this.state.filteredRecords = filtered;
  }
  
  groupByItem() {
    const grouped = groupBy(this.state.filteredRecords, 'item_id');
    
    return Object.entries(grouped).map(([itemId, records]) => {
      const item = this.state.items[itemId];
      
      // Calculate stats
      const repairs = records.filter(r => r.record_type === 'repair').length;
      const maintenance = records.filter(r => r.record_type === 'maintenance').length;
      const inspections = records.filter(r => r.record_type === 'inspection').length;
      
      const totalCost = records.reduce((sum, r) => sum + (r.total_cost || 0), 0);
      
      // Find highest criticality
      const criticalityOrder = { high: 3, medium: 2, low: 1, null: 0 };
      const highestCrit = records.reduce((max, r) => {
        const rCrit = criticalityOrder[r.criticality] || 0;
        return rCrit > max ? rCrit : max;
      }, 0);
      
      const criticalityMap = { 3: 'high', 2: 'medium', 1: 'low', 0: null };
      
      // Most recent record date
      const sortedByDate = records.sort((a, b) => 
        new Date(b.created_at) - new Date(a.created_at)
      );
      
      return {
        item_id: itemId,
        season: item?.season || 'Unknown',
        criticality: criticalityMap[highestCrit],
        repairs,
        maintenance,
        inspections,
        total_cost: totalCost,
        last_record_date: sortedByDate[0]?.created_at,
        record_count: records.length
      };
    });
  }
  
  // ============= SCHEDULE METHODS =============
  
  /**
   * Set all schedules
   * @param {Array} schedules - Array of schedule objects
   */
  setSchedules(schedules) {
    this.state.schedules = schedules;
    this.notify();
  }
  
  /**
   * Add a new schedule
   * @param {Object} schedule - Schedule object
   */
  addSchedule(schedule) {
    this.state.schedules.push(schedule);
    this.notify();
  }
  
  /**
   * Update an existing schedule
   * @param {string} scheduleId - Schedule ID
   * @param {Object} updatedSchedule - Updated schedule data
   */
  updateSchedule(scheduleId, updatedSchedule) {
    const index = this.state.schedules.findIndex(s => s.schedule_id === scheduleId);
    if (index !== -1) {
      this.state.schedules[index] = { ...this.state.schedules[index], ...updatedSchedule };
      
      // Update current schedule if it's the one being viewed
      if (this.state.currentSchedule && this.state.currentSchedule.schedule_id === scheduleId) {
        this.state.currentSchedule = this.state.schedules[index];
      }
      
      this.notify();
    }
  }
  
  /**
   * Remove a schedule
   * @param {string} scheduleId - Schedule ID
   */
  removeSchedule(scheduleId) {
    this.state.schedules = this.state.schedules.filter(s => s.schedule_id !== scheduleId);
    
    // Clear current schedule if it was deleted
    if (this.state.currentSchedule && this.state.currentSchedule.schedule_id === scheduleId) {
      this.state.currentSchedule = null;
    }
    
    this.notify();
  }
  
  /**
   * Set current schedule (for detail view)
   * @param {Object} schedule - Schedule object
   */
  setCurrentSchedule(schedule) {
    this.state.currentSchedule = schedule;
    this.notify();
  }
  
  /**
   * Set records for current schedule
   * @param {Array} records - Array of maintenance records
   */
  setScheduleRecords(records) {
    this.state.scheduleRecords = records;
    this.notify();
  }
  
  /**
   * Update schedule filters
   * @param {Object} filters - Filter object
   */
  updateScheduleFilters(filters) {
    this.state.scheduleFilters = { ...this.state.scheduleFilters, ...filters };
    this.notify();
  }
  
  /**
   * Get filtered schedules based on current filters
   * @returns {Array} Filtered schedules
   */
  getFilteredSchedules() {
    let filtered = [...this.state.schedules];
    
    // Apply status filter
    if (this.state.scheduleFilters.status !== 'all') {
      filtered = filtered.filter(s => s.status === this.state.scheduleFilters.status);
    }
    
    // Apply task type filter
    if (this.state.scheduleFilters.task_type !== 'all') {
      filtered = filtered.filter(s => s.task_type === this.state.scheduleFilters.task_type);
    }
    
    // Apply item filter
    if (this.state.scheduleFilters.item_id !== 'all') {
      filtered = filtered.filter(s => s.item_id === this.state.scheduleFilters.item_id);
    }
    
    // Apply enabled filter
    if (this.state.scheduleFilters.enabled !== 'all') {
      const enabledValue = this.state.scheduleFilters.enabled === 'true';
      filtered = filtered.filter(s => s.enabled === enabledValue);
    }
    
    return filtered;
  }
  
  /**
   * Get schedule by ID
   * @param {string} scheduleId - Schedule ID
   * @returns {Object|null} Schedule object or null
   */
  getScheduleById(scheduleId) {
    return this.state.schedules.find(s => s.schedule_id === scheduleId) || null;
  }
  
  /**
   * Get schedules for a specific item
   * @param {string} itemId - Item ID
   * @returns {Array} Array of schedules for the item
   */
  getSchedulesForItem(itemId) {
    return this.state.schedules.filter(s => s.item_id === itemId);
  }
  
  /**
   * Get upcoming schedules (due within X days)
   * @param {number} days - Number of days to look ahead (default 30)
   * @returns {Array} Array of upcoming schedules
   */
  getUpcomingSchedules(days = 30) {
    const now = new Date();
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() + days);
    
    return this.state.schedules.filter(s => {
      const dueDate = new Date(s.next_due_date);
      return dueDate >= now && dueDate <= cutoff && s.enabled;
    }).sort((a, b) => new Date(a.next_due_date) - new Date(b.next_due_date));
  }
  
  /**
   * Get overdue schedules
   * @returns {Array} Array of overdue schedules
   */
  getOverdueSchedules() {
    const now = new Date();
    
    return this.state.schedules.filter(s => {
      const dueDate = new Date(s.next_due_date);
      return dueDate < now && s.enabled && s.status === 'overdue';
    }).sort((a, b) => new Date(a.next_due_date) - new Date(b.next_due_date));
  }
  
  /**
   * Get schedule statistics
   * @returns {Object} Statistics object
   */
  getScheduleStats() {
    const total = this.state.schedules.length;
    const enabled = this.state.schedules.filter(s => s.enabled).length;
    const upcoming = this.getUpcomingSchedules(7).length; // Due in next 7 days
    const overdue = this.getOverdueSchedules().length;
    
    return {
      total,
      enabled,
      disabled: total - enabled,
      upcoming,
      overdue
    };
  }
  
  getState() {
    return this.state;
  }
}

export const appState = new AppState();