import { lazy, Suspense } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { LoadingState } from '@spookydecs/ui';
import { GalleryHeader } from './components/GalleryHeader';

// Lazy-load pages — one chunk per section (mirrors the vanilla lazy import pattern).
const Showcase = lazy(() => import('./pages/Showcase'));
const Progress = lazy(() => import('./pages/Progress'));
const Community = lazy(() => import('./pages/Community'));

export default function App() {
  return (
    <div className="min-h-screen">
      <GalleryHeader />
      <Suspense fallback={<LoadingState />}>
        <Routes>
          {/* URLs preserved verbatim: `/` and `/showcase` both show the showcase. */}
          <Route path="/" element={<Showcase />} />
          <Route path="/showcase" element={<Showcase />} />
          <Route path="/progress" element={<Progress />} />
          <Route path="/community" element={<Community />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </Suspense>
    </div>
  );
}
