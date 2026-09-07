import { Handle, Position, type Node, type NodeProps } from '@xyflow/react';
import type { GraphNodeData } from '../../lib/graphDerivation';

/** An item id referenced by a connection/placement that no longer resolves. */
export default function PlaceholderNode({ data, selected }: NodeProps<Node<GraphNodeData>>) {
  const ring = selected ? 'ring-2 ring-secondary' : '';
  return (
    <div
      className={`flex w-[200px] flex-col gap-1 rounded-lg border-2 border-dashed border-default-300 bg-default-50 p-3 text-left opacity-70 shadow-sm ${ring}`}
    >
      <span className="text-lg">🗑️</span>
      <span className="text-sm font-medium text-default-500">{data.label}</span>

      <Handle id="t-t" type="target" position={Position.Top} isConnectable={false} style={{ opacity: 0 }} />
      <Handle id="b-s" type="source" position={Position.Bottom} isConnectable={false} style={{ opacity: 0 }} />
    </div>
  );
}
