// Deployment Configuration
// Constants, validation rules, and helper functions

export const DEPLOYMENT_CONFIG = {
  // Season options
  SEASONS: [
    { value: 'Christmas', label: 'Christmas', code: 'CHR' },
    { value: 'Halloween', label: 'Halloween', code: 'HAL' }
  ],

  // Year range for validation
  MIN_YEAR: 2023,
  MAX_YEAR: 2030,

  // Predefined zones (immutable)
  ZONES: [
    {
      zone_code: 'FY',
      zone_name: 'Front Yard',
      receptacle_id: 'REC-FY-001'
    },
    {
      zone_code: 'BY',
      zone_name: 'Back Yard',
      receptacle_id: 'REC-BY-001'
    },
    {
      zone_code: 'SY',
      zone_name: 'Side Yard',
      receptacle_id: 'REC-SY-001'
    }
  ],

  // Deployment statuses
  STATUSES: {
    PRE_DEPLOYMENT: 'pre-deployment',
    ACTIVE_SETUP: 'active_setup',
    COMPLETED: 'completed',
    ACTIVE_TEARDOWN: 'active_teardown',
    ARCHIVED: 'archived'
  }
};

// Validation functions

export function validateYear(year) {
  const yearNum = parseInt(year);
  
  if (isNaN(yearNum)) {
    return { valid: false, error: 'Year must be a number' };
  }
  
  if (yearNum < DEPLOYMENT_CONFIG.MIN_YEAR || yearNum > DEPLOYMENT_CONFIG.MAX_YEAR) {
    return { 
      valid: false, 
      error: `Year must be between ${DEPLOYMENT_CONFIG.MIN_YEAR} and ${DEPLOYMENT_CONFIG.MAX_YEAR}` 
    };
  }
  
  return { valid: true };
}

export function validateSeason(season) {
  const validSeasons = DEPLOYMENT_CONFIG.SEASONS.map(s => s.value);
  
  if (!season) {
    return { valid: false, error: 'Season is required' };
  }
  
  if (!validSeasons.includes(season)) {
    return { valid: false, error: 'Invalid season selected' };
  }
  
  return { valid: true };
}

export function validateDeploymentForm(formData) {
  const errors = {};
  
  // Validate season
  const seasonValidation = validateSeason(formData.season);
  if (!seasonValidation.valid) {
    errors.season = seasonValidation.error;
  }
  
  // Validate year
  const yearValidation = validateYear(formData.year);
  if (!yearValidation.valid) {
    errors.year = yearValidation.error;
  }
  
  return {
    valid: Object.keys(errors).length === 0,
    errors
  };
}

// Helper functions

export function getSeasonCode(season) {
  const seasonObj = DEPLOYMENT_CONFIG.SEASONS.find(s => s.value === season);
  return seasonObj ? seasonObj.code : season.substring(0, 3).toUpperCase();
}

export function generateDeploymentId(season, year) {
  const code = getSeasonCode(season);
  return `DEP-${code}-${year}`;
}

export function formatDeploymentDate(dateString) {
  if (!dateString) return 'N/A';
  
  const date = new Date(dateString);
  return date.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric'
  });
}

export function getStatusLabel(status) {
  const labels = {
    'pre-deployment': 'Pre-Deployment',
    'active_setup': 'Active Setup',
    'completed': 'Completed',
    'active_teardown': 'Active Teardown',
    'archived': 'Archived'
  };
  
  return labels[status] || status;
}

export function getStatusColor(status) {
  const colors = {
    'pre-deployment': '#9CA3AF',
    'active_setup': '#3B82F6',
    'completed': '#10B981',
    'active_teardown': '#F59E0B',
    'archived': '#6B7280'
  };
  
  return colors[status] || '#9CA3AF';
}
