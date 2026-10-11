import { Checkbox, Chip, Table, TableBody, TableCell, TableColumn, TableHeader, TableRow } from '@heroui/react';
import { OP_LABEL, type ProposalRow, type RowStatus } from '../../lib/proposal';
import type { RowResult } from '../../lib/applyProposal';

interface Props {
  rows: ProposalRow[];
  included: Set<string>;
  results: Record<string, RowResult>;
  locked: boolean;
  onToggle: (rowId: string) => void;
}

const STATUS_COLOR: Record<RowStatus, 'default' | 'primary' | 'success' | 'danger' | 'warning'> = {
  pending: 'default',
  running: 'primary',
  ok: 'success',
  error: 'danger',
  skipped: 'warning',
};

function describe(r: ProposalRow): string {
  if (r.op === 'connect') return `${r.label}${r.from_port ? ` (${r.from_port} → ${r.to_port})` : ''}`;
  return r.label || r.item_id || '';
}

export default function ProposalTable({ rows, included, results, locked, onToggle }: Props) {
  return (
    <Table aria-label="Proposed changes" removeWrapper isCompact data-testid="assistant-proposal-table">
      <TableHeader>
        <TableColumn width={36}> </TableColumn>
        <TableColumn>Change</TableColumn>
        <TableColumn width={90}>Result</TableColumn>
      </TableHeader>
      <TableBody>
        {rows.map((r) => {
          const result = results[r.row_id];
          return (
            <TableRow key={r.row_id} data-testid={`assistant-row-${r.row_id}`}>
              <TableCell>
                <Checkbox
                  size="sm"
                  aria-label={`Include ${describe(r)}`}
                  isSelected={included.has(r.row_id)}
                  isDisabled={!r.valid || locked}
                  onValueChange={() => onToggle(r.row_id)}
                />
              </TableCell>
              <TableCell>
                <div className={r.valid ? '' : 'line-through text-default-400'}>
                  <Chip size="sm" variant="flat" color={r.destructive ? 'danger' : 'primary'} className="mr-2">
                    {OP_LABEL[r.op]}
                  </Chip>
                  {describe(r)}
                </div>
                {r.problems.map((p) => (
                  <p key={p} className="text-xs text-danger">{p}</p>
                ))}
                {r.warnings.map((w) => (
                  <p key={w} className="text-xs text-warning">{w}</p>
                ))}
                {result?.error && <p className="text-xs text-danger">{result.error}</p>}
              </TableCell>
              <TableCell>
                {result && (
                  <Chip size="sm" variant="flat" color={STATUS_COLOR[result.status]}>
                    {result.status}
                  </Chip>
                )}
              </TableCell>
            </TableRow>
          );
        })}
      </TableBody>
    </Table>
  );
}
