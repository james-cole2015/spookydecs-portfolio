// Cross-cutting Tailwind config is centralized in @spookydecs/ui (#330):
//   - the preset supplies the HeroUI plugin + brand theme + dark mode,
//   - spookyUIContent supplies the @spookydecs/ui + @heroui/theme safelist globs.
// This sub only declares its OWN content — no per-sub @heroui/theme glob copy
// (that brittle, hoist-guessing glob now lives once, in the library).
import spookyTailwindPreset, { spookyUIContent } from '@spookydecs/ui/tailwind-preset';

/** @type {import('tailwindcss').Config} */
export default {
  presets: [spookyTailwindPreset],
  content: ['./index.html', './src/**/*.{ts,tsx}', ...spookyUIContent],
};
