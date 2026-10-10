import { Handle, Position, type Node, type NodeProps } from '@xyflow/react';
import { Chip } from '@heroui/react';
import { GRAPH_CLASS_TYPE_ICONS } from '../../config/deploymentsConfig';
import type { GraphNodeData } from '../../lib/graphDerivation';

/**
 * A light — second tier, warning accent so a spotlight reads differently from the props
 * it lights. Carries its own load, and the right-hand handle drags an illuminates edge
 * onto a decoration.
 */
export default function LightNode({ data, selected }: NodeProps<Node<GraphNodeData>>) {
  const ring = selected ? 'ring-2 ring-secondary' : '';
  const icon = GRAPH_CLASS_TYPE_ICONS[data.classType || ''] || '💡';
  const powered = data.hasPowerData;
  // A lighter-weight card than a decoration: neutral surface, thick amber left bar, amber icon
  // chip. (Amber fill is what powered loads used to look like, so it wouldn't read as new.)
  const stateClasses = powered
    ? 'border-default-200 border-l-[6px] border-l-warning bg-content1'
    : 'border-default-300 border-l-[6px] border-l-default-300 border-dashed bg-default-50';
  const item = data.item;
  const amps = item?.power_data?.amps;
  const watts = item?.power_data?.watts;

  return (
    <div className={`flex w-[200px] flex-col gap-1 rounded-md border p-3 text-left shadow-sm ${stateClasses} ${ring}`}>
      <div className="flex items-center justify-between">
        <span className="flex h-7 w-7 items-center justify-center rounded-full bg-warning-100 text-base">{icon}</span>
        {!powered && (
          <Chip size="sm" variant="flat" color="default">
            no power_data
          </Chip>
        )}
      </div>
      <span className="truncate text-sm font-semibold text-foreground" title={data.label}>
        {data.label}
      </span>
      <span className="text-xs text-default-500">
        {data.classType || '—'}
        {data.litCount ? ` · lights ${data.litCount}` : ''}
      </span>
      {powered && (
        <span className="text-xs font-medium text-warning-600">
          {amps}A{watts != null ? ` / ${watts}W` : ''}
        </span>
      )}

      <Handle id="t-t" type="target" position={Position.Top} isConnectable={!!data.canTarget} className={data.canTarget ? '!h-3 !w-3 !border-2 !border-background !bg-secondary' : ''} style={data.canTarget ? undefined : { opacity: 0 }} />
      <Handle id="b-s" type="source" position={Position.Bottom} isConnectable={!!data.canSource} className={data.canSource ? '!h-3 !w-3 !border-2 !border-background !bg-secondary' : ''} style={data.canSource ? undefined : { opacity: 0 }} />
      <Handle id="illum-s" type="source" position={Position.Right} isConnectable={!!data.canIlluminate} className={data.canIlluminate ? '!h-3 !w-3 !border-2 !border-background !bg-warning' : ''} style={data.canIlluminate ? undefined : { opacity: 0 }} />
    </div>
  );
}
