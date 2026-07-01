import { lazy, Suspense } from 'react';
import { Navigate, Route, Routes } from 'react-router-dom';
import { useAuth } from './auth/AuthContext';
import AdminLayout from './layout/AdminLayout';
import type { ReactElement } from 'react';

// Eager load critical path
import Login from './pages/Login';

// Lazy load all dashboard pages — reduces initial bundle size
const Dashboard       = lazy(() => import('./pages/Dashboard'));
const CalendarPage    = lazy(() => import('./pages/CalendarPage'));
const ActiveEvents    = lazy(() => import('./pages/ActiveEvents'));
const PastEvents      = lazy(() => import('./pages/PastEvents'));
const Documents       = lazy(() => import('./pages/Documents'));
const ActivityLogs    = lazy(() => import('./pages/ActivityLogs'));
const AdminManagement = lazy(() => import('./pages/AdminManagement'));
const MailSettings    = lazy(() => import('./pages/MailSettings'));
const Labels          = lazy(() => import('./pages/Labels'));
const Notifications   = lazy(() => import('./pages/Notifications'));
const Reminders       = lazy(() => import('./pages/Reminders'));
const Staff           = lazy(() => import('./pages/Staff'));
const Inventory       = lazy(() => import('./pages/Inventory'));

/* ── Page-level skeleton fallback ─────────────────── */
function PageSkeleton() {
  return (
    <div className="space-y-5 p-1">
      {/* Header row */}
      <div className="flex items-center justify-between">
        <div className="space-y-2">
          <div className="skeleton h-5 w-48 rounded" />
          <div className="skeleton h-3 w-32 rounded" />
        </div>
        <div className="skeleton h-8 w-28 rounded-lg" />
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {Array.from({ length: 4 }).map((_, i) => (
          <div
            key={i}
            className="rounded-xl p-4 space-y-3"
            style={{ background: 'var(--card-bg)', border: '1px solid var(--card-border)' }}
          >
            <div className="skeleton h-3 w-20 rounded" />
            <div className="skeleton h-7 w-14 rounded" />
          </div>
        ))}
      </div>

      {/* Main content area */}
      <div
        className="rounded-xl p-5 space-y-4"
        style={{ background: 'var(--card-bg)', border: '1px solid var(--card-border)' }}
      >
        <div className="skeleton h-4 w-40 rounded" />
        <div className="skeleton h-48 w-full rounded-lg" />
      </div>
    </div>
  );
}

function PrivateRoute({ children }: { children: ReactElement }) {
  const { token } = useAuth();
  if (!token) return <Navigate to="/login" replace />;
  return children;
}

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route
        path="/"
        element={
          <PrivateRoute>
            <AdminLayout />
          </PrivateRoute>
        }
      >
        <Route index element={
          <Suspense fallback={<PageSkeleton />}>
            <Dashboard />
          </Suspense>
        } />
        <Route path="dashboard" element={
          <Suspense fallback={<PageSkeleton />}>
            <Dashboard />
          </Suspense>
        } />
        <Route path="calendar" element={
          <Suspense fallback={<PageSkeleton />}>
            <CalendarPage />
          </Suspense>
        } />
        <Route path="active" element={
          <Suspense fallback={<PageSkeleton />}>
            <ActiveEvents />
          </Suspense>
        } />
        <Route path="past" element={
          <Suspense fallback={<PageSkeleton />}>
            <PastEvents />
          </Suspense>
        } />
        <Route path="documents" element={
          <Suspense fallback={<PageSkeleton />}>
            <Documents />
          </Suspense>
        } />
        <Route path="logs" element={
          <Suspense fallback={<PageSkeleton />}>
            <ActivityLogs />
          </Suspense>
        } />
        <Route path="admins" element={
          <Suspense fallback={<PageSkeleton />}>
            <AdminManagement />
          </Suspense>
        } />
        <Route path="mail-settings" element={
          <Suspense fallback={<PageSkeleton />}>
            <MailSettings />
          </Suspense>
        } />
        <Route path="labels" element={
          <Suspense fallback={<PageSkeleton />}>
            <Labels />
          </Suspense>
        } />
        <Route path="notifications" element={
          <Suspense fallback={<PageSkeleton />}>
            <Notifications />
          </Suspense>
        } />
        <Route path="reminders" element={
          <Suspense fallback={<PageSkeleton />}>
            <Reminders />
          </Suspense>
        } />
        <Route path="staff" element={
          <Suspense fallback={<PageSkeleton />}>
            <Staff />
          </Suspense>
        } />
        <Route path="inventory" element={
          <Suspense fallback={<PageSkeleton />}>
            <Inventory />
          </Suspense>
        } />
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
