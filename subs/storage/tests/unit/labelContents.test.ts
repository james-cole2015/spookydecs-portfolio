import { describe, expect, it } from 'vitest';
import { capGroups, groupContents } from '../../src/lib/labelContents';

describe('groupContents', () => {
  it('lists by short_name, combines duplicates, falls back to id; biggest first', () => {
    const groups = groupContents([
      { id: '1', short_name: 'Spider Web' },
      { id: '2', short_name: 'Spider Web' },
      { id: '3', short_name: 'Inflatable Ghost' },
      { id: 'ITEM-4' },
    ]);
    expect(groups).toEqual([
      { label: 'Spider Web', count: 2 },
      { label: 'Inflatable Ghost', count: 1 },
      { label: 'ITEM-4', count: 1 },
    ]);
  });
  it('returns empty for no items', () => {
    expect(groupContents([])).toEqual([]);
  });
});

describe('capGroups', () => {
  const groups = [
    { label: 'A', count: 5 },
    { label: 'B', count: 3 },
    { label: 'C', count: 2 },
  ];
  it('passes through under the cap', () => {
    expect(capGroups(groups, 3)).toEqual({ shown: groups, hidden: 0 });
  });
  it('rolls the overflow into a hidden item count', () => {
    expect(capGroups(groups, 1)).toEqual({ shown: [groups[0]], hidden: 5 });
  });
});
