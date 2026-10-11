import { useState } from 'react';
import { Badge, Button, Card, CardBody, CardFooter, CardHeader, Chip, Textarea } from '@heroui/react';
import { Sparkles } from 'lucide-react';
import type { useAssistant } from './useAssistant';

type Assistant = ReturnType<typeof useAssistant>;

interface Props {
  assistant: Assistant;
  zoneName: string;
  /** Controlled by the page: default open for builders on desktop, then the viewer's remembered choice. */
  open: boolean;
  onOpenChange: (open: boolean) => void;
  busyApplying: boolean;
}

const EXAMPLES = [
  'I set up the ghost and the reaper in the front yard',
  'Plug the ghost into cord 612',
  'Spot light 2 lights the reaper',
];

/** Lurch's chat panel. Docked (non-modal) so the graph and its ghost preview stay visible; the review table lives under the graph. */
export default function AssistantPanel({ assistant, zoneName, open, onOpenChange, busyApplying }: Props) {
  const [draft, setDraft] = useState('');
  const { messages, proposal, clarify, busy, available, send } = assistant;

  if (!available) {
    return (
      <p className="mb-3 text-sm text-default-500" data-testid="assistant-unavailable">
        Lurch is unavailable — use Add manually below.
      </p>
    );
  }

  if (!open) {
    return (
      <div className="fixed right-0 top-1/2 z-30 -translate-y-1/2" data-testid="assistant-pull-tab">
        <Badge content="" color="primary" isInvisible={!proposal} shape="circle">
          <Button color="primary" variant="solid" radius="none" className="rounded-l-medium px-3" onPress={() => onOpenChange(true)} startContent={<Sparkles size={16} />}>
            {proposal ? 'Review proposal' : 'Lurch'}
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
    <Card className="w-full shrink-0 lg:w-[320px]" data-testid="assistant-panel">
      <CardHeader className="flex items-center justify-between">
        <span className="font-semibold">Lurch · {zoneName}</span>
        <Button size="sm" variant="light" onPress={() => onOpenChange(false)}>
          Close
        </Button>
      </CardHeader>
      <CardBody className="max-h-[520px] gap-3 overflow-y-auto">
        {messages.length === 0 && (
          <div className="flex flex-col gap-2">
            <p className="text-sm text-default-500">You rang? Tell me what you set up and I will propose changes for you to review before anything is saved.</p>
            {EXAMPLES.map((e) => (
              <Chip key={e} variant="bordered" className="h-auto cursor-pointer whitespace-normal py-1" onClick={() => submit(e)}>
                {e}
              </Chip>
            ))}
          </div>
        )}
        {messages.map((m, i) => (
          <p
            key={i}
            className={m.role === 'user' ? 'self-end rounded-medium bg-content3 px-3 py-1 text-sm text-foreground' : 'text-sm text-foreground'}
          >
            {m.text}
          </p>
        ))}
        {clarify?.candidates && clarify.candidates.length > 0 && (
          <div className="flex flex-col gap-2" data-testid="assistant-clarify">
            {clarify.candidates.map((c: any) => (
              <Chip key={c.id} variant="bordered" className="h-auto cursor-pointer whitespace-normal py-1" onClick={() => submit(`I mean ${c.short_name || c.id} (${c.id})`)}>
                {c.short_name || c.id} <span className="text-xs text-default-400">{c.season} {c.class}</span>
              </Chip>
            ))}
          </div>
        )}
        {busy && <p className="text-sm text-default-400">Thinking…</p>}
        {proposal && (
          <p className="text-sm font-medium text-primary" data-testid="assistant-review-hint">
            {proposal.rows.length} proposed {proposal.rows.length === 1 ? 'change' : 'changes'} — review them below the graph.
          </p>
        )}
      </CardBody>
      <CardFooter>
        <Textarea
          minRows={1}
          size="sm"
          placeholder="e.g. I set up the ghost and the reaper"
          value={draft}
          onValueChange={setDraft}
          isDisabled={busy || busyApplying}
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
