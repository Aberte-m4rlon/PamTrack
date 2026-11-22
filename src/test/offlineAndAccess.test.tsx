import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import {
  DEFAULT_TRANSPORT_TYPES,
  ORIENTAL_MINDORO_MUNICIPALITIES,
} from '@/data/orientalMindoro';
import { AuthProvider } from '@/contexts/AuthContext';
import { GpsProvider } from '@/contexts/GpsContext';
import { NetworkProvider } from '@/contexts/NetworkContext';
import { ToastProvider } from '@/contexts/ToastContext';
import { AppRoutes } from '@/App';
import { RouteExplorerPage } from '@/pages/public/RouteExplorerPage';
import {
  isNetworkUnavailableError,
  readOfflineFareRecords,
  saveOfflineFareRecords,
} from '@/lib/offlineCache';
import { fetchFareRecords } from '@/services/pamasaheApi';
import type { FareRecord } from '@/types/database';

function renderApp(initialEntries = ['/']) {
  const qc = new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
        networkMode: 'offlineFirst',
      },
    },
  });
  return render(
    <QueryClientProvider client={qc}>
      <NetworkProvider>
        <ToastProvider>
          <AuthProvider>
            <GpsProvider>
              <MemoryRouter initialEntries={initialEntries}>
                <AppRoutes />
              </MemoryRouter>
            </GpsProvider>
          </AuthProvider>
        </ToastProvider>
      </NetworkProvider>
    </QueryClientProvider>
  );
}

function setOnlineStatus(online: boolean) {
  Object.defineProperty(navigator, 'onLine', {
    configurable: true,
    value: online,
  });
  window.dispatchEvent(new Event(online ? 'online' : 'offline'));
}

const SAMPLE_OFFICIAL_FARE: FareRecord = {
  id: 'offline-fare-cal-pg',
  route_id: null,
  origin_municipality_id: 'lgu-calapan-city',
  destination_municipality_id: 'lgu-puerto-galera',
  transport_type_id: 'tt-multicab',
  passenger_category: 'regular',
  fare_amount: 120,
  currency: 'PHP',
  status: 'community_estimate',
  fare_source_id: null,
  issuing_authority: 'Citizen Commuter Fare Guide',
  official_document_reference: null,
  source_url: null,
  effective_date: '2026-02-01',
  last_verified_at: '2026-02-15T00:00:00Z',
  verified_by: null,
  is_archived: false,
  is_test_fixture: false,
  notes: 'Citizen estimate MC-2026-041 reference',
  created_at: '2026-02-01T00:00:00Z',
  updated_at: '2026-02-15T00:00:00Z',
  origin: ORIENTAL_MINDORO_MUNICIPALITIES.find((m) => m.id === 'lgu-calapan-city'),
  destination: ORIENTAL_MINDORO_MUNICIPALITIES.find((m) => m.id === 'lgu-puerto-galera'),
  transport_type: DEFAULT_TRANSPORT_TYPES.find((t) => t.id === 'tt-multicab'),
};

describe('Offline Mode & Logged-Out Feature Access Restrictions', () => {
  beforeEach(() => {
    localStorage.clear();
    setOnlineStatus(true);
  });

  afterEach(() => {
    setOnlineStatus(true);
    vi.restoreAllMocks();
  });

  it('restricts sidebar navigation and gates Live Map, Trips & Vehicle Reporting when logged out', async () => {
    const first = renderApp(['/']);

    const sidebar = screen.getByLabelText('Desktop navigation sidebar');
    expect(sidebar).toHaveTextContent('Public Guest Access');
    expect(sidebar).toHaveTextContent('Fare Finder');
    expect(sidebar).toHaveTextContent('Fare Matrix');
    expect(sidebar).toHaveTextContent('15 LGUs');
    expect(sidebar).toHaveTextContent('Sign In to Unlock More');
    expect(within(sidebar).queryByRole('link', { name: /Live GPS Map/i })).toBeNull();
    first.unmount();

    const second = renderApp(['/live-map']);
    await waitFor(() => {
      expect(screen.getByRole('heading', { name: /Live GPS Map/i })).toBeInTheDocument();
      expect(screen.getByText(/Account Access Locked While Logged Out/i)).toBeInTheDocument();
    });
    second.unmount();

    const third = renderApp(['/trips']);
    await waitFor(() => {
      expect(screen.getByRole('heading', { name: /Live Trip Monitor/i })).toBeInTheDocument();
      expect(screen.getByText(/Account Access Locked While Logged Out/i)).toBeInTheDocument();
    });
    third.unmount();

    renderApp(['/report-vehicle']);
    await waitFor(() => {
      expect(screen.getByRole('heading', { name: /Report a Vehicle/i })).toBeInTheDocument();
      expect(screen.getByText(/Account Access Locked While Logged Out/i)).toBeInTheDocument();
      expect(screen.queryByPlaceholderText(/ABC 1234/i)).not.toBeInTheDocument();
    });
  });

  it('enables core fare lookup offline from local cache while gating online-only routes', async () => {
    saveOfflineFareRecords([SAMPLE_OFFICIAL_FARE]);
    expect(readOfflineFareRecords()).toHaveLength(1);

    setOnlineStatus(false);

    // Offline API helper reads cached official record cleanly without network calls
    const offlineResults = await fetchFareRecords({
      originId: 'lgu-calapan-city',
      destinationId: 'lgu-puerto-galera',
    });
    expect(offlineResults).toHaveLength(1);
    expect(offlineResults[0].fare_amount).toBe(120);

    // Offline Fare Finder displays offline notice & reads cached official fare safely
    const user = userEvent.setup();
    const first = renderApp(['/fare-search']);
    expect(
      screen.getByText(/Offline Mode Active — Limited Features Available/i)
    ).toBeInTheDocument();

    await waitFor(() => {
      expect(screen.getByLabelText('Origin municipality')).toHaveTextContent('Calapan City');
    });

    await user.selectOptions(screen.getByLabelText('Origin municipality'), 'lgu-calapan-city');
    await user.selectOptions(screen.getByLabelText('Destination municipality'), 'lgu-puerto-galera');
    await user.click(screen.getByRole('button', { name: /^search$/i }));

    await waitFor(() => {
      expect(screen.getByText(/Offline Cached Lookup/i)).toBeInTheDocument();
      expect(screen.getAllByText(/₱120\.00/).length).toBeGreaterThanOrEqual(1);
      expect(screen.getByText(/MC-2026-041/)).toBeInTheDocument();
    });

    // Uncached route offline still obeys strict integrity notice (no invented price)
    await user.selectOptions(screen.getByLabelText('Destination municipality'), 'lgu-naujan');
    await user.click(screen.getByRole('button', { name: /^search$/i }));
    await waitFor(() => {
      expect(
        screen.getByText('No commuter fare estimate found for this route yet.')
      ).toBeInTheDocument();
    });
    first.unmount();

    // Online-only routes render Offline Mode Gate cleanly
    const second = renderApp(['/routes']);
    expect(
      screen.getByText(/Internet Connection Required for Oriental Mindoro Route Explorer/i)
    ).toBeInTheDocument();
    expect(screen.getByText(/Cached Fare Finder/i)).toBeInTheDocument();
    second.unmount();

    renderApp(['/login']);
    expect(
      screen.getByText(/Internet Connection Required for Account Sign In/i)
    ).toBeInTheDocument();
  });

  it('displays route fare prices directly on RouteExplorerPage (/routes)', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response(JSON.stringify({ routes: [] }), { status: 404 })
    );
    saveOfflineFareRecords([SAMPLE_OFFICIAL_FARE]);

    const user = userEvent.setup();
    const qc = new QueryClient({
      defaultOptions: { queries: { retry: false, networkMode: 'offlineFirst' } },
    });
    render(
      <QueryClientProvider client={qc}>
        <NetworkProvider>
          <ToastProvider>
            <AuthProvider>
              <GpsProvider>
                <MemoryRouter initialEntries={['/routes']}>
                  <RouteExplorerPage />
                </MemoryRouter>
              </GpsProvider>
            </AuthProvider>
          </ToastProvider>
        </NetworkProvider>
      </QueryClientProvider>
    );

    await waitFor(() => {
      expect(screen.getByLabelText('Route map origin municipality')).toHaveTextContent(
        'Calapan City'
      );
    });

    await user.selectOptions(screen.getByLabelText('Route map origin municipality'), 'lgu-calapan-city');
    await user.selectOptions(
      screen.getByLabelText('Route map destination municipality'),
      'lgu-puerto-galera'
    );

    await waitFor(() => {
      expect(screen.getByLabelText('Selected route fare prices')).toBeInTheDocument();
      expect(screen.getAllByText(/₱120\.00/).length).toBeGreaterThanOrEqual(1);
    });
  });

  it('treats upstream timeouts, gateway 5xx HTML responses, and status 0 as fallback-safe network failures', () => {
    const abortErr = new Error('The operation was aborted due to timeout');
    abortErr.name = 'TimeoutError';
    expect(isNetworkUnavailableError(abortErr)).toBe(true);
    expect(isNetworkUnavailableError({ message: '<!DOCTYPE html><html>502 Bad Gateway</html>' })).toBe(true);
    expect(isNetworkUnavailableError({ status: 0, message: '' })).toBe(true);
    expect(isNetworkUnavailableError({ status: 504, message: 'Gateway Time-out' })).toBe(true);
    expect(isNetworkUnavailableError(new Error('permission denied for table fare_records'))).toBe(false);
  });
});
