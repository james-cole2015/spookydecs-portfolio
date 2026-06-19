/**
 * IGAnalysisCard — renders the Inspector Gadget annotation (Violation.Annotated)
 * for a violation. Present only when `agent_notes` is populated. This is the
 * most portfolio-visible part of the inspector UI (the agentic loop's output) —
 * ported field-for-field from the vanilla `renderIGAnalysisCard`.
 */
import { Card, CardBody, CardHeader, Chip } from '@heroui/react';
import type { Violation } from '../config/inspectorConfig';

export function IGAnalysisCard({ violation }: { violation: Violation }) {
  const { agent_notes, resolution_path, requires_confirmation, awaiting_confirmation } = violation;
  if (!agent_notes) return null;

  return (
    <Card className="border border-secondary/40 bg-content1" shadow="sm">
      <CardHeader className="flex items-center justify-between gap-2">
        <h3 className="text-lg font-semibold text-foreground">IG Analysis</h3>
        <div className="flex flex-wrap gap-2">
          {requires_confirmation && (
            <Chip
              size="sm"
              variant="flat"
              color="warning"
              title="Resolver Agent must request confirmation before acting"
            >
              ⚠ Confirmation required
            </Chip>
          )}
          {awaiting_confirmation === 'true' && (
            <Chip size="sm" variant="flat" color="secondary">
              Awaiting confirmation
            </Chip>
          )}
        </div>
      </CardHeader>
      <CardBody className="space-y-3">
        <p className="whitespace-pre-wrap text-default-700">{agent_notes}</p>
        {resolution_path && (
          <div className="flex items-center gap-2">
            <span className="text-tiny uppercase tracking-wide text-default-500">Path</span>
            <Chip size="sm" variant="flat" color="primary">
              {resolution_path}
            </Chip>
          </div>
        )}
      </CardBody>
    </Card>
  );
}
