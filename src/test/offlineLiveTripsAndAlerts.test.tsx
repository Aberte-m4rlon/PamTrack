import { act, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { GpsProvider } from '@/contexts/GpsContext';
import { NetworkProvider } from '@/contexts/NetworkContext';
import { ToastProvider } from '@/contexts/ToastContext';
import { LiveTripPage } from '@/pages/trips/LiveTripPage';
import { AppRoutes } from '@/App';
import {
  readOfflineActiveTrip,
  readOfflineAlerts,
  readOfflineCompletedTrips,
} from '@/lib/offlineTripsAndAlerts';

vi.mock('@/contexts/AuthContext', () => ({
  AuthProvider: ({ children }: { children: React.ReactNode }) => <>{children}</>,
  useAuth: () => ({
    user: { id: 'offline-commuter-1', email: 'commuter@mindoro.example' },
    session: null,
    profile: { full_name: 'Juan Commuter', home_municipality_id: 'lgu-calapan-city' },
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

function renderLiveTripTree(ui: React.ReactElement, initialEntries = ['/trips']) {
  const qc = new QueryClient({
    defaultOptions: { queries: { retry: false, networkMode: 'offlineFirst' } },
  });
  return render(
    <QueryClientProvider client={qc}>
      <NetworkProvider>
        <ToastProvider>
          <GpsProvider>
            <MemoryRouter initialEntries={initialEntries}>{ui}</MemoryRouter>
          </GpsProvider>
        </ToastProvider>
      </NetworkProvider>
    </QueryClientProvider>
  );
}

function makeGeoPosition(lat: number, lng: number, speedMps = 8): GeolocationPosition {
  return {
    coords: {
      latitude: lat,
      longitude: lng,
      accuracy: 15,
      altitude: null,
      altitudeAccuracy: null,
      heading: 90,
      speed: speedMps,
      toJSON: () => ({}),
    },
    timestamp: Date.now() + Math.floor(Math.random() * 10000),
    toJSON: () => ({}),
  };
}

describe('Offline Live Trip Monitoring & Offline Alerts', () => {
  beforeEach(() => {
    localStorage.clear();
    Object.defineProperty(navigator, 'onLine', {
      configurable: true,
      value: false,
    });
    window.dispatchEvent(new Event('offline'));
  });

  afterEach(() => {
    Object.defineProperty(navigator, 'onLine', {
      configurable: true,
      value: true,
    });
    vi.restoreAllMocks();
  });

  it('allows signed-in users to open /trips offline without OfflineFeatureGate blocking it', async () => {
    renderLiveTripTree(<AppRoutes />, ['/trips']);

    await waitFor(() => {
      expect(screen.getByRole('heading', { name: /Live Trip Monitor/i })).toBeInTheDocument();
      expect(screen.getByText(/Offline Tracking Active/i)).toBeInTheDocument();
    });
    expect(
      screen.queryByText(/Internet Connection Required for Live Trip Monitor/i)
    ).not.toBeInTheDocument();
  });

  it('starts a live trip offline, tracks moving coordinates on OfflineTripRadar, triggers alerts, and saves trip offline', async () => {
    let watchCallback: PositionCallback | null = null;
    const vibrateMock = vi.fn(() => true);

    Object.defineProperty(navigator, 'vibrate', {
      configurable: true,
      value: vibrateMock,
    });
    Object.defineProperty(navigator, 'geolocation', {
      configurable: true,
      value: {
        getCurrentPosition: vi.fn((success: PositionCallback) => {
          success(makeGeoPosition(13.407, 121.1778, 5));
        }),
        watchPosition: vi.fn((success: PositionCallback) => {
          watchCallback = success;
          return 77;
        }),
        clearWatch: vi.fn(),
      },
    });

    const user = userEvent.setup();
    renderLiveTripTree(<LiveTripPage />);

    expect(screen.getByTestId('offline-gps-radar')).toBeInTheDocument();
    expect(screen.getByText(/Offline Tracking Active/i)).toBeInTheDocument();

    await waitFor(() => {
      const boxes = screen.getAllByRole('combobox');
      expect(boxes[0]).toHaveTextContent('Calapan City');
      expect(boxes[2]).toHaveTextContent('Multicab');
    });

    const combos = screen.getAllByRole('combobox');
    await user.selectOptions(combos[0], 'lgu-calapan-city');
    await user.selectOptions(combos[1], 'lgu-naujan');
    await user.selectOptions(combos[2], 'tt-multicab');

    await user.click(screen.getByRole('button', { name: /Start Live Trip/i }));

    await waitFor(() => {
      expect(screen.getByText(/Offline Trip Running/i)).toBeInTheDocument();
      expect(readOfflineActiveTrip('offline-commuter-1')).not.toBeNull();
    });

    // Simulate GPS moving far off corridor (~10+ km west) while offline to verify movement & auto deviation alert
    expect(watchCallback).not.toBeNull();
    await act(async () => {
      watchCallback!(makeGeoPosition(13.38, 121.02, 12));
    });

    await waitFor(() => {
      expect(screen.getByRole('alert')).toHaveTextContent(/Route Deviation Alert/i);
      expect(vibrateMock).toHaveBeenCalled();
      expect(
        readOfflineAlerts('offline-commuter-1').some((a) => a.type === 'route_deviation_warning')
      ).toBe(true);
    });

    // Trigger manual Safe Arrival Alert offline
    await user.click(screen.getByRole('button', { name: /Safe Arrival Alert/i }));
    await waitFor(() => {
      expect(
        readOfflineAlerts('offline-commuter-1').some((a) => a.title.includes('Safe Arrival'))
      ).toBe(true);
    });

    // Finish trip offline cleanly -> queued locally for future online sync
    await user.click(screen.getByRole('button', { name: /End & Save Trip/i }));
    await waitFor(() => {
      expect(readOfflineActiveTrip('offline-commuter-1')).toBeNull();
      const completed = readOfflineCompletedTrips('offline-commuter-1');
      expect(completed).toHaveLength(1);
      expect(completed[0].status).toBe('completed');
      expect(completed[0].distance_km).toBeGreaterThan(0);
    });
  });
});
