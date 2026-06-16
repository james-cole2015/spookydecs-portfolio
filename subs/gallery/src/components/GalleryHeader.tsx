/**
 * GalleryHeader — public-facing top chrome for the gallery sub.
 *
 * The gallery is a *public* showcase, so it deliberately does NOT use the admin
 * @spookydecs/ui AppHeader (12-item nav dropdown + Logout). It keeps the original
 * branded "🎃 SpookyDecs Gallery" identity and the section tabs, and hosts the
 * shared ThemeSwitch (replacing the dropped custom ThemeToggle).
 */
import { Link } from 'react-router-dom';
import { ThemeSwitch } from '@spookydecs/ui';
import { SectionTabs } from './SectionTabs';

export function GalleryHeader() {
  return (
    <header className="mb-6 border-b border-default-200">
      <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-4 px-4 py-3">
        <Link to="/showcase" className="flex items-center gap-2 text-xl font-semibold text-foreground">
          <span>🎃</span>
          <span>SpookyDecs Gallery</span>
        </Link>
        <ThemeSwitch />
      </div>
      <div className="mx-auto max-w-7xl px-4">
        <SectionTabs />
      </div>
    </header>
  );
}
