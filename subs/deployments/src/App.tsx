import { lazy, Suspense } from 'react';
import { Routes, Route, Navigate, useParams } from 'react-router-dom';
import { PageContainer, LoadingState, AppHeader } from '@spookydecs/ui';

// Lazy-load pages so each route is its own chunk (playbook pattern: mirrors the
// vanilla router's lazy page imports and keeps the initial bundle small).
const LandingPage = lazy(() => import('./pages/LandingPage'));
const BuilderPage = lazy(() => import('./pages/BuilderPage'));
const DeploymentPage = lazy(() => import('./pages/DeploymentPage'));
const StagingPage = lazy(() => import('./pages/StagingPage'));
const CompletePage = lazy(() => import('./pages/CompletePage'));
const TeardownPage = lazy(() => import('./pages/TeardownPage'));
const HistoricalPage = lazy(() => import('./pages/HistoricalPage'));
const HistoricalDetailPage = lazy(() => import('./pages/HistoricalDetailPage'));
const StatsPage = lazy(() => import('./pages/StatsPage'));
const StatsDetailPage = lazy(() => import('./pages/StatsDetailPage'));
const GraphsPage = lazy(() => import('./pages/GraphsPage'));
const DeploymentSchematic = lazy(() => import('./pages/DeploymentSchematic'));

/** Redirects an old path, filling `:id` from the current route. */
function RedirectTo({ to }: { to: string }) {
  const { id } = useParams();
  return <Navigate to={to.replace(':id', id || '')} replace />;
}

export default function App() {
  return (
    <>
      <AppHeader pageTitle="Deployments" />
      <PageContainer>
        <Suspense fallback={<LoadingState />}>
          {/* Bare-root routing (#487): the subdomain is the namespace, so routes are
              root-relative with no `/deployments` prefix. react-router v6 ranks routes
              by specificity, so registration order does not matter — `/:id` will not
              shadow the static and nested builder routes. */}
          <Routes>
            <Route path="/" element={<LandingPage />} />
            <Route path="/builder" element={<BuilderPage />} />

            {/* Deployment workspace: one graph per zone (#638). Sessions, the zone dashboard and the
                standalone connection/session pages are retired. */}
            <Route path="/builder/:id" element={<DeploymentPage />} />
            <Route path="/builder/:id/staging" element={<StagingPage />} />
            <Route path="/builder/:id/complete" element={<CompletePage />} />
            <Route path="/builder/:id/teardown" element={<TeardownPage />} />

            {/* Old bookmarks */}
            <Route path="/builder/:id/zones/complete" element={<RedirectTo to="/builder/:id/complete" />} />
            <Route path="/builder/:id/zones/*" element={<RedirectTo to="/builder/:id" />} />
            <Route path="/builder/:id/zones" element={<RedirectTo to="/builder/:id" />} />

            {/* Historical */}
            <Route path="/historical/:id" element={<HistoricalDetailPage />} />
            <Route path="/historical" element={<HistoricalPage />} />

            {/* Stats */}
            <Route path="/stats/:id" element={<StatsDetailPage />} />
            <Route path="/stats" element={<StatsPage />} />

            {/* Graphs */}
            <Route path="/graphs/:id" element={<DeploymentSchematic />} />
            <Route path="/graphs" element={<GraphsPage />} />

            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </Suspense>
      </PageContainer>
    </>
  );
}
