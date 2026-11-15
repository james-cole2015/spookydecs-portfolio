/**
 * #699 — teardown zone hydration: real record for any status, 'Unknown' only on load failure.
 *
 *   npx vitest run --dir subs/deployments/tests/unit
 */
import { describe, it, expect } from 'vitest';
import { hydrateZones } from '../../src/lib/teardownHydrate';

const rec = (id: string, status: string) => ({ id, short_name: id.toLowerCase(), class: 'Decoration', status });
const db: Record<string, any> = {
  A: rec('A', 'Deployed'),
  B: rec('B', 'TearDown'),
  C: rec('C', 'Packed'),
  D: rec('D', 'Ready'),
};
const getItem = async (id: string) => {
  if (id === 'BOOM') throw new Error('500');
  return db[id] ? { data: db[id] } : { data: null };
};

describe('hydrateZones', () => {
  it('resolves real name/class/status for any status, incl. Packed and Ready', async () => {
    const [z] = await hydrateZones(getItem, [{ zone_code: 'FY', zone_name: 'Front', items_deployed: ['A', 'B', 'C', 'D'] }]);
    expect(z.items_deployed.map((i) => i.status)).toEqual(['Deployed', 'TearDown', 'Packed', 'Ready']);
    expect(z.items_deployed.every((i) => i.class === 'Decoration' && i.short_name)).toBe(true);
  });

  it("uses 'Unknown' only when the record cannot be loaded (missing or error)", async () => {
    const [z] = await hydrateZones(getItem, [{ zone_code: 'FY', zone_name: 'Front', items_deployed: ['A', 'NOPE', 'BOOM'] }]);
    expect(z.items_deployed[0].status).toBe('Deployed');
    expect(z.items_deployed[1]).toMatchObject({ id: 'NOPE', status: 'Unknown', class: 'Unknown' });
    expect(z.items_deployed[2]).toMatchObject({ id: 'BOOM', status: 'Unknown' });
  });

  it('fetches each unique id once and passes through already-hydrated objects', async () => {
    let calls = 0;
    const counting = async (id: string) => { calls++; return getItem(id); };
    const obj = rec('X', 'Packed');
    const zs = await hydrateZones(counting, [
      { zone_code: 'FY', zone_name: 'F', items_deployed: ['A', obj] },
      { zone_code: 'BY', zone_name: 'B', items_deployed: ['A'] },
    ]);
    expect(calls).toBe(1);
    expect(zs[0].items_deployed[1]).toBe(obj);
  });
});
