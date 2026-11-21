import { BrowserRouter, Link, Route, Routes } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { AuthProvider } from '@/contexts/AuthContext';
import { GpsProvider } from '@/contexts/GpsContext';
import { ToastProvider } from '@/contexts/ToastContext';
import { AppShell } from '@/components/layout/AppShell';
import { RequireAdmin, RequireAuth, RequireOperator } from '@/components/auth/RouteGuards';
import { EmptyStateCard, GlassButton } from '@/components/glass/GlassPrimitives';

// Public Pages
import { LandingPage } from '@/pages/public/LandingPage';
import { AboutPage } from '@/pages/public/AboutPage';
import { RouteExplorerPage } from '@/pages/public/RouteExplorerPage';
import { FareSearchPage } from '@/pages/public/FareSearchPage';
import { FareMatrixPage } from '@/pages/public/FareMatrixPage';
import { MunicipalitiesPage } from '@/pages/public/MunicipalitiesPage';
import {
  ForgotPasswordPage,
  LoginPage,
  RegisterPage,
  ResetPasswordPage,
} from '@/pages/public/AuthPages';
import { PrivacyPolicyPage, TermsPage } from '@/pages/public/LegalPages';
import { ProfileHubPage } from '@/pages/public/ProfileHubPage';
import { SharedTripPage } from '@/pages/public/SharedTripPage';

// GPS, Live Map, Trips & Safety Pages
import { LiveMapPage } from '@/pages/gps/LiveMapPage';
import { NearbyTransportPage } from '@/pages/gps/NearbyTransportPage';
import { LiveTripPage } from '@/pages/trips/LiveTripPage';
import { TripAnalyticsPage } from '@/pages/trips/TripAnalyticsPage';
import { SafetyCenterPage } from '@/pages/safety/SafetyCenterPage';

// Commuter & Operator Pages
import { CommuterDashboardPage } from '@/pages/commuter/CommuterDashboardPage';
import { CommuterRouteFinderPage } from '@/pages/commuter/CommuterRouteFinderPage';
import { FareDetailsPage } from '@/pages/commuter/FareDetailsPage';
import { MyReportsPage } from '@/pages/commuter/MyReportsPage';
import { FavoritesPage } from '@/pages/commuter/FavoritesPage';
import { NotificationsPage } from '@/pages/commuter/NotificationsPage';
import { ProfileSettingsPage } from '@/pages/commuter/ProfileSettingsPage';
import { OperatorPortalPage } from '@/pages/operator/OperatorPortalPage';

// Admin Pages
import { AdminDashboardPage } from '@/pages/admin/AdminDashboardPage';
import { FareVerificationPage } from '@/pages/admin/FareVerificationPage';
import { FareManagementPage } from '@/pages/admin/FareManagementPage';
import { AdminReportsPage } from '@/pages/admin/AdminReportsPage';
import { RouteManagementPage } from '@/pages/admin/RouteManagementPage';
import { MunicipalityManagementPage } from '@/pages/admin/MunicipalityManagementPage';
import { OperatorManagementPage } from '@/pages/admin/OperatorManagementPage';
import { UserManagementPage } from '@/pages/admin/UserManagementPage';
import { AdminNotificationsPage } from '@/pages/admin/AdminNotificationsPage';
import { AuditLogsPage } from '@/pages/admin/AuditLogsPage';
import { SystemSettingsPage } from '@/pages/admin/SystemSettingsPage';
import { AdminTripAnalyticsPage } from '@/pages/admin/AdminTripAnalyticsPage';
import { AdminLocationAnalyticsPage } from '@/pages/admin/AdminLocationAnalyticsPage';
import { AdminSafetyReportsPage } from '@/pages/admin/AdminSafetyReportsPage';
import { AdminVehicleReportsPage } from '@/pages/admin/AdminVehicleReportsPage';
import { AdminAgenciesPage } from '@/pages/admin/AdminAgenciesPage';
import { AdminAgencyReferralsPage } from '@/pages/admin/AdminAgencyReferralsPage';
import { AdminVehicleAnalyticsPage } from '@/pages/admin/AdminVehicleAnalyticsPage';

// Phase 3: Vehicle, Driver & Violation Reporting Pages
import { ReportVehiclePage } from '@/pages/vehicle/ReportVehiclePage';
import { MyVehicleReportsPage } from '@/pages/vehicle/MyVehicleReportsPage';
import { VehicleComplaintDetailsPage } from '@/pages/vehicle/VehicleComplaintDetailsPage';
import { AuthoritiesDirectoryPage } from '@/pages/vehicle/AuthoritiesDirectoryPage';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      refetchOnWindowFocus: false,
    },
  },
});

export function AppRoutes() {
  return (
    <AppShell>
      <Routes>
        {/* Public Routes */}
        <Route path="/" element={<LandingPage />} />
        <Route path="/about" element={<AboutPage />} />
        <Route path="/routes" element={<RouteExplorerPage />} />
        <Route path="/fare-search" element={<FareSearchPage />} />
        <Route path="/fare-matrix" element={<FareMatrixPage />} />
        <Route path="/fares/:id" element={<FareDetailsPage />} />
        <Route path="/municipalities" element={<MunicipalitiesPage />} />
        <Route path="/live-map" element={<LiveMapPage />} />
        <Route path="/nearby" element={<NearbyTransportPage />} />
        <Route path="/trips" element={<LiveTripPage />} />
        <Route path="/safety" element={<SafetyCenterPage />} />
        <Route path="/report-vehicle" element={<ReportVehiclePage focusMode="vehicle" />} />
        <Route path="/report-driver" element={<ReportVehiclePage focusMode="driver" />} />
        <Route path="/report-violation" element={<ReportVehiclePage focusMode="violation" />} />
        <Route path="/authorities" element={<AuthoritiesDirectoryPage />} />
        <Route path="/profile" element={<ProfileHubPage />} />
        <Route path="/shared-trip/:token" element={<SharedTripPage />} />
        <Route path="/login" element={<LoginPage />} />
        <Route path="/register" element={<RegisterPage />} />
        <Route path="/forgot-password" element={<ForgotPasswordPage />} />
        <Route path="/reset-password" element={<ResetPasswordPage />} />
        <Route path="/privacy" element={<PrivacyPolicyPage />} />
        <Route path="/terms" element={<TermsPage />} />

        {/* Protected Commuter Routes */}
        <Route
          path="/dashboard"
          element={
            <RequireAuth>
              <CommuterDashboardPage />
            </RequireAuth>
          }
        />
        <Route
          path="/trips/analytics"
          element={
            <RequireAuth>
              <TripAnalyticsPage />
            </RequireAuth>
          }
        />
        <Route
          path="/dashboard/route-finder"
          element={
            <RequireAuth>
              <CommuterRouteFinderPage />
            </RequireAuth>
          }
        />
        <Route
          path="/dashboard/fares/:id"
          element={
            <RequireAuth>
              <FareDetailsPage />
            </RequireAuth>
          }
        />
        <Route
          path="/dashboard/reports"
          element={
            <RequireAuth>
              <MyReportsPage />
            </RequireAuth>
          }
        />
        <Route
          path="/dashboard/vehicle-reports"
          element={
            <RequireAuth>
              <MyVehicleReportsPage />
            </RequireAuth>
          }
        />
        <Route
          path="/dashboard/vehicle-reports/:id"
          element={
            <RequireAuth>
              <VehicleComplaintDetailsPage />
            </RequireAuth>
          }
        />
        <Route
          path="/dashboard/favorites"
          element={
            <RequireAuth>
              <FavoritesPage />
            </RequireAuth>
          }
        />
        <Route
          path="/dashboard/notifications"
          element={
            <RequireAuth>
              <NotificationsPage />
            </RequireAuth>
          }
        />
        <Route
          path="/dashboard/profile"
          element={
            <RequireAuth>
              <ProfileSettingsPage />
            </RequireAuth>
          }
        />

        {/* Protected Transport Operator Portal */}
        <Route
          path="/operator"
          element={
            <RequireOperator>
              <OperatorPortalPage />
            </RequireOperator>
          }
        />

        {/* Protected Administrator Portal */}
        <Route
          path="/admin"
          element={
            <RequireAdmin>
              <AdminDashboardPage />
            </RequireAdmin>
          }
        />
        <Route
          path="/admin/users"
          element={
            <RequireAdmin>
              <UserManagementPage />
            </RequireAdmin>
          }
        />
        <Route
          path="/admin/municipalities"
          element={
            <RequireAdmin>
              <MunicipalityManagementPage />
            </RequireAdmin>
          }
        />
        <Route
          path="/admin/routes"
          element={
            <RequireAdmin>
              <RouteManagementPage />
            </RequireAdmin>
          }
        />
        <Route
          path="/admin/fares"
          element={
            <RequireAdmin>
              <FareManagementPage />
            </RequireAdmin>
          }
        />
        <Route
          path="/admin/verification"
          element={
            <RequireAdmin>
              <FareVerificationPage />
            </RequireAdmin>
          }
        />
        <Route
          path="/admin/reports"
          element={
            <RequireAdmin>
              <AdminReportsPage />
            </RequireAdmin>
          }
        />
        <Route
          path="/admin/operators"
          element={
            <RequireAdmin>
              <OperatorManagementPage />
            </RequireAdmin>
          }
        />
        <Route
          path="/admin/notifications"
          element={
            <RequireAdmin>
              <AdminNotificationsPage />
            </RequireAdmin>
          }
        />
        <Route
          path="/admin/audit-logs"
          element={
            <RequireAdmin>
              <AuditLogsPage />
            </RequireAdmin>
          }
        />
        <Route
          path="/admin/settings"
          element={
            <RequireAdmin>
              <SystemSettingsPage />
            </RequireAdmin>
          }
        />
        <Route
          path="/admin/trip-analytics"
          element={
            <RequireAdmin>
              <AdminTripAnalyticsPage />
            </RequireAdmin>
          }
        />
        <Route
          path="/admin/location-analytics"
          element={
            <RequireAdmin>
              <AdminLocationAnalyticsPage />
            </RequireAdmin>
          }
        />
        <Route
          path="/admin/safety-reports"
          element={
            <RequireAdmin>
              <AdminSafetyReportsPage />
            </RequireAdmin>
          }
        />
        <Route
          path="/admin/vehicle-reports"
          element={
            <RequireAdmin>
              <AdminVehicleReportsPage presetGroup="ALL" pageTitle="Vehicle Reports" />
            </RequireAdmin>
          }
        />
        <Route
          path="/admin/driver-complaints"
          element={
            <RequireAdmin>
              <AdminVehicleReportsPage
                presetGroup="DRIVER BEHAVIOR"
                pageTitle="Driver Complaints"
              />
            </RequireAdmin>
          }
        />
        <Route
          path="/admin/fare-violations"
          element={
            <RequireAdmin>
              <AdminVehicleReportsPage
                presetGroup="FARE VIOLATIONS"
                pageTitle="Fare Violations"
              />
            </RequireAdmin>
          }
        />
        <Route
          path="/admin/vehicle-safety-incidents"
          element={
            <RequireAdmin>
              <AdminVehicleReportsPage
                presetGroup="VEHICLE SAFETY"
                pageTitle="Vehicle Safety Incidents"
              />
            </RequireAdmin>
          }
        />
        <Route
          path="/admin/agencies"
          element={
            <RequireAdmin>
              <AdminAgenciesPage />
            </RequireAdmin>
          }
        />
        <Route
          path="/admin/agency-referrals"
          element={
            <RequireAdmin>
              <AdminAgencyReferralsPage />
            </RequireAdmin>
          }
        />
        <Route
          path="/admin/vehicle-analytics"
          element={
            <RequireAdmin>
              <AdminVehicleAnalyticsPage />
            </RequireAdmin>
          }
        />

        {/* Fallback 404 */}
        <Route
          path="*"
          element={
            <EmptyStateCard
              title="Page Not Found"
              description="The requested Pamasahe Tracker route does not exist."
              action={
                <Link to="/">
                  <GlassButton variant="primary">Return Home</GlassButton>
                </Link>
              }
            />
          }
        />
      </Routes>
    </AppShell>
  );
}

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <ToastProvider>
        <AuthProvider>
          <GpsProvider>
            <BrowserRouter>
              <AppRoutes />
            </BrowserRouter>
          </GpsProvider>
        </AuthProvider>
      </ToastProvider>
    </QueryClientProvider>
  );
}
