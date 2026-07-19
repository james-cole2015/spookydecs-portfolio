// Ideas configuration, constants, and domain types.
// Ported from the vanilla js/utils/ideas-config.js (framework-agnostic).

export const SEASONS = ['Halloween', 'Christmas', 'Shared'] as const;
export type Season = (typeof SEASONS)[number];

export const SEASON_CODES: Record<string, string> = {
  Halloween: 'hal',
  Christmas: 'chr',
  Shared: 'shr',
};

export const STATUSES = ['Considering', 'Planning', 'Workbench', 'Built', 'Abandoned'] as const;
export type Status = (typeof STATUSES)[number];

// Statuses available to users in forms — Workbench is set via "Move to Workbench" action.
export const USER_STATUSES: Status[] = ['Considering', 'Planning', 'Built', 'Abandoned'];

// Terminal statuses receive muted card treatment (Workbench is active, not terminal).
export const TERMINAL_STATUSES = new Set<Status>(['Built', 'Abandoned']);

// Statuses hidden from the season list view.
export const HIDDEN_FROM_LIST = new Set<string>(['Workbench', 'Built', 'Abandoned']);

// Maps a status to a HeroUI Chip color.
export const STATUS_CHIP_COLOR: Record<string, 'default' | 'primary' | 'secondary' | 'success' | 'warning' | 'danger'> = {
  Considering: 'default',
  Planning: 'primary',
  Workbench: 'warning',
  Built: 'success',
  Abandoned: 'danger',
};

export const SORT_OPTIONS = [
  { value: 'newest', label: 'Newest First' },
  { value: 'oldest', label: 'Oldest First' },
  { value: 'az', label: 'A – Z' },
] as const;
export type SortValue = (typeof SORT_OPTIONS)[number]['value'];

// List-view filters for the shared @spookydecs/ui FilterBar (#429). First option
// per key is its "all/default" sentinel (status → 'all', sort → 'newest').
import type { FilterOption } from '@spookydecs/ui';

export const FILTER_SELECT_KEYS = ['status', 'sort'];

export const FILTER_LABELS: Record<string, string> = { status: 'Status', sort: 'Sort' };

export const FILTER_OPTIONS: Record<string, FilterOption[]> = {
  status: [{ value: 'all', label: 'All Statuses' }, ...STATUSES.map((s) => ({ value: s, label: s }))],
  sort: SORT_OPTIONS.map((o) => ({ value: o.value, label: o.label })),
};

export const ITEMS_BASE_URL = 'https://items.spookydecs.com';

// Cost-log modal option lists (ported from idea-detail-costs.js).
export const COST_TYPES = ['build', 'supply_purchase', 'other'] as const;
export const COST_CATEGORIES = [
  'materials',
  'labor',
  'parts',
  'consumables',
  'decoration',
  'light',
  'accessory',
  'other',
] as const;

// Build-complete wizard item classes → their class_types (ported from build-detail.js).
export const CLASS_TYPES: Record<string, string[]> = {
  Decoration: ['Inflatable', 'Animatronic', 'Static Prop'],
  Light: ['Spot Light', 'String Light'],
  Accessory: ['Cord', 'Plug', 'Receptacle'],
};

export const PIPELINE_STAGES: Status[] = ['Considering', 'Planning', 'Workbench', 'Built'];

// Inline season placeholder SVGs (ported from ideas-config.js SEASON_PLACEHOLDERS).
export const SEASON_PLACEHOLDERS: Record<string, string> = {
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

// --- Domain types ---------------------------------------------------------

export interface Material {
  name: string;
  done?: boolean;
}

export interface BuildSession {
  session_id: string;
  date: string;
  duration_min?: number;
  notes?: string;
}

export interface EnrichmentPhoto {
  url: string;
  alt?: string;
  source?: string;
}

export interface EnrichmentLink {
  url?: string;
  retailer?: string;
  product?: string;
  price_usd?: number | string;
  category?: string;
}

export interface EnrichmentMaterial {
  item?: string;
  quantity?: string | number;
  notes?: string;
}

export interface EnrichmentStep {
  step?: number;
  title?: string;
  detail?: string;
}

export interface EnrichmentCostBand {
  range_usd?: string;
  notes?: string;
}

export type SubAgentState = 'pending' | 'complete' | 'empty' | 'failed' | string;

export interface AgentEnrichment {
  status?: 'in_progress' | 'complete' | 'partial' | 'failed';
  started_at?: string;
  sub_agents?: Record<string, SubAgentState>;
  photos?: EnrichmentPhoto[];
  purchase_links?: EnrichmentLink[];
  materials?: EnrichmentMaterial[];
  instructions?: EnrichmentStep[];
  estimated_cost?: { diy_build?: EnrichmentCostBand; pre_made_alternative?: EnrichmentCostBand };
  tags?: string[];
  error?: string;
}

export interface Idea {
  id: string;
  title: string;
  season: string;
  status: Status;
  description?: string;
  link?: string;
  notes?: string;
  tags?: string[];
  images?: string[];
  build_images?: string[];
  estimated_cost?: number | null;
  materials?: Array<Material | string>;
  build_sessions?: BuildSession[];
  prep_start?: string;
  build_start?: string;
  build_complete?: string;
  item_id?: string;
  related_item_id?: string;
  built_item_ids?: string[];
  bucket?: string;
  agent_enrichment?: AgentEnrichment;
  createdAt?: string;
  updatedAt?: string;
  [key: string]: unknown;
}

export interface Cost {
  cost_id?: string;
  item_name: string;
  cost_type?: string;
  category?: string;
  total_cost: number | string;
  cost_date?: string;
  vendor?: string;
  manufacturer?: string;
  notes?: string;
  receipt_data?: { url?: string };
  related_idea_id?: string;
}
