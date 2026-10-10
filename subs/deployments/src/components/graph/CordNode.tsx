import { Handle, Position, type Node, type NodeProps } from '@xyflow/react';
import type { GraphNodeData } from '../../lib/graphDerivation';
import IconNodeShell from './IconNodeShell';
import { nodeIcon } from './graphIcons';

/**
 * A cord — the quietest tier: a small dot with a cable glyph; length and carried load in the sublabel, so a chain of cords reads as wiring.
 */
export default function CordNode({ data, selected }: NodeProps<Node<GraphNodeData>>) {
  const length = data.item?.length;
  const parts = [length != null && length !== '' ? String(length) : null, data.throughAmps ? `${data.throughAmps}A` : null].filter(Boolean);
  return (
    <IconNodeShell
      Icon={nodeIcon(data)}
      badgeSize={30}
      iconSize={16}
      width={100}
      selected={selected}
      label={data.label}
      sublabel={parts.join(' · ') || undefined}
      sublabelClassName={data.throughAmps ? 'text-warning-600' : 'text-default-400'}
      badgeClassName="border-default-300 bg-default-100 text-default-500"
    >
        <Handle id="t-t" type="target" position={Position.Top} isConnectable={!!data.canTarget} className={data.canTarget ? '!h-3 !w-3 !border-2 !border-background !bg-secondary' : ''} style={data.canTarget ? undefined : { opacity: 0 }} />
        <Handle id="b-s" type="source" position={Position.Bottom} isConnectable={!!data.canSource} className={data.canSource ? '!h-3 !w-3 !border-2 !border-background !bg-secondary' : ''} style={data.canSource ? undefined : { opacity: 0 }} />
    </IconNodeShell>
  );
}
