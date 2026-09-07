import { Handle, Position, type Node, type NodeProps } from '@xyflow/react';
import { Chip } from '@heroui/react';
import type { GraphNodeData } from '../../lib/graphDerivation';

/** Zone circuit source — synthetic root, never resolved via the items table. */
export default function HubNode({ data, selected }: NodeProps<Node<GraphNodeData>>) {
  const ring = selected ? 'ring-2 ring-secondary' : '';
  const overloadClasses = data.overloaded
    ? 'border-danger bg-danger-50'
    : 'border-secondary bg-secondary-50';

  return (
    <div
      className={`flex w-[200px] flex-col gap-1 rounded-lg border-2 p-3 text-left shadow-sm ${overloadClasses} ${ring}`}
    >
      <div className="flex items-center justify-between">
        <span className="text-lg">🔌</span>
        {data.overloaded && (
          <Chip size="sm" variant="flat" color="danger">
            Overload
          </Chip>
        )}
      </div>
      <span className="truncate text-sm font-semibold text-foreground" title={data.label}>
        {data.label}
      </span>
      <div className="flex items-center justify-between text-xs text-default-500">
        <span>120V · 15A breaker</span>
      </div>
      {data.rollupAmps != null && (
        <span className={`text-xs font-medium ${data.overloaded ? 'text-danger' : 'text-secondary'}`}>
          {data.rollupAmps}A load
        </span>
      )}

      <Handle id="b-s" type="source" position={Position.Bottom} isConnectable={false} style={{ opacity: 0 }} />
    </div>
  );
}
