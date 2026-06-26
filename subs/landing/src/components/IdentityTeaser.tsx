/**
 * IdentityTeaser — a slim "coming soon" note for self-service identities.
 *
 * Deliberately NOT a competing call-to-action. In the real flow (#366) generating
 * an identity IS how you enter (mint → auto-login), so there's a single front door:
 * the hero's "Enter the demo" CTA. This strip just signals the self-service /
 * crawler-identity feature that's coming, without implying a prerequisite step.
 */
import { Sparkles } from 'lucide-react';

export function IdentityTeaser() {
  return (
    <div className="sd-chip flex items-start gap-3 rounded-lg px-4 py-3 text-sm text-foreground backdrop-blur">
      <Sparkles size={16} className="mt-0.5 shrink-0 sd-accent-text" aria-hidden="true" />
      <p className="text-foreground/80">
        <span className="font-medium text-foreground">Coming soon — self-service identities.</span>{' '}
        You’ll roll your own themed crawler identity and get a private sandbox, no signup required. For
        now, “Enter the demo” drops you straight into the shared demo environment.
      </p>
    </div>
  );
}
