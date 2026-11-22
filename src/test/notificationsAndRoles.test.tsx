import { describe, expect, it } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { AuthProvider } from '@/contexts/AuthContext';
import { GpsProvider } from '@/contexts/GpsContext';
import { ToastProvider } from '@/contexts/ToastContext';
import { AppRoutes } from '@/App';
import { getRecentSearches, saveRecentSearch } from '@/components/fare/FareSearchWidget';
import { buildFareMatrixRows, FARE_STATUS_META, REPORT_STATUS_META } from '@/lib/fareIntegrity';
import type { FareRecord } from '@/types/database';

function renderAppAt(path: string) {
  const qc = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return render(
    <QueryClientProvider client={qc}>
      <ToastProvider>
        <AuthProvider>
          <GpsProvider>
            <MemoryRouter initialEntries={[path]}>
              <AppRoutes />
            </MemoryRouter>
          </GpsProvider>
        </AuthProvider>
      </ToastProvider>
    </QueryClientProvider>
  );
}

describe('Navigation, Matrix Filtering, Recent Search History & Status Metadata', () => {
  it('deduplicates recent route searches in localStorage and keeps most recent first', () => {
    localStorage.clear();
    saveRecentSearch({
      originId: 'lgu-calapan-city',
      originName: 'Calapan City',
      destinationId: 'lgu-naujan',
      destinationName: 'Naujan',
      transportTypeId: 'all',
      passengerCategory: 'regular',
      searchedAt: '2026-01-01T00:00:00Z',
    });
    saveRecentSearch({
      originId: 'lgu-calapan-city',
      originName: 'Calapan City',
      destinationId: 'lgu-victoria',
      destinationName: 'Victoria',
      transportTypeId: 'all',
      passengerCategory: 'student',
      searchedAt: '2026-01-02T00:00:00Z',
    });
    saveRecentSearch({
      originId: 'lgu-calapan-city',
      originName: 'Calapan City',
      destinationId: 'lgu-naujan',
      destinationName: 'Naujan',
      transportTypeId: 'all',
      passengerCategory: 'regular',
      searchedAt: '2026-01-03T00:00:00Z',
    });

    const recent = getRecentSearches();
    expect(recent).toHaveLength(2);
    expect(recent[0].destinationName).toBe('Naujan');
  });

  it('defines distinct official vs community vs pending vs disputed status labels and colors', () => {
    expect(FARE_STATUS_META.verified_official.label).toBe('OPISYAL AT VERIFIED');
    expect(FARE_STATUS_META.community_estimate.label).toBe('GABAY NG KOMUNIDAD');
    expect(FARE_STATUS_META.pending_verification.label).toBe('NIRE-REVIEW PA');
    expect(FARE_STATUS_META.rejected_or_disputed.label).toBe('TINANGGIHAN / MAY DISPUTE');

    expect(REPORT_STATUS_META.approved_community_estimate.label).toBe(
      'Na-approve Bilang Gabay ng Komunidad'
    );
  });

  it('renders Municipalities (15 LGUs) and collapsible desktop sidebar toggle cleanly', async () => {
    const user = userEvent.setup();
    renderAppAt('/municipalities');

    await waitFor(() => {
      expect(screen.getByText('Mga Bayan sa Oriental Mindoro')).toBeInTheDocument();
      expect(screen.getByText('Calapan City')).toBeInTheDocument();
      expect(screen.getByText('Puerto Galera')).toBeInTheDocument();
    });

    const collapseBtn = screen.getByLabelText('Isara ang sidebar');
    await user.click(collapseBtn);
    expect(screen.getByLabelText('Buksan ang sidebar')).toBeInTheDocument();
  });

  it('renders registration form with safe unconfigured Supabase submit guard', async () => {
    renderAppAt('/register');

    await waitFor(() => {
      expect(screen.getByText('Gumawa ng Account ng Pasahero')).toBeInTheDocument();
    });

    const submitBtn = screen.getByRole('button', { name: /I-register ang Account/i });
    expect(submitBtn).toBeDisabled();
  });

  it('aggregates multiple passenger categories per corridor without mixing statuses', () => {
    const base: Partial<FareRecord> = {
      route_id: null,
      origin_municipality_id: 'lgu-calapan-city',
      destination_municipality_id: 'lgu-pinamalayan',
      transport_type_id: 'tt-uv-express',
      currency: 'PHP',
      fare_source_id: null,
      issuing_authority: 'LTFRB Region IV-B',
      official_document_reference: '[TEST FIXTURE] REF-01',
      source_url: null,
      effective_date: '2026-01-01',
      last_verified_at: '2026-01-10T00:00:00Z',
      verified_by: 'admin',
      is_archived: false,
      is_test_fixture: false,
      notes: null,
      created_at: '2026-01-10T00:00:00Z',
      updated_at: '2026-01-10T00:00:00Z',
    };
    const rows = buildFareMatrixRows([
      { ...(base as FareRecord), id: '1', passenger_category: 'regular', fare_amount: 100, status: 'verified_official' },
      { ...(base as FareRecord), id: '2', passenger_category: 'student', fare_amount: 80, status: 'verified_official' },
      { ...(base as FareRecord), id: '3', passenger_category: 'senior_citizen', fare_amount: 80, status: 'verified_official' },
      { ...(base as FareRecord), id: '4', passenger_category: 'pwd', fare_amount: 80, status: 'verified_official' },
    ]);
    expect(rows).toHaveLength(1);
    expect(rows[0].regularFare).toBe(100);
    expect(rows[0].studentFare).toBe(80);
    expect(rows[0].seniorFare).toBe(80);
    expect(rows[0].pwdFare).toBe(80);
  });
});
