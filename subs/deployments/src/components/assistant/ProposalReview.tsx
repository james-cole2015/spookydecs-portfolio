import { Button, Card, CardBody, CardFooter, CardHeader, Chip } from '@heroui/react';
import ProposalTable from './ProposalTable';
import { OP_LABEL, type Proposal, type ProposalOp } from '../../lib/proposal';
import type { RowResult } from '../../lib/applyProposal';

interface Props {
  proposal: Proposal;
  included: Set<string>;
  results: Record<string, RowResult>;
  applying: boolean;
  onToggle: (rowId: string) => void;
  onApply: () => void;
  onDiscard: () => void;
  labelFor: (id?: string) => string;
}

/**
 * The review step (#639): everything the assistant proposes, in full width under the graph, so the
 * builder can confirm it understood before anything is written. Included rows are previewed as
 * ghosts on the graph above; nothing is saved until Apply.
 */
export default function ProposalReview({ proposal, included, results, applying, onToggle, onApply, onDiscard, labelFor }: Props) {
  const chosen = proposal.rows.filter((r) => r.valid && included.has(r.row_id));
  const invalid = proposal.rows.filter((r) => !r.valid).length;
  const counts = chosen.reduce<Partial<Record<ProposalOp, number>>>((acc, r) => ({ ...acc, [r.op]: (acc[r.op] || 0) + 1 }), {});
  const finished = Object.keys(results).length > 0;

  return (
    <Card className="mt-4" data-testid="assistant-review">
      <CardHeader className="flex flex-wrap items-center gap-2">
        <span className="text-medium font-semibold">Review proposed changes</span>
        {(Object.keys(counts) as ProposalOp[]).map((op) => (
          <Chip key={op} size="sm" variant="flat" color={op === 'undeclare' || op === 'disconnect' || op === 'unilluminate' ? 'danger' : 'primary'}>
            {counts[op]} {OP_LABEL[op].toLowerCase()}
          </Chip>
        ))}
        {invalid > 0 && (
          <Chip size="sm" variant="flat" color="danger">
            {invalid} can&apos;t be applied
          </Chip>
        )}
        <span className="ml-auto text-xs text-default-500">
          Ticked rows preview on the graph: dashed = to be added, faded = to be removed. Nothing is saved until you apply.
        </span>
      </CardHeader>
      <CardBody>
        <p className="mb-2 text-sm">{proposal.message}</p>
        <ProposalTable rows={proposal.rows} included={included} results={results} locked={applying || finished} onToggle={onToggle} labelFor={labelFor} />
      </CardBody>
      <CardFooter className="gap-2">
        <Button color="primary" isDisabled={chosen.length === 0 || finished} isLoading={applying} onPress={onApply} data-testid="assistant-apply">
          Apply {chosen.length} {chosen.length === 1 ? 'change' : 'changes'}
        </Button>
        <Button variant="bordered" isDisabled={applying} onPress={onDiscard}>
          {finished ? 'Done' : 'Discard'}
        </Button>
      </CardFooter>
    </Card>
  );
}
