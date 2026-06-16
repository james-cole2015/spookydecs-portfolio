/**
 * TrackerNav — the tracker's intra-sub navigation bar (Issues / Epics / + Issue).
 * Ports the vanilla `.nav` block that every page rendered. The cross-sub chrome
 * (Items, Deployments, …) lives in the shared <AppHeader>; this is tracker-local.
 */
import { Link as RouterLink, useLocation } from 'react-router-dom';
import { Link } from '@heroui/react';

const LINKS = [
  { label: 'Issues', to: '/priority' },
  { label: 'Epics', to: '/epics' },
  { label: '+ Issue', to: '/new-issue' },
];

/**
 * Active-link mapping, matching the vanilla pages: /priority → Issues; /epics and
 * /epics/:slug → Epics; the issue-detail route (/epics/:slug/:issue) highlighted
 * nothing in the original, so neither does this.
 */
function activeTo(pathname: string): string | null {
  if (pathname === '/priority') return '/priority';
  if (pathname === '/new-issue') return '/new-issue';
  // Epics is active for the list and epic-detail, but not the deeper issue route.
  if (pathname.startsWith('/epics') && pathname.split('/').filter(Boolean).length <= 2) return '/epics';
  return null;
}

export default function TrackerNav() {
  const { pathname } = useLocation();
  const active = activeTo(pathname);

  return (
    <nav className="mx-auto mb-6 flex max-w-5xl items-center justify-between border-b border-divider px-1 pb-3 pt-1">
      <Link as={RouterLink} to="/" color="foreground" className="text-sm font-semibold tracking-wide">
        Tracker
      </Link>
      <div className="flex items-center gap-5">
        {LINKS.map((link) => (
          <Link
            key={link.to}
            as={RouterLink}
            to={link.to}
            size="sm"
            color={active === link.to ? 'secondary' : 'foreground'}
            className={active === link.to ? 'font-semibold' : 'text-default-500'}
          >
            {link.label}
          </Link>
        ))}
      </div>
    </nav>
  );
}
