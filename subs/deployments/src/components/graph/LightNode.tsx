import { Handle, Position, type Node, type NodeProps } from '@xyflow/react';
import type { GraphNodeData } from '../../lib/graphDerivation';
import IconNodeShell from './IconNodeShell';
import { nodeIcon } from './graphIcons';

/**
 * A light — second tier: medium badge with an amber glow, bulb or flashlight glyph. The right-hand handle drags an illuminates edge onto a decoration; the corner pip counts what it lights.
 */
export default function LightNode({ data, selected }: NodeProps<Node<GraphNodeData>>) {
  const powered = data.hasPowerData;
  const amps = data.item?.power_data?.amps;
  const watts = data.item?.power_data?.watts;
  return (
    <IconNodeShell
      Icon={nodeIcon(data)}
      badgeSize={56}
      iconSize={28}
      width={130}
      selected={selected}
      label={data.label}
      corner={data.litCount ? data.litCount : undefined}
      sublabel={powered ? `${amps}A${watts != null ? ` · ${watts}W` : ''}` : 'no power_data'}
      sublabelClassName={powered ? 'font-medium text-warning-600' : 'text-default-400'}
      badgeClassName={
        powered
          ? 'border-warning bg-warning-100 text-warning-600 ring-4 ring-warning/30'
          : 'border-dashed border-default-300 bg-default-50 text-default-400'
      }
    >
        <Handle id="t-t" type="target" position={Position.Top} isConnectable={!!data.canTarget} className={data.canTarget ? '!h-3 !w-3 !border-2 !border-background !bg-secondary' : ''} style={data.canTarget ? undefined : { opacity: 0 }} />
        <Handle id="b-s" type="source" position={Position.Bottom} isConnectable={!!data.canSource} className={data.canSource ? '!h-3 !w-3 !border-2 !border-background !bg-secondary' : ''} style={data.canSource ? undefined : { opacity: 0 }} />
        <Handle id="illum-s" type="source" position={Position.Right} isConnectable={!!data.canIlluminate} className={data.canIlluminate ? '!h-3 !w-3 !border-2 !border-background !bg-warning' : ''} style={data.canIlluminate ? undefined : { opacity: 0 }} />
    </IconNodeShell>
  );
}
