/**
 * Sentinel idea fixture (#623) — marker+sweep (idea IDs are server-generated). Every sentinel
 * idea carries SENTINEL_MARKER in its title; sweep cascade-deletes them (also removes linked
 * costs/photos). Idea titles allow up to 150 chars (FormPage maxLength).
 */
export { makeApiClient } from '../../../storage/tests/shared/sentinel.mjs';

export const SENTINEL_MARKER = 'E2E IDEAS SENTINEL - safe to delete';

export function sentinelName(label) {
  return `${SENTINEL_MARKER} ${label} ${Date.now()}`;
}

export async function findSentinels(api) {
  const res = await api('GET', '/ideas');
  const ideas = Array.isArray(res.body) ? res.body : res.data?.ideas || res.body?.ideas || res.data || [];
  return ideas.filter((i) => String(i.title ?? '').includes(SENTINEL_MARKER));
}

export async function sweepSentinels(api) {
  const found = await findSentinels(api);
  for (const idea of found) await api('DELETE', `/ideas/${idea.id}/cascade`);
  return found.length;
}
