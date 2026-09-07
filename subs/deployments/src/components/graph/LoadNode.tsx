import { Handle, Position, type Node, type NodeProps } from '@xyflow/react';
import { Chip } from '@heroui/react';
import { GRAPH_CLASS_TYPE_ICONS } from '../../config/deploymentsConfig';
import type { GraphNodeData } from '../../lib/graphDerivation';

/** Terminal load — two visual states depending on whether power_data resolved. */
export default function LoadNode({ data, selected }: NodeProps<Node<GraphNodeData>>) {
  const ring = selected ? 'ring-2 ring-secondary' : '';
  const icon = GRAPH_CLASS_TYPE_ICONS[data.classType || ''] || '📦';
  const powered = data.hasPowerData;
  const stateClasses = powered
    ? 'border-warning bg-warning-50'
    : 'border-default-300 border-dashed bg-default-50';
  const item = data.item;
  const amps = item?.power_data?.amps;
  const watts = item?.power_data?.watts;

  return (
    <div className={`flex w-[200px] flex-col gap-1 rounded-lg border-2 p-3 text-left shadow-sm ${stateClasses} ${ring}`}>
      <div className="flex items-center justify-between">
        <span className="text-lg">{icon}</span>
        {!powered && (
          <Chip size="sm" variant="flat" color="default">
            no power_data
          </Chip>
        )}
      </div>
      <span className="truncate text-sm font-medium text-foreground" title={data.label}>
        {data.label}
      </span>
      <span className="text-xs text-default-500">{data.classType || '—'}</span>
      {powered && (
        <span className="text-xs font-medium text-warning-600">
          {amps}A{watts != null ? ` / ${watts}W` : ''}
        </span>
      )}

      <Handle id="t-t" type="target" position={Position.Top} isConnectable={false} style={{ opacity: 0 }} />
    </div>
  );
}
