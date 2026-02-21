// URL-based State Management for Ideas filters

export class StateManager {
  constructor() {
    this.listeners = new Set();
    this._initPopState();
  }

  // Read current filter state from URL query params
  getState() {
    const params = new URLSearchParams(window.location.search);
    return {
      season: params.get('season') || 'Halloween',
      status: params.get('status') || 'all',
      sort:   params.get('sort')   || 'newest',
      search: params.get('search') || ''
    };
  }

  // Write state patch into URL and notify listeners
  setState(updates) {
    const current = this.getState();
    const next = { ...current, ...updates };

    const params = new URLSearchParams();
    if (next.season && next.season !== 'Halloween') params.set('season', next.season);
    if (next.status && next.status !== 'all')       params.set('status', next.status);
    if (next.sort   && next.sort   !== 'newest')    params.set('sort',   next.sort);
    if (next.search && next.search !== '')          params.set('search', next.search);

    const qs = params.toString();
    const newUrl = window.location.pathname + (qs ? '?' + qs : '');
    window.history.pushState(next, '', newUrl);
    this._notify(next);
  }

  // Reset to defaults
  resetState() {
    window.history.pushState({}, '', window.location.pathname);
    this._notify(this.getState());
  }

  // Subscribe to state changes; returns unsubscribe fn
  subscribe(listener) {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  _notify(state) {
    this.listeners.forEach(fn => fn(state));
  }

  _initPopState() {
    window.addEventListener('popstate', () => {
      this._notify(this.getState());
    });
  }
}

export const stateManager = new StateManager();
