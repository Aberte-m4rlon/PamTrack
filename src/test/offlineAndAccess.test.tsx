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
import {
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
  transport_type_id: 'tt-jeepney',
  passenger_category: 'regular',
  fare_amount: 120,
  currency: 'PHP',
  status: 'verified_official',
  fare_source_id: null,
  issuing_authority: 'LTFRB Region IV-B',
  official_document_reference: 'MC-2026-041',
  source_url: null,
  effective_date: '2026-02-01',
  last_verified_at: '2026-02-15T00:00:00Z',
  verified_by: 'admin-1',
  is_archived: false,
  is_test_fixture: false,
  notes: null,
  created_at: '2026-02-01T00:00:00Z',
  updated_at: '2026-02-15T00:00:00Z',
  origin: ORIENTAL_MINDORO_MUNICIPALITIES.find((m) => m.id === 'lgu-calapan-city'),
  destination: ORIENTAL_MINDORO_MUNICIPALITIES.find((m) => m.id === 'lgu-puerto-galera'),
  transport_type: DEFAULT_TRANSPORT_TYPES.find((t) => t.id === 'tt-jeepney'),
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
        screen.getByText('No verified official fare is currently available for this route.')
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
});
