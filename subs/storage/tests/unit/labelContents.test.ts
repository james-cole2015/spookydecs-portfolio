import { describe, expect, it } from 'vitest';
import { capGroups, groupContents } from '../../src/lib/labelContents';

describe('groupContents', () => {
  it('groups by class_type, falls back to class, then Other; biggest first', () => {
    const groups = groupContents([
      { id: '1', class_type: 'Spider' },
      { id: '2', class_type: 'Spider' },
      { id: '3', class: 'Light' },
      { id: '4' },
    ]);
    expect(groups).toEqual([
      { label: 'Spider', count: 2 },
      { label: 'Light', count: 1 },
      { label: 'Other', count: 1 },
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
