import spookyTailwindPreset, { spookySubContent } from '@spookydecs/ui/tailwind-preset';

/** @type {import('tailwindcss').Config} */
export default {
  presets: [spookyTailwindPreset],
  content: spookySubContent(import.meta.url),
};
