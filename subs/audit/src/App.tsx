import { lazy, Suspense } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { PageContainer, LoadingState, AppHeader } from '@spookydecs/ui';

// The audit viewer is one lazy chunk — mirrors storage/workbench App.tsx. The
// header hosts the theme switch (#348), so there is no per-page ThemeSwitch here.
const RecordListPage = lazy(() => import('./pages/RecordListPage'));

export default function App() {
  // Access gating (token presence + env claim) is handled by the shared AuthGate
  // in main.tsx (#513), before this component ever mounts.
  return (
    <>
      <AppHeader pageTitle="Audit" />
      <PageContainer>
        <Suspense fallback={<LoadingState />}>
          <Routes>
            <Route path="/audit" element={<RecordListPage />} />
            {/* Preserve the /audit entry path; anything else returns to it. */}
            <Route path="*" element={<Navigate to="/audit" replace />} />
          </Routes>
        </Suspense>
      </PageContainer>
    </>
  );
}
