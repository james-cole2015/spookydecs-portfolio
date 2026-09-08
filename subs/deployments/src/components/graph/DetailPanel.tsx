import { useEffect, useState } from 'react';
import type { Node, Edge } from '@xyflow/react';
import { PhotoLightbox, type LightboxPhoto } from '@spookydecs/ui';
import { fetchImageById } from '../../api/deploymentsApi';
import type { GraphConnection, GraphItem, GraphNodeData, GraphEdgeData } from '../../lib/graphDerivation';

export type GraphSelection =
  | { type: 'node'; node: Node<GraphNodeData> }
  | { type: 'edge'; edge: Edge<GraphEdgeData> }
  | null;

function DefRow({ label, value }: { label: string; value?: string | number | null }) {
  if (value == null || value === '') return null;
  return (
    <div className="flex justify-between gap-3 text-sm">
      <span className="text-default-500">{label}</span>
      <span className="font-medium text-foreground">{value}</span>
    </div>
  );
}

async function resolvePhotos(photoIds: string[] | undefined): Promise<LightboxPhoto[]> {
  if (!photoIds || photoIds.length === 0) return [];
  const results = await Promise.all(
    photoIds.map((id) => fetchImageById(id).catch(() => null)),
  );
  return results
    .filter((r): r is any => !!r?.cloudfront_url)
    .map((r) => ({ url: r.cloudfront_url, thumbUrl: r.thumb_cloudfront_url || r.cloudfront_url }));
}

function IlluminatesRow({ itemIds, items }: { itemIds: string[]; items: Record<string, GraphItem | undefined> }) {
  return (
    <div className="flex flex-col gap-1">
      <span className="text-sm text-default-500">Illuminates</span>
      <div className="flex flex-col gap-1">
        {itemIds.map((id) => (
          <span key={id} className="text-sm font-medium text-foreground">
            💡 {items[id]?.short_name || id}
          </span>
        ))}
      </div>
    </div>
  );
}

function NodeDetail({
  node,
  connections,
  items,
}: {
  node: Node<GraphNodeData>;
  connections: GraphConnection[];
  items: Record<string, GraphItem | undefined>;
}) {
  const { data } = node;
  const [photoUrl, setPhotoUrl] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setPhotoUrl(null);
    const photoId = data.item?.images?.primary_photo_id;
    if (!photoId) return;
    fetchImageById(photoId)
      .then((r) => {
        if (!cancelled && r?.cloudfront_url) setPhotoUrl(r.cloudfront_url);
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [data.item?.images?.primary_photo_id]);

  if (data.kind === 'hub') {
    return (
      <div className="flex flex-col gap-2">
        <h3 className="text-sm font-semibold text-foreground">{data.label}</h3>
        <p className="text-xs text-default-500">Circuit source — synthetic zone outlet, not an item.</p>
        <DefRow label="Zone" value={data.zone?.zone_name} />
        <DefRow label="Receptacle ID" value={node.id} />
        <DefRow label="Rollup" value={data.rollupAmps != null ? `${data.rollupAmps}A` : undefined} />
      </div>
    );
  }

  if (data.kind === 'placeholder') {
    return (
      <div className="flex flex-col gap-2">
        <h3 className="text-sm font-semibold text-foreground">{node.id}</h3>
        <p className="text-xs text-default-500">
          This item no longer exists — it was likely deleted after this graph was last derived.
        </p>
      </div>
    );
  }

  const item = data.item;
  // A connection's `illuminates` list belongs to its to_item (typically the
  // spotlight) — find the connection this node is the destination of.
  const illuminates = connections.find((c) => c.to_item_id === node.id)?.illuminates;

  return (
    <div className="flex flex-col gap-2">
      {photoUrl ? (
        <img src={photoUrl} alt={data.label} className="h-32 w-full rounded-medium object-cover" />
      ) : (
        <div className="flex h-32 items-center justify-center rounded-medium bg-default-100 text-4xl">
          {data.kind === 'branch' ? '➰' : '📦'}
        </div>
      )}
      <h3 className="text-sm font-semibold text-foreground">{data.label}</h3>
      <DefRow label="Class type" value={data.classType} />
      <DefRow label="Status" value={item?.status} />
      {data.hasPowerData ? (
        <>
          <DefRow label="Amps" value={item?.power_data?.amps} />
          <DefRow label="Watts" value={item?.power_data?.watts} />
        </>
      ) : (
        <p className="text-xs text-default-400">No power_data recorded for this item.</p>
      )}
      <DefRow label="Male ends" value={item?.male_ends} />
      <DefRow label="Female ends" value={item?.female_ends} />
      <DefRow label="Length" value={item?.length} />
      {illuminates && illuminates.length > 0 && <IlluminatesRow itemIds={illuminates} items={items} />}
    </div>
  );
}

function EdgeDetail({ edge, items }: { edge: Edge<GraphEdgeData>; items: Record<string, GraphItem | undefined> }) {
  const [photos, setPhotos] = useState<LightboxPhoto[]>([]);
  const photoIds = edge.data?.connection?.photo_ids;

  useEffect(() => {
    let cancelled = false;
    setPhotos([]);
    resolvePhotos(photoIds).then((p) => {
      if (!cancelled) setPhotos(p);
    });
    return () => {
      cancelled = true;
    };
  }, [photoIds]);

  const conn = edge.data?.connection;
  const placement = edge.data?.placement;

  return (
    <div className="flex flex-col gap-2">
      <h3 className="text-sm font-semibold text-foreground">Connection</h3>
      {photos.length > 0 ? (
        <PhotoLightbox photos={photos} className="grid grid-cols-3 gap-2" thumbnailClassName="h-16 w-full rounded-medium object-cover" />
      ) : (
        <p className="text-xs text-default-400">No photos recorded for this connection.</p>
      )}
      <DefRow label="From port" value={conn?.from_port} />
      <DefRow label="To port" value={conn?.to_port} />
      <DefRow label="Zone" value={conn?.zone_code || placement?.zone_code} />
      <DefRow label="Signal" value={edge.data?.label} />
      {conn?.illuminates && conn.illuminates.length > 0 && (
        <IlluminatesRow itemIds={conn.illuminates} items={items} />
      )}
    </div>
  );
}

/** Persistent right-column detail panel — not a modal/Drawer (#466 plan §2a). */
export default function DetailPanel({
  selection,
  connections,
  items,
}: {
  selection: GraphSelection;
  connections: GraphConnection[];
  items: Record<string, GraphItem | undefined>;
}) {
  if (!selection) {
    return (
      <div className="flex h-full items-center justify-center rounded-medium border border-dashed border-default-200 p-4 text-center text-sm text-default-400">
        Click a node or edge to preview its item photo and power_data…
      </div>
    );
  }

  return (
    <div className="rounded-medium border border-default-200 p-4">
      {selection.type === 'node' ? (
        <NodeDetail node={selection.node} connections={connections} items={items} />
      ) : (
        <EdgeDetail edge={selection.edge} items={items} />
      )}
    </div>
  );
}
