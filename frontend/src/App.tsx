import { useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { useAuthStore } from './store/authStore';
import { Sidebar } from './components/shared/Sidebar';
import { Navbar } from './components/shared/Navbar';
import { ProtectedRoute } from './components/shared/ProtectedRoute';
import { Spinner } from './components/shared/Badges';

// Dedicated Full-Featured Pages
import Login from './pages/Login';
import CitizenDashboard from './pages/citizen/CitizenDashboard';
import CommandCenter from './pages/CommandCenter';
import LiveRiskMap from './pages/LiveRiskMap';
import { Locations } from './pages/Locations';
import LocationDetails from './pages/LocationDetails';
import RainfallMonitoring from './pages/RainfallMonitoring';
import AlertCenter from './pages/AlertCenter';
import TerrainAnalysis from './pages/TerrainAnalysis';
import SoilAnalysis from './pages/SoilAnalysis';
import HistoricalLandslides from './pages/HistoricalLandslides';
import InfrastructureExposure from './pages/InfrastructureExposure';
import RiskAnalytics from './pages/RiskAnalytics';
import NotificationsPage from './pages/NotificationsPage';
import ResponseCenter from './pages/ResponseCenter';
import DataSourcesPage from './pages/DataSourcesPage';
import AdminPanel from './pages/AdminPanel';
import SettingsPage from './pages/SettingsPage';

function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex h-screen overflow-hidden bg-surface">
      <Sidebar />
      <div className="flex-1 flex flex-col overflow-hidden w-full md:ml-60">
        <Navbar />
        <main className="flex-1 overflow-y-auto scrollbar-thin">
          {children}
        </main>
      </div>
    </div>
  );
}

export default function App() {
  const { initialize, initialized, activePortal } = useAuthStore();

  useEffect(() => {
    initialize();
  }, [initialize]);

  if (!initialized) {
    return (
      <div className="flex items-center justify-center h-screen bg-surface">
        <div className="flex flex-col items-center gap-3">
          <Spinner size={32} />
          <div className="text-slate-400 text-sm">Initializing Landslide Watch System...</div>
        </div>
      </div>
    );
  }

  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<Login />} />

        <Route
          path="/"
          element={
            <ProtectedRoute>
              {activePortal === 'citizen' ? (
                <CitizenDashboard />
              ) : (
                <AppLayout>
                  <CommandCenter />
                </AppLayout>
              )}
            </ProtectedRoute>
          }
        />

        <Route
          path="/citizen"
          element={
            <ProtectedRoute>
              <CitizenDashboard />
            </ProtectedRoute>
          }
        />

        <Route
          path="/authority"
          element={
            <ProtectedRoute minRole="authority">
              <AppLayout>
                <CommandCenter />
              </AppLayout>
            </ProtectedRoute>
          }
        />

        <Route
          path="/map"
          element={
            <ProtectedRoute>
              <AppLayout>
                <LiveRiskMap />
              </AppLayout>
            </ProtectedRoute>
          }
        />

        <Route
          path="/locations"
          element={
            <ProtectedRoute>
              <AppLayout>
                <Locations />
              </AppLayout>
            </ProtectedRoute>
          }
        />

        <Route
          path="/locations/:id"
          element={
            <ProtectedRoute>
              <AppLayout>
                <LocationDetails />
              </AppLayout>
            </ProtectedRoute>
          }
        />

        <Route
          path="/rainfall"
          element={
            <ProtectedRoute>
              <AppLayout>
                <RainfallMonitoring />
              </AppLayout>
            </ProtectedRoute>
          }
        />

        <Route
          path="/terrain"
          element={
            <ProtectedRoute>
              <AppLayout>
                <TerrainAnalysis />
              </AppLayout>
            </ProtectedRoute>
          }
        />

        <Route
          path="/soil"
          element={
            <ProtectedRoute>
              <AppLayout>
                <SoilAnalysis />
              </AppLayout>
            </ProtectedRoute>
          }
        />

        <Route
          path="/landslides"
          element={
            <ProtectedRoute>
              <AppLayout>
                <HistoricalLandslides />
              </AppLayout>
            </ProtectedRoute>
          }
        />

        <Route
          path="/infrastructure"
          element={
            <ProtectedRoute>
              <AppLayout>
                <InfrastructureExposure />
              </AppLayout>
            </ProtectedRoute>
          }
        />

        <Route
          path="/analytics"
          element={
            <ProtectedRoute>
              <AppLayout>
                <RiskAnalytics />
              </AppLayout>
            </ProtectedRoute>
          }
        />

        <Route
          path="/alerts"
          element={
            <ProtectedRoute minRole="authority">
              <AppLayout>
                <AlertCenter />
              </AppLayout>
            </ProtectedRoute>
          }
        />

        <Route
          path="/notifications"
          element={
            <ProtectedRoute>
              <AppLayout>
                <NotificationsPage />
              </AppLayout>
            </ProtectedRoute>
          }
        />

        <Route
          path="/response"
          element={
            <ProtectedRoute minRole="authority">
              <AppLayout>
                <ResponseCenter />
              </AppLayout>
            </ProtectedRoute>
          }
        />

        <Route
          path="/datasources"
          element={
            <ProtectedRoute>
              <AppLayout>
                <DataSourcesPage />
              </AppLayout>
            </ProtectedRoute>
          }
        />

        <Route
          path="/admin"
          element={
            <ProtectedRoute minRole="admin">
              <AppLayout>
                <AdminPanel />
              </AppLayout>
            </ProtectedRoute>
          }
        />

        <Route
          path="/settings"
          element={
            <ProtectedRoute minRole="admin">
              <AppLayout>
                <SettingsPage />
              </AppLayout>
            </ProtectedRoute>
          }
        />

        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}

