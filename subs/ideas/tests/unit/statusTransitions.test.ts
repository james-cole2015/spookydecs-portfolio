import { describe, expect, it } from 'vitest';
import { blockedStatuses, nextStatusOptions } from '../../src/config/fieldAvailability';
import { deferTargets, isDeferred, type Idea } from '../../src/config/ideasConfig';

// #683 — sidebar Status offers only legal next states; Defer reuses the bucket field.
const idea = (over: Partial<Idea>): Idea =>
  ({ id: 'x', title: 't', season: 'Halloween', status: 'Considering', ...over }) as Idea;

describe('nextStatusOptions', () => {
  it('offers Built and Abandoned from Workbench, never Planning', () => {
    expect(nextStatusOptions('Workbench')).toEqual(['Built', 'Abandoned']);
  });
  it('walks Considering <-> Planning -> Workbench', () => {
    expect(nextStatusOptions('Considering')).toEqual(['Planning']);
    expect(nextStatusOptions('Planning')).toEqual(['Considering', 'Workbench']);
  });
  it('offers nothing from terminal statuses', () => {
    expect(nextStatusOptions('Built')).toEqual([]);
    expect(nextStatusOptions('Abandoned')).toEqual([]);
  });
});

describe('blockedStatuses', () => {
  it('blocks Planning until description and link/cost exist', () => {
    expect(blockedStatuses(idea({}), false).Planning).toMatch(/Description/);
    expect(blockedStatuses(idea({ description: 'd', link: 'https://x.test' }), false).Planning).toBeUndefined();
  });
  it('blocks Workbench at the build cap even when gates pass', () => {
    const ready = idea({
      status: 'Planning',
      description: 'd',
      materials: [{ name: 'foam' }] as Idea['materials'],
      build_instructions: [{ title: 's' }] as Idea['build_instructions'],
    });
    expect(blockedStatuses(ready, false).Workbench).toBeUndefined();
    expect(blockedStatuses(ready, true).Workbench).toBe('Build limit reached');
  });
});

describe('defer', () => {
  it("targets next year's seasons, Off-Season first", () => {
    expect(deferTargets(new Date('2026-10-24'))).toEqual(['2027 Off-Season', '2027 Halloween', '2027 Christmas']);
  });
  it('detects a deferral by bucket year later than the year it entered Planning', () => {
    expect(isDeferred({ status: 'Planning', bucket: '2027 Off-Season', prep_start: '2026-03-01' })).toBe(true);
    expect(isDeferred({ status: 'Planning', bucket: '2026 Off-Season', prep_start: '2026-03-01' })).toBe(false);
    expect(isDeferred({ status: 'Workbench', bucket: '2027 Off-Season', prep_start: '2026-03-01' })).toBe(false);
  });
});
