import { lazy, Suspense } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { PageContainer, LoadingState, AppHeader } from '@spookydecs/ui';

// Lazy-load pages so each route is its own chunk (playbook pattern: mirrors the
// vanilla router's lazy page imports and keeps the initial bundle small).
const LandingPage = lazy(() => import('./pages/LandingPage'));
const BuilderPage = lazy(() => import('./pages/BuilderPage'));
const ZonesPage = lazy(() => import('./pages/ZonesPage'));
const ZoneDetailPage = lazy(() => import('./pages/ZoneDetailPage'));
const SessionPage = lazy(() => import('./pages/SessionPage'));
const SessionDetailPage = lazy(() => import('./pages/SessionDetailPage'));
const ConnectionDetailPage = lazy(() => import('./pages/ConnectionDetailPage'));
const StagingPage = lazy(() => import('./pages/StagingPage'));
const CompletePage = lazy(() => import('./pages/CompletePage'));
const TeardownPage = lazy(() => import('./pages/TeardownPage'));
const HistoricalPage = lazy(() => import('./pages/HistoricalPage'));
const HistoricalDetailPage = lazy(() => import('./pages/HistoricalDetailPage'));
const StatsPage = lazy(() => import('./pages/StatsPage'));
const StatsDetailPage = lazy(() => import('./pages/StatsDetailPage'));
const GraphsPlaceholderPage = lazy(() => import('./pages/GraphsPlaceholderPage'));
const DetailPlaceholderPage = lazy(() => import('./pages/DetailPlaceholderPage'));

export default function App() {
  return (
    <>
      <AppHeader pageTitle="Deployments" />
      <PageContainer>
        <Suspense fallback={<LoadingState />}>
          {/* react-router v6 ranks routes by specificity, so registration order
              does not matter — `/deployments/:id` will not shadow the static
              and nested builder routes the way the vanilla Navigo router required. */}
          <Routes>
            <Route path="/deployments" element={<LandingPage />} />
            <Route path="/deployments/builder" element={<BuilderPage />} />

            {/* Builder → zones → session → staging/teardown flow */}
            <Route path="/deployments/builder/:id/staging" element={<StagingPage />} />
            <Route path="/deployments/builder/:id/teardown" element={<TeardownPage />} />
            <Route path="/deployments/builder/:id/zones/complete" element={<CompletePage />} />
            <Route
              path="/deployments/builder/:id/zones/:zone/sessions/:sessionId"
              element={<SessionDetailPage />}
            />
            <Route
              path="/deployments/builder/:id/zones/:zone/session"
              element={<SessionPage />}
            />
            <Route path="/deployments/builder/:id/zones/:zone" element={<ZoneDetailPage />} />
            <Route path="/deployments/builder/:id/zones" element={<ZonesPage />} />
            <Route
              path="/deployments/builder/:deploymentId/:sessionId/:connectionId"
              element={<ConnectionDetailPage />}
            />

            {/* Historical */}
            <Route path="/deployments/historical/:id" element={<HistoricalDetailPage />} />
            <Route path="/deployments/historical" element={<HistoricalPage />} />

            {/* Stats */}
            <Route path="/deployments/stats/:id" element={<StatsDetailPage />} />
            <Route path="/deployments/stats" element={<StatsPage />} />

            {/* Graphs placeholder */}
            <Route path="/deployments/graphs" element={<GraphsPlaceholderPage />} />

            {/* Generic detail placeholder (least specific) */}
            <Route path="/deployments/:id" element={<DetailPlaceholderPage />} />

            <Route path="*" element={<Navigate to="/deployments" replace />} />
          </Routes>
        </Suspense>
      </PageContainer>
    </>
  );
}
