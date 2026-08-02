import { lazy, Suspense } from 'react';
import { Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { PageContainer, LoadingState, AppHeader } from '@spookydecs/ui';
import TrackerNav from './components/TrackerNav';

// Lazy-load pages so each route is its own chunk (playbook pattern: mirrors the
// vanilla router's per-page scripts and keeps the initial bundle small).
const LandingPage = lazy(() => import('./pages/LandingPage'));
const PriorityListPage = lazy(() => import('./pages/PriorityListPage'));
const EpicsListPage = lazy(() => import('./pages/EpicsListPage'));
const TimelinePage = lazy(() => import('./pages/TimelinePage'));
const EpicDetailPage = lazy(() => import('./pages/EpicDetailPage'));
const IssueDetailPage = lazy(() => import('./pages/IssueDetailPage'));
const CreateIssuePage = lazy(() => import('./pages/CreateIssuePage'));

export default function App() {
  const { pathname } = useLocation();
  // Landing is the hub — it has its own card grid and showed no sub-nav in the
  // vanilla app, so suppress TrackerNav there.
  const showNav = pathname !== '/';

  // Access gating (token presence + env claim) is handled by the shared AuthGate
  // in main.tsx (#513), before this component ever mounts.
  return (
    <>
      <AppHeader pageTitle="Tracker" />
      <PageContainer>
        {showNav && <TrackerNav />}
        <Suspense fallback={<LoadingState />}>
          <Routes>
            {/* Routes ported from the vanilla Navigo router (deep links intact),
                plus /timeline — the epic-sequencing view added in #514. */}
            <Route path="/" element={<LandingPage />} />
            <Route path="/priority" element={<PriorityListPage />} />
            <Route path="/new-issue" element={<CreateIssuePage />} />
            <Route path="/timeline" element={<TimelinePage />} />
            <Route path="/epics" element={<EpicsListPage />} />
            <Route path="/epics/:slug" element={<EpicDetailPage />} />
            <Route path="/epics/:slug/:issue" element={<IssueDetailPage />} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </Suspense>
      </PageContainer>
    </>
  );
}
