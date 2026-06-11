import { heroui } from '@heroui/react';

/** @type {import('tailwindcss').Config} */
export default {
  content: [
    './index.html',
    './src/**/*.{ts,tsx}',
    '../../packages/ui/src/**/*.{ts,tsx}',
    // @heroui/theme gets nested under @heroui/react/node_modules (npm doesn't
    // hoist it), so match it wherever it lands — otherwise Tailwind purges all
    // of HeroUI's component classes and the components render unstyled.
    './node_modules/**/@heroui/theme/dist/**/*.{js,ts,jsx,tsx}',
  ],
  theme: {
    extend: {},
  },
  darkMode: 'class',
  plugins: [
    heroui({
      defaultTheme: 'dark',
      themes: {
        dark: {
          colors: {
            // Black canvas with neutral dark-gray surfaces; violet is the accent only.
            background: '#000000',
            foreground: '#ECEDEE',
            focus: '#a855f7',
            // Progressive dark-gray surface tokens (each lighter than the last) so
            // cards/inputs read as layers above the black background.
            content1: '#18181b',
            content2: '#26262a',
            content3: '#323237',
            content4: '#3f3f46',
            // Neutral gray scale — drives borders (default-200/300) and bordered
            // input outlines so controls are legible on the dark surfaces.
            default: {
              50: '#18181b',
              100: '#27272a',
              200: '#3f3f46',
              300: '#52525b',
              400: '#71717a',
              500: '#a1a1aa',
              600: '#d4d4d8',
              700: '#e4e4e7',
              800: '#f4f4f5',
              900: '#fafafa',
              DEFAULT: '#3f3f46',
              foreground: '#ECEDEE',
            },
            primary: {
              50: '#f5f3ff',
              100: '#ede9fe',
              200: '#ddd6fe',
              300: '#c4b5fd',
              400: '#a78bfa',
              500: '#8b5cf6',
              600: '#7c3aed',
              700: '#6d28d9',
              800: '#5b21b6',
              900: '#4c1d95',
              DEFAULT: '#8b5cf6',
              foreground: '#ffffff',
            },
            secondary: {
              DEFAULT: '#7c3aed',
              foreground: '#ffffff',
            },
          },
        },
        light: {
          colors: {
            // Clean light surfaces with the same violet accent as dark mode.
            background: '#faf9fc',
            foreground: '#1b1726',
            focus: '#7c3aed',
            content1: '#ffffff',
            content2: '#f4f2f8',
            content3: '#ebe8f1',
            content4: '#e0dcec',
            primary: {
              50: '#f5f3ff',
              100: '#ede9fe',
              200: '#ddd6fe',
              300: '#c4b5fd',
              400: '#a78bfa',
              500: '#8b5cf6',
              600: '#7c3aed',
              700: '#6d28d9',
              800: '#5b21b6',
              900: '#4c1d95',
              DEFAULT: '#7c3aed',
              foreground: '#ffffff',
            },
            secondary: {
              DEFAULT: '#6d28d9',
              foreground: '#ffffff',
            },
          },
        },
      },
    }),
  ],
};
