/**
 * AgenticTrio — the headline portfolio signal: three agentic systems on AWS
 * Bedrock, surfaced as a compact trio of cards directly under the hero headline.
 * A technical reviewer should immediately see the LLM/agent work.
 */
import { Card, CardBody } from '@heroui/react';
import { AGENTIC_SYSTEMS } from '../config/landingConfig';

export function AgenticTrio() {
  return (
    <div className="w-full">
      <p className="mb-3 text-sm font-medium uppercase tracking-wide sd-accent-text">
        AI / agentic engineering on AWS Bedrock
      </p>
      <div className="grid gap-3 sm:grid-cols-3">
        {AGENTIC_SYSTEMS.map((sys) => (
          <a key={sys.name} href={sys.href} target="_blank" rel="noreferrer" className="block">
            <Card className="sd-chip h-full backdrop-blur transition-transform hover:-translate-y-0.5">
              <CardBody className="gap-1.5 p-4">
                <div className="flex items-center gap-2 text-base font-semibold text-foreground">
                  <span aria-hidden="true">{sys.emoji}</span>
                  <span>{sys.name}</span>
                </div>
                <p className="text-xs leading-relaxed sd-hero-muted">{sys.blurb}</p>
              </CardBody>
            </Card>
          </a>
        ))}
      </div>
    </div>
  );
}
