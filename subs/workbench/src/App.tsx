import { lazy, Suspense } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { PageContainer, LoadingState, AppHeader } from '@spookydecs/ui';

// Single read-only route (the seasonal monitor), lazy-loaded so it is its own
// chunk — mirrors storage's App.tsx. The header hosts the theme switch (#348),
// so there is no per-page ThemeSwitch block here.
const SeasonalView = lazy(() => import('./pages/SeasonalView'));

export default function App() {
  return (
    <>
      <AppHeader pageTitle="Workbench" />
      <PageContainer>
        <Suspense fallback={<LoadingState />}>
          <Routes>
            <Route path="/" element={<SeasonalView />} />
            {/* No other routes today; anything else returns to the monitor. */}
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </Suspense>
      </PageContainer>
    </>
  );
}
