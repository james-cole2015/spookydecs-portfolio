import { lazy, Suspense } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { PageContainer, LoadingState } from './components/Layout';
import { Hello, ThemeSwitch } from '@spookydecs/ui';

// Lazy-load pages so each route is its own chunk (playbook pattern: mirrors the
// vanilla router's lazy page imports and keeps the initial bundle small).
const LandingPage = lazy(() => import('./pages/LandingPage'));
const ListPage = lazy(() => import('./pages/ListPage'));
const DetailPage = lazy(() => import('./pages/DetailPage'));
const CreateWizardPage = lazy(() => import('./pages/CreateWizardPage'));
const EditPage = lazy(() => import('./pages/EditPage'));
const PackWizardPage = lazy(() => import('./pages/PackWizardPage'));
const StatisticsPage = lazy(() => import('./pages/StatisticsPage'));
const NonPackablePage = lazy(() => import('./pages/NonPackablePage'));
const UnpackedPage = lazy(() => import('./pages/UnpackedPage'));

export default function App() {
  return (
    <PageContainer>
      <Hello />
      <div className="mb-2 flex justify-end">
        <ThemeSwitch />
      </div>
      <Suspense fallback={<LoadingState />}>
        <Routes>
          <Route path="/" element={<LandingPage />} />
          <Route path="/storage" element={<ListPage />} />
          <Route path="/new" element={<CreateWizardPage />} />
          <Route path="/storage/create" element={<CreateWizardPage />} />
          <Route path="/statistics" element={<StatisticsPage />} />
          <Route path="/storage/non-packable" element={<NonPackablePage />} />
          <Route path="/storage/unpacked" element={<UnpackedPage />} />
          <Route path="/storage/pack" element={<PackWizardPage />} />
          <Route path="/storage/pack/:id" element={<PackWizardPage />} />
          <Route path="/storage/:id/edit" element={<EditPage />} />
          <Route path="/storage/:id" element={<DetailPage />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </Suspense>
    </PageContainer>
  );
}
