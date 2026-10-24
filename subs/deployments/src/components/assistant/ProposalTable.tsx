import { Checkbox, Chip, Table, TableBody, TableCell, TableColumn, TableHeader, TableRow } from '@heroui/react';
import { OP_LABEL, type ProposalRow, type RowStatus } from '../../lib/proposal';
import type { RowResult } from '../../lib/applyProposal';

interface Props {
  rows: ProposalRow[];
  included: Set<string>;
  results: Record<string, RowResult>;
  locked: boolean;
  onToggle: (rowId: string) => void;
  /** Display name for an item id (graph + proposal items). */
  labelFor: (id?: string) => string;
}

const STATUS_COLOR: Record<RowStatus, 'default' | 'primary' | 'success' | 'danger' | 'warning'> = {
  pending: 'default',
  running: 'primary',
  ok: 'success',
  error: 'danger',
  skipped: 'warning',
};

/** What the row acts on, and the detail a builder needs to confirm it (ports, lit items). */
export function rowSummary(r: ProposalRow, labelFor: (id?: string) => string): { item: string; detail: string } {
  switch (r.op) {
    case 'connect':
      return {
        item: `${labelFor(r.from_item_id)} → ${labelFor(r.to_item_id)}`,
        detail: [r.from_port, r.to_port].filter(Boolean).join(' → ') || 'ports assigned on apply',
      };
    case 'disconnect':
      return { item: `${labelFor(r.from_item_id)} → ${labelFor(r.to_item_id)}`, detail: 'removes this power connection' };
    case 'illuminate':
    case 'unilluminate':
      return {
        item: labelFor(r.item_id),
        detail: `${r.op === 'illuminate' ? 'lights' : 'stops lighting'}: ${(r.illuminates || []).map(labelFor).join(', ')}`,
      };
    case 'undeclare':
      return { item: labelFor(r.item_id), detail: 'removed from this zone' };
    default:
      return { item: labelFor(r.item_id), detail: 'set up in this zone' };
  }
}

export default function ProposalTable({ rows, included, results, locked, onToggle, labelFor }: Props) {
  return (
    <Table aria-label="Proposed changes" removeWrapper isCompact data-testid="assistant-proposal-table">
      <TableHeader>
        <TableColumn width={44}>Apply</TableColumn>
        <TableColumn width={130}>Action</TableColumn>
        <TableColumn>Item</TableColumn>
        <TableColumn>Details</TableColumn>
        <TableColumn width={110}>Result</TableColumn>
      </TableHeader>
      <TableBody>
        {rows.map((r) => {
          const result = results[r.row_id];
          const { item, detail } = rowSummary(r, labelFor);
          return (
            <TableRow key={r.row_id} data-testid={`assistant-row-${r.row_id}`}>
              <TableCell>
                <Checkbox
                  size="sm"
                  aria-label={`Include ${item}`}
                  isSelected={included.has(r.row_id)}
                  isDisabled={!r.valid || locked}
                  onValueChange={() => onToggle(r.row_id)}
                />
              </TableCell>
              <TableCell>
                <Chip size="sm" variant="flat" color={!r.valid ? 'default' : r.destructive ? 'danger' : 'primary'}>
                  {OP_LABEL[r.op]}
                </Chip>
              </TableCell>
              <TableCell>
                <span className={r.valid ? 'font-medium' : 'font-medium text-default-400 line-through'}>{item}</span>
              </TableCell>
              <TableCell>
                <span className="text-default-500">{detail}</span>
                {r.problems.map((p) => (
                  <p key={p} className="text-xs text-danger">
                    {p}
                  </p>
                ))}
                {r.warnings.map((w) => (
                  <p key={w} className="text-xs text-warning">
                    {w}
                  </p>
                ))}
                {result?.error && <p className="text-xs text-danger">{result.error}</p>}
              </TableCell>
              <TableCell>
                {result ? (
                  <Chip size="sm" variant="flat" color={STATUS_COLOR[result.status]}>
                    {result.status}
                  </Chip>
                ) : !r.valid ? (
                  <Chip size="sm" variant="flat" color="danger">
                    can&apos;t apply
                  </Chip>
                ) : r.destructive && !included.has(r.row_id) ? (
                  <Chip size="sm" variant="flat" color="warning">
                    tick to include
                  </Chip>
                ) : null}
              </TableCell>
            </TableRow>
          );
        })}
      </TableBody>
    </Table>
  );
}
