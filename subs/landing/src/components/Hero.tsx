/**
 * Hero — the top fold: seasonal headline + tagline, an AWS/tech blurb, the
 * agentic-systems trio (first-class, not a footnote), and the primary
 * "Enter the demo" CTA.
 */
import { Button, Chip, Tooltip } from '@heroui/react';
import { ArrowRight } from 'lucide-react';
import { useSeason } from '../season/SeasonProvider';
import { SEASON_COPY } from '../season/seasons';
import { ENTER_DEMO_URL, TECH_HIGHLIGHTS } from '../config/landingConfig';
import { AgenticTrio } from './AgenticTrio';
import { FloorCollapseBanner } from './FloorCollapseBanner';
import { IdentityTeaser } from './IdentityTeaser';
import { SeasonMotif } from './SeasonMotif';

export function Hero() {
  const { season } = useSeason();
  const copy = SEASON_COPY[season];

  return (
    <section className="sd-hero relative overflow-hidden">
      <SeasonMotif />
      <div className="relative z-10 mx-auto max-w-6xl px-4 pb-16 pt-10 sm:pt-16">
        <p className="mb-3 text-sm font-medium uppercase tracking-widest sd-hero-muted">
          {copy.emoji} {copy.eyebrow}
        </p>
        <h1 className="max-w-3xl text-4xl font-bold leading-tight sm:text-5xl">{copy.headline}</h1>
        <p className="mt-4 max-w-2xl text-lg sd-hero-muted">{copy.tagline}</p>

        <div className="mt-5 flex flex-wrap gap-2">
          {TECH_HIGHLIGHTS.map((t) => (
            <Chip key={t} size="sm" variant="flat" className="sd-chip text-foreground">
              {t}
            </Chip>
          ))}
        </div>

        {/* Front-and-center notices, directly above the single entry CTA. */}
        <div className="mt-8 flex flex-col gap-2">
          <IdentityTeaser />
          <FloorCollapseBanner />
        </div>

        <div className="mt-6">
          <Tooltip
            content="We’ll generate a temporary Cognito identity and redirect you straight into the app — no signup."
            placement="bottom"
          >
            <Button
              as="a"
              href={ENTER_DEMO_URL}
              size="lg"
              endContent={<ArrowRight size={18} />}
              className="sd-cta font-semibold"
            >
              {copy.cta}
            </Button>
          </Tooltip>
        </div>

        <div className="mt-12">
          <AgenticTrio />
        </div>
      </div>
    </section>
  );
}
