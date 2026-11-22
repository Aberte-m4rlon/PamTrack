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
  CONTINUOUS_ANIMATION_FPS,
  CONTINUOUS_FRAME_INTERVAL_MS,
  createFpsFrameGate,
} from '@/lib/liquidAnimations';
import {
  GlassModal,
  GlassTabs,
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
    expect(LIGHT_RED_THEME.liquidGlass.specularRim).toBe('rgba(255, 255, 255, 0.92)');
    expect(LIGHT_RED_THEME.liquidGlass.backdropBlur).toBe('24px');
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
        <StatCard label="Routes Tracked" value={12} icon={Car} to="/fare-search" />
        <StatusBadge tone="red">Priority</StatusBadge>
        <SecondaryButton>Secondary Action</SecondaryButton>
        <GlassTabs
          value="all"
          onChange={() => {}}
          tabs={[
            { value: 'all', label: 'All Corridors', count: 8 },
            { value: 'multicab', label: 'Multicab' },
          ]}
        />
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
    expect(screen.getByText('Routes Tracked')).toBeInTheDocument();
    expect(screen.getByText('12')).toBeInTheDocument();
    expect(screen.getByText('Priority')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Publish' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Secondary Action' })).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: /All Corridors/i })).toBeInTheDocument();
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

  it('renders AppShell header, sidebar, and mandatory 5-tab mobile bottom nav cleanly without top-left mobile menu button', () => {
    renderWithProviders(<AppRoutes />, ['/']);

    expect(screen.getByLabelText('Desktop navigation sidebar')).toBeInTheDocument();
    const mobileNav = screen.getByLabelText('Mobile bottom navigation');
    expect(mobileNav).toHaveTextContent('Home');
    expect(mobileNav).toHaveTextContent('Explore');
    expect(mobileNav).toHaveTextContent('Live Map');
    expect(mobileNav).toHaveTextContent('Trips');
    expect(mobileNav).toHaveTextContent('Profile');

    // Top-left hamburger menu button & drawer removed on mobile view
    expect(screen.queryByLabelText('Open navigation menu')).not.toBeInTheDocument();
    expect(screen.queryByLabelText('Mobile navigation drawer')).not.toBeInTheDocument();
  });

  it('caps continuous custom ambient animation frame gate accurately at 28 FPS', () => {
    expect(CONTINUOUS_ANIMATION_FPS).toBe(28);
    expect(CONTINUOUS_FRAME_INTERVAL_MS).toBeCloseTo(1000 / 28, 3);

    const shouldTick = createFpsFrameGate(28);
    expect(shouldTick(0)).toBe(true);
    expect(shouldTick(16.6)).toBe(false);
    expect(shouldTick(30)).toBe(false);
    expect(shouldTick(36)).toBe(true);
    expect(shouldTick(52)).toBe(false);
    expect(shouldTick(72)).toBe(true);
  });
});
