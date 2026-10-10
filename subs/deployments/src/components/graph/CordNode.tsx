import { Handle, Position, type Node, type NodeProps } from '@xyflow/react';
import type { GraphNodeData } from '../../lib/graphDerivation';

/**
 * A cord — the quietest tier: a compact pill (name + length, with the load it carries) so a
 * chain of cords reads as wiring between the things that matter, not as more cards.
 */
export default function CordNode({ data, selected }: NodeProps<Node<GraphNodeData>>) {
  const ring = selected ? 'ring-2 ring-secondary' : '';
  const length = data.item?.length;

  return (
    <div
      className={`flex h-[44px] w-[150px] items-center gap-2 rounded-full border border-default-300 bg-default-50 px-3 text-left text-default-600 ${ring}`}
      title={data.label}
    >
      <span className="text-sm">➰</span>
      <span className="min-w-0 flex-1 truncate text-xs font-medium">{data.label}</span>
      {length != null && length !== '' && <span className="text-[10px] text-default-400">{length}</span>}
      {data.throughAmps != null && data.throughAmps > 0 && (
        <span className="text-[10px] font-medium text-warning-600">{data.throughAmps}A</span>
      )}

      <Handle id="t-t" type="target" position={Position.Top} isConnectable={!!data.canTarget} className={data.canTarget ? '!h-3 !w-3 !border-2 !border-background !bg-secondary' : ''} style={data.canTarget ? undefined : { opacity: 0 }} />
      <Handle id="b-s" type="source" position={Position.Bottom} isConnectable={!!data.canSource} className={data.canSource ? '!h-3 !w-3 !border-2 !border-background !bg-secondary' : ''} style={data.canSource ? undefined : { opacity: 0 }} />
    </div>
  );
}
