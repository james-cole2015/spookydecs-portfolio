/**
 * SectionTabs — gallery section navigation (port of js/components/SectionTabs.js).
 *
 * HeroUI Tabs replace the hand-rolled desktop-tabs / mobile-hamburger pair; the
 * selected tab is derived from the route and selecting one navigates (URLs are
 * preserved: `/` and `/showcase` are both the showcase tab). Changing section
 * clears the filter query params, matching the vanilla state.clear() on tab change.
 */
import { Tabs, Tab } from '@heroui/react';
import { useLocation, useNavigate } from 'react-router-dom';
import { SECTION_TABS, type Section } from '../config/galleryConfig';

function sectionFromPath(pathname: string): Section {
  if (pathname.startsWith('/progress')) return 'progress';
  if (pathname.startsWith('/community')) return 'community';
  return 'showcase';
}

export function SectionTabs() {
  const navigate = useNavigate();
  const location = useLocation();
  const active = sectionFromPath(location.pathname);

  return (
    <Tabs
      aria-label="Gallery sections"
      selectedKey={active}
      onSelectionChange={(key) => {
        const section = key as Section;
        // Drop filters when switching sections (parity with state.clear()).
        navigate(section === 'showcase' ? '/showcase' : `/${section}`);
      }}
      variant="underlined"
      color="primary"
    >
      {SECTION_TABS.map((tab) => (
        <Tab
          key={tab.id}
          title={
            <span className="flex items-center gap-1">
              <span>{tab.icon}</span>
              <span>{tab.label}</span>
            </span>
          }
        />
      ))}
    </Tabs>
  );
}
