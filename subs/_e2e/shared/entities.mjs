/**
 * Throwaway entities for e2e specs that need an upstream record (#623): a sentinel item or idea created through
 * the API, found again by a marker in its name/title (IDs are server-generated → marker+sweep), and deleted via
 * the cascade routes. Each suite passes its OWN marker so suites never sweep each other's records.
 * Zero dependencies — takes the `api` client from makeApiClient (storage/tests/shared/sentinel.mjs).
 */

const asList = (res, key) => {
  const d = res.data ?? res.body?.data ?? res.body;
  return Array.isArray(d) ? d : d?.[key] || res.body?.[key] || [];
};

/** Creates a tote-packed Static Prop (validators.py requires stakes + tethers) and returns its record. */
export async function createSentinelItem(api, marker, label = 'item') {
  const name = `${marker} ${label} ${Date.now()}`;
  const res = await api('POST', '/items', {
    type: 'Decoration', category: 'Static Prop', shortName: name, season: 'Halloween', status: 'Ready',
    stakes: '4', tethers: '2', packable: true, singlePacked: false,
  });
  if (res.status >= 300) throw new Error(`create sentinel item failed (${res.status}): ${JSON.stringify(res.body).slice(0, 300)}`);
  const found = (await findSentinelItems(api, marker)).find((i) => i.short_name === name);
  if (!found) throw new Error('sentinel item not found after create');
  return found;
}

export async function findSentinelItems(api, marker) {
  // Also match by id: a late Item.Packed event can re-create a deleted item as a stub with no short_name.
  const idToken = marker.split(' - ')[0].replace(/ /g, '_');
  return asList(await api('GET', '/items'), 'items').filter((i) => String(i.short_name ?? '').includes(marker) || String(i.id ?? '').includes(idToken));
}

export async function createSentinelIdea(api, marker, label = 'idea') {
  const title = `${marker} ${label} ${Date.now()}`;
  const res = await api('POST', '/ideas', { title, season: 'Halloween', status: 'Considering', description: 'e2e sentinel', tags: [] });
  if (res.status >= 300) throw new Error(`create sentinel idea failed (${res.status}): ${JSON.stringify(res.body).slice(0, 300)}`);
  const found = (await findSentinelIdeas(api, marker)).find((i) => i.title === title);
  if (!found) throw new Error('sentinel idea not found after create');
  return found;
}

export async function findSentinelIdeas(api, marker) {
  return asList(await api('GET', '/ideas'), 'ideas').filter((i) => String(i.title ?? '').includes(marker));
}

/** Cascade-deletes every marked item and idea; returns how many were removed. */
export async function sweepItemsAndIdeas(api, marker) {
  const items = await findSentinelItems(api, marker);
  for (const i of items) {
    const enc = encodeURIComponent(i.id);
    await api('DELETE', `/items/${enc}/cascade`);
  }
  const ideas = await findSentinelIdeas(api, marker);
  for (const i of ideas) await api('DELETE', `/ideas/${i.id}/cascade`);
  return items.length + ideas.length;
}
