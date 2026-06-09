import { Switch } from '@heroui/react';
import { Sun, Moon } from 'lucide-react';
import { useTheme } from '../providers/ThemeProvider';

/** Light/dark toggle. HeroUI Switch with sun/moon thumb icons. */
export function ThemeSwitch() {
  const { theme, toggle } = useTheme();
  return (
    <Switch
      isSelected={theme === 'dark'}
      onValueChange={toggle}
      color="secondary"
      size="lg"
      aria-label="Toggle light or dark mode"
      thumbIcon={({ isSelected, className }) =>
        isSelected ? <Moon className={className} size={16} /> : <Sun className={className} size={16} />
      }
    />
  );
}
