/** Proposal contract between the deployments assistant Lambda and the UI (#639). */
import type { GraphItem } from './graphDerivation';

export type ProposalOp = 'declare' | 'undeclare' | 'connect' | 'disconnect' | 'illuminate' | 'unilluminate';

export interface ProposalRow {
  row_id: string;
  op: ProposalOp;
  label?: string;
  item_id?: string;
  from_item_id?: string;
  from_port?: string;
  to_item_id?: string;
  to_port?: string;
  illuminates?: string[];
  target_ref?: { placement_id?: string; connection_id?: string };
  destructive: boolean;
  valid: boolean;
  problems: string[];
  warnings: string[];
}

export interface Proposal {
  type: 'proposal' | 'clarify' | 'message';
  message: string;
  rows: ProposalRow[];
  items?: Record<string, GraphItem>;
  clarify?: { name?: string; candidates?: Array<Record<string, unknown>> };
}

export type RowStatus = 'pending' | 'running' | 'ok' | 'error' | 'skipped';

export const OP_LABEL: Record<ProposalOp, string> = {
  declare: 'Declare',
  undeclare: 'Remove',
  connect: 'Connect',
  disconnect: 'Disconnect',
  illuminate: 'Illuminate',
  unilluminate: 'Stop lighting',
};

/** Invalid rows can never be included; removals start excluded (opt-in). */
export function defaultIncluded(rows: ProposalRow[]): Set<string> {
  return new Set(rows.filter((r) => r.valid && !r.destructive).map((r) => r.row_id));
}
