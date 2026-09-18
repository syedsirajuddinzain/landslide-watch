import { useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { useAuthStore } from './store/authStore';
import { Sidebar } from './components/shared/Sidebar';
import { Navbar } from './components/shared/Navbar';
import { ProtectedRoute } from './components/shared/ProtectedRoute';
import { Spinner } from './components/shared/Badges';

// Core Dual Entry & Authentication Pages
import LandingPage from './pages/LandingPage';
import AuthorityLogin from './pages/AuthorityLogin';
import CitizenAuth from './pages/citizen/CitizenAuth';

// Citizen Experience
import CitizenDashboard from './pages/citizen/CitizenDashboard';

// Authority Operational Cockpit Pages
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
    <div className="flex h-screen overflow-hidden bg-[#F5F0E8]">
      <Sidebar />
      <div className="flex-1 flex flex-col overflow-hidden w-full min-w-0">
        <Navbar />
        <main className="flex-1 overflow-y-auto scrollbar-thin">
          {children}
        </main>
      </div>
    </div>
  );
}

export default function App() {
  const { initialize, initialized, user, role } = useAuthStore();

  useEffect(() => {
    initialize();
  }, [initialize]);

  if (!initialized) {
    return (
      <div className="flex items-center justify-center h-screen bg-[#070D14] text-white">
        <div className="flex flex-col items-center gap-3">
          <Spinner size={32} />
          <div className="text-slate-400 text-xs font-mono tracking-wider">
            INITIALIZING LANDSLIDE WATCH PLATFORM...
          </div>
        </div>
      </div>
    );
  }

  return (
    <BrowserRouter>
      <Routes>
        {/* ROOT: Dual Entry Landing Screen (ALWAYS presents clear choice: [CITIZEN] or [AUTHORITY]; never auto-enters dashboard) */}
        <Route path="/" element={<LandingPage />} />

        {/* Dual Entry Routes */}
        <Route path="/landing" element={<LandingPage />} />
        <Route path="/authority/login" element={<AuthorityLogin />} />
        <Route path="/citizen/auth" element={<CitizenAuth />} />
        <Route path="/login" element={<Navigate to="/authority/login" replace />} />

        {/* Citizen Safety Experience (Publicly Accessible) */}
        <Route path="/citizen" element={<CitizenDashboard />} />
        <Route path="/citizen/dashboard" element={<CitizenDashboard />} />
        <Route path="/citizen/welcome" element={<CitizenDashboard initialWelcome={true} />} />

        {/* Authority Command Center */}
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

        {/* Operational GIS & Monitoring Pages (Strictly Protected for Authority) */}
        <Route
          path="/map"
          element={
            <ProtectedRoute minRole="authority">
              <AppLayout>
                <LiveRiskMap />
              </AppLayout>
            </ProtectedRoute>
          }
        />

        <Route
          path="/locations"
          element={
            <ProtectedRoute minRole="authority">
              <AppLayout>
                <Locations />
              </AppLayout>
            </ProtectedRoute>
          }
        />

        <Route
          path="/locations/:id"
          element={
            <ProtectedRoute minRole="authority">
              <AppLayout>
                <LocationDetails />
              </AppLayout>
            </ProtectedRoute>
          }
        />

        <Route
          path="/rainfall"
          element={
            <ProtectedRoute minRole="authority">
              <AppLayout>
                <RainfallMonitoring />
              </AppLayout>
            </ProtectedRoute>
          }
        />

        <Route
          path="/terrain"
          element={
            <ProtectedRoute minRole="authority">
              <AppLayout>
                <TerrainAnalysis />
              </AppLayout>
            </ProtectedRoute>
          }
        />

        <Route
          path="/soil"
          element={
            <ProtectedRoute minRole="authority">
              <AppLayout>
                <SoilAnalysis />
              </AppLayout>
            </ProtectedRoute>
          }
        />

        <Route
          path="/landslides"
          element={
            <ProtectedRoute minRole="authority">
              <AppLayout>
                <HistoricalLandslides />
              </AppLayout>
            </ProtectedRoute>
          }
        />

        <Route
          path="/infrastructure"
          element={
            <ProtectedRoute minRole="authority">
              <AppLayout>
                <InfrastructureExposure />
              </AppLayout>
            </ProtectedRoute>
          }
        />

        <Route
          path="/analytics"
          element={
            <ProtectedRoute minRole="authority">
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
            <ProtectedRoute minRole="authority">
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
            <ProtectedRoute minRole="authority">
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

        {/* Catch-all redirect to / */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}
