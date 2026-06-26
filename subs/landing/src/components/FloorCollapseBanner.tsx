/**
 * FloorCollapseBanner — a slim, season-aware countdown to the real weekly demo
 * reset (Sunday 03:00 UTC, see lib/demoReset.ts). DCC "floor collapse" framing in
 * halloween; neutral "demo resets" copy in christmas/plain. Ticks once a minute.
 */
import { useEffect, useState } from 'react';
import { Clock } from 'lucide-react';
import { useSeason } from '../season/SeasonProvider';
import { RESET_COPY } from '../season/seasons';
import { formatCountdown, msUntilReset } from '../lib/demoReset';

export function FloorCollapseBanner() {
  const { season } = useSeason();
  const [remaining, setRemaining] = useState(() => msUntilReset());

  useEffect(() => {
    const id = setInterval(() => setRemaining(msUntilReset()), 60_000);
    return () => clearInterval(id);
  }, []);

  const { icon, template } = RESET_COPY[season];
  const message = template.replace('{t}', formatCountdown(remaining));

  return (
    <div className="sd-chip flex items-center gap-2 rounded-lg px-4 py-2 text-sm text-foreground backdrop-blur">
      <Clock size={15} className="sd-accent-text shrink-0" aria-hidden="true" />
      <span aria-hidden="true">{icon}</span>
      <span className="text-foreground/80">{message}</span>
    </div>
  );
}
