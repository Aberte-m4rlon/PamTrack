import React from 'react';
import { describe, expect, it, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { AuthProvider } from '@/contexts/AuthContext';
import { ToastProvider } from '@/contexts/ToastContext';
import { LandingPage } from '@/pages/public/LandingPage';
import { FareSearchWidget } from '@/components/fare/FareSearchWidget';
import { FareMatrixPage } from '@/pages/public/FareMatrixPage';
import { RequireAuth } from '@/components/auth/RouteGuards';

function renderWithProviders(ui: React.ReactElement, initialEntries = ['/']) {
  const qc = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return render(
    <QueryClientProvider client={qc}>
      <ToastProvider>
        <AuthProvider>
          <MemoryRouter initialEntries={initialEntries}>{ui}</MemoryRouter>
        </AuthProvider>
      </ToastProvider>
    </QueryClientProvider>
  );
}

describe('Pamasahe Tracker Core UI & Role Guards', () => {
  it('renders the Landing Page with brand slogan, 15 LGUs, and safe citizen featured routes state', async () => {
    renderWithProviders(<LandingPage />);

    expect(screen.getByText(/Alamin ang Ruta\./i)).toBeInTheDocument();
    expect(screen.getByText(/Tamang Pamasahe\. Ligtas na Biyahe\./i)).toBeInTheDocument();
    expect(screen.getByText(/Mga Sikat na Ruta sa Oriental Mindoro/i)).toBeInTheDocument();
    expect(screen.getByText('Nakalistang Taripa')).toBeInTheDocument();

    await waitFor(() => {
      expect(screen.getByText('Calapan City')).toBeInTheDocument();
      expect(screen.getByText('Bulalacao')).toBeInTheDocument();
      expect(screen.getByText('Puerto Galera')).toBeInTheDocument();
    });
  });

  it('displays explicit empty notice when searching a route with no cached or published fare estimate', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response(JSON.stringify({ routes: [] }), { status: 404 })
    );

    const user = userEvent.setup();
    renderWithProviders(<FareSearchWidget />);

    await waitFor(() => {
      expect(screen.getByLabelText('Origin municipality')).toHaveTextContent('Calapan City');
    });

    await user.selectOptions(screen.getByLabelText('Origin municipality'), 'lgu-calapan-city');
    await user.selectOptions(screen.getByLabelText('Destination municipality'), 'lgu-naujan');
    await user.click(screen.getByRole('button', { name: /hanapin/i }));

    await waitFor(() => {
      expect(
        screen.getByText('Wala pang naka-save na pamasahe para sa rutang ito.')
      ).toBeInTheDocument();
    });
  });

  it('renders Fare Matrix cleanly and handles empty state without fake fares', async () => {
    renderWithProviders(<FareMatrixPage />);

    await waitFor(() => {
      expect(screen.getByText('Fare Matrix ng Oriental Mindoro')).toBeInTheDocument();
      expect(
        screen.getByText(/Walang nakitang pamasahe sa piniling filter/i)
      ).toBeInTheDocument();
    });
  });

  it('redirects unauthenticated guests away from protected commuter routes', async () => {
    renderWithProviders(
      <Routes>
        <Route path="/login" element={<div>Login Screen</div>} />
        <Route
          path="/dashboard/reports"
          element={
            <RequireAuth>
              <div>Secret Commuter Fare Report</div>
            </RequireAuth>
          }
        />
        <Route
          path="/dashboard/profile"
          element={
            <RequireAuth>
              <div>Secret Profile Settings</div>
            </RequireAuth>
          }
        />
      </Routes>,
      ['/dashboard/reports']
    );

    await waitFor(() => {
      expect(screen.getByText('Login Screen')).toBeInTheDocument();
      expect(screen.queryByText('Secret Commuter Fare Report')).not.toBeInTheDocument();
    });
  });
});
