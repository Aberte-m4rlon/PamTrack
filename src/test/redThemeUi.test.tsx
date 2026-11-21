import React from 'react';
import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Car } from 'lucide-react';
import { AuthProvider } from '@/contexts/AuthContext';
import { GpsProvider } from '@/contexts/GpsContext';
import { ToastProvider } from '@/contexts/ToastContext';
import { LIGHT_RED_THEME } from '@/lib/theme';
import {
  GlassModal,
  PageHeader,
  PrimaryButton,
  ResponsiveTable,
  SecondaryButton,
  StatCard,
  StatusBadge,
} from '@/components/glass/GlassPrimitives';
import { AppRoutes } from '@/App';

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

describe('Light Red Glassmorphism Design System & Shared Components', () => {
  it('defines exact Light Red / Rose color tokens', () => {
    expect(LIGHT_RED_THEME.colors.primaryRed).toBe('#DC2626');
    expect(LIGHT_RED_THEME.colors.deepRed).toBe('#B91C1C');
    expect(LIGHT_RED_THEME.colors.secondaryRed).toBe('#EF4444');
    expect(LIGHT_RED_THEME.colors.softRose).toBe('#FCA5A5');
    expect(LIGHT_RED_THEME.colors.lightRose).toBe('#FFE4E6');
    expect(LIGHT_RED_THEME.colors.background).toBe('#FFF1F2');
    expect(LIGHT_RED_THEME.colors.primaryText).toBe('#24191D');
    expect(LIGHT_RED_THEME.colors.secondaryText).toBe('#78716C');
    expect(LIGHT_RED_THEME.colors.mutedText).toBe('#A8A29E');
    expect(LIGHT_RED_THEME.colors.success).toBe('#16A34A');
    expect(LIGHT_RED_THEME.colors.warning).toBe('#F59E0B');
    expect(LIGHT_RED_THEME.colors.error).toBe('#DC2626');
    expect(LIGHT_RED_THEME.colors.information).toBe('#2563EB');
  });

  it('renders PageHeader, StatCard, StatusBadge, Buttons, ResponsiveTable, and GlassModal', () => {
    const first = renderWithProviders(
      <>
        <PageHeader
          eyebrow="Operations"
          title="Fare Verification"
          description="Monitor routes in Oriental Mindoro."
          breadcrumbs={[{ label: 'Home', to: '/' }, { label: 'Fare Verification' }]}
          actions={<PrimaryButton>Publish</PrimaryButton>}
        />
        <StatCard label="Vehicle Complaints" value={12} icon={Car} to="/report-vehicle" />
        <StatusBadge tone="red">Priority</StatusBadge>
        <SecondaryButton>Secondary Action</SecondaryButton>
        <ResponsiveTable>
          <table>
            <tbody>
              <tr>
                <td>Calapan City</td>
              </tr>
            </tbody>
          </table>
        </ResponsiveTable>
      </>
    );

    expect(screen.getByRole('heading', { name: 'Fare Verification' })).toBeInTheDocument();
    expect(screen.getByRole('navigation', { name: 'Breadcrumb' })).toBeInTheDocument();
    expect(screen.getByText('Vehicle Complaints')).toBeInTheDocument();
    expect(screen.getByText('12')).toBeInTheDocument();
    expect(screen.getByText('Priority')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Publish' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Secondary Action' })).toBeInTheDocument();
    expect(screen.getByText('Calapan City')).toBeInTheDocument();
    first.unmount();

    renderWithProviders(
      <GlassModal open onOpenChange={() => {}} title="Confirm Action">
        <p>Modal content</p>
      </GlassModal>
    );
    expect(screen.getByRole('dialog')).toBeInTheDocument();
    expect(screen.getByText('Modal content')).toBeInTheDocument();
    expect(screen.getByLabelText('Close modal')).toBeInTheDocument();
  });

  it('renders AppShell header, sidebar, and mandatory 5-tab mobile bottom nav cleanly', () => {
    renderWithProviders(<AppRoutes />, ['/']);

    expect(screen.getByLabelText('Desktop navigation sidebar')).toBeInTheDocument();
    const mobileNav = screen.getByLabelText('Mobile bottom navigation');
    expect(mobileNav).toHaveTextContent('Home');
    expect(mobileNav).toHaveTextContent('Explore');
    expect(mobileNav).toHaveTextContent('Live Map');
    expect(mobileNav).toHaveTextContent('Trips');
    expect(mobileNav).toHaveTextContent('Profile');
  });
});
