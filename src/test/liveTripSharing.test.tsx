import React from 'react';
import { act, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { NetworkProvider } from '@/contexts/NetworkContext';
import { ToastProvider } from '@/contexts/ToastContext';
import { GpsProvider } from '@/contexts/GpsContext';
import { LiveTripPage } from '@/pages/trips/LiveTripPage';
import { SharedTripPage } from '@/pages/public/SharedTripPage';
import * as api from '@/services/pamasaheApi';
import * as streamChannel from '@/lib/liveTripShareChannel';
import * as supabaseMod from '@/lib/supabase';
import type { LiveTripTelemetryPacket } from '@/lib/liveTripShareChannel';
import type { SharedTripStatus } from '@/types/database';

vi.mock('react-leaflet', () => ({
  MapContainer: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="mock-leaflet-map">{children}</div>
  ),
  TileLayer: () => null,
  Polyline: ({ positions }: { positions: [number, number][] }) => (
    <div data-testid="mock-polyline" data-count={positions.length} />
  ),
  CircleMarker: ({ children }: { children?: React.ReactNode }) => <div>{children}</div>,
  Circle: () => null,
  Marker: ({ children }: { children?: React.ReactNode }) => (
    <div data-testid="mock-live-marker">{children}</div>
  ),
  Popup: ({ children }: { children?: React.ReactNode }) => <div>{children}</div>,
  useMap: () => ({ panTo: vi.fn(), fitBounds: vi.fn(), setView: vi.fn() }),
}));

vi.mock('@/contexts/AuthContext', () => ({
  AuthProvider: ({ children }: { children: React.ReactNode }) => <>{children}</>,
  useAuth: () => ({
    user: { id: 'commuter-share-1', email: 'juan@mindoro.example' },
    session: null,
    profile: { full_name: 'Juan Dela Cruz', home_municipality_id: 'lgu-calapan-city' },
    role: 'commuter',
    loading: false,
    isConfigured: true,
    isCommuter: true,
    isOperator: false,
    isAdmin: false,
    isSuperAdmin: false,
    signIn: vi.fn(),
    signUp: vi.fn(),
    signOut: vi.fn(),
    refreshProfile: vi.fn(),
  }),
}));

function renderWithProviders(ui: React.ReactElement, route = '/') {
  const qc = new QueryClient({
    defaultOptions: { queries: { retry: false, networkMode: 'offlineFirst' } },
  });
  return render(
    <QueryClientProvider client={qc}>
      <NetworkProvider>
        <ToastProvider>
          <GpsProvider>
            <MemoryRouter initialEntries={[route]}>{ui}</MemoryRouter>
          </GpsProvider>
        </ToastProvider>
      </NetworkProvider>
    </QueryClientProvider>
  );
}

describe('Live Trip Sharing & Recipient Speed/Movement Monitor', () => {
  beforeEach(() => {
    localStorage.clear();
    sessionStorage.clear();
    Object.defineProperty(navigator, 'onLine', { configurable: true, value: true });
    vi.spyOn(supabaseMod, 'isSupabaseConfigured', 'get').mockReturnValue(true);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('displays live speed, movement state, trail, ETA, and real-time packet updates on SharedTripPage', async () => {
    const mockStatus: SharedTripStatus = {
      available: true,
      commuter_name: 'Juan',
      trip_status: 'active',
      origin_name: 'Calapan City',
      destination_name: 'Roxas',
      transport_mode: 'UV Express',
      current_latitude: 13.35,
      current_longitude: 121.22,
      distance_km: 12.4,
      duration_seconds: 1200,
      deviation_detected: false,
      latest_speed_kmh: 36.0,
      avg_speed_kmh: 37.2,
      max_speed_kmh: 44.5,
      heading_deg: 135,
      accuracy_meters: 12,
      last_recorded_at: new Date().toISOString(),
      started_at: new Date(Date.now() - 1200_000).toISOString(),
      expires_at: new Date(Date.now() + 3600_000).toISOString(),
      trail_points: [
        {
          latitude: 13.407,
          longitude: 121.1778,
          speed_kmh: 22.0,
          heading_deg: 140,
          accuracy_meters: 14,
          recorded_at: new Date(Date.now() - 600_000).toISOString(),
        },
        {
          latitude: 13.35,
          longitude: 121.22,
          speed_kmh: 36.0,
          heading_deg: 135,
          accuracy_meters: 12,
          recorded_at: new Date().toISOString(),
        },
      ],
    };

    vi.spyOn(api, 'fetchSharedTripStatus').mockResolvedValue(mockStatus);

    let pushPacket: ((pkt: LiveTripTelemetryPacket) => void) | null = null;
    vi.spyOn(streamChannel, 'subscribeSharedTripStream').mockImplementation(
      (_token, _enabled, onTelemetry, onConn) => {
        pushPacket = onTelemetry;
        onConn?.(true);
        return () => {};
      }
    );

    renderWithProviders(
      <Routes>
        <Route path="/shared-trip/:token" element={<SharedTripPage />} />
      </Routes>,
      '/shared-trip/token-abc123'
    );

    await waitFor(() => {
      expect(screen.getByText(/Juan's Live Trip: Calapan City → Roxas/i)).toBeInTheDocument();
      expect(screen.getByTestId('shared-current-speed')).toHaveTextContent('36.0');
      expect(screen.getAllByText(/Moving Steadily/i).length).toBeGreaterThan(0);
      expect(screen.getByText(/SE \(135°\)/i)).toBeInTheDocument();
      expect(screen.getByText(/Live Realtime Monitor/i)).toBeInTheDocument();
      expect(screen.getByText(/Movement Log/i)).toBeInTheDocument();
    });

    // Simulate incoming Realtime Broadcast packet showing faster movement & urgent SOS alert
    expect(pushPacket).not.toBeNull();
    await act(async () => {
      pushPacket!({
        shareToken: 'token-abc123',
        tripId: 'trip-1',
        commuterName: 'Juan',
        originName: 'Calapan City',
        destinationName: 'Roxas',
        transportMode: 'UV Express',
        tripStatus: 'active',
        latitude: 13.28,
        longitude: 121.29,
        accuracyMeters: 8,
        speedKmh: 58.4,
        avgSpeedKmh: 41.0,
        maxSpeedKmh: 58.4,
        headingDeg: 145,
        movementLabel: 'Fast Travel',
        distanceKm: 19.6,
        elapsedSeconds: 1500,
        remainingKm: 42.0,
        etaMinutes: 43,
        deviationKm: 0,
        deviationDetected: false,
        nearestLguName: 'Victoria',
        originCoords: [13.407, 121.1778],
        destinationCoords: [12.583, 121.519],
        trail: [
          {
            latitude: 13.407,
            longitude: 121.1778,
            speedKmh: 22.0,
            headingDeg: 140,
            accuracyMeters: 14,
            recordedAt: new Date(Date.now() - 600_000).toISOString(),
          },
          {
            latitude: 13.28,
            longitude: 121.29,
            speedKmh: 58.4,
            headingDeg: 145,
            accuracyMeters: 8,
            recordedAt: new Date().toISOString(),
          },
        ],
        alertBanner: {
          title: 'SOS Emergency Alert Triggered',
          message: 'Emergency button pressed near Victoria.',
          urgent: true,
          triggeredAt: new Date().toISOString(),
        },
        updatedAt: new Date().toISOString(),
      });
    });

    await waitFor(() => {
      expect(screen.getByTestId('shared-current-speed')).toHaveTextContent('58.4');
      expect(screen.getAllByText(/Fast Travel/i).length).toBeGreaterThan(0);
      expect(screen.getByText(/Peak recorded: 58\.4 km\/h/i)).toBeInTheDocument();
      expect(screen.getByRole('alert')).toHaveTextContent(/SOS Emergency Alert Triggered/i);
    });
  });

  it('shows unavailable card when shared trip token is revoked or expired', async () => {
    vi.spyOn(api, 'fetchSharedTripStatus').mockResolvedValue({
      available: false,
      reason: 'Sharing link has been revoked.',
    });

    renderWithProviders(
      <Routes>
        <Route path="/shared-trip/:token" element={<SharedTripPage />} />
      </Routes>,
      '/shared-trip/revoked-tok'
    );

    await waitFor(() => {
      expect(screen.getByText(/Shared Trip Unavailable/i)).toBeInTheDocument();
      expect(screen.getByText(/Sharing link has been revoked/i)).toBeInTheDocument();
    });
  });

  it('displays speedometer and creates, copies, and revokes live location sharing link on LiveTripPage', async () => {
    const startSpy = vi.spyOn(api, 'startTripRecord').mockResolvedValue({
      id: 'online-trip-99',
      user_id: 'commuter-share-1',
      origin_municipality_id: 'lgu-calapan-city',
      destination_municipality_id: 'lgu-naujan',
      route_id: null,
      transport_type_id: 'tt-multicab',
      associated_fare_record_id: null,
      recorded_fare_amount: null,
      fare_expense_type: 'none',
      start_latitude: 13.407,
      start_longitude: 121.1778,
      destination_latitude: 13.3242,
      destination_longitude: 121.303,
      current_latitude: 13.407,
      current_longitude: 121.1778,
      distance_km: 0,
      duration_seconds: 0,
      deviation_detected: false,
      max_deviation_km: 0,
      status: 'active',
      started_at: new Date().toISOString(),
      ended_at: null,
      notes: null,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    });
    vi.spyOn(api, 'updateActiveTripProgress').mockResolvedValue(undefined);
    vi.spyOn(api, 'fetchMyTrips').mockResolvedValue([]);
    vi.spyOn(api, 'fetchLocationSharingSessions').mockResolvedValue([]);
    vi.spyOn(api, 'fetchTrustedContacts').mockResolvedValue([]);
    const revokeSpy = vi.spyOn(api, 'revokeLocationSharingSession').mockResolvedValue(undefined);
    let shareActive = false;
    vi.spyOn(api, 'createLocationSharingSession').mockImplementation(async () => {
      shareActive = true;
      return {
        id: 'share-sess-1',
        user_id: 'commuter-share-1',
        trip_id: 'online-trip-99',
        trusted_contact_id: null,
        share_token: 'live-share-xyz789',
        consent_confirmed: true,
        expires_at: new Date(Date.now() + 1800_000).toISOString(),
        revoked_at: null,
        is_active: true,
        created_at: new Date().toISOString(),
      };
    });
    vi.spyOn(api, 'fetchLocationSharingSessions').mockImplementation(async () =>
      shareActive
        ? [
            {
              id: 'share-sess-1',
              user_id: 'commuter-share-1',
              trip_id: 'online-trip-99',
              trusted_contact_id: null,
              share_token: 'live-share-xyz789',
              consent_confirmed: true,
              expires_at: new Date(Date.now() + 1800_000).toISOString(),
              revoked_at: null,
              is_active: true,
              created_at: new Date().toISOString(),
            },
          ]
        : []
    );

    Object.defineProperty(navigator, 'geolocation', {
      configurable: true,
      value: {
        getCurrentPosition: vi.fn((success: PositionCallback) => {
          success({
            coords: {
              latitude: 13.407,
              longitude: 121.1778,
              accuracy: 10,
              altitude: null,
              altitudeAccuracy: null,
              heading: 90,
              speed: 10, // 36.0 km/h
              toJSON: () => ({}),
            },
            timestamp: Date.now(),
            toJSON: () => ({}),
          });
        }),
        watchPosition: vi.fn(() => 12),
        clearWatch: vi.fn(),
      },
    });

    const user = userEvent.setup();
    const clipboardSpy = vi.spyOn(navigator.clipboard, 'writeText');
    renderWithProviders(<LiveTripPage />, '/trips');

    await waitFor(() => {
      const boxes = screen.getAllByRole('combobox');
      expect(boxes[0]).toHaveTextContent('Calapan City');
    });

    const combos = screen.getAllByRole('combobox');
    await user.selectOptions(combos[0], 'lgu-calapan-city');
    await user.selectOptions(combos[1], 'lgu-naujan');
    await user.selectOptions(combos[2], 'tt-multicab');

    await user.click(screen.getByRole('button', { name: /Start Live Trip/i }));

    await waitFor(() => {
      expect(startSpy).toHaveBeenCalled();
      expect(screen.getByText(/Live Speed/i)).toBeInTheDocument();
      expect(screen.getAllByText(/36\.0/i).length).toBeGreaterThan(0);
      expect(screen.getByText(/Share Live Location & Speed/i)).toBeInTheDocument();
    });

    // Change duration to 30 mins and create share link
    const durationSelect = screen.getByLabelText(/Share link duration/i);
    await user.selectOptions(durationSelect, '30');

    await user.click(screen.getByRole('button', { name: /Create Live Share Link/i }));

    await waitFor(() => {
      expect(screen.getByText(/live-share-xyz789/i)).toBeInTheDocument();
      expect(screen.getByText(/Streaming Live/i)).toBeInTheDocument();
    });

    await user.click(screen.getByRole('button', { name: /Copy Link/i }));
    await waitFor(() => {
      expect(clipboardSpy).toHaveBeenCalledWith(
        expect.stringContaining('/shared-trip/live-share-xyz789')
      );
      expect(screen.getByRole('button', { name: /Copied/i })).toBeInTheDocument();
    });

    // Wait for query refetch to hydrate server-persisted session so Revoke button renders
    await waitFor(() => {
      expect(screen.getByRole('button', { name: /^Revoke$/i })).toBeInTheDocument();
    });
    await user.click(screen.getByRole('button', { name: /^Revoke$/i }));
    await waitFor(() => {
      expect(revokeSpy).toHaveBeenCalledWith('share-sess-1');
    });
  });
});
