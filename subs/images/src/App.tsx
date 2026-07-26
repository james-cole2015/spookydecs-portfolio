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
    <>
      <AppHeader pageTitle="Images" />
      <PageContainer>
        <Suspense fallback={<LoadingState />}>
          <Routes>
            {/* Bare-root routing (#487): the images subdomain is the namespace, so
                routes are root-relative with no /images prefix. */}
            <Route path="/" element={<LandingPage />} />
            <Route path="/list" element={<ImagesListPage />} />
            <Route path="/gallery" element={<GalleryManagerPage />} />
            <Route path="/browse" element={<PhotoBrowserPage />} />
            <Route path="/items" element={<ItemsPage />} />
            <Route path="/entities" element={<EntitiesPage />} />
            <Route path="/entities/:id" element={<EntityDetailPage />} />
            <Route path="/:photoId/edit" element={<ImageDetailPage editMode />} />
            <Route path="/:photoId" element={<ImageDetailPage />} />
            {/* Anything else → landing. */}
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </Suspense>
      </PageContainer>
    </>
  );
}
