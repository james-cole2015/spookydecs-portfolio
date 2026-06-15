/**
 * Admin sub configuration — domain types + the System Map subdomain catalog.
 *
 * The vanilla admin sub had no `admin-config.js`; the only static config was the
 * subdomain list hardcoded inside `components/SystemMap.js`. That list is lifted
 * here verbatim (order, copy, url/health/stats keys) so SystemMap.tsx is a pure
 * presentation component. Domain types for the cross-sub stats fan-out also live
 * here.
 */

export const SEASON_LABELS: Record<string, string> = {
  off_season: 'Off-Season',
  halloween: 'Halloween',
  christmas: 'Christmas',
};

/** A System Map tile. Either an external sub link (urlKey) or an internal route. */
export interface Subdomain {
  id: string;
  title: string;
  description: string;
  /** Key into the resolved subdomain-URL map (external link). */
  urlKey?: string;
  /** Key into the system-health map. */
  healthKey?: string;
  /** Key into the per-sub stats map (only items carries live stats today). */
  statsKey?: string;
  /** Internal SPA route (no external URL), e.g. the Iris search-text manager. */
  internalRoute?: string;
  /** Render as a "Coming Soon" placeholder regardless of URL. */
  placeholder?: boolean;
}

/** The 13 System Map tiles, ported verbatim from SystemMap.js. */
export const SUBDOMAINS: Subdomain[] = [
  {
    id: 'ideas',
    title: 'Ideas',
    description: 'Brainstorm and plan future decoration projects and seasonal themes.',
    urlKey: 'ideas',
    healthKey: 'ideas',
  },
  {
    id: 'items',
    title: 'Items',
    description: 'Manage your decoration, light, and accessory inventory.',
    urlKey: 'items',
    healthKey: 'items',
    statsKey: 'items',
  },
  {
    id: 'storage',
    title: 'Storage',
    description: 'Organize totes, bins, and storage locations across shed and garage.',
    urlKey: 'storage',
    healthKey: 'storage',
  },
  {
    id: 'deployments',
    title: 'Deployments',
    description: "Track what's out and when for each holiday season.",
    urlKey: 'deployments',
    healthKey: 'deployments',
  },
  {
    id: 'finance',
    title: 'Finance',
    description: 'Track costs, receipts, and spending across all seasons.',
    urlKey: 'finance',
    healthKey: 'finance',
  },
  {
    id: 'maintenance',
    title: 'Maintenance',
    description: 'Schedule repairs, inspections, and maintenance tasks for your items.',
    urlKey: 'maintenance',
    healthKey: 'maintenance',
  },
  {
    id: 'workbench',
    title: 'Workbench',
    description: 'Project workspace for repairs, modifications, and custom builds.',
    urlKey: 'workbench',
    healthKey: 'workbench',
  },
  {
    id: 'images',
    title: 'Images',
    description: 'Visual catalog and documentation for all items.',
    urlKey: 'images',
    healthKey: 'images',
  },
  {
    id: 'gallery',
    title: 'Gallery',
    description: 'Gallery of Previous Displays, Community Displays, and Project Builds.',
    urlKey: 'gallery',
    healthKey: 'gallery',
  },
  {
    id: 'audit',
    title: 'Audit',
    description: 'Review system logs, changes, and activity across all subdomains.',
    urlKey: 'audit',
    healthKey: 'audit',
  },
  {
    id: 'inspector',
    title: 'Inspector',
    description: 'Data quality checks to identify and correct data integrity issues.',
    urlKey: 'inspector',
    healthKey: 'inspector',
  },
  {
    id: 'tracker',
    title: 'Tracker',
    description: 'Manage epics, issues, and tasks for the SpookyDecs project.',
    urlKey: 'tracker',
  },
  {
    id: 'iris-admin',
    title: 'Iris Admin',
    description: 'Edit item search text and trigger vector index rebuilds for Iris.',
    internalRoute: '/admin/search-text',
  },
];

/** Resolved external URLs for every sub, keyed by Subdomain.urlKey. */
export interface SubdomainUrls {
  ideas: string;
  items: string;
  finance: string;
  maintenance: string;
  storage: string;
  workbench: string;
  deployments: string;
  audit: string;
  inspector: string;
  images: string;
  gallery: string;
  tracker: string;
  [key: string]: string;
}

export interface InspectorStats {
  by_resolution_mode?: Record<string, number>;
  by_status?: Record<string, number>;
  total_open?: number;
}

export interface WorkbenchSeasonStats {
  active?: number;
  scheduled?: number;
  completed?: number;
}

export interface WorkbenchStats {
  current_season?: string;
  seasons?: Record<string, WorkbenchSeasonStats>;
  active?: number;
  scheduled?: number;
  completed?: number;
}

/** Live per-sub stats (only items is populated today). */
export interface SubStats {
  total_items?: number;
  [key: string]: unknown;
}

export interface SystemHealthEntry {
  healthy: boolean;
  count?: number;
  pendingCount?: number;
  overdueCount?: number;
  completionRate?: number;
}

export type SystemHealth = Record<string, SystemHealthEntry>;

/** A single search result row in the Iris search-text manager. */
export interface SearchItem {
  id: string;
  short_name?: string;
  [key: string]: unknown;
}

/** The editable search_text record for one item. */
export interface ItemSearchText {
  item_id: string;
  short_name: string;
  season: string;
  search_text: string;
}

/** One turn in the Iris chat transcript. */
export interface IrisMessage {
  role: 'user' | 'assistant';
  content: string;
  timestamp: string;
}
