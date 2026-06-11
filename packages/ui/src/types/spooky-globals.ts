/**
 * Ambient type declarations for the shared SpookyDecs CDN globals.
 *
 * These are provided at runtime by `api-config.js` and `auth-helpers.js`
 * (loaded via <script> in index.html), NOT bundled. This file is the
 * reusable artifact every future React sub imports — keep it sub-agnostic.
 */

export interface SpookyConfigValues {
  API_ENDPOINT: string;
  AUTH_URL: string;
  [key: string]: unknown;
}

export interface SpookyConfigGlobal {
  /** Resolves the runtime config (cached after first call). */
  get(): Promise<SpookyConfigValues>;
}

export interface SpookyTokenClaims {
  sub?: string;
  email?: string;
  'cognito:groups'?: string[];
  [key: string]: unknown;
}

/** Role hierarchy used by hasMinRole(). */
export type SpookyRole = 'viewer' | 'builder' | 'admin' | string;

export interface SpookyAuthGlobal {
  getAuthToken(): string | null;
  buildHeaders(extra?: Record<string, string>): Record<string, string>;
  redirectToLogin(): Promise<void>;
  getTokenClaims(): SpookyTokenClaims | null;
  hasMinRole(required: SpookyRole): boolean;
  hasEnvAccess(): boolean;
  enforceEnvAccess(): boolean;
}

declare global {
  interface Window {
    SpookyConfig: SpookyConfigGlobal;
    SpookyAuth: SpookyAuthGlobal;
    Navigo?: unknown;
  }
}

export {};
