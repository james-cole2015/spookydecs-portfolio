import { Handle, Position, type Node, type NodeProps } from '@xyflow/react';
import type { GraphNodeData } from '../../lib/graphDerivation';
import IconNodeShell from './IconNodeShell';
import { nodeIcon } from './graphIcons';

/**
 * An item id referenced by a connection/placement that no longer resolves.
 */
export default function PlaceholderNode({ data, selected }: NodeProps<Node<GraphNodeData>>) {
  return (
    <IconNodeShell
      Icon={nodeIcon(data)}
      badgeSize={44}
      iconSize={22}
      width={120}
      selected={selected}
      label={data.label}
      badgeClassName="border-dashed border-default-300 bg-default-50 text-default-400 opacity-70"
    >
        <Handle id="t-t" type="target" position={Position.Top} isConnectable={false} style={{ opacity: 0 }} />
        <Handle id="b-s" type="source" position={Position.Bottom} isConnectable={false} style={{ opacity: 0 }} />
    </IconNodeShell>
  );
}
