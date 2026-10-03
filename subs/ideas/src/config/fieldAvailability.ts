// Field-availability matrix + transition gates for the unified idea DetailPage (#597).
// Single policy surface driving what's editable/readonly/hidden per field per
// status, plus the required-field gates that must be met before a status can
// advance. Root-caused by #596: two hand-written pages independently decided
// this per field and drifted. See docs-spookydecs/sub_docs/ideas.md for the
// canonical rule text both this file and sd_ideas_handler.py cite.
import type { Idea, Status } from './ideasConfig';
import { normalizeMaterials } from '../lib/format';

export type FieldMode = 'editable' | 'readonly' | 'hidden';
export type FieldKey =
  | 'description'
  | 'materials'
  | 'build_instructions'
  | 'estimated_cost'
  | 'remaining_units'
  | 'agent_enrichment'
  | 'costs'
  | 'build_sessions'
  | 'images'
  | 'build_images'
  | 'title'
  | 'season'
  | 'link'
  | 'notes'
  | 'tags'
  | 'bucket';

const E: FieldMode = 'editable';
const R: FieldMode = 'readonly';
const H: FieldMode = 'hidden';

// Row order matches the issue's field-availability matrix verbatim.
export const FIELD_AVAILABILITY: Record<FieldKey, Record<Status, FieldMode>> = {
  description:        { Considering: E, Planning: E, Workbench: E, Built: R, Abandoned: R },
  materials:           { Considering: E, Planning: E, Workbench: E, Built: R, Abandoned: R },
  build_instructions:  { Considering: E, Planning: E, Workbench: E, Built: R, Abandoned: R },
  estimated_cost:      { Considering: E, Planning: E, Workbench: R, Built: R, Abandoned: R },
  remaining_units:     { Considering: E, Planning: E, Workbench: R, Built: R, Abandoned: R },
  agent_enrichment:    { Considering: E, Planning: E, Workbench: R, Built: R, Abandoned: R },
  costs:               { Considering: H, Planning: E, Workbench: E, Built: R, Abandoned: R },
  build_sessions:      { Considering: H, Planning: H, Workbench: E, Built: R, Abandoned: R },
  images:              { Considering: E, Planning: E, Workbench: E, Built: E, Abandoned: R },
  build_images:        { Considering: H, Planning: H, Workbench: E, Built: R, Abandoned: R },
  title:   { Considering: E, Planning: E, Workbench: E, Built: E, Abandoned: E },
  season:  { Considering: E, Planning: E, Workbench: E, Built: E, Abandoned: E },
  link:    { Considering: E, Planning: E, Workbench: E, Built: E, Abandoned: E },
  notes:   { Considering: E, Planning: E, Workbench: E, Built: E, Abandoned: E },
  tags:    { Considering: E, Planning: E, Workbench: E, Built: E, Abandoned: E },
  bucket:  { Considering: E, Planning: E, Workbench: E, Built: E, Abandoned: E },
};

export function fieldMode(field: FieldKey, status: Status): FieldMode {
  return FIELD_AVAILABILITY[field][status];
}

// Transition gates, keyed by target status alone (not from->to pairs) — reaching
// a stage always requires the same fields regardless of where the idea is
// coming from. Mirrored in lambdas-spookydecs/handlers/ideas/sd_ideas_handler.py
// (GATE_REQUIREMENTS) — keep both in sync; canonical rule text lives in
// docs-spookydecs/sub_docs/ideas.md. Workbench->Built has no standalone gate
// here: BuildCompleteWizard's own required fields are the de facto gate.
export const TRANSITION_GATES: Partial<Record<Status, (idea: Idea) => FieldKey[]>> = {
  Planning: (idea) =>
    [
      !idea.description?.trim() && 'description',
      !(idea.link?.trim() || idea.estimated_cost != null) && 'link_or_cost',
    ].filter(Boolean) as FieldKey[],
  Workbench: (idea) =>
    [
      !idea.description?.trim() && 'description',
      !normalizeMaterials(idea.materials).length && 'materials',
      !(idea.build_instructions?.length) && 'build_instructions',
    ].filter(Boolean) as FieldKey[],
};

const GATE_FIELD_LABELS: Record<string, string> = {
  description: 'Description',
  link_or_cost: 'Link or Estimated Cost',
  materials: 'Materials',
  build_instructions: 'Build Instructions',
};

export function missingGateFields(idea: Idea, target: Status): string[] {
  return (TRANSITION_GATES[target]?.(idea) ?? []) as string[];
}

export function missingGateLabels(idea: Idea, target: Status): string[] {
  return missingGateFields(idea, target).map((f) => GATE_FIELD_LABELS[f] || f);
}
