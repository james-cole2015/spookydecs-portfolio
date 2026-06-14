// Cross-cutting Tailwind config is centralized in @spookydecs/ui (#330):
//   - the preset supplies the HeroUI plugin + brand theme + dark mode,
//   - spookySubContent supplies this sub's own globs (resolved absolutely so they
//     hold under `npm run dev:<sub>`, which runs Vite from the repo root) PLUS the
//     @spookydecs/ui + @heroui/theme safelist globs. (#330, #358)
import spookyTailwindPreset, { spookySubContent } from '@spookydecs/ui/tailwind-preset';

/** @type {import('tailwindcss').Config} */
export default {
  presets: [spookyTailwindPreset],
  content: spookySubContent(import.meta.url),
};
