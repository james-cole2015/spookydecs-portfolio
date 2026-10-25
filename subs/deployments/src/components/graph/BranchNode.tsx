import { Handle, Position, type Node, type NodeProps } from '@xyflow/react';
import type { GraphNodeData } from '../../lib/graphDerivation';
import IconNodeShell from './IconNodeShell';
import { nodeIcon } from './graphIcons';

/**
 * A plug / splitter (or any accessory with 2+ outlets) — third tier: neutral rounded-square badge with a split glyph; the corner pip is the outlet count and the sublabel the load through it.
 */
export default function BranchNode({ data, selected }: NodeProps<Node<GraphNodeData>>) {
  return (
    <IconNodeShell
      Icon={nodeIcon(data)}
      rounded="xl"
      badgeSize={52}
      iconSize={26}
      width={120}
      selected={selected}
      label={data.label}
      corner={data.femaleEnds}
      sublabel={data.throughAmps ? `${data.throughAmps}A through` : 'splitter'}
      sublabelClassName={data.throughAmps ? 'font-medium text-warning-600' : 'text-default-400'}
      badgeClassName="border-default-500 bg-content3 text-default-700"
    >
        <Handle id="t-t" type="target" position={Position.Top} isConnectable={!!data.canTarget} className={data.canTarget ? '!h-3 !w-3 !border-2 !border-background !bg-secondary' : ''} style={data.canTarget ? undefined : { opacity: 0 }} />
        <Handle id="b-s" type="source" position={Position.Bottom} isConnectable={!!data.canSource} className={data.canSource ? '!h-3 !w-3 !border-2 !border-background !bg-secondary' : ''} style={data.canSource ? undefined : { opacity: 0 }} />
    </IconNodeShell>
  );
}
