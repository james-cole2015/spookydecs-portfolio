import { useEffect, useState } from 'react';
import type { Node, Edge } from '@xyflow/react';
import { PhotoLightbox, type LightboxPhoto } from '@spookydecs/ui';
import { fetchImageById } from '../../api/deploymentsApi';
import type { GraphConnection, GraphPlacement, GraphNodeData, GraphEdgeData } from '../../lib/graphDerivation';

export type GraphSelection =
  | { type: 'node'; node: Node<GraphNodeData> }
  | { type: 'edge'; edge: Edge<GraphEdgeData> }
  | null;

interface DetailContext {
  connections: GraphConnection[];
  placements: GraphPlacement[];
  /** id -> display label, covers every node kind (hub/load/branch/placeholder). */
  nodeLabels: Record<string, string>;
}

function DefRow({ label, value }: { label: string; value?: string | number | null }) {
  if (value == null || value === '') return null;
  return (
    <div className="flex justify-between gap-3 text-sm">
      <span className="text-default-500">{label}</span>
      <span className="font-medium text-foreground">{value}</span>
    </div>
  );
}

function formatDateTime(iso?: string): string | null {
  if (!iso) return null;
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return null;
  return d.toLocaleString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });
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

function LabeledList({ label, items }: { label: string; items: { id: string; text: string }[] }) {
  if (items.length === 0) return null;
  return (
    <div className="flex flex-col gap-1">
      <span className="text-sm text-default-500">{label}</span>
      <div className="flex flex-col gap-1">
        {items.map((it) => (
          <span key={it.id} className="text-xs text-foreground">
            {it.text}
          </span>
        ))}
      </div>
    </div>
  );
}

/** Every connection/placement touching this node, split by direction. */
function connectionsForNode(nodeId: string, ctx: DetailContext) {
  const incoming = ctx.connections.filter((c) => c.to_item_id === nodeId);
  const outgoing = ctx.connections.filter((c) => c.from_item_id === nodeId);
  const placement = ctx.placements.find((p) => p.item_id === nodeId);
  // The connection whose illuminates list contains this node — i.e. this node
  // is a decoration lit by another connection's to_item (a spotlight).
  const illuminatedByConn = ctx.connections.find((c) => c.illuminates?.includes(nodeId));
  return { incoming, outgoing, placement, illuminatedByConn };
}

function NodeDetail({ node, ctx }: { node: Node<GraphNodeData>; ctx: DetailContext }) {
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
  const { incoming, outgoing, placement, illuminatedByConn } = connectionsForNode(node.id, ctx);
  const deployedAt = formatDateTime(incoming[0]?.connected_at || placement?.placed_at);
  // `illuminates` belongs to the connection where this node is the *target*
  // (this node is the spotlight powering on) — never the outgoing side.
  const illuminates = incoming.find((c) => c.illuminates?.length)?.illuminates;

  const incomingRows = incoming.map((c) => ({
    id: c.connection_id || c.from_item_id,
    text: `← ${ctx.nodeLabels[c.from_item_id] || c.from_item_id}${c.from_port ? ` (${c.from_port})` : ''}`,
  }));
  const outgoingRows = outgoing.map((c) => ({
    id: c.connection_id || c.to_item_id,
    text: `→ ${ctx.nodeLabels[c.to_item_id] || c.to_item_id}${c.to_port ? ` (${c.to_port})` : ''}`,
  }));

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
      <DefRow label="Deployed" value={deployedAt} />
      {illuminates && illuminates.length > 0 && (
        <LabeledList
          label="Illuminates"
          items={illuminates.map((id) => ({ id, text: `💡 ${ctx.nodeLabels[id] || id}` }))}
        />
      )}
      {illuminatedByConn && (
        <LabeledList
          label="Illuminated by"
          items={[{ id: illuminatedByConn.connection_id || illuminatedByConn.to_item_id, text: `💡 ${ctx.nodeLabels[illuminatedByConn.to_item_id] || illuminatedByConn.to_item_id}` }]}
        />
      )}
      <LabeledList label="Incoming connections" items={incomingRows} />
      <LabeledList label="Outgoing connections" items={outgoingRows} />
    </div>
  );
}

function EdgeDetail({ edge, ctx }: { edge: Edge<GraphEdgeData>; ctx: DetailContext }) {
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
  const when = formatDateTime(conn?.connected_at || placement?.placed_at);

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
      <DefRow label="Deployed" value={when} />
      {conn?.illuminates && conn.illuminates.length > 0 && (
        <LabeledList
          label="Illuminates"
          items={conn.illuminates.map((id) => ({ id, text: `💡 ${ctx.nodeLabels[id] || id}` }))}
        />
      )}
    </div>
  );
}

/** Persistent right-column detail panel — not a modal/Drawer (#466 plan §2a). */
export default function DetailPanel({
  selection,
  connections,
  placements,
  nodeLabels,
}: {
  selection: GraphSelection;
} & DetailContext) {
  if (!selection) {
    return (
      <div className="flex h-full items-center justify-center rounded-medium border border-dashed border-default-200 p-4 text-center text-sm text-default-400">
        Click a node or edge to preview its item photo and power_data…
      </div>
    );
  }

  const ctx: DetailContext = { connections, placements, nodeLabels };

  return (
    <div className="rounded-medium border border-default-200 p-4">
      {selection.type === 'node' ? (
        <NodeDetail node={selection.node} ctx={ctx} />
      ) : (
        <EdgeDetail edge={selection.edge} ctx={ctx} />
      )}
    </div>
  );
}
