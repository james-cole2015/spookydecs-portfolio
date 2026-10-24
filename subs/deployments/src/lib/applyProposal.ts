/**
 * Apply a reviewed proposal through the existing guarded routes (#639).
 *
 * Sequential, in dependency order (declare -> connect -> illuminate -> removals), stop on the
 * first error with the rest marked skipped. The server guards stay the single rule set — this
 * only sequences calls and reports per row. The api is injected so it is unit-testable.
 */
import type { ProposalRow, RowStatus } from './proposal';

export interface ApplyApi {
  createPlacement(deploymentId: string, body: unknown): Promise<unknown>;
  createConnection(deploymentId: string, body: unknown): Promise<unknown>;
  updateConnection(deploymentId: string, connectionId: string, body: unknown): Promise<unknown>;
  removeConnection(deploymentId: string, connectionId: string): Promise<unknown>;
  updatePlacement(deploymentId: string, placementId: string, body: unknown): Promise<unknown>;
}

export interface RowResult {
  status: RowStatus;
  error?: string;
}

const ORDER: Record<ProposalRow['op'], number> = {
  declare: 0,
  connect: 1,
  illuminate: 2,
  unilluminate: 3,
  disconnect: 4,
  undeclare: 5,
};

export function orderRows(rows: ProposalRow[]): ProposalRow[] {
  return [...rows].sort((a, b) => ORDER[a.op] - ORDER[b.op]);
}

async function runRow(
  api: ApplyApi,
  deploymentId: string,
  zone: string,
  row: ProposalRow,
  /** Connection ids created earlier in this run, keyed by "from>to" — illuminates may target them. */
  created: Map<string, string>,
  illuminatesNow: Map<string, string[]>,
  existingIlluminates: (connectionId: string) => string[],
): Promise<void> {
  switch (row.op) {
    case 'declare':
      await api.createPlacement(deploymentId, { zone_code: zone, item_id: row.item_id, notes: '' });
      return;
    case 'connect': {
      const res: any = await api.createConnection(deploymentId, {
        zone_code: zone,
        from_item_id: row.from_item_id,
        from_port: row.from_port,
        to_item_id: row.to_item_id,
        to_port: row.to_port,
        illuminates: [],
        notes: '',
      });
      const id = res?.data?.connection_id ?? res?.data?.item?.connection_id;
      if (id && row.to_item_id) created.set(row.to_item_id, id);
      return;
    }
    case 'illuminate':
    case 'unilluminate': {
      const connectionId = row.target_ref?.connection_id || created.get(row.item_id!);
      if (!connectionId) throw new Error('The light has no power connection to attach illumination to');
      const current = illuminatesNow.get(connectionId) ?? existingIlluminates(connectionId);
      const next =
        row.op === 'illuminate'
          ? Array.from(new Set([...current, ...(row.illuminates || [])]))
          : current.filter((x) => !(row.illuminates || []).includes(x));
      illuminatesNow.set(connectionId, next);
      await api.updateConnection(deploymentId, connectionId, { illuminates: next });
      return;
    }
    case 'disconnect':
      if (!row.target_ref?.connection_id) throw new Error('Connection not found');
      await api.removeConnection(deploymentId, row.target_ref.connection_id);
      return;
    case 'undeclare':
      if (!row.target_ref?.placement_id) throw new Error('Declaration not found');
      await api.updatePlacement(deploymentId, row.target_ref.placement_id, { removal_reason: 'Removed from deployment' });
      return;
  }
}

/**
 * Runs `rows` (already filtered to included + valid). Calls `onResult` as each row settles so the
 * table can show live progress. Returns the final per-row results.
 */
export async function applyProposal(opts: {
  api: ApplyApi;
  deploymentId: string;
  zone: string;
  rows: ProposalRow[];
  existingIlluminates?: (connectionId: string) => string[];
  onResult?: (rowId: string, result: RowResult) => void;
}): Promise<Record<string, RowResult>> {
  const { api, deploymentId, zone, onResult } = opts;
  const results: Record<string, RowResult> = {};
  const created = new Map<string, string>();
  const illuminatesNow = new Map<string, string[]>();
  const existing = opts.existingIlluminates ?? (() => []);
  const set = (id: string, r: RowResult) => {
    results[id] = r;
    onResult?.(id, r);
  };

  let failed = false;
  for (const row of orderRows(opts.rows)) {
    if (failed) {
      set(row.row_id, { status: 'skipped' });
      continue;
    }
    set(row.row_id, { status: 'running' });
    try {
      await runRow(api, deploymentId, zone, row, created, illuminatesNow, existing);
      set(row.row_id, { status: 'ok' });
    } catch (err: any) {
      failed = true;
      set(row.row_id, { status: 'error', error: err?.message || 'Request failed' });
    }
  }
  return results;
}
