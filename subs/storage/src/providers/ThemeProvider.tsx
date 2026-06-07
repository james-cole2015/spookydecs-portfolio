/**
 * ThemeProvider — light/dark theme state for the app.
 * Persists to localStorage (default: dark) and drives the `dark`/`light` class
 * on <html>, which HeroUI reads to pick its theme. Reusable playbook artifact.
 *
 * No-flash: index.html sets the initial class from localStorage before React
 * paints, so this just keeps it in sync.
 */
import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from 'react';

export type Theme = 'light' | 'dark';

const STORAGE_KEY = 'sd-theme';

interface ThemeApi {
  theme: Theme;
  setTheme: (t: Theme) => void;
  toggle: () => void;
}

const ThemeContext = createContext<ThemeApi | null>(null);

function readInitial(): Theme {
  if (typeof window === 'undefined') return 'dark';
  const stored = window.localStorage.getItem(STORAGE_KEY);
  return stored === 'light' || stored === 'dark' ? stored : 'dark';
}

function apply(theme: Theme) {
  const html = document.documentElement;
  html.classList.remove('light', 'dark');
  html.classList.add(theme);
  html.style.colorScheme = theme;
}

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [theme, setThemeState] = useState<Theme>(readInitial);

  useEffect(() => {
    apply(theme);
    window.localStorage.setItem(STORAGE_KEY, theme);
  }, [theme]);

  const setTheme = (t: Theme) => setThemeState(t);
  const toggle = () => setThemeState((t) => (t === 'dark' ? 'light' : 'dark'));

  return <ThemeContext.Provider value={{ theme, setTheme, toggle }}>{children}</ThemeContext.Provider>;
}

export function useTheme(): ThemeApi {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error('useTheme must be used within <ThemeProvider>');
  return ctx;
}
