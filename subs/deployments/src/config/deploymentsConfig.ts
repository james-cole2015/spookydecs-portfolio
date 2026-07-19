/**
 * Deployments configuration — typed port of the vanilla deployment-config.js.
 *
 * Constants, validation rules, and helper functions, carried over 1:1. Domain
 * types for the deployments data model are added on top so the React layer is
 * fully typed.
 */
import type { ChipColor } from '@spookydecs/ui';

export interface SeasonOption {
  value: string;
  label: string;
  code: string;
}

export interface ZoneDef {
  zone_code: string;
  zone_name: string;
  receptacle_id: string;
}

export const DEPLOYMENT_CONFIG = {
  // Season options
  SEASONS: [
    { value: 'Christmas', label: 'Christmas', code: 'CHR' },
    { value: 'Halloween', label: 'Halloween', code: 'HAL' },
  ] as SeasonOption[],

  // Year range for validation
  MIN_YEAR: 2023,
  MAX_YEAR: 2030,

  // Predefined zones (immutable)
  ZONES: [
    { zone_code: 'FY', zone_name: 'Front Yard', receptacle_id: 'REC-FY-001' },
    { zone_code: 'BY', zone_name: 'Back Yard', receptacle_id: 'REC-BY-001' },
    { zone_code: 'SY', zone_name: 'Side Yard', receptacle_id: 'REC-SY-001' },
  ] as ZoneDef[],

  // Deployment statuses
  STATUSES: {
    PRE_DEPLOYMENT: 'pre-deployment',
    ACTIVE_SETUP: 'active_setup',
    COMPLETED: 'completed',
    ACTIVE_TEARDOWN: 'active_teardown',
    ARCHIVED: 'archived',
  },
} as const;

// ---- Domain types ----------------------------------------------------------

export type DeploymentStatus =
  | 'pre-deployment'
  | 'active_setup'
  | 'completed'
  | 'active_teardown'
  | 'archived';

export interface Deployment {
  deployment_id: string;
  season: string;
  year: number | string;
  status: DeploymentStatus | string;
  created_at?: string;
  updated_at?: string;
  completed_at?: string;
  zones?: Zone[];
  sessions?: Session[];
  connections?: Connection[];
  [key: string]: unknown;
}

export interface Zone {
  zone_code: string;
  zone_name: string;
  receptacle_id?: string;
  connection_count?: number;
  item_count?: number;
  sessions?: Session[];
  [key: string]: unknown;
}

export interface Session {
  session_id: string;
  deployment_id?: string;
  zone_code?: string;
  status?: string;
  started_at?: string;
  ended_at?: string;
  connections?: Connection[];
  [key: string]: unknown;
}

export interface Connection {
  connection_id: string;
  session_id?: string;
  deployment_id?: string;
  source_item_id?: string;
  destination_item_id?: string;
  port?: string;
  photo_ids?: string[];
  type?: string;
  [key: string]: unknown;
}

export interface DeploymentItem {
  item_id: string;
  name?: string;
  season?: string;
  class?: string;
  class_type?: string;
  status?: string;
  [key: string]: unknown;
}

export interface ValidationResult {
  valid: boolean;
  error?: string;
}

// ---- Validation functions --------------------------------------------------

export function validateYear(year: number | string): ValidationResult {
  const yearNum = parseInt(String(year), 10);

  if (isNaN(yearNum)) {
    return { valid: false, error: 'Year must be a number' };
  }

  if (yearNum < DEPLOYMENT_CONFIG.MIN_YEAR || yearNum > DEPLOYMENT_CONFIG.MAX_YEAR) {
    return {
      valid: false,
      error: `Year must be between ${DEPLOYMENT_CONFIG.MIN_YEAR} and ${DEPLOYMENT_CONFIG.MAX_YEAR}`,
    };
  }

  return { valid: true };
}

export function validateSeason(season: string): ValidationResult {
  const validSeasons = DEPLOYMENT_CONFIG.SEASONS.map((s) => s.value);

  if (!season) {
    return { valid: false, error: 'Season is required' };
  }

  if (!validSeasons.includes(season)) {
    return { valid: false, error: 'Invalid season selected' };
  }

  return { valid: true };
}

export interface DeploymentFormData {
  season: string;
  year: number | string;
}

export function validateDeploymentForm(formData: DeploymentFormData): {
  valid: boolean;
  errors: Record<string, string>;
} {
  const errors: Record<string, string> = {};

  const seasonValidation = validateSeason(formData.season);
  if (!seasonValidation.valid) {
    errors.season = seasonValidation.error!;
  }

  const yearValidation = validateYear(formData.year);
  if (!yearValidation.valid) {
    errors.year = yearValidation.error!;
  }

  return {
    valid: Object.keys(errors).length === 0,
    errors,
  };
}

// ---- Helper functions ------------------------------------------------------

export function getSeasonCode(season: string): string {
  const seasonObj = DEPLOYMENT_CONFIG.SEASONS.find((s) => s.value === season);
  return seasonObj ? seasonObj.code : season.substring(0, 3).toUpperCase();
}

export function generateDeploymentId(season: string, year: number | string): string {
  const code = getSeasonCode(season);
  return `DEP-${code}-${year}`;
}

export function formatDeploymentDate(dateString?: string): string {
  if (!dateString) return 'N/A';

  const date = new Date(dateString);
  return date.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
}

export function getStatusLabel(status: string): string {
  const labels: Record<string, string> = {
    'pre-deployment': 'Pre-Deployment',
    active_setup: 'Active Setup',
    completed: 'Completed',
    active_teardown: 'Active Teardown',
    archived: 'Archived',
  };

  return labels[status] || status;
}

/** Deployment status → HeroUI Chip color (domain map; consumed via the shared `<StatusChip>`). */
export const DEPLOYMENT_STATUS_COLORS: Record<string, ChipColor> = {
  'pre-deployment': 'default',
  active_setup: 'primary',
  completed: 'success',
  active_teardown: 'warning',
  archived: 'secondary',
};

export default DEPLOYMENT_CONFIG;
