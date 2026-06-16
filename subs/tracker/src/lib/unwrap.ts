/**
 * Response unwrapping helpers — the vanilla pages all did `data?.items || data
 * || []` (the tracker handler sometimes wraps lists in `{ items: [...] }`, and
 * trackerApi already strips the outer `{ data: ... }` envelope). Centralized here
 * so the React pages stay terse.
 */

/** Coerce a list-shaped response (`{ items }` or a bare array) to an array. */
export function asArray<T = any>(data: any): T[] {
  if (Array.isArray(data)) return data;
  if (data && Array.isArray(data.items)) return data.items;
  return [];
}

/** Coerce a single-record response (`{ item }` or the record itself) to the record. */
export function asItem<T = any>(data: any): T | null {
  if (!data) return null;
  return (data.item ?? data) as T;
}
