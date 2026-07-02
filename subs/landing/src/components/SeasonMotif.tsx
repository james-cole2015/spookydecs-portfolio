/**
 * SeasonMotif — subtle ambient overlay keyed to the active season.
 *   halloween → drifting bats   christmas → falling snow   plain → none
 *
 * Pure CSS animation (see seasons.css). The whole overlay is hidden under
 * `prefers-reduced-motion: reduce`, so there is no motion for users who opt out.
 */
import { useSeason } from '../season/SeasonProvider';

function Bats() {
  // Deterministic spread so the layout is stable between renders.
  const bats = [
    { top: '12%', size: '1.6rem', dur: '24s', delay: '0s', flap: '0.34s' },
    { top: '28%', size: '1.1rem', dur: '30s', delay: '4s', flap: '0.46s' },
    { top: '44%', size: '2rem', dur: '20s', delay: '2s', flap: '0.3s' },
    { top: '63%', size: '1.3rem', dur: '27s', delay: '7s', flap: '0.4s' },
    { top: '78%', size: '1.7rem', dur: '23s', delay: '10s', flap: '0.38s' },
  ];
  return (
    <div className="sd-motif" aria-hidden="true">
      {bats.map((b, i) => (
        <span
          key={i}
          className="sd-bat"
          style={
            {
              '--top': b.top,
              '--size': b.size,
              '--dur': b.dur,
              '--delay': b.delay,
              '--flap': b.flap,
            } as React.CSSProperties
          }
        >
          {/* Drift on the outer span, wing-flap (scaleX) on the inner — separate
              elements so the two transforms don't fight. */}
          <span className="sd-bat-wing">🦇</span>
        </span>
      ))}
    </div>
  );
}

const SNOWFLAKES = ['❄', '❅', '❆'];

function Snow() {
  const flakes = Array.from({ length: 24 }, (_, i) => ({
    glyph: SNOWFLAKES[i % SNOWFLAKES.length],
    left: `${(i * 4.1) % 100}%`,
    size: `${10 + (i % 4) * 4}px`,
    dur: `${9 + (i % 7)}s`,
    delay: `${(i % 10) * 0.9}s`,
    twinkle: `${2 + (i % 5) * 0.6}s`,
  }));
  return (
    <div className="sd-motif" aria-hidden="true">
      {flakes.map((f, i) => (
        <span
          key={i}
          className="sd-snow"
          style={
            {
              '--left': f.left,
              '--size': f.size,
              '--dur': f.dur,
              '--delay': f.delay,
              '--tw': f.twinkle,
            } as React.CSSProperties
          }
        >
          {f.glyph}
        </span>
      ))}
    </div>
  );
}

export function SeasonMotif() {
  const { season } = useSeason();
  if (season === 'halloween') return <Bats />;
  if (season === 'christmas') return <Snow />;
  return null;
}
