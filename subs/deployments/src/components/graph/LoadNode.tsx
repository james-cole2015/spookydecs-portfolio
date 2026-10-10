import { Handle, Position, type Node, type NodeProps } from '@xyflow/react';
import type { GraphNodeData } from '../../lib/graphDerivation';
import IconNodeShell from './IconNodeShell';
import { nodeIcon } from './graphIcons';

/**
 * A decoration — the loudest tier: large circular badge in the primary colour, glyph by class_type, amps/watts under the name. Dashed neutral when there is no power_data.
 */
export default function LoadNode({ data, selected }: NodeProps<Node<GraphNodeData>>) {
  const powered = data.hasPowerData;
  const amps = data.item?.power_data?.amps;
  const watts = data.item?.power_data?.watts;
  return (
    <IconNodeShell
      Icon={nodeIcon(data)}
      badgeSize={76}
      iconSize={38}
      width={140}
      selected={selected}
      label={data.label}
      sublabel={powered ? `${amps}A${watts != null ? ` · ${watts}W` : ''}` : 'no power_data'}
      sublabelClassName={powered ? 'font-semibold text-primary' : 'text-default-400'}
      badgeClassName={
        powered
          ? 'border-primary bg-primary-100 text-primary shadow-md'
          : 'border-dashed border-default-300 bg-default-50 text-default-400'
      }
    >
        <Handle id="t-t" type="target" position={Position.Top} isConnectable={!!data.canTarget} className={data.canTarget ? '!h-3 !w-3 !border-2 !border-background !bg-secondary' : ''} style={data.canTarget ? undefined : { opacity: 0 }} />
        <Handle id="b-s" type="source" position={Position.Bottom} isConnectable={!!data.canSource} className={data.canSource ? '!h-3 !w-3 !border-2 !border-background !bg-secondary' : ''} style={data.canSource ? undefined : { opacity: 0 }} />
        <Handle id="illum-t" type="target" position={Position.Left} isConnectable={!!data.canBeLit} className={data.canBeLit ? '!h-3 !w-3 !border-2 !border-background !bg-warning' : ''} style={data.canBeLit ? undefined : { opacity: 0 }} />
    </IconNodeShell>
  );
}
