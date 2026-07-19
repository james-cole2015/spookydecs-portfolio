/**
 * chartColors — resolve stats-chart colors from the active HeroUI theme.
 *
 * Chart.js needs concrete color strings, so we can't hand it Tailwind classes.
 * Instead of hardcoding hex (which drifts from the theme and never follows
 * light/dark), we read the HeroUI CSS custom properties live and wrap each
 * HSL-triple in `hsl(…)`. Callers resolve these at paint time (inside the
 * chart's `useEffect`) so a `ThemeSwitch` toggle re-reads the current vars and
 * the doughnut, legend dots, and chrome all stay in sync — #430 (F5).
 */

const cssVar = (name: string): string =>
  getComputedStyle(document.documentElement).getPropertyValue(name).trim();

/** Wrap a HeroUI HSL-triple var (e.g. `212 100% 47%`) as an `hsl()` color. */
const hsl = (name: string, fallback = '0 0% 60%'): string => `hsl(${cssVar(name) || fallback})`;

/**
 * Categorical palette — 6 visually distinct brand hues for the stats doughnuts.
 * This is a *palette source*, not a per-category semantic claim: slice N is just
 * hue #N, not "danger". "By Class" uses the first 5; "By Class Type" uses all 6.
 */
export function resolveChartPalette(): string[] {
  return [
    hsl('--heroui-primary'),
    hsl('--heroui-success'),
    hsl('--heroui-warning'),
    hsl('--heroui-danger'),
    hsl('--heroui-secondary'),
    hsl('--heroui-default-400'),
  ];
}

/**
 * Chart chrome — the non-data colors on the doughnut. `border` blends the slice
 * gaps into the card surface (a harsh white line in dark mode was the old bug);
 * `foreground`/`sublabel` are the center total + "items" caption.
 */
export function resolveChartChrome(): { border: string; foreground: string; sublabel: string } {
  return {
    border: hsl('--heroui-background'),
    foreground: hsl('--heroui-foreground', '0 0% 11%'),
    sublabel: hsl('--heroui-default-500'),
  };
}
