import { BrowserRouter, Link, Route, Routes } from 'react-router-dom';
import { MotionConfig } from 'framer-motion';
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
              featureTitle="Mapa ng Mga Ruta sa Oriental Mindoro"
              featureDescription="Kailangan ng internet para makita ang OpenStreetMap tiles at OSRM na ruta ng kalsada. Pwede pa ring gamitin offline ang mga naka-save na pamasahe."
            >
              <RouteExplorerPage />
            </OfflineFeatureGate>
          }
        />
        <Route
          path="/shared-trip/:token"
          element={
            <OfflineFeatureGate
              featureTitle="Viewer ng Naka-share na Biyahe"
              featureDescription="Kailangan ng internet connection para mabuksan at masubaybayan ang live shared trip link."
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
              featureTitle="Pag-sign In sa Account"
              featureDescription="Kailangan ng internet connection para makapag-sign in sa account mo."
            >
              <LoginPage />
            </OfflineFeatureGate>
          }
        />
        <Route
          path="/register"
          element={
            <OfflineFeatureGate
              featureTitle="Pag-register ng Pasahero"
              featureDescription="Kailangan ng internet connection para makagawa ng bagong account."
            >
              <RegisterPage />
            </OfflineFeatureGate>
          }
        />
        <Route
          path="/forgot-password"
          element={
            <OfflineFeatureGate
              featureTitle="Pagbawi ng Password"
              featureDescription="Kailangan ng internet connection para makapagpadala ng password reset link."
            >
              <ForgotPasswordPage />
            </OfflineFeatureGate>
          }
        />
        <Route
          path="/reset-password"
          element={
            <OfflineFeatureGate
              featureTitle="I-reset ang Password"
              featureDescription="Kailangan ng internet connection para ma-update ang iyong password."
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
              featureDescription="Kailangan ng internet connection para sa live OpenStreetMap tiles at road routing."
            >
              <RequireAccountAccess
                featureTitle="Live GPS Map"
                featureDescription="Subaybayan ang iyong lokasyon, tingnan ang mga terminal, at sukatin ang layo sa kalsada sa Oriental Mindoro."
                unlocks={[
                  'Live GPS marker sa lahat ng 15 LGU',
                  'Mga terminal at pantalan na may filter sa sasakyan',
                  'Pagkalkula ng distansya at tagal sa kalsada (OSRM)',
                  'Direktang lipat papunta sa Live Trip Monitor',
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
              featureDescription="Bantayan ang iyong biyahe online o offline gamit ang GPS, alerto sa ruta, at pag-save ng biyahe."
              unlocks={[
                'Online at offline GPS monitor habang bumabyahe',
                'Offline alerto kapag lumihis sa ruta o malapit na sa bababaan',
                'Link na pwede i-share para sa live monitoring kapag may internet',
                'Awtomatikong nag-si-sync ang na-save na biyahe kapag online na ulit',
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
              featureTitle="Safety at Trusted Contacts"
              featureDescription="Kailangan ng internet connection para ma-manage ang mga trusted contact at live sharing links."
            >
              <RequireAccountAccess
                featureTitle="Safety at Trusted Contacts"
                featureDescription="I-manage ang mga emergency contact, live sharing links na may limitadong oras, at safety reports."
                unlocks={[
                  'Listahan ng pamilya at mga pinagkakatiwalaang contact',
                  'Kontrol sa live GPS share links na may expiration',
                  'Pag-report ng mga insidente sa kaligtasan ng pasahero',
                ]}
              >
                <SafetyCenterPage />
              </RequireAccountAccess>
            </OfflineFeatureGate>
          }
        />

        <Route
          path="/dashboard/reports"
          element={withAuthGate('Mag-report ng Pamasahe', <MyReportsPage />)}
        />
        <Route
          path="/dashboard/profile"
          element={withAuthGate('Settings ng Profile', <ProfileSettingsPage />)}
        />

        {/* Fallback 404 */}
        <Route
          path="*"
          element={
            <EmptyStateCard
              title="Hindi Mahanap ang Pahina"
              description="Mukhang wala sa Pamasahe Tracker ang pahinang hinahanap mo."
              action={
                <Link to="/">
                  <GlassButton variant="primary">Bumalik sa Home</GlassButton>
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
      <MotionConfig reducedMotion="user">
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
      </MotionConfig>
    </GlassErrorBoundary>
  );
}
