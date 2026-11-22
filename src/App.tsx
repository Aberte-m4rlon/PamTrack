import { BrowserRouter, Link, Route, Routes } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { AuthProvider } from '@/contexts/AuthContext';
import { GpsProvider } from '@/contexts/GpsContext';
import { NetworkProvider } from '@/contexts/NetworkContext';
import { ToastProvider } from '@/contexts/ToastContext';
import { AppShell } from '@/components/layout/AppShell';
import { GlassErrorBoundary } from '@/components/ErrorBoundary';
import {
  OfflineFeatureGate,
  RequireAccountAccess,
  RequireAuth,
} from '@/components/auth/RouteGuards';
import { EmptyStateCard, GlassButton } from '@/components/glass/GlassPrimitives';

// Core Public Pages
import { LandingPage } from '@/pages/public/LandingPage';
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
import { ProfileHubPage } from '@/pages/public/ProfileHubPage';
import { SharedTripPage } from '@/pages/public/SharedTripPage';

// GPS, Live Map, Trips, Safety & Commuter Essentials
import { LiveMapPage } from '@/pages/gps/LiveMapPage';
import { LiveTripPage } from '@/pages/trips/LiveTripPage';
import { SafetyCenterPage } from '@/pages/safety/SafetyCenterPage';
import { FareDetailsPage } from '@/pages/commuter/FareDetailsPage';
import { MyReportsPage } from '@/pages/commuter/MyReportsPage';
import { ProfileSettingsPage } from '@/pages/commuter/ProfileSettingsPage';

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

export function AppRoutes() {
  return (
    <AppShell>
      <Routes>
        {/* Core Public Routes (Available Logged Out & Offline via Cache) */}
        <Route path="/" element={<LandingPage />} />
        <Route path="/fare-search" element={<FareSearchPage />} />
        <Route path="/fare-matrix" element={<FareMatrixPage />} />
        <Route path="/fares/:id" element={<FareDetailsPage />} />
        <Route path="/municipalities" element={<MunicipalitiesPage />} />
        <Route path="/profile" element={<ProfileHubPage />} />

        {/* Public Route Explorer & Shared Live Trip (Internet Required) */}
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

        {/* Authentication Routes (Internet Required) */}
        <Route
          path="/login"
          element={
            <OfflineFeatureGate
              featureTitle="Account Sign In"
              featureDescription="Signing in to your commuter account requires an internet connection."
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
              featureDescription="Creating a commuter account requires an internet connection."
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
              featureDescription="Updating your password requires an internet connection."
            >
              <ResetPasswordPage />
            </OfflineFeatureGate>
          }
        />

        {/* Commuter GPS, Live Trip, Safety & Fare Reporting Tools */}
        <Route
          path="/live-map"
          element={
            <OfflineFeatureGate
              featureTitle="Live GPS Map"
              featureDescription="Real-time OpenStreetMap tiles and routing require internet connectivity."
            >
              <RequireAccountAccess
                featureTitle="Live GPS Map"
                featureDescription="Track your current position, browse terminals, and measure OSRM road corridors across Oriental Mindoro."
                unlocks={[
                  'Live GPS position marker across all 15 LGUs',
                  'Terminal & port pins with mode filtering',
                  'OSRM road distance & duration estimation',
                  'Direct handoff to Live Trip Monitor',
                ]}
              >
                <LiveMapPage />
              </RequireAccountAccess>
            </OfflineFeatureGate>
          }
        />
        <Route
          path="/trips"
          element={
            <RequireAccountAccess
              featureTitle="Live Trip Monitor"
              featureDescription="Monitor active journeys offline or online with GPS tracking, route alerts, and trip saving."
              unlocks={[
                'Offline & online active trip GPS distance monitor',
                'Offline route deviation & destination arrival alerts',
                'Shareable live trip links when connected',
                'Trip logging synced automatically when back online',
              ]}
            >
              <LiveTripPage />
            </RequireAccountAccess>
          }
        />
        <Route
          path="/safety"
          element={
            <OfflineFeatureGate
              featureTitle="Safety & Trusted Contacts"
              featureDescription="Managing trusted contacts and emergency trip sharing requires an internet connection."
            >
              <RequireAccountAccess
                featureTitle="Safety & Trusted Contacts"
                featureDescription="Manage emergency trusted contacts, control live trip sharing links, and log safety alerts."
                unlocks={[
                  'Trusted family & emergency contact directory',
                  'Time-limited live GPS share controls',
                  'Commuter safety incident logging',
                ]}
              >
                <SafetyCenterPage />
              </RequireAccountAccess>
            </OfflineFeatureGate>
          }
        />

        <Route
          path="/dashboard/reports"
          element={withAuthGate('Report Observed Fare', <MyReportsPage />)}
        />
        <Route
          path="/dashboard/profile"
          element={withAuthGate('Profile Settings', <ProfileSettingsPage />)}
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
    <GlassErrorBoundary>
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
    </GlassErrorBoundary>
  );
}
