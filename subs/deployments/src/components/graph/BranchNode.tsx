import { Handle, Position, type Node, type NodeProps } from '@xyflow/react';
import { GRAPH_CLASS_TYPE_ICONS } from '../../config/deploymentsConfig';
import type { GraphNodeData } from '../../lib/graphDerivation';

/**
 * A plug / splitter (or any accessory fanning out to 2+ outlets) — third tier. A distribution
 * point rather than a load: neutral card, outlet count, and the load flowing through it.
 */
export default function BranchNode({ data, selected }: NodeProps<Node<GraphNodeData>>) {
  const ring = selected ? 'ring-2 ring-secondary' : '';
  const icon = GRAPH_CLASS_TYPE_ICONS[data.classType || ''] || '🔌';

  return (
    <div
      className={`flex w-[200px] flex-col gap-1 rounded-lg border-2 border-default-500 bg-content2 p-3 text-left shadow-sm ${ring}`}
    >
      <div className="flex items-center justify-between">
        <span className="text-lg">{icon}</span>
        {data.throughAmps != null && data.throughAmps > 0 && (
          <span className="text-xs font-medium text-warning-600">{data.throughAmps}A through</span>
        )}
      </div>
      <span className="truncate text-sm font-medium text-foreground" title={data.label}>
        {data.label}
      </span>
      <span className="text-xs text-default-500">
        {data.femaleEnds ?? '—'} outlets · splitter
      </span>

      <Handle id="t-t" type="target" position={Position.Top} isConnectable={!!data.canTarget} className={data.canTarget ? '!h-3 !w-3 !border-2 !border-background !bg-secondary' : ''} style={data.canTarget ? undefined : { opacity: 0 }} />
      <Handle id="b-s" type="source" position={Position.Bottom} isConnectable={!!data.canSource} className={data.canSource ? '!h-3 !w-3 !border-2 !border-background !bg-secondary' : ''} style={data.canSource ? undefined : { opacity: 0 }} />
    </div>
  );
}
