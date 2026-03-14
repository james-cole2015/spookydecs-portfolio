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

export const SEASON_PLACEHOLDERS = {
  halloween: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 48">
    <path d="M24 6 C24 6 28 2 31 4 C29 7 27 9 24 12" fill="#4ade80"/>
    <ellipse cx="18" cy="30" rx="10" ry="13" fill="#f97316"/>
    <ellipse cx="24" cy="28" rx="9" ry="15" fill="#fb923c"/>
    <ellipse cx="30" cy="30" rx="10" ry="13" fill="#f97316"/>
    <polygon points="17,24 14,30 20,30" fill="#7c2d12"/>
    <polygon points="31,24 28,30 34,30" fill="#7c2d12"/>
    <path d="M17 36 Q20 40 24 39 Q28 40 31 36" stroke="#7c2d12" stroke-width="1.5" fill="none" stroke-linecap="round"/>
  </svg>`,
  christmas: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 48">
    <polygon points="24,3 25.5,8 31,8 26.5,11.5 28,17 24,14 20,17 21.5,11.5 17,8 22.5,8" fill="#fbbf24"/>
    <polygon points="24,10 13,26 35,26" fill="#16a34a"/>
    <polygon points="24,18 10,38 38,38" fill="#15803d"/>
    <rect x="21" y="38" width="6" height="7" rx="1" fill="#92400e"/>
  </svg>`,
  shared: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
    <rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/>
    <path d="m21 15-5-5L5 21"/>
  </svg>`,
};
