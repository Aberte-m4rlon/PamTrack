import { describe, expect, it } from 'vitest';
import {
  buildFareMatrixRows,
  hasValidOfficialSource,
  partitionFareRecords,
} from '@/lib/fareIntegrity';
import type { FareRecord } from '@/types/database';

function makeFareRecord(overrides: Partial<FareRecord>): FareRecord {
  return {
    id: 'fare-1',
    route_id: null,
    origin_municipality_id: 'lgu-calapan-city',
    destination_municipality_id: 'lgu-naujan',
    transport_type_id: 'tt-jeepney',
    passenger_category: 'regular',
    fare_amount: 30,
    currency: 'PHP',
    status: 'verified_official',
    fare_source_id: null,
    issuing_authority: 'LTFRB Region IV-B',
    official_document_reference: '[TEST FIXTURE] MC-2026-TEST',
    source_url: 'https://ltfrb.gov.ph/',
    effective_date: '2026-01-01',
    last_verified_at: '2026-01-15T00:00:00Z',
    verified_by: 'admin-1',
    is_archived: false,
    is_test_fixture: false,
    notes: null,
    created_at: '2026-01-15T00:00:00Z',
    updated_at: '2026-01-15T00:00:00Z',
    origin: {
      id: 'lgu-calapan-city',
      name: 'Calapan City',
      slug: 'calapan-city',
      classification: 'component_city',
      district: '1st District',
      is_capital: true,
      psgc_code: null,
      latitude: 13.407,
      longitude: 121.1778,
      description: null,
      is_active: true,
      sort_order: 1,
    },
    destination: {
      id: 'lgu-naujan',
      name: 'Naujan',
      slug: 'naujan',
      classification: 'municipality',
      district: '1st District',
      is_capital: false,
      psgc_code: null,
      latitude: 13.3242,
      longitude: 121.303,
      description: null,
      is_active: true,
      sort_order: 5,
    },
    transport_type: {
      id: 'tt-jeepney',
      code: 'jeepney',
      name: 'Jeepney',
      description: null,
      regulatory_body: 'LTFRB Region IV-B',
      supports_statutory_discount: true,
      icon_name: 'BusFront',
      is_active: true,
      sort_order: 1,
    },
    ...overrides,
  };
}

describe('Fare Data Integrity & Separation Rules', () => {
  it('strictly separates verified official fares from community estimates and excludes archived/test fixtures', () => {
    const records: FareRecord[] = [
      makeFareRecord({ id: 'official-1', status: 'verified_official', fare_amount: 35 }),
      makeFareRecord({
        id: 'community-1',
        status: 'community_estimate',
        fare_amount: 40,
        official_document_reference: null,
      }),
      makeFareRecord({ id: 'archived-1', status: 'verified_official', is_archived: true }),
      makeFareRecord({ id: 'test-1', status: 'verified_official', is_test_fixture: true }),
    ];

    const { officialFares, communityEstimates } = partitionFareRecords(records);

    expect(officialFares).toHaveLength(1);
    expect(officialFares[0].id).toBe('official-1');
    expect(communityEstimates).toHaveLength(1);
    expect(communityEstimates[0].id).toBe('community-1');
  });

  it('keeps official and community rows separate in the Fare Matrix consolidation', () => {
    const records: FareRecord[] = [
      makeFareRecord({
        id: 'off-reg',
        status: 'verified_official',
        passenger_category: 'regular',
        fare_amount: 35,
      }),
      makeFareRecord({
        id: 'off-stu',
        status: 'verified_official',
        passenger_category: 'student',
        fare_amount: 28,
      }),
      makeFareRecord({
        id: 'comm-reg',
        status: 'community_estimate',
        passenger_category: 'regular',
        fare_amount: 40,
        official_document_reference: null,
      }),
    ];

    const rows = buildFareMatrixRows(records);
    expect(rows).toHaveLength(2);

    const officialRow = rows.find((r) => r.status === 'verified_official');
    const communityRow = rows.find((r) => r.status === 'community_estimate');

    expect(officialRow?.regularFare).toBe(35);
    expect(officialRow?.studentFare).toBe(28);
    expect(communityRow?.regularFare).toBe(40);
    expect(communityRow?.studentFare).toBeNull();
  });

  it('requires valid official authority, document reference, and effective date before publishing official fare', () => {
    expect(
      hasValidOfficialSource({
        issuingAuthority: '',
        officialDocumentReference: 'MC-2026-01',
        effectiveDate: '2026-01-01',
      })
    ).toBe(false);

    expect(
      hasValidOfficialSource({
        issuingAuthority: 'LTFRB Region IV-B',
        officialDocumentReference: 'A',
        effectiveDate: '2026-01-01',
      })
    ).toBe(false);

    expect(
      hasValidOfficialSource({
        issuingAuthority: 'LTFRB Region IV-B',
        officialDocumentReference: 'LTFRB MC 2026-004',
        effectiveDate: '2026-02-01',
      })
    ).toBe(true);
  });
});
