import React from 'react';
import { beforeEach, describe, expect, it } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { AuthProvider } from '@/contexts/AuthContext';
import { GpsProvider } from '@/contexts/GpsContext';
import { ToastProvider } from '@/contexts/ToastContext';
import { AppRoutes } from '@/App';
import { AuthoritiesDirectoryPage } from '@/pages/vehicle/AuthoritiesDirectoryPage';
import { ReportVehiclePage } from '@/pages/vehicle/ReportVehiclePage';

function renderWithProviders(ui: React.ReactElement, initialEntries = ['/']) {
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

describe('Phase 3 Vehicle Reporting & Authority Directory UI', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('renders ReportVehiclePage with neutral terminology, plate toggle, violation categories, and smart agency routing', async () => {
    const user = userEvent.setup();
    renderWithProviders(<ReportVehiclePage />);

    expect(screen.getByRole('heading', { name: /Report a Vehicle/i })).toBeInTheDocument();
    expect(screen.getByText(/Reported Incident \/ Alleged Violation/i)).toBeInTheDocument();
    expect(screen.getByText(/never published as a public blacklist/i)).toBeInTheDocument();
    expect(
      screen.getByText(/Pamasahe Tracker is an independent monitoring system and is/i)
    ).toBeInTheDocument();

    // Plate input visible initially; hides when "Plate Number Not Available" is checked
    const plateInput = screen.getByPlaceholderText(/ABC 1234/i);
    expect(plateInput).toBeInTheDocument();

    const plateToggle = screen.getByLabelText(/Plate Number Not Available/i);
    await user.click(plateToggle);
    expect(screen.queryByPlaceholderText(/ABC 1234/i)).not.toBeInTheDocument();

    // Selecting Reckless driving & Verbal harassment updates Smart Agency Recommendations to show LTO & PNP HPG
    await user.click(screen.getByLabelText('Reckless driving'));
    await user.click(screen.getByLabelText('Verbal harassment'));

    await waitFor(() => {
      expect(screen.getByText(/LTO – Land Transportation Office/i)).toBeInTheDocument();
      expect(screen.getByText(/PNP – Highway Patrol Group/i)).toBeInTheDocument();
    });

    // Selecting Tricycle recommends Oriental Mindoro Municipal / City LGU
    const vehicleTypeSelect = screen.getAllByRole('combobox')[0];
    await user.selectOptions(vehicleTypeSelect, 'Tricycle');
    await waitFor(() => {
      expect(
        screen.getByText(/Oriental Mindoro Municipal \/ City LGU/i)
      ).toBeInTheDocument();
    });
  });

  it('renders Reporting Authority Directory with verified agencies and official links', async () => {
    renderWithProviders(<AuthoritiesDirectoryPage />);

    await waitFor(() => {
      expect(
        screen.getByRole('heading', { name: /Reporting Authority Directory/i })
      ).toBeInTheDocument();
      expect(
        screen.getByText(/LTFRB – Land Transportation Franchising and Regulatory Board/i)
      ).toBeInTheDocument();
      expect(screen.getByText(/LTO – Land Transportation Office/i)).toBeInTheDocument();
      expect(
        screen.getByText(/Oriental Mindoro Municipal \/ City LGU/i)
      ).toBeInTheDocument();
      expect(screen.getByText(/PNP – Highway Patrol Group/i)).toBeInTheDocument();
    });
  });

  it('preserves fixed mobile bottom navigation when navigating to /report-vehicle and /authorities', async () => {
    const first = renderWithProviders(<AppRoutes />, ['/report-vehicle']);
    await waitFor(() => {
      expect(screen.getByRole('heading', { name: /Report a Vehicle/i })).toBeInTheDocument();
    });
    const mobileNav = screen.getByLabelText('Mobile bottom navigation');
    expect(mobileNav).toHaveTextContent('Home');
    expect(mobileNav).toHaveTextContent('Explore');
    expect(mobileNav).toHaveTextContent('Live Map');
    expect(mobileNav).toHaveTextContent('Trips');
    expect(mobileNav).toHaveTextContent('Profile');
    first.unmount();

    renderWithProviders(<AppRoutes />, ['/authorities']);
    await waitFor(() => {
      expect(
        screen.getByRole('heading', { name: /Reporting Authority Directory/i })
      ).toBeInTheDocument();
    });
    expect(screen.getByLabelText('Mobile bottom navigation')).toBeInTheDocument();
  });
});
