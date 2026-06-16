import { lazy, Suspense, useEffect, useState } from 'react';
import { Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { PageContainer, LoadingState, AppHeader, useAuth } from '@spookydecs/ui';
import TrackerNav from './components/TrackerNav';

// Lazy-load pages so each route is its own chunk (playbook pattern: mirrors the
// vanilla router's per-page scripts and keeps the initial bundle small).
const LandingPage = lazy(() => import('./pages/LandingPage'));
const PriorityListPage = lazy(() => import('./pages/PriorityListPage'));
const EpicsListPage = lazy(() => import('./pages/EpicsListPage'));
const EpicDetailPage = lazy(() => import('./pages/EpicDetailPage'));
const IssueDetailPage = lazy(() => import('./pages/IssueDetailPage'));
const CreateIssuePage = lazy(() => import('./pages/CreateIssuePage'));

export default function App() {
  const { pathname } = useLocation();
  // Landing is the hub — it has its own card grid and showed no sub-nav in the
  // vanilla app, so suppress TrackerNav there.
  const showNav = pathname !== '/';

  // Env-access gate — ports the vanilla app.js boot check
  // (`SpookyAuth.enforceEnvAccess()`). tracker is a dev-only internal admin tool,
  // so this keeps it locked to the matching environment. enforceEnvAccess()
  // redirects internally and returns false on mismatch; render nothing while the
  // redirect navigates away. Runs under ConfigProvider (config already resolved).
  const [access, setAccess] = useState<'checking' | 'granted' | 'denied'>('checking');
  const { enforceEnvAccess } = useAuth();

  useEffect(() => {
    const ok = enforceEnvAccess();
    setAccess(ok ? 'granted' : 'denied');
  }, [enforceEnvAccess]);

  if (access === 'checking') return <LoadingState label="Checking access…" />;
  if (access === 'denied') return null;

  return (
    <PageContainer>
      <AppHeader pageTitle="Tracker" />
      {showNav && <TrackerNav />}
      <Suspense fallback={<LoadingState />}>
        <Routes>
          {/* The 6 routes ported verbatim from the vanilla Navigo router (deep
              links intact). There is no /timeline route in the source app. */}
          <Route path="/" element={<LandingPage />} />
          <Route path="/priority" element={<PriorityListPage />} />
          <Route path="/new-issue" element={<CreateIssuePage />} />
          <Route path="/epics" element={<EpicsListPage />} />
          <Route path="/epics/:slug" element={<EpicDetailPage />} />
          <Route path="/epics/:slug/:issue" element={<IssueDetailPage />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </Suspense>
    </PageContainer>
  );
}
