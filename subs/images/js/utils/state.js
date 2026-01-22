// URL State Management
export function getStateFromUrl() {
  const params = new URLSearchParams(window.location.search);
  return {
    season: params.get('season') || '',
    category: params.get('category') || '',
    year: params.get('year') || '',
    isPublic: params.get('isPublic') || '',
    hasReferences: params.get('hasReferences') || '',
    search: params.get('search') || ''
  };
}

export function updateUrlState(state) {
  const params = new URLSearchParams();
  
  Object.entries(state).forEach(([key, value]) => {
    if (value) {
      params.set(key, value);
    }
  });
  
  const newUrl = `${window.location.pathname}${params.toString() ? '?' + params.toString() : ''}`;
  window.history.replaceState({}, '', newUrl);
}

export function clearUrlState() {
  window.history.replaceState({}, '', window.location.pathname);
}
