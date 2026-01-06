// URL State Management

export class StateManager {
  constructor() {
    this.listeners = new Set();
  }

  // Get current state from URL
  getState() {
    const params = new URLSearchParams(window.location.search);
    return {
      tab: params.get('tab') || 'records',
      search: params.get('search') || '',
      cost_type: params.get('cost_type') || 'all',
      category: params.get('category') || 'all',
      vendor: params.get('vendor') || 'all',
      date_range: params.get('date_range') || 'all',
      start_date: params.get('start_date') || '',
      end_date: params.get('end_date') || '',
      sortBy: params.get('sortBy') || 'cost_date',
      sortOrder: params.get('sortOrder') || 'desc',
      page: parseInt(params.get('page')) || 1,
      selectedCostId: params.get('costId') || null
    };
  }

  // Update URL with new state
  setState(updates) {
    const currentState = this.getState();
    const newState = { ...currentState, ...updates };
    
    const params = new URLSearchParams();
    
    Object.entries(newState).forEach(([key, value]) => {
      if (value && value !== 'all' && value !== '' && value !== null) {
        params.set(key, value);
      }
    });

    const newUrl = `${window.location.pathname}?${params.toString()}`;
    window.history.pushState(newState, '', newUrl);
    
    this.notifyListeners(newState);
  }

  // Reset state to defaults
  resetState() {
    const defaultState = {
      tab: 'records',
      search: '',
      cost_type: 'all',
      category: 'all',
      vendor: 'all',
      date_range: 'all',
      start_date: '',
      end_date: '',
      sortBy: 'cost_date',
      sortOrder: 'desc',
      page: 1,
      selectedCostId: null
    };
    
    window.history.pushState(defaultState, '', window.location.pathname);
    this.notifyListeners(defaultState);
  }

  // Subscribe to state changes
  subscribe(listener) {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  // Notify all listeners of state change
  notifyListeners(state) {
    this.listeners.forEach(listener => listener(state));
  }

  // Handle browser back/forward
  initPopStateListener() {
    window.addEventListener('popstate', (event) => {
      const state = event.state || this.getState();
      this.notifyListeners(state);
    });
  }
}

// Create singleton instance
export const stateManager = new StateManager();

// Initialize popstate listener
stateManager.initPopStateListener();