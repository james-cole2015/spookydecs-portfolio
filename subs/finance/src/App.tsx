import { lazy, Suspense } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { PageContainer, LoadingState, AppHeader } from '@spookydecs/ui';

// Lazy-load pages so each route is its own chunk (playbook pattern: mirrors the
// vanilla router's dynamic page imports and keeps the initial bundle small).
const LandingPage = lazy(() => import('./pages/LandingPage'));
const RecordsPage = lazy(() => import('./pages/RecordsPage'));
const ReceiptsPage = lazy(() => import('./pages/ReceiptsPage'));
const StatisticsPage = lazy(() => import('./pages/StatisticsPage'));
const ItemsPage = lazy(() => import('./pages/ItemsPage'));
const NewCostRecordPage = lazy(() => import('./pages/NewCostRecordPage'));
const CostDetailPage = lazy(() => import('./pages/CostDetailPage'));
const ItemCostsPage = lazy(() => import('./pages/ItemCostsPage'));

// URL paths mirror the vanilla Navigo routes verbatim (#333 AC: no broken deep
// links). React Router v6 ranks the static routes (/records, /receipts, …) above
// the dynamic /:itemId catch-all automatically, so the vanilla RESERVED_ROUTES
// guard is no longer needed.
export default function App() {
  return (
    <>
      <AppHeader pageTitle="Finance" />
      <PageContainer>
        <Suspense fallback={<LoadingState />}>
          <Routes>
            <Route path="/" element={<LandingPage />} />
            <Route path="/records" element={<RecordsPage />} />
            <Route path="/receipts" element={<ReceiptsPage />} />
            <Route path="/statistics" element={<StatisticsPage />} />
            <Route path="/items" element={<ItemsPage />} />
            <Route path="/new" element={<NewCostRecordPage />} />
            <Route path="/costs/:costId" element={<CostDetailPage />} />
            <Route path="/:itemId" element={<ItemCostsPage />} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </Suspense>
      </PageContainer>
    </>
  );
}
