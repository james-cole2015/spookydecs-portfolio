import { useState } from 'react';
import { Badge, Button, Card, CardBody, CardFooter, CardHeader, Chip, Textarea } from '@heroui/react';
import { Sparkles } from 'lucide-react';
import ProposalTable from './ProposalTable';
import type { useAssistant } from './useAssistant';
import type { RowResult } from '../../lib/applyProposal';

type Assistant = ReturnType<typeof useAssistant>;

interface Props {
  assistant: Assistant;
  zoneName: string;
  /** Empty zone => the panel is the front door, so it opens by default. */
  open: boolean;
  onOpenChange: (open: boolean) => void;
  results: Record<string, RowResult>;
  applying: boolean;
  onApply: () => void;
  onDiscard: () => void;
}

const EXAMPLES = [
  'I set up the ghost and the reaper in the front yard',
  'Plug the ghost into cord 612',
  'Spot light 2 lights the reaper',
];

/** Docked (non-modal) so the graph and its ghost preview stay visible while the panel is open. */
export default function AssistantPanel({ assistant, zoneName, open, onOpenChange, results, applying, onApply, onDiscard }: Props) {
  const [draft, setDraft] = useState('');
  const { messages, proposal, clarify, included, busy, available, send, toggle } = assistant;
  const includedCount = proposal ? proposal.rows.filter((r) => r.valid && included.has(r.row_id)).length : 0;
  const hasResults = Object.keys(results).length > 0;

  if (!available) {
    return (
      <p className="mb-3 text-sm text-default-500" data-testid="assistant-unavailable">
        Assistant unavailable — use Add manually below.
      </p>
    );
  }

  if (!open) {
    return (
      <div className="fixed right-0 top-1/2 z-30 -translate-y-1/2" data-testid="assistant-pull-tab">
        <Badge content="" color="primary" isInvisible={!proposal} shape="circle">
          <Button color="primary" variant="solid" radius="none" className="rounded-l-medium px-3" onPress={() => onOpenChange(true)} startContent={<Sparkles size={16} />}>
            Assistant
          </Button>
        </Badge>
      </div>
    );
  }

  function submit(text: string) {
    send(text);
    setDraft('');
  }

  return (
    <Card className="w-full shrink-0 lg:w-[360px]" data-testid="assistant-panel">
      <CardHeader className="flex items-center justify-between">
        <span className="font-semibold">Assistant · {zoneName}</span>
        <Button size="sm" variant="light" onPress={() => onOpenChange(false)}>
          Close
        </Button>
      </CardHeader>
      <CardBody className="gap-3 overflow-y-auto">
        {messages.length === 0 && (
          <div className="flex flex-col gap-2">
            <p className="text-sm text-default-500">Describe what you set up. I will propose changes for you to review.</p>
            {EXAMPLES.map((e) => (
              <Chip key={e} variant="bordered" className="h-auto cursor-pointer whitespace-normal py-1" onClick={() => submit(e)}>
                {e}
              </Chip>
            ))}
          </div>
        )}
        {messages.map((m, i) => (
          <p key={i} className={m.role === 'user' ? 'self-end rounded-medium bg-primary-100 px-3 py-1 text-sm' : 'text-sm'}>
            {m.text}
          </p>
        ))}
        {clarify?.candidates && clarify.candidates.length > 0 && (
          <div className="flex flex-col gap-2" data-testid="assistant-clarify">
            {clarify.candidates.map((c: any) => (
              <Chip
                key={c.id}
                variant="bordered"
                className="h-auto cursor-pointer whitespace-normal py-1"
                onClick={() => submit(`I mean ${c.short_name || c.id} (${c.id})`)}
              >
                {c.short_name || c.id} <span className="text-xs text-default-400">{c.season} {c.class}</span>
              </Chip>
            ))}
          </div>
        )}
        {busy && <p className="text-sm text-default-400">Thinking…</p>}
        {proposal && (
          <ProposalTable rows={proposal.rows} included={included} results={results} locked={applying || hasResults} onToggle={toggle} />
        )}
      </CardBody>
      <CardFooter className="flex-col items-stretch gap-2">
        {proposal && (
          <div className="flex gap-2">
            <Button color="primary" className="flex-1" isDisabled={includedCount === 0 || hasResults} isLoading={applying} onPress={onApply} data-testid="assistant-apply">
              Apply {includedCount} {includedCount === 1 ? 'change' : 'changes'}
            </Button>
            <Button variant="bordered" isDisabled={applying} onPress={onDiscard}>
              {hasResults ? 'Done' : 'Discard'}
            </Button>
          </div>
        )}
        <Textarea
          minRows={1}
          size="sm"
          placeholder="e.g. I set up the ghost and the reaper"
          value={draft}
          onValueChange={setDraft}
          isDisabled={busy || applying}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
              e.preventDefault();
              submit(draft);
            }
          }}
          data-testid="assistant-input"
        />
      </CardFooter>
    </Card>
  );
}
