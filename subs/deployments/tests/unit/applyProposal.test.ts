/**
 * L1 — proposal apply executor (#639): ordering, per-row results, stop-on-error.
 *
 *   npx vitest run --dir subs/deployments/tests/unit
 */
import { describe, it, expect } from 'vitest';
import { applyProposal, orderRows, type ApplyApi } from '../../src/lib/applyProposal';
import type { ProposalRow } from '../../src/lib/proposal';

const row = (r: Partial<ProposalRow> & Pick<ProposalRow, 'row_id' | 'op'>): ProposalRow => ({
  destructive: false,
  valid: true,
  problems: [],
  warnings: [],
  ...r,
});

function fakeApi(failOn?: string) {
  const calls: string[] = [];
  const mk = (name: string, ret: unknown = {}) => async (..._a: unknown[]) => {
    calls.push(name);
    if (name === failOn) throw new Error(`${name} rejected`);
    return ret;
  };
  const api: ApplyApi = {
    createPlacement: mk('createPlacement'),
    createConnection: mk('createConnection', { data: { connection_id: 'new-conn' } }),
    updateConnection: mk('updateConnection'),
    removeConnection: mk('removeConnection'),
    updatePlacement: mk('updatePlacement'),
  };
  return { api, calls };
}

const rows: ProposalRow[] = [
  row({ row_id: 'r1', op: 'undeclare', item_id: 'X', destructive: true, target_ref: { placement_id: 'p9' } }),
  row({ row_id: 'r2', op: 'illuminate', item_id: 'SPOT', illuminates: ['G'] }),
  row({ row_id: 'r3', op: 'connect', from_item_id: 'CORD', from_port: 'Female_1', to_item_id: 'SPOT', to_port: 'Power_Inlet' }),
  row({ row_id: 'r4', op: 'declare', item_id: 'G' }),
];

describe('applyProposal', () => {
  it('orders declare -> connect -> illuminate -> removals', () => {
    expect(orderRows(rows).map((r) => r.op)).toEqual(['declare', 'connect', 'illuminate', 'undeclare']);
  });

  it('runs in order and a light connected in the same run can be illuminated', async () => {
    const { api, calls } = fakeApi();
    const res = await applyProposal({ api, deploymentId: 'D', zone: 'FY', rows });
    expect(calls).toEqual(['createPlacement', 'createConnection', 'updateConnection', 'updatePlacement']);
    expect(Object.values(res).every((r) => r.status === 'ok')).toBe(true);
  });

  it('stops on the first error and marks the rest skipped', async () => {
    const { api, calls } = fakeApi('createConnection');
    const seen: string[] = [];
    const res = await applyProposal({ api, deploymentId: 'D', zone: 'FY', rows, onResult: (id, r) => seen.push(`${id}:${r.status}`) });
    expect(calls).toEqual(['createPlacement', 'createConnection']);
    expect(res.r4.status).toBe('ok');
    expect(res.r3).toEqual({ status: 'error', error: 'createConnection rejected' });
    expect(res.r2.status).toBe('skipped');
    expect(res.r1.status).toBe('skipped');
    expect(seen[0]).toBe('r4:running');
  });

  it('merges illuminates with the existing list', async () => {
    const bodies: unknown[] = [];
    const { api } = fakeApi();
    api.updateConnection = async (_d, _c, b) => void bodies.push(b);
    await applyProposal({
      api, deploymentId: 'D', zone: 'FY',
      rows: [row({ row_id: 'r1', op: 'illuminate', item_id: 'SPOT', illuminates: ['G'], target_ref: { connection_id: 'c2' } })],
      existingIlluminates: () => ['OLD'],
    });
    expect(bodies).toEqual([{ illuminates: ['OLD', 'G'] }]);
  });

  it('a missing target_ref errors that row rather than calling the API', async () => {
    const { api, calls } = fakeApi();
    const res = await applyProposal({ api, deploymentId: 'D', zone: 'FY', rows: [row({ row_id: 'r1', op: 'disconnect', destructive: true })] });
    expect(res.r1.status).toBe('error');
    expect(calls).toEqual([]);
  });
});
