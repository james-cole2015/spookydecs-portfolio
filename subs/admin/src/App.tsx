import { lazy, Suspense } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { PageContainer, LoadingState, AppHeader } from '@spookydecs/ui';

// Lazy-load pages so each route is its own chunk (playbook pattern). Bare-root
// routing (#487): the admin subdomain (admin.spookydecs.com, the configured
// ADMIN_URL + post-login redirect target) is the namespace, so routes are
// root-relative with no /admin prefix. The catch-all sends any unknown path to
// the dashboard at '/'.
const DashboardPage = lazy(() => import('./pages/DashboardPage'));
const AboutPage = lazy(() => import('./pages/AboutPage'));
const SearchTextPage = lazy(() => import('./pages/SearchTextPage'));

export default function App() {
  return (
    <>
      <AppHeader pageTitle="Administration" />
      <PageContainer>
        <Suspense fallback={<LoadingState />}>
          <Routes>
            <Route path="/" element={<DashboardPage />} />
            <Route path="/dashboard" element={<DashboardPage />} />
            <Route path="/about" element={<AboutPage />} />
            <Route path="/search-text" element={<SearchTextPage />} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </Suspense>
      </PageContainer>
    </>
  );
}
