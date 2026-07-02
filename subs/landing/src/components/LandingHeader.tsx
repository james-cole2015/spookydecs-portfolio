/**
 * LandingHeader — lightweight public top bar (logo + shared ThemeSwitch).
 *
 * Deliberately NOT the admin @spookydecs/ui AppHeader (nav dropdown + Logout) and
 * NOT the shared spookydecs-header.js: this is a pre-identity, anonymous entry
 * page, so it carries no authenticated-app chrome. Same call as the gallery sub.
 */
import { ThemeSwitch } from '@spookydecs/ui';
import { useSeason } from '../season/SeasonProvider';
import { SEASON_COPY } from '../season/seasons';

export function LandingHeader() {
  const { season } = useSeason();
  return (
    <header className="relative z-10">
      <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-4 py-4">
        <a href="/" className="flex items-center gap-2 text-xl font-semibold text-foreground">
          <span>{SEASON_COPY[season].emoji}</span>
          <span>SpookyDecs</span>
        </a>
        <ThemeSwitch />
      </div>
    </header>
  );
}
