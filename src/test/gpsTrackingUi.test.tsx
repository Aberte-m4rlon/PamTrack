import React from 'react';
import { describe, expect, it, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { AuthProvider } from '@/contexts/AuthContext';
import { GpsProvider } from '@/contexts/GpsContext';
import { ToastProvider } from '@/contexts/ToastContext';
import { AppRoutes } from '@/App';
import { GpsConsentCard } from '@/components/gps/GpsConsentCard';
import { LiveMapPage } from '@/pages/gps/LiveMapPage';

function renderWithAllProviders(ui: React.ReactElement, initialEntries = ['/']) {
  const qc = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return render(
    <QueryClientProvider client={qc}>
      <ToastProvider>
        <AuthProvider>
          <GpsProvider>
            <MemoryRouter initialEntries={initialEntries}>{ui}</MemoryRouter>
          </GpsProvider>
        </AuthProvider>
      </ToastProvider>
    </QueryClientProvider>
  );
}

describe('GPS Permission, Tracking Controls, Nearby Stops & Mobile Bottom Nav', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('requires explicit consent before tracking and starts/stops geolocation cleanly', async () => {
    const clearWatchMock = vi.fn();
    const watchPositionMock = vi.fn().mockReturnValue(42);
    const getCurrentPositionMock = vi.fn((success: PositionCallback) => {
      success({
        coords: {
          latitude: 13.412,
          longitude: 121.179,
          accuracy: 18,
          altitude: null,
          altitudeAccuracy: null,
          heading: null,
          speed: 3.5,
          toJSON: () => ({}),
        },
        timestamp: Date.now(),
        toJSON: () => ({}),
      });
    });

    Object.defineProperty(navigator, 'geolocation', {
      configurable: true,
      value: {
        getCurrentPosition: getCurrentPositionMock,
        watchPosition: watchPositionMock,
        clearWatch: clearWatchMock,
      },
    });

    const user = userEvent.setup();
    renderWithAllProviders(<GpsConsentCard />);

    // Never silently queries GPS on mount
    expect(getCurrentPositionMock).not.toHaveBeenCalled();

    await user.click(screen.getByRole('button', { name: /simulan ang tracking/i }));

    await waitFor(() => {
      expect(watchPositionMock).toHaveBeenCalledTimes(1);
      expect(screen.getByText(/Naka-on ang Live GPS/i)).toBeInTheDocument();
      expect(screen.getByText(/±18 metro/i)).toBeInTheDocument();
      expect(screen.getByText(/Calapan City/i)).toBeInTheDocument();
    });

    await user.click(screen.getByRole('button', { name: /ihinto ang tracking/i }));
    expect(clearWatchMock).toHaveBeenCalledWith(42);
  });

  it('handles GPS permission denied cleanly with actionable message', async () => {
    const getCurrentPositionMock = vi.fn((_s: PositionCallback, error: PositionErrorCallback) => {
      error({
        code: 1,
        PERMISSION_DENIED: 1,
        POSITION_UNAVAILABLE: 2,
        TIMEOUT: 3,
        message: 'User denied Geolocation',
      });
    });

    Object.defineProperty(navigator, 'geolocation', {
      configurable: true,
      value: {
        getCurrentPosition: getCurrentPositionMock,
        watchPosition: vi.fn(),
        clearWatch: vi.fn(),
      },
    });

    const user = userEvent.setup();
    renderWithAllProviders(<GpsConsentCard />);

    await user.click(screen.getByRole('button', { name: /alamin ang lokasyon/i }));

    await waitFor(() => {
      expect(screen.getByText(/Tinanggihan ang location permission/i)).toBeInTheDocument();
    });
  });

  it('renders Live GPS Map & Terminals page with GPS controls cleanly', async () => {
    renderWithAllProviders(<LiveMapPage />);

    await waitFor(() => {
      expect(screen.getByText(/Live GPS Location/i)).toBeInTheDocument();
      expect(screen.getByText(/Kontrol sa GPS Location/i)).toBeInTheDocument();
    });
  });

  it('renders both desktop sidebar and fixed mobile bottom nav with exact 5 primary tabs', async () => {
    renderWithAllProviders(<AppRoutes />, ['/']);

    expect(screen.getByLabelText('Desktop navigation sidebar')).toBeInTheDocument();

    const mobileNav = screen.getByLabelText('Mobile bottom navigation');
    expect(mobileNav).toBeInTheDocument();
    expect(mobileNav).toHaveTextContent('Home');
    expect(mobileNav).toHaveTextContent('Hanapin');
    expect(mobileNav).toHaveTextContent('Live Map');
    expect(mobileNav).toHaveTextContent('Biyahe');
    expect(mobileNav).toHaveTextContent('Profile');
  });
});
