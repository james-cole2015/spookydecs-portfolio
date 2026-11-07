export interface TItem {
  id: string;
  short_name?: string;
  status?: string;
  class?: string;
}
export interface TZone {
  zone_code: string;
  zone_name: string;
  items_deployed: TItem[];
}

/**
 * Hydrate each zone item from its own record rather than status-filtered searches, so any
 * status (Deployed, TearDown, Packed, Ready, ...) resolves. 'Unknown' only when the load fails (#699).
 */
export async function hydrateZones(getItem: (id: string) => Promise<any>, zones: any[]): Promise<TZone[]> {
  const ids = new Set<string>();
  zones.forEach((z) =>
    (z.items_deployed || []).forEach((i: any) => {
      if (typeof i === 'string') ids.add(i);
    }),
  );
  const itemMap: Record<string, TItem> = {};
  await Promise.all(
    [...ids].map(async (itemId) => {
      try {
        const res = await getItem(itemId);
        const rec = res?.data?.item || res?.data || res?.item;
        if (rec && rec.id) itemMap[itemId] = rec;
      } catch {
        /* leave unresolved -> Unknown placeholder */
      }
    }),
  );
  return zones.map((zone) => ({
    ...zone,
    items_deployed: (zone.items_deployed || []).map((idOrObj: any) =>
      typeof idOrObj === 'object' && idOrObj !== null
        ? idOrObj
        : itemMap[idOrObj] || { id: idOrObj, short_name: idOrObj, status: 'Unknown', class: 'Unknown' },
    ),
  }));
}
