/**
 * State Management
 * 
 * Manages URL query parameters for filters
 */

class State {
  /**
   * Get current state from URL
   */
  get() {
    const params = new URLSearchParams(window.location.search);
    return {
      season: params.get('season') || null,
      year: params.get('year') || null
    };
  }

  /**
   * Update state and URL
   */
  update(newState) {
    const currentState = this.get();
    const updatedState = { ...currentState, ...newState };

    // Build new query string
    const params = new URLSearchParams();
    
    if (updatedState.season) {
      params.set('season', updatedState.season);
    }
    
    if (updatedState.year) {
      params.set('year', updatedState.year);
    }

    // Update URL without reload
    const newUrl = params.toString() 
      ? `${window.location.pathname}?${params.toString()}`
      : window.location.pathname;

    window.history.pushState({}, '', newUrl);
  }

  /**
   * Clear all state
   */
  clear() {
    window.history.pushState({}, '', window.location.pathname);
  }

  /**
   * Get specific state value
   */
  getValue(key) {
    const state = this.get();
    return state[key];
  }

  /**
   * Set specific state value
   */
  setValue(key, value) {
    this.update({ [key]: value });
  }

  /**
   * Check if state has value
   */
  has(key) {
    const state = this.get();
    return state[key] !== null;
  }

  /**
   * Get state as query string
   */
  toQueryString() {
    const state = this.get();
    const params = new URLSearchParams();
    
    Object.entries(state).forEach(([key, value]) => {
      if (value) {
        params.set(key, value);
      }
    });

    return params.toString();
  }
}

// Singleton instance
export const state = new State();
