/**
 * SeasonProvider — resolves the active season and reflects it onto the document
 * root as `data-season`, which the CSS-variable palettes in seasons.css key off
 * (independently of HeroUI's `.dark`/`.light` class, so the two compose).
 *
 * Source of truth: a `?season=halloween|christmas|plain` query override (for
 * demo/QA), else the calendar via `resolveSeason()`.
 */
import { createContext, useContext, useEffect, useMemo, type ReactNode } from 'react';
import { parseSeasonOverride, resolveSeason, type Season } from './seasons';

interface SeasonContextValue {
  season: Season;
  /** True when the season came from the `?season=` override rather than the date. */
  overridden: boolean;
}

const SeasonContext = createContext<SeasonContextValue | null>(null);

export function SeasonProvider({ children }: { children: ReactNode }) {
  const value = useMemo<SeasonContextValue>(() => {
    const override =
      typeof window !== 'undefined' ? parseSeasonOverride(window.location.search) : null;
    return { season: override ?? resolveSeason(), overridden: override !== null };
  }, []);

  useEffect(() => {
    document.documentElement.setAttribute('data-season', value.season);
    return () => {
      document.documentElement.removeAttribute('data-season');
    };
  }, [value.season]);

  return <SeasonContext.Provider value={value}>{children}</SeasonContext.Provider>;
}

export function useSeason(): SeasonContextValue {
  const ctx = useContext(SeasonContext);
  if (!ctx) throw new Error('useSeason must be used within a SeasonProvider');
  return ctx;
}
