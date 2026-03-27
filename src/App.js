import React, { Suspense, lazy } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { logger } from './utils/logger.js';
import ErrorBoundary from './components/common/ErrorBoundary.js';
import LoadingSpinner from './components/common/LoadingSpinner.js';
import { useBootstrapApp } from './hooks/useBootstrapApp.js';
import { Dashboard } from './components/Dashboard.js';

// Lazy load main components
const AppShell = lazy(() => import('./components/layout/AppShell.js'));
const CalendarPage = lazy(() => import('./pages/CalendarPage.js'));
const BookingsPage = lazy(() => import('./pages/BookingsPage.js'));
const SettingsPage = lazy(() => import('./pages/SettingsPage.js'));

logger.info('App: Initializing');

const AppContent = () => {
  return (
    <ErrorBoundary>
      <BrowserRouter>
        <Suspense fallback={
          <div className="flex items-center justify-center min-h-screen">
            <LoadingSpinner label="Loading application..." />
          </div>
        }>
          <Routes>
            <Route
              path="/"
              element={
                <AppShell>
                  <CalendarPage />
                </AppShell>
              }
            />
            <Route
              path="/calendar"
              element={
                <AppShell>
                  <CalendarPage />
                </AppShell>
              }
            />
            <Route
              path="/bookings"
              element={
                <AppShell>
                  <BookingsPage />
                </AppShell>
              }
            />
            <Route
              path="/settings"
              element={
                <AppShell>
                  <SettingsPage />
                </AppShell>
              }
            />
            <Route
              path="/dashboard"
              element={
                <AppShell>
                  <Dashboard />
                </AppShell>
              }
            />

            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </Suspense>
      </BrowserRouter>
    </ErrorBoundary>
  );
};

const BootstrapWrapper = () => {
  const { isReady, error, isLoading, retry } = useBootstrapApp();

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-white">
        <div className="text-center">
          <LoadingSpinner label="Initializing application..." />
          <p style={{ marginTop: '16px', fontSize: '14px', color: '#666' }}>
            Logging in and fetching booking data...
          </p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-white">
        <div className="text-center" style={{ maxWidth: '400px' }}>
          <h2 style={{ fontSize: '24px', fontWeight: '600', color: '#d32f2f', marginBottom: '8px' }}>
            ❌ Initialization Failed
          </h2>
          <p style={{ fontSize: '14px', color: '#666', marginBottom: '16px' }}>
            {error}
          </p>
          <button
            onClick={retry}
            style={{
              padding: '10px 20px',
              backgroundColor: '#0066cc',
              color: 'white',
              border: 'none',
              borderRadius: '4px',
              fontSize: '14px',
              fontWeight: '500',
              cursor: 'pointer',
            }}
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  if (!isReady) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-white">
        <LoadingSpinner label="Preparing application..." />
      </div>
    );
  }

  return <AppContent />;
};

const App = () => {
  return <BootstrapWrapper />;
};

export default App;
