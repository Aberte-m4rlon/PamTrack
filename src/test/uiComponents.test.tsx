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
import { RequireAdmin, RequireAuth } from '@/components/auth/RouteGuards';

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
  it('renders the Landing Page with brand slogan, 15 LGUs, and safe unfabricated featured routes state', async () => {
    renderWithProviders(<LandingPage />);

    expect(screen.getByText(/Know Your Route\./i)).toBeInTheDocument();
    expect(screen.getByText(/Tamang Pamasahe\. Ligtas na Biyahe\./i)).toBeInTheDocument();
    expect(screen.getByText(/No verified official fare records published yet/i)).toBeInTheDocument();

    await waitFor(() => {
      expect(screen.getByText('Calapan City')).toBeInTheDocument();
      expect(screen.getByText('Bulalacao')).toBeInTheDocument();
      expect(screen.getByText('Puerto Galera')).toBeInTheDocument();
    });
  });

  it('displays explicit unavailable official fare notice when searching a route with no official fare', async () => {
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
    await user.click(screen.getByRole('button', { name: /search/i }));

    await waitFor(() => {
      expect(
        screen.getByText('No verified official fare is currently available for this route.')
      ).toBeInTheDocument();
    });
  });

  it('renders Fare Matrix cleanly and handles empty state without fake fares', async () => {
    renderWithProviders(<FareMatrixPage />);

    await waitFor(() => {
      expect(screen.getByText('Oriental Mindoro Fare Matrix')).toBeInTheDocument();
      expect(
        screen.getByText(/No fare matrix records match your filters/i)
      ).toBeInTheDocument();
    });
  });

  it('redirects unauthenticated guests away from protected commuter and admin routes', async () => {
    renderWithProviders(
      <Routes>
        <Route path="/login" element={<div>Login Screen</div>} />
        <Route
          path="/dashboard"
          element={
            <RequireAuth>
              <div>Secret Commuter Dashboard</div>
            </RequireAuth>
          }
        />
        <Route
          path="/admin"
          element={
            <RequireAdmin>
              <div>Secret Admin Portal</div>
            </RequireAdmin>
          }
        />
      </Routes>,
      ['/admin']
    );

    await waitFor(() => {
      expect(screen.getByText('Login Screen')).toBeInTheDocument();
      expect(screen.queryByText('Secret Admin Portal')).not.toBeInTheDocument();
    });
  });
});
