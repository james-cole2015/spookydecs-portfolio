import { lazy, Suspense } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { PageContainer, LoadingState, AppHeader } from '@spookydecs/ui';

// Lazy-load pages so each route is its own chunk (playbook pattern). Routes carry
// the /admin prefix verbatim from the vanilla Navigo app (/admin, /admin/about,
// /admin/search-text). No router basename: admin is served at the bare root
// (admin.spookydecs.com, the configured ADMIN_URL + the post-login redirect
// target), so the catch-all sends bare root — and any unknown path — to the
// dashboard, mirroring the old Navigo notFound → '/' behavior.
const DashboardPage = lazy(() => import('./pages/DashboardPage'));
const AboutPage = lazy(() => import('./pages/AboutPage'));
const SearchTextPage = lazy(() => import('./pages/SearchTextPage'));

export default function App() {
  return (
    <PageContainer>
      <AppHeader pageTitle="Administration" />
      <Suspense fallback={<LoadingState />}>
        <Routes>
          <Route path="/admin" element={<DashboardPage />} />
          <Route path="/admin/dashboard" element={<DashboardPage />} />
          <Route path="/admin/about" element={<AboutPage />} />
          <Route path="/admin/search-text" element={<SearchTextPage />} />
          <Route path="*" element={<Navigate to="/admin" replace />} />
        </Routes>
      </Suspense>
    </PageContainer>
  );
}
