/**
 * Hero — the top fold: seasonal headline + tagline, an AWS/tech blurb, the
 * self-service identity-mint flow (Generate → Enter), and the agentic-systems
 * trio (first-class, not a footnote).
 */
import { Chip } from '@heroui/react';
import { useSeason } from '../season/SeasonProvider';
import { SEASON_COPY } from '../season/seasons';
import { TECH_HIGHLIGHTS } from '../config/landingConfig';
import { AgenticTrio } from './AgenticTrio';
import { FloorCollapseBanner } from './FloorCollapseBanner';
import { IdentityMintFlow } from './IdentityMintFlow';
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

        {/* Self-service entry: generate a throwaway identity, then enter via real auth. */}
        <div className="mt-8 flex flex-col gap-2">
          <IdentityMintFlow />
          <FloorCollapseBanner />
        </div>

        <div className="mt-12">
          <AgenticTrio />
        </div>
      </div>
    </section>
  );
}
