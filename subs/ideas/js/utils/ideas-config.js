// Ideas Configuration & Constants

export const SEASONS = ['Halloween', 'Christmas', 'Shared'];

export const SEASON_CODES = {
  Halloween: 'hal',
  Christmas: 'chr',
  Shared: 'shr'
};

export const STATUSES = ['Considering', 'Planning', 'Workbench', 'Built', 'Abandoned'];

// Statuses available to users in forms — Workbench is set via "Move to Workbench" action
export const USER_STATUSES = ['Considering', 'Planning', 'Built', 'Abandoned'];

// Terminal statuses receive muted card treatment (Workbench is active, not terminal)
export const TERMINAL_STATUSES = new Set(['Built', 'Abandoned']);

export const STATUS_COLORS = {
  Considering: 'gray',
  Planning:    'blue',
  Workbench:   'orange',
  Built:       'green',
  Abandoned:   'red'
};

export const SORT_OPTIONS = [
  { value: 'newest', label: 'Newest First' },
  { value: 'oldest', label: 'Oldest First' },
  { value: 'az',     label: 'A – Z' }
];

export const ITEMS_BASE_URL = 'https://items.spookydecs.com';
