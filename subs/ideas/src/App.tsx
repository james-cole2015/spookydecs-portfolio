import { lazy, Suspense } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { PageContainer, LoadingState, AppHeader } from '@spookydecs/ui';

// Lazy-load pages so each route is its own chunk (playbook pattern: mirrors the
// vanilla router's lazy page imports and keeps the initial bundle small).
const LandingPage = lazy(() => import('./pages/LandingPage'));
const ListPage = lazy(() => import('./pages/ListPage'));
const FormPage = lazy(() => import('./pages/FormPage'));
const DetailPage = lazy(() => import('./pages/DetailPage'));
const WorkbenchPage = lazy(() => import('./pages/WorkbenchPage'));
const BuildDetailPage = lazy(() => import('./pages/BuildDetailPage'));
// Acquisitions (/acquisitions/*) rides in the ideas sub deployment (#494, W3).
const AcquisitionsListPage = lazy(() => import('./pages/AcquisitionsListPage'));
const AcquisitionFormPage = lazy(() => import('./pages/AcquisitionFormPage'));
const AcquisitionDetailPage = lazy(() => import('./pages/AcquisitionDetailPage'));

export default function App() {
  return (
    <>
      <AppHeader pageTitle="Ideas" />
      <PageContainer>
        <Suspense fallback={<LoadingState />}>
          {/* URLs preserved verbatim from the vanilla Navigo router. React Router v6
              ranks static segments above the dynamic `/:id`, so `/list`, `/create`
              and `/workbench` win automatically; `/workbench/:id` and `/:id/edit`
              are declared explicitly for clarity and deep-link parity. */}
          <Routes>
            <Route path="/" element={<LandingPage />} />
            <Route path="/list" element={<ListPage />} />
            <Route path="/create" element={<FormPage />} />
            <Route path="/workbench" element={<WorkbenchPage />} />
            <Route path="/workbench/:id" element={<BuildDetailPage />} />
            {/* Acquisitions (#494). Static `acquisitions` segment ranks above `/:id`. */}
            <Route path="/acquisitions" element={<AcquisitionsListPage />} />
            <Route path="/acquisitions/create" element={<AcquisitionFormPage />} />
            <Route path="/acquisitions/:id/edit" element={<AcquisitionFormPage />} />
            <Route path="/acquisitions/:id" element={<AcquisitionDetailPage />} />
            <Route path="/:id/edit" element={<FormPage />} />
            <Route path="/:id" element={<DetailPage />} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </Suspense>
      </PageContainer>
    </>
  );
}
