import { lazy, Suspense, useEffect, useState } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { PageContainer, LoadingState, AppHeader } from '@spookydecs/ui';

// The audit viewer is one lazy chunk — mirrors storage/workbench App.tsx. The
// header hosts the theme switch (#348), so there is no per-page ThemeSwitch here.
const RecordListPage = lazy(() => import('./pages/RecordListPage'));

export default function App() {
  // Staff-only access gate (audit-specific; workbench has none). enforceEnvAccess()
  // redirects internally when the user lacks access and returns false — in that
  // case render nothing while the redirect navigates away. Runs under
  // ConfigProvider, so the runtime config is already resolved here.
  const [access, setAccess] = useState<'checking' | 'granted' | 'denied'>('checking');

  useEffect(() => {
    const ok = window.SpookyAuth?.enforceEnvAccess?.() ?? false;
    setAccess(ok ? 'granted' : 'denied');
  }, []);

  if (access === 'checking') return <LoadingState label="Checking access…" />;
  if (access === 'denied') return null;

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
