// Loading State Components

export function Loader(message = 'Loading...') {
  const loader = document.createElement('div');
  loader.className = 'loader-container';
  loader.innerHTML = `
    <div class="loader-spinner"></div>
    <div class="loader-message">${message}</div>
  `;
  return loader;
}

export function EmptyState(message, icon = '📷') {
  const empty = document.createElement('div');
  empty.className = 'empty-state';
  empty.innerHTML = `
    <div class="empty-icon">${icon}</div>
    <div class="empty-message">${message}</div>
  `;
  return empty;
}

export function ErrorState(message) {
  const error = document.createElement('div');
  error.className = 'error-state';
  error.innerHTML = `
    <div class="error-icon">⚠️</div>
    <div class="error-message">${message}</div>
    <button class="btn btn-secondary" onclick="location.reload()">Retry</button>
  `;
  return error;
}
