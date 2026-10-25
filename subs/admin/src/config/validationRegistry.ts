/**
 * Run Validation registry (#623): the ten holiday-readiness subs, what each does, the checks its browser
 * suite covers, how to re-run it, and the last recorded result.
 *
 * Browser-suite results are recorded here after a run (counts only, no environment detail, since this repo is
 * public). `readChecks` drive the live GET-only readiness check (#680); UI-triggered suites are #679.
 * Finance is descoped.
 */

export type CheckLayer = 'browser' | 'unit';

export interface ValidationRun {
  /** ISO date of the recorded run. */
  date: string;
  environment: 'dev' | 'prod';
  passed: number;
  total: number;
}

/** A read-only route the readiness check GETs. Static path, no ids, so nothing record-specific can leak. */
export interface ReadCheck {
  /** Shown in the UI, e.g. "List items". Never contains record data. */
  label: string;
  /** Path appended to API_ENDPOINT. */
  path: string;
  /** true: a failure fails the verdict. false: a failure only warns. */
  required: boolean;
}

/** A recorded readiness-check run (counts only, since this repo is public). */
export interface ReadinessRecord {
  date: string;
  environment: 'dev' | 'prod';
  passed: number;
  warned: number;
  total: number;
}

export interface ValidationSub {
  id: string;
  name: string;
  description: string;
  /** What the browser suite proves, one line per spec (titles mirror the Playwright tests). */
  browserChecks: string[];
  /** Lambda-side suites that guard the same sub. */
  unitSuites: string[];
  /** Command that re-runs the browser suite from the Portfolio repo root. */
  browserCommand: string;
  lastRun: ValidationRun;
  /** Routes the in-page readiness check GETs (#680). */
  readChecks: ReadCheck[];
  /** Latest recorded readiness-check run, kept apart from `lastRun` (the dev Playwright result). */
  readiness?: ReadinessRecord;
}

const RUN_DATE = '2026-10-18';
const run = (passed: number, total = passed, date = RUN_DATE): ValidationRun => ({ date, environment: 'dev', passed, total });

export const VALIDATION_SUBS: ValidationSub[] = [
  {
    id: 'admin',
    name: 'Admin',
    description: 'Operational overview, the Iris assistant, search-text editing, outlet registration and photo placement.',
    browserChecks: [
      'Dashboard renders live stats, About renders, unknown routes fall back, Iris panel opens',
      'Run Validation: card opens the hub, all ten subs listed, a sub page shows its checks',
      'Search text: find an item, edit it, save persists',
      'Add Outlet: form validation, register a receptacle, it appears under its zone',
      'Place photo on an item, an idea and a maintenance record; cascade delete leaves no S3 objects',
    ],
    unitSuites: ['Handler contract and role gates'],
    browserCommand: 'npm run test:e2e:admin',
    readChecks: [
      { label: 'Read admin config', path: '/admin/config', required: true },
    ],
    lastRun: run(5, 5, '2026-10-24'),
  },
  {
    id: 'deployments',
    name: 'Deployments',
    description: "Plan a season's yard setup: staging, declaring and connecting items per zone, completion and teardown.",
    browserChecks: ['Full lifecycle: builder, staging, declare and connect, connection photo, complete, teardown'],
    unitSuites: ['Deployments CRUD, connections and placements', 'Stage, complete and teardown lifecycle', 'Connection limits and dates'],
    browserCommand: 'npm run test:e2e:deployments',
    readChecks: [
      { label: 'List deployments', path: '/deployments', required: true },
      { label: 'List historical deployments', path: '/deployments/historical', required: false },
    ],
    lastRun: run(1),
  },
  {
    id: 'gallery',
    name: 'Gallery',
    description: 'The public photo gallery with season, year and tag filters and a lightbox.',
    browserChecks: [
      'Every section loads its photos from the public API',
      'Section tabs navigate; Progress, root and unknown routes land correctly',
      'Season and year filter reaches the API and the results match',
      'Tag filter: any-match, empty state, chip removal',
      'Photo detail opens in the lightbox; the list API rejects bad sections',
    ],
    unitSuites: ['Gallery handler contract'],
    browserCommand: 'npm run test:e2e:gallery',
    readChecks: [
      { label: 'List showcase photos', path: '/gallery/images?section=showcase', required: true },
    ],
    lastRun: run(6),
  },
  {
    id: 'ideas',
    name: 'Ideas',
    description: 'The idea board, acquisitions and the workbench that turns ideas into items and costs.',
    browserChecks: [
      'Ideas lifecycle: create, detail, cascade delete',
      'Workflow: inline edit, gated Planning transition, WIP cap enforced in the UI and API',
      'IdeaBuild complete: item vendor metadata and finance acquisition',
      'Complete Build wizard and Abandon Build',
      'Acquisitions: create, edit, pass, purchase wizard, item and cost',
      'Idea photos: create, stored, cascade delete leaves no S3 objects',
      'Agentic entry points render',
    ],
    unitSuites: ['Ideas handler API', 'Idea build consumer', 'Acquisitions API and purchase consumer'],
    browserCommand: 'npm run test:e2e:ideas',
    readChecks: [
      { label: 'List ideas', path: '/ideas', required: true },
    ],
    lastRun: run(10),
  },
  {
    id: 'images',
    name: 'Images',
    description: 'Photo upload, primary photo selection, thumbnails and the image manager.',
    browserChecks: [
      'Upload through the API pipeline, view, edit caption, delete',
      'Item photos: back-links, set primary, delete promotes the next',
      'Edit metadata, replace and reprocess',
      'Lists, gallery manager, browse, entities and items pages load; filters narrow',
    ],
    unitSuites: ['Photo handler, set primary, presign and confirm', 'Items and storage image consumers'],
    browserCommand: 'npm run test:e2e:images',
    readChecks: [
      { label: 'List images', path: '/admin/images', required: true },
    ],
    lastRun: run(4),
  },
  {
    id: 'inspector',
    name: 'Inspector',
    description: 'Rules that watch inventory for problems and the violations they raise.',
    browserChecks: ['Run a rule, violation appears, item and rule views, notes save, dismiss, rule description edit round-trips'],
    unitSuites: ['Inspector rules and violations API', 'Violation consumer'],
    browserCommand: 'npm run test:e2e:inspector',
    readChecks: [
      { label: 'List rules', path: '/admin/inspector/rules', required: true },
      { label: 'List violations', path: '/admin/inspector/violations', required: true },
      { label: 'Violation stats', path: '/admin/inspector/violations/stats', required: false },
    ],
    lastRun: run(1),
  },
  {
    id: 'items',
    name: 'Items',
    description: 'The decoration catalog: create by class, edit, search, photos and cascade delete.',
    browserChecks: [
      'Create each class through the wizard; required fields block it; power flag stored correctly',
      'Large and oversized items are not packable; single-packed creates a Self unit',
      'Lifecycle: create, edit, cascade delete (including ids with a hash)',
      'List search and filters, landing and detail with maintenance history',
      'Photos: upload, back-link, set primary, cascade delete leaves no S3 objects',
    ],
    unitSuites: ['Items handler API', 'Search-text and template consumers'],
    browserCommand: 'npm run test:e2e:items',
    readChecks: [
      { label: 'List items', path: '/items', required: true },
      { label: 'Item stats', path: '/stats/items', required: true },
    ],
    lastRun: run(14),
  },
  {
    id: 'maintenance',
    name: 'Maintenance',
    description: 'Repair and inspection records, schedules and templates, and the item flags they drive.',
    browserChecks: [
      'Repair lifecycle: create, perform, item updated, delete',
      'Inspections: pass, maintenance required with tasks, retire item with a reason',
      'Completing or deleting a repair clears the item flag',
      'Template lifecycle and the standalone apply wizard',
      'Records and schedules lists; photos and cost link; delete removes the photo',
    ],
    unitSuites: ['Records API', 'Scheduler, template, repair and inspection handlers', 'Recurrence consumer'],
    browserCommand: 'npm run test:e2e:maintenance',
    readChecks: [
      { label: 'List maintenance records', path: '/admin/maintenance-records', required: true },
      { label: 'List maintenance schedules', path: '/admin/maintenance-schedules', required: true },
    ],
    lastRun: run(13),
  },
  {
    id: 'storage',
    name: 'Storage',
    description: 'Totes and self-contained units: packing, unpacking, status and photos.',
    browserChecks: [
      'Lifecycle: create, pack, mark packed, mark stored, unpack, delete',
      'Pack and unpack events reach the items',
      'Large and oversized page lists non-packable items',
      'Supply tote: add supplies, delete blocked while it has supplies',
      'Self-contained unit through the wizard holds its item',
      'Photos: upload, back-link, set primary, delete leaves no S3 objects',
    ],
    unitSuites: ['Storage handler API', 'Storage image and item consumers'],
    browserCommand: 'npm run test:e2e:storage',
    readChecks: [
      { label: 'List storage units', path: '/storage', required: true },
    ],
    lastRun: run(6),
  },
  {
    id: 'workbench',
    name: 'Workbench',
    description: 'The seasonal build monitor: planning, in-progress and completed work by season and year.',
    browserChecks: ['Monitor renders seeded ideas and maintenance by bucket, status and year; cards preview and deep-link'],
    unitSuites: ['Ideas handler API'],
    browserCommand: 'npm run test:e2e:workbench',
    readChecks: [
      { label: 'Workbench summary', path: '/workbench/summary', required: true },
      { label: 'Workbench seasons', path: '/workbench/seasons', required: true },
    ],
    lastRun: run(1),
  },
];

export function findValidationSub(id: string | undefined): ValidationSub | undefined {
  return VALIDATION_SUBS.find((s) => s.id === id);
}

export function overallStatus(subs: ValidationSub[] = VALIDATION_SUBS) {
  const passing = subs.filter((s) => s.lastRun.passed === s.lastRun.total).length;
  const latest = subs.map((s) => s.lastRun.date).sort().pop() ?? '';
  return { passing, total: subs.length, latest };
}
