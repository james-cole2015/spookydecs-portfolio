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
          {/* Bare-root routing (#487): the audit subdomain is the namespace, so the
              route is root-relative with no /audit prefix. */}
          <Routes>
            <Route path="/" element={<RecordListPage />} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </Suspense>
      </PageContainer>
    </>
  );
}
