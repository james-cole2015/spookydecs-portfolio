import { lazy, Suspense } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { PageContainer, LoadingState, AppHeader } from '@spookydecs/ui';

// Lazy-load pages so each route is its own chunk (playbook pattern: mirrors the
// vanilla router's lazy page imports and keeps the initial bundle small).
const LandingPage = lazy(() => import('./pages/landing'));
const ImagesListPage = lazy(() => import('./pages/images-list'));
const GalleryManagerPage = lazy(() => import('./pages/gallery-manager'));
const PhotoBrowserPage = lazy(() => import('./pages/photo-browser'));
const ItemsPage = lazy(() => import('./pages/items'));
const EntitiesPage = lazy(() => import('./pages/entities'));
const EntityDetailPage = lazy(() => import('./pages/entity-detail'));
const ImageDetailPage = lazy(() => import('./pages/image-detail'));

export default function App() {
  return (
    <PageContainer>
      <AppHeader pageTitle="Images" />
      <Suspense fallback={<LoadingState />}>
        <Routes>
          {/* All routes carry the /images prefix verbatim from the vanilla Navigo
              router — the sub is served at the images subdomain root, but the
              paths preserve /images so existing deep links keep working. */}
          <Route path="/images" element={<LandingPage />} />
          <Route path="/images/list" element={<ImagesListPage />} />
          <Route path="/images/gallery" element={<GalleryManagerPage />} />
          <Route path="/images/browse" element={<PhotoBrowserPage />} />
          <Route path="/images/items" element={<ItemsPage />} />
          <Route path="/images/entities" element={<EntitiesPage />} />
          <Route path="/images/entities/:id" element={<EntityDetailPage />} />
          <Route path="/images/:photoId/edit" element={<ImageDetailPage editMode />} />
          <Route path="/images/:photoId" element={<ImageDetailPage />} />
          {/* Root + anything else → landing (preserves the old "/" entry point). */}
          <Route path="*" element={<Navigate to="/images" replace />} />
        </Routes>
      </Suspense>
    </PageContainer>
  );
}
