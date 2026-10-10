import { Handle, Position, type Node, type NodeProps } from '@xyflow/react';
import type { GraphNodeData } from '../../lib/graphDerivation';
import IconNodeShell from './IconNodeShell';
import { nodeIcon } from './graphIcons';

/**
 * Zone circuit source — synthetic root, never resolved via the items table. Bolt glyph; turns red when the outlet rollup exceeds the breaker threshold.
 */
export default function HubNode({ data, selected }: NodeProps<Node<GraphNodeData>>) {
  return (
    <IconNodeShell
      Icon={nodeIcon(data)}
      badgeSize={64}
      iconSize={32}
      width={150}
      selected={selected}
      label={data.label}
      sublabel={data.rollupAmps != null ? `${data.rollupAmps}A load${data.overloaded ? ' · overload' : ''} · 15A` : undefined}
      sublabelClassName={data.overloaded ? 'font-semibold text-danger' : 'font-medium text-secondary'}
      badgeClassName={
        data.overloaded
          ? 'border-danger bg-danger-100 text-danger ring-4 ring-danger/30'
          : 'border-secondary bg-secondary-100 text-secondary'
      }
    >
        <Handle id="b-s" type="source" position={Position.Bottom} isConnectable={!!data.canSource} className={data.canSource ? '!h-3 !w-3 !border-2 !border-background !bg-secondary' : ''} style={data.canSource ? undefined : { opacity: 0 }} />
    </IconNodeShell>
  );
}
