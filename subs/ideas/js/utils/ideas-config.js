// Ideas Configuration & Constants

export const SEASONS = ['Halloween', 'Christmas', 'Shared'];

export const SEASON_CODES = {
  Halloween: 'hal',
  Christmas: 'chr',
  Shared: 'shr'
};

export const STATUSES = ['Considering', 'Committed', 'Workbench', 'Built', 'Abandoned'];

// Statuses available to users — Workbench is system-only
export const USER_STATUSES = ['Considering', 'Committed', 'Built', 'Abandoned'];

// Terminal statuses receive muted card treatment
export const TERMINAL_STATUSES = new Set(['Workbench', 'Built', 'Abandoned']);

export const STATUS_COLORS = {
  Considering: 'gray',
  Committed:   'blue',
  Workbench:   'orange',
  Built:       'green',
  Abandoned:   'red'
};

export const SORT_OPTIONS = [
  { value: 'newest', label: 'Newest First' },
  { value: 'oldest', label: 'Oldest First' },
  { value: 'az',     label: 'A – Z' }
];
