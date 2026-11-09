/**
 * Label content helpers (#707). Pure functions so the label template stays
 * dumb and the grouping/truncation rules are unit-testable.
 */
export interface LabelItem {
  id: string;
  short_name?: string;
  class?: string;
  class_type?: string;
  [key: string]: unknown;
}

export interface ContentGroup {
  label: string;
  count: number;
}

/** List packed items by short name, combining duplicates ("Spider Web x3"), biggest first. */
export function groupContents(items: LabelItem[]): ContentGroup[] {
  const counts = new Map<string, number>();
  for (const item of items) {
    const label = String(item.short_name || item.id || item.class_type || item.class || 'Item');
    counts.set(label, (counts.get(label) ?? 0) + 1);
  }
  return [...counts.entries()]
    .map(([label, count]) => ({ label, count }))
    .sort((a, b) => b.count - a.count || a.label.localeCompare(b.label));
}

/** Cap the group list so a crowded tote cannot overflow the card. */
export function capGroups(groups: ContentGroup[], max: number): { shown: ContentGroup[]; hidden: number } {
  if (groups.length <= max) return { shown: groups, hidden: 0 };
  const shown = groups.slice(0, max);
  const hidden = groups.slice(max).reduce((n, g) => n + g.count, 0);
  return { shown, hidden };
}
