import { lazy, Suspense } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { PageContainer, LoadingState, AppHeader } from '@spookydecs/ui';

// Lazy-load pages so each route is its own chunk (playbook pattern: mirrors the
// vanilla Navigo router's lazy page imports and keeps the initial bundle small).
const LandingPage = lazy(() => import('./pages/LandingPage'));
const RecordsListPage = lazy(() => import('./pages/RecordsListPage'));
const ItemsListPage = lazy(() => import('./pages/ItemsListPage'));
const RecordDetailPage = lazy(() => import('./pages/RecordDetailPage'));
const RecordFormPage = lazy(() => import('./pages/RecordFormPage'));
const InspectionFormPage = lazy(() => import('./pages/InspectionFormPage'));
const RepairFormPage = lazy(() => import('./pages/RepairFormPage'));
const ItemDetailPage = lazy(() => import('./pages/ItemDetailPage'));
const SchedulesListPage = lazy(() => import('./pages/SchedulesListPage'));
const ScheduleFormPage = lazy(() => import('./pages/ScheduleFormPage'));
const ScheduleDetailPage = lazy(() => import('./pages/ScheduleDetailPage'));
const TemplateApplicationPage = lazy(() => import('./pages/TemplateApplicationPage'));

// React Router ranks routes by specificity (static > dynamic), so the literal
// /schedules, /records, /items, /create routes win over the catch-all /:itemId
// patterns natively — no manual guards needed (the vanilla Navigo router needed
// explicit `if (id === 'schedules') return` guards because it matched in order).
export default function App() {
  return (
    <>
      <AppHeader pageTitle="Maintenance" />
      <PageContainer>
        <Suspense fallback={<LoadingState />}>
          <Routes>
            <Route path="/" element={<LandingPage />} />
            <Route path="/maintenance" element={<LandingPage />} />
            <Route path="/records" element={<RecordsListPage />} />
            <Route path="/items" element={<ItemsListPage />} />
            <Route path="/create" element={<RecordFormPage />} />

            {/* Schedules subsystem */}
            <Route path="/schedules" element={<SchedulesListPage />} />
            <Route path="/schedules/new" element={<ScheduleFormPage />} />
            <Route path="/schedules/apply" element={<TemplateApplicationPage />} />
            <Route path="/schedules/:id" element={<ScheduleDetailPage />} />
            <Route path="/schedules/:id/edit" element={<ScheduleFormPage />} />
            <Route path="/schedules/:id/apply" element={<TemplateApplicationPage />} />

            {/* Record + item deep links */}
            <Route path="/:itemId/:recordId/perform-repair" element={<RepairFormPage />} />
            <Route path="/:itemId/:recordId/perform-inspection" element={<InspectionFormPage />} />
            <Route path="/:itemId/:recordId/edit" element={<RecordFormPage />} />
            <Route path="/:itemId/:recordId" element={<RecordDetailPage />} />
            <Route path="/:itemId" element={<ItemDetailPage />} />

            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </Suspense>
      </PageContainer>
    </>
  );
}
