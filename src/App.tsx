import { BrowserRouter, Link, Route, Routes } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { AuthProvider } from '@/contexts/AuthContext';
import { GpsProvider } from '@/contexts/GpsContext';
import { NetworkProvider } from '@/contexts/NetworkContext';
import { ToastProvider } from '@/contexts/ToastContext';
import { AppShell } from '@/components/layout/AppShell';
import {
  OfflineFeatureGate,
  RequireAccountAccess,
  RequireAdmin,
  RequireAuth,
  RequireOperator,
} from '@/components/auth/RouteGuards';
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
      networkMode: 'offlineFirst',
      staleTime: 1000 * 60 * 5,
      gcTime: 1000 * 60 * 60 * 24,
    },
  },
});

function withAuthGate(featureTitle: string, element: React.ReactNode) {
  return (
    <OfflineFeatureGate featureTitle={featureTitle}>
      <RequireAuth>{element}</RequireAuth>
    </OfflineFeatureGate>
  );
}

function withAdminGate(featureTitle: string, element: React.ReactNode) {
  return (
    <OfflineFeatureGate featureTitle={featureTitle}>
      <RequireAdmin>{element}</RequireAdmin>
    </OfflineFeatureGate>
  );
}

export function AppRoutes() {
  return (
    <AppShell>
      <Routes>
        {/* Core Public Routes (Available Logged Out & Offline via Cache) */}
        <Route path="/" element={<LandingPage />} />
        <Route path="/about" element={<AboutPage />} />
        <Route path="/fare-search" element={<FareSearchPage />} />
        <Route path="/fare-matrix" element={<FareMatrixPage />} />
        <Route path="/fares/:id" element={<FareDetailsPage />} />
        <Route path="/municipalities" element={<MunicipalitiesPage />} />
        <Route path="/profile" element={<ProfileHubPage />} />
        <Route path="/privacy" element={<PrivacyPolicyPage />} />
        <Route path="/terms" element={<TermsPage />} />

        {/* Public Route Overview & Shared Trip (Logged Out Allowed, Internet Required) */}
        <Route
          path="/routes"
          element={
            <OfflineFeatureGate
              featureTitle="Oriental Mindoro Route Explorer"
              featureDescription="Interactive OpenStreetMap tiles and OSRM road geometry require internet connectivity. Cached fares remain usable offline."
            >
              <RouteExplorerPage />
            </OfflineFeatureGate>
          }
        />
        <Route
          path="/shared-trip/:token"
          element={
            <OfflineFeatureGate
              featureTitle="Shared Live Trip Viewer"
              featureDescription="Viewing a shared commuter trip link requires an internet connection."
            >
              <SharedTripPage />
            </OfflineFeatureGate>
          }
        />

        {/* Authentication Routes (Requires Internet) */}
        <Route
          path="/login"
          element={
            <OfflineFeatureGate
              featureTitle="Account Sign In"
              featureDescription="Authenticating into your account requires an internet connection."
            >
              <LoginPage />
            </OfflineFeatureGate>
          }
        />
        <Route
          path="/register"
          element={
            <OfflineFeatureGate
              featureTitle="Commuter Registration"
              featureDescription="Creating a new commuter account requires an internet connection."
            >
              <RegisterPage />
            </OfflineFeatureGate>
          }
        />
        <Route
          path="/forgot-password"
          element={
            <OfflineFeatureGate
              featureTitle="Password Recovery"
              featureDescription="Sending password reset links requires an internet connection."
            >
              <ForgotPasswordPage />
            </OfflineFeatureGate>
          }
        />
        <Route
          path="/reset-password"
          element={
            <OfflineFeatureGate
              featureTitle="Reset Password"
              featureDescription="Updating your account password requires an internet connection."
            >
              <ResetPasswordPage />
            </OfflineFeatureGate>
          }
        />

        {/* Member Commuter Tools (Locked When Logged Out & Disabled Offline) */}
        <Route
          path="/live-map"
          element={
            <OfflineFeatureGate
              featureTitle="Live GPS Map"
              featureDescription="Real-time OpenStreetMap tiles and turn-by-turn routing require internet connectivity."
            >
              <RequireAccountAccess
                featureTitle="Live GPS Map"
                featureDescription="Track your current position, browse nearby verified terminals, and calculate real OSRM road corridors across Oriental Mindoro."
                unlocks={[
                  'Live GPS position marker across all 15 LGUs',
                  'Verified terminal & port stop pins with filtering',
                  'OSRM turn-by-turn distance & duration routing',
                  'Quick handoff to Live Trip Monitoring',
                ]}
              >
                <LiveMapPage />
              </RequireAccountAccess>
            </OfflineFeatureGate>
          }
        />
        <Route
          path="/nearby"
          element={
            <OfflineFeatureGate
              featureTitle="Nearby Transportation Finder"
              featureDescription="Distance-sorted live terminals and GPS proximity tools require an internet connection."
            >
              <RequireAccountAccess
                featureTitle="Nearby Transportation Finder"
                featureDescription="Locate nearby verified public transport terminals, ports, tricycle stands, and UV Express stations."
                unlocks={[
                  'GPS proximity sorting to verified terminals',
                  'Multi-mode terminal & port filtering',
                  'Direct route lookup from your nearest hub',
                ]}
              >
                <NearbyTransportPage />
              </RequireAccountAccess>
            </OfflineFeatureGate>
          }
        />
        <Route
          path="/trips"
          element={
            <OfflineFeatureGate
              featureTitle="Live Trip Monitor"
              featureDescription="Real-time trip tracking, deviation checks, and safety share links require an internet connection."
            >
              <RequireAccountAccess
                featureTitle="Live Trip Monitor"
                featureDescription="Monitor active journeys against verified corridors, get route deviation warnings, and generate shareable live safety links."
                unlocks={[
                  'Real-time active trip GPS timer & distance monitor',
                  'Route deviation alerts (2 km corridor threshold)',
                  'Shareable live trip tokens for trusted family contacts',
                  'Trip logging linked to official fares',
                ]}
              >
                <LiveTripPage />
              </RequireAccountAccess>
            </OfflineFeatureGate>
          }
        />
        <Route
          path="/safety"
          element={
            <OfflineFeatureGate
              featureTitle="Safety Center & Contacts"
              featureDescription="Trusted contact management, live share controls, and safety incident reporting require an internet connection."
            >
              <RequireAccountAccess
                featureTitle="Safety Center & Contacts"
                featureDescription="Manage emergency trusted contacts, oversee active trip sharing tokens, and file transport safety reports."
                unlocks={[
                  'Trusted family & emergency contact directory',
                  'Time-limited live GPS share controls',
                  'Transport incident & overcharging safety reporting',
                ]}
              >
                <SafetyCenterPage />
              </RequireAccountAccess>
            </OfflineFeatureGate>
          }
        />
        <Route
          path="/report-vehicle"
          element={
            <OfflineFeatureGate
              featureTitle="Report a Vehicle"
              featureDescription="Submitting vehicle violation complaints and evidence uploads requires an internet connection."
            >
              <RequireAccountAccess
                featureTitle="Report a Vehicle"
                featureDescription="Submit verified commuter complaints citing vehicle plate details, violation categories, evidence uploads, and LGU/LTFRB authority routing."
                unlocks={[
                  'Structured vehicle & plate violation reports',
                  'Secure evidence photo/video storage upload',
                  'Automatic PT-OM tracking reference numbers',
                  'Smart routing recommendations to LTFRB, LTO, LGU, or PNP HPG',
                ]}
              >
                <ReportVehiclePage focusMode="vehicle" />
              </RequireAccountAccess>
            </OfflineFeatureGate>
          }
        />
        <Route
          path="/report-driver"
          element={
            <OfflineFeatureGate
              featureTitle="Report a Driver"
              featureDescription="Submitting driver conduct complaints requires an internet connection."
            >
              <RequireAccountAccess
                featureTitle="Report a Driver"
                featureDescription="Submit structured driver conduct reports reviewed confidentially by administrators."
                unlocks={[
                  'Driver behavior & safety incident logging',
                  'Confidential identity protection option',
                  'Real-time complaint status tracking',
                ]}
              >
                <ReportVehiclePage focusMode="driver" />
              </RequireAccountAccess>
            </OfflineFeatureGate>
          }
        />
        <Route
          path="/report-violation"
          element={
            <OfflineFeatureGate
              featureTitle="Report Fare Violation"
              featureDescription="Submitting overcharging or discount refusal complaints requires an internet connection."
            >
              <RequireAccountAccess
                featureTitle="Report Fare Violation"
                featureDescription="Report fare overcharging, refusal of 20% student/senior/PWD discounts, or unsafe transport practices."
                unlocks={[
                  'Official tariff comparison on route complaints',
                  'Evidence upload & administrator review queue',
                  'Agency referral escalation logs',
                ]}
              >
                <ReportVehiclePage focusMode="violation" />
              </RequireAccountAccess>
            </OfflineFeatureGate>
          }
        />
        <Route
          path="/authorities"
          element={
            <OfflineFeatureGate
              featureTitle="Reporting Authority Directory"
              featureDescription="Official enforcement referrals and complaint channel sync require an internet connection."
            >
              <RequireAccountAccess
                featureTitle="Reporting Authority Directory"
                featureDescription="Access verified Oriental Mindoro LGU, LTFRB, LTO, and PNP HPG compliance channels for escalated complaints."
                unlocks={[
                  'Official LTFRB, LTO, LGU & PNP HPG contact portals',
                  'Scope-matched enforcement referral guides',
                  'Direct filing preparation alongside your PT-OM reports',
                ]}
              >
                <AuthoritiesDirectoryPage />
              </RequireAccountAccess>
            </OfflineFeatureGate>
          }
        />

        {/* Protected Commuter Routes */}
        <Route path="/dashboard" element={withAuthGate('Commuter Dashboard', <CommuterDashboardPage />)} />
        <Route path="/trips/analytics" element={withAuthGate('Trip Analytics', <TripAnalyticsPage />)} />
        <Route path="/dashboard/route-finder" element={withAuthGate('Personalized Route Finder', <CommuterRouteFinderPage />)} />
        <Route path="/dashboard/fares/:id" element={<RequireAuth><FareDetailsPage /></RequireAuth>} />
        <Route path="/dashboard/reports" element={withAuthGate('My Fare Reports', <MyReportsPage />)} />
        <Route path="/dashboard/vehicle-reports" element={withAuthGate('My Vehicle Reports', <MyVehicleReportsPage />)} />
        <Route path="/dashboard/vehicle-reports/:id" element={withAuthGate('Vehicle Complaint Details', <VehicleComplaintDetailsPage />)} />
        <Route path="/dashboard/favorites" element={withAuthGate('Favorite Routes', <FavoritesPage />)} />
        <Route path="/dashboard/notifications" element={withAuthGate('Notifications', <NotificationsPage />)} />
        <Route path="/dashboard/profile" element={withAuthGate('Profile Settings', <ProfileSettingsPage />)} />

        {/* Protected Transport Operator Portal */}
        <Route
          path="/operator"
          element={
            <OfflineFeatureGate featureTitle="Operator Portal">
              <RequireOperator>
                <OperatorPortalPage />
              </RequireOperator>
            </OfflineFeatureGate>
          }
        />

        {/* Protected Administrator Portal */}
        <Route path="/admin" element={withAdminGate('Admin Dashboard', <AdminDashboardPage />)} />
        <Route path="/admin/users" element={withAdminGate('User Management', <UserManagementPage />)} />
        <Route path="/admin/municipalities" element={withAdminGate('Municipality Management', <MunicipalityManagementPage />)} />
        <Route path="/admin/routes" element={withAdminGate('Route Management', <RouteManagementPage />)} />
        <Route path="/admin/fares" element={withAdminGate('Fare Management', <FareManagementPage />)} />
        <Route path="/admin/verification" element={withAdminGate('Fare Verification', <FareVerificationPage />)} />
        <Route path="/admin/reports" element={withAdminGate('Community Reports', <AdminReportsPage />)} />
        <Route path="/admin/operators" element={withAdminGate('Transport Operators', <OperatorManagementPage />)} />
        <Route path="/admin/notifications" element={withAdminGate('Broadcast Notices', <AdminNotificationsPage />)} />
        <Route path="/admin/audit-logs" element={withAdminGate('Audit Logs', <AuditLogsPage />)} />
        <Route path="/admin/settings" element={withAdminGate('System Settings', <SystemSettingsPage />)} />
        <Route path="/admin/trip-analytics" element={withAdminGate('Admin Trip Analytics', <AdminTripAnalyticsPage />)} />
        <Route path="/admin/location-analytics" element={withAdminGate('Location & Stops Analytics', <AdminLocationAnalyticsPage />)} />
        <Route path="/admin/safety-reports" element={withAdminGate('Safety Reports', <AdminSafetyReportsPage />)} />
        <Route
          path="/admin/vehicle-reports"
          element={withAdminGate('Vehicle Reports', <AdminVehicleReportsPage presetGroup="ALL" pageTitle="Vehicle Reports" />)}
        />
        <Route
          path="/admin/driver-complaints"
          element={withAdminGate('Driver Complaints', <AdminVehicleReportsPage presetGroup="DRIVER BEHAVIOR" pageTitle="Driver Complaints" />)}
        />
        <Route
          path="/admin/fare-violations"
          element={withAdminGate('Fare Violations', <AdminVehicleReportsPage presetGroup="FARE VIOLATIONS" pageTitle="Fare Violations" />)}
        />
        <Route
          path="/admin/vehicle-safety-incidents"
          element={withAdminGate('Vehicle Safety Incidents', <AdminVehicleReportsPage presetGroup="VEHICLE SAFETY" pageTitle="Vehicle Safety Incidents" />)}
        />
        <Route path="/admin/agencies" element={withAdminGate('Agency Directory', <AdminAgenciesPage />)} />
        <Route path="/admin/agency-referrals" element={withAdminGate('Agency Referrals', <AdminAgencyReferralsPage />)} />
        <Route path="/admin/vehicle-analytics" element={withAdminGate('Vehicle Analytics', <AdminVehicleAnalyticsPage />)} />

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
      <NetworkProvider>
        <ToastProvider>
          <AuthProvider>
            <GpsProvider>
              <BrowserRouter>
                <AppRoutes />
              </BrowserRouter>
            </GpsProvider>
          </AuthProvider>
        </ToastProvider>
      </NetworkProvider>
    </QueryClientProvider>
  );
}
