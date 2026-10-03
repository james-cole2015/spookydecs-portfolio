import { Handle, Position, type Node, type NodeProps } from '@xyflow/react';
import { GRAPH_CLASS_TYPE_ICONS } from '../../config/deploymentsConfig';
import type { GraphNodeData } from '../../lib/graphDerivation';

/**
 * A Cord/Plug with female_ends > 1 — one card per cord (not one node per
 * terminal); every active outbound connection fans out as its own edge from
 * this single node. Per the approved concept mockup (#466 plan §2a).
 */
export default function BranchNode({ data, selected }: NodeProps<Node<GraphNodeData>>) {
  const ring = selected ? 'ring-2 ring-secondary' : '';
  const icon = GRAPH_CLASS_TYPE_ICONS[data.classType || ''] || '➰';

  return (
    <div
      className={`flex w-[200px] flex-col gap-1 rounded-lg border-2 border-dashed border-default-400 bg-content1 p-3 text-left shadow-sm ${ring}`}
    >
      <span className="text-lg">{icon}</span>
      <span className="truncate text-sm font-medium text-foreground" title={data.label}>
        {data.label}
      </span>
      <span className="text-xs text-default-500">
        {data.femaleEnds ?? '—'} female ends · branch
      </span>

      <Handle id="t-t" type="target" position={Position.Top} isConnectable={false} style={{ opacity: 0 }} />
      <Handle id="b-s" type="source" position={Position.Bottom} isConnectable={false} style={{ opacity: 0 }} />
    </div>
  );
}
