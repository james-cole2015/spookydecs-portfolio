import { lazy, Suspense } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { PageContainer, LoadingState, AppHeader } from '@spookydecs/ui';

// Lazy-load pages — mirrors the vanilla Navigo lazy import pattern
const LandingPage  = lazy(() => import('./pages/LandingPage'));
const ListPage     = lazy(() => import('./pages/ListPage'));
const CreatePage   = lazy(() => import('./pages/CreatePage'));
// /:id/edit MUST register before /:id so the more-specific path wins
const EditPage     = lazy(() => import('./pages/EditPage'));
const DetailPage   = lazy(() => import('./pages/DetailPage'));

export default function App() {
  return (
    <>
      <AppHeader pageTitle="Item Administration" />
      <PageContainer>
        <Suspense fallback={<LoadingState />}>
          <Routes>
            <Route path="/"         element={<LandingPage />} />
            <Route path="/items"    element={<ListPage />} />
            <Route path="/create"   element={<CreatePage />} />
            <Route path="/:id/edit" element={<EditPage />} />
            <Route path="/:id"      element={<DetailPage />} />
            <Route path="*"         element={<Navigate to="/" replace />} />
          </Routes>
        </Suspense>
      </PageContainer>
    </>
  );
}
