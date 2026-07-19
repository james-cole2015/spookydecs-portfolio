import { lazy, Suspense } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { PageContainer, LoadingState, AppHeader } from '@spookydecs/ui';

// Lazy-load pages so each route is its own chunk (playbook pattern: mirrors the
// vanilla router's lazy page modules and keeps the initial bundle small).
const Dashboard = lazy(() => import('./pages/Dashboard'));
const RuleDetail = lazy(() => import('./pages/RuleDetail'));
const ViolationDetail = lazy(() => import('./pages/ViolationDetail'));
const ItemDetail = lazy(() => import('./pages/ItemDetail'));

export default function App() {
  return (
    <>
      <AppHeader pageTitle="Inspector" />
      <PageContainer>
        <Suspense fallback={<LoadingState />}>
          <Routes>
            <Route path="/inspector" element={<Dashboard />} />
            <Route path="/inspector/rules/:ruleId" element={<RuleDetail />} />
            <Route path="/inspector/violations/:violationId" element={<ViolationDetail />} />
            <Route path="/inspector/items/:itemId" element={<ItemDetail />} />
            <Route path="*" element={<Navigate to="/inspector" replace />} />
          </Routes>
        </Suspense>
      </PageContainer>
    </>
  );
}
