/**
 * L1 — pure config/validation logic for the deployments sub.
 *
 * Fast regression net for the season/year rules the builder form enforces client-side.
 * This layer cannot catch lifecycle or IAM regressions — that is the E2E gate's job.
 *
 *   npm i -D vitest -w spookydecs-deployments
 *   npx vitest run --dir subs/deployments/tests/unit
 */
import { describe, it, expect } from 'vitest';
import {
  DEPLOYMENT_CONFIG,
  validateYear,
  validateSeason,
  validateDeploymentForm,
  getSeasonCode,
  generateDeploymentId,
  getStatusLabel,
  DEPLOYMENT_STATUS_COLORS,
} from '../../src/config/deploymentsConfig';

describe('seasons', () => {
  it('offers exactly Halloween and Christmas', () => {
    expect(DEPLOYMENT_CONFIG.SEASONS.map((s) => s.value).sort()).toEqual(['Christmas', 'Halloween']);
  });

  it('maps each season to its 3-letter deployment code', () => {
    expect(getSeasonCode('Halloween')).toBe('HAL');
    expect(getSeasonCode('Christmas')).toBe('CHR');
  });

  it('rejects seasons outside the configured list', () => {
    expect(validateSeason('Easter').valid).toBe(false);
    expect(validateSeason('').valid).toBe(false);
    // Casing matters — chip contexts use Capitalized season names.
    expect(validateSeason('halloween').valid).toBe(false);
  });

  it('accepts both real seasons', () => {
    expect(validateSeason('Halloween').valid).toBe(true);
    expect(validateSeason('Christmas').valid).toBe(true);
  });
});

describe('year validation', () => {
  it('accepts the inclusive boundaries', () => {
    expect(validateYear(DEPLOYMENT_CONFIG.MIN_YEAR).valid).toBe(true);
    expect(validateYear(DEPLOYMENT_CONFIG.MAX_YEAR).valid).toBe(true);
  });

  it('rejects just outside the boundaries', () => {
    expect(validateYear(DEPLOYMENT_CONFIG.MIN_YEAR - 1).valid).toBe(false);
    expect(validateYear(DEPLOYMENT_CONFIG.MAX_YEAR + 1).valid).toBe(false);
  });

  it('rejects non-numeric input', () => {
    expect(validateYear('not-a-year').valid).toBe(false);
    expect(validateYear('').valid).toBe(false);
  });

  it('accepts the current and next season year', () => {
    const now = new Date().getFullYear();
    expect(validateYear(now).valid).toBe(true);
    expect(validateYear(now + 1).valid).toBe(true);
  });

  it('MAX_YEAR still covers the upcoming season', () => {
    // Guard against the config quietly expiring: if this fails, bump MAX_YEAR
    // before the next setup weekend.
    expect(DEPLOYMENT_CONFIG.MAX_YEAR).toBeGreaterThanOrEqual(new Date().getFullYear() + 1);
  });
});

describe('deployment id generation', () => {
  it('produces the ids the backend keys on', () => {
    expect(generateDeploymentId('Halloween', 2026)).toBe('DEP-HAL-2026');
    expect(generateDeploymentId('Christmas', 2026)).toBe('DEP-CHR-2026');
  });

  it('is stable across number and string years', () => {
    expect(generateDeploymentId('Halloween', '2026')).toBe(generateDeploymentId('Halloween', 2026));
  });
});

describe('form validation', () => {
  it('passes a valid Halloween form', () => {
    const r = validateDeploymentForm({ season: 'Halloween', year: 2026 });
    expect(r.valid).toBe(true);
    expect(r.errors).toEqual({});
  });

  it('reports season and year errors independently', () => {
    const r = validateDeploymentForm({ season: 'Easter', year: 1999 });
    expect(r.valid).toBe(false);
    expect(r.errors.season).toBeTruthy();
    expect(r.errors.year).toBeTruthy();
  });
});

describe('status vocabulary', () => {
  // These five values are the live backend contract. If a label or color is
  // missing, the UI renders a raw status string mid-deployment.
  const STATUSES = ['pre-deployment', 'active_setup', 'completed', 'active_teardown', 'archived'];

  it('matches the handlers exactly', () => {
    expect(Object.values(DEPLOYMENT_CONFIG.STATUSES).sort()).toEqual([...STATUSES].sort());
  });

  it('has a human label for every status', () => {
    for (const s of STATUSES) {
      expect(getStatusLabel(s)).not.toBe(s);
    }
  });

  it('has a chip color for every status', () => {
    for (const s of STATUSES) {
      expect(DEPLOYMENT_STATUS_COLORS[s]).toBeDefined();
    }
  });

  it('falls back to the raw value for unknown statuses', () => {
    expect(getStatusLabel('bogus')).toBe('bogus');
  });
});
