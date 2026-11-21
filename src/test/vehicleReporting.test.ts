import { describe, expect, it } from 'vitest';
import {
  ALL_COMPLAINT_STATUSES,
  VIOLATION_CATEGORIES,
  buildComplaintSummaryText,
  normalizePlateNumber,
  recommendAgenciesForReport,
} from '@/lib/vehicleReporting';
import { validateVehicleEvidenceFile, vehicleReportSchema } from '@/lib/validation';
import { VERIFIED_GOVERNMENT_AGENCIES_FALLBACK } from '@/data/orientalMindoro';
import type { VehicleReport } from '@/types/database';

describe('Vehicle Reporting Logic & Agency Routing', () => {
  it('normalizes plate numbers consistently in uppercase with single spaces', () => {
    expect(normalizePlateNumber('  abc   1234 ')).toBe('ABC 1234');
    expect(normalizePlateNumber('orm-402')).toBe('ORM-402');
    expect(normalizePlateNumber('  vab\t987 ')).toBe('VAB 987');
  });

  it('routes Tricycle complaints to Municipal / City LGU as primary authority', () => {
    const recs = recommendAgenciesForReport({
      vehicleType: 'Tricycle',
      selectedCategories: ['Overcharging'],
      agencies: VERIFIED_GOVERNMENT_AGENCIES_FALLBACK,
    });
    expect(recs.length).toBeGreaterThanOrEqual(1);
    expect(recs[0].agency.agency_code).toBe('lgu_ormindoro');
    expect(recs[0].priority).toBe('primary');
  });

  it('routes Jeepney overcharging to LTFRB as primary authority', () => {
    const recs = recommendAgenciesForReport({
      vehicleType: 'Jeepney',
      selectedCategories: ['Overcharging', 'Refusal to honor applicable passenger discounts'],
      agencies: VERIFIED_GOVERNMENT_AGENCIES_FALLBACK,
    });
    expect(recs[0].agency.agency_code).toBe('ltfrb');
    expect(recs[0].priority).toBe('primary');
  });

  it('routes reckless driving and verbal harassment to LTO and PNP HPG', () => {
    const recs = recommendAgenciesForReport({
      vehicleType: 'Bus',
      selectedCategories: ['Reckless driving', 'Verbal harassment'],
      agencies: VERIFIED_GOVERNMENT_AGENCIES_FALLBACK,
    });
    const codes = recs.map((r) => r.agency.agency_code);
    expect(codes).toContain('lto');
    expect(codes).toContain('pnp_hpg');
    expect(recs[0].agency.agency_code).toBe('lto');
    expect(recs[0].priority).toBe('primary');
  });

  it('provides full complaint status workflow & categorized violation taxonomy', () => {
    expect(ALL_COMPLAINT_STATUSES).toHaveLength(12);
    expect(ALL_COMPLAINT_STATUSES).toContain('Submitted to Pamasahe Tracker');
    expect(ALL_COMPLAINT_STATUSES).toContain('Acknowledged by Agency');
    expect(ALL_COMPLAINT_STATUSES).toContain('Under Agency Investigation');
    expect(VIOLATION_CATEGORIES.map((g) => g.group)).toEqual([
      'FARE VIOLATIONS',
      'DRIVER BEHAVIOR',
      'VEHICLE SAFETY',
      'TRANSPORTATION REGULATIONS',
      'OTHER',
    ]);
  });

  it('generates structured complaint summary packet with independent disclaimer and plate status', () => {
    const mockReport: VehicleReport = {
      id: 'rep-1',
      reference_number: 'PT-OM-2026-000105',
      user_id: 'user-1',
      plate_number: 'ORM 402',
      plate_not_available: false,
      vehicle_type: 'Jeepney',
      body_number: 'BODY-12',
      vehicle_color: 'Green and White',
      vehicle_model: 'Sarao',
      operator_name: null,
      route_info: 'Calapan - Naujan',
      origin_municipality_id: null,
      destination_municipality_id: null,
      municipality_id: 'calapan',
      incident_location: 'Calapan City Public Market',
      incident_latitude: 13.412,
      incident_longitude: 121.179,
      incident_date: '2026-11-20',
      incident_time: '08:30',
      description: 'Driver charged PHP 50 instead of the verified PHP 25 minimum corridor fare.',
      actual_fare: 50,
      expected_fare: 25,
      additional_remarks: 'Ticket not issued.',
      is_confidential_identity: true,
      external_share_consent: false,
      submission_idempotency_key: 'key-123',
      is_duplicate_flagged: false,
      complaint_status: 'Submitted to Pamasahe Tracker',
      assigned_admin_id: null,
      admin_remarks: null,
      created_at: '2026-11-20T09:00:00Z',
      updated_at: '2026-11-20T09:00:00Z',
      categories: [
        {
          id: 'cat-1',
          report_id: 'rep-1',
          category_group: 'FARE VIOLATIONS',
          category: 'Overcharging',
          created_at: '2026-11-20T09:00:00Z',
        },
      ],
      evidence: [
        {
          id: 'ev-1',
          report_id: 'rep-1',
          storage_path: 'user-1/rep-1/plate.jpg',
          evidence_type: 'license_plate_photo',
          file_type: 'image/jpeg',
          file_size_bytes: 102400,
          original_filename: 'plate.jpg',
          uploaded_by: 'user-1',
          created_at: '2026-11-20T09:00:00Z',
        },
      ],
    };

    const recs = recommendAgenciesForReport({
      vehicleType: mockReport.vehicle_type,
      selectedCategories: ['Overcharging'],
      agencies: VERIFIED_GOVERNMENT_AGENCIES_FALLBACK,
    });
    const text = buildComplaintSummaryText(mockReport, recs);
    expect(text).toContain('Reference Number: PT-OM-2026-000105');
    expect(text).toContain('ORM 402');
    expect(text).toContain('does NOT\nautomatically file an official case');
    expect(text).toContain('LTFRB');
    expect(text).toContain('plate.jpg');
  });
});

describe('Vehicle Evidence File Validation & Schema Rules', () => {
  it('accepts valid images up to 5 MB and MP4 videos up to 25 MB, while rejecting oversized or invalid files', () => {
    const validJpg = new File([new Uint8Array(1024)], 'plate.jpg', { type: 'image/jpeg' });
    const validWebp = new File([new Uint8Array(1024)], 'bus.webp', { type: 'image/webp' });
    const validMp4 = new File([new Uint8Array(1024)], 'dashcam.mp4', { type: 'video/mp4' });
    const oversizedImg = new File(['x'], 'big.png', { type: 'image/png' });
    Object.defineProperty(oversizedImg, 'size', { value: 6 * 1024 * 1024 });
    const oversizedMp4 = new File(['x'], 'huge.mp4', { type: 'video/mp4' });
    Object.defineProperty(oversizedMp4, 'size', { value: 26 * 1024 * 1024 });
    const pdfFile = new File(['%PDF'], 'scan.pdf', { type: 'application/pdf' });
    const exeFile = new File(['MZ'], 'payload.exe', { type: 'application/x-msdownload' });

    expect(validateVehicleEvidenceFile(validJpg)).toBeNull();
    expect(validateVehicleEvidenceFile(validWebp)).toBeNull();
    expect(validateVehicleEvidenceFile(validMp4)).toBeNull();
    expect(validateVehicleEvidenceFile(oversizedImg)).toContain('5 MB image');
    expect(validateVehicleEvidenceFile(oversizedMp4)).toContain('25 MB video');
    expect(validateVehicleEvidenceFile(pdfFile)).toContain('Unsupported file type');
    expect(validateVehicleEvidenceFile(exeFile)).toContain('Unsupported file type');
  });

  it('requires vehicle plate number unless plateNotAvailable is true and rejects future incident dates', () => {
    const baseValid = {
      plateNotAvailable: false,
      plateNumber: 'ABC 1234',
      vehicleType: 'Jeepney' as const,
      municipalityId: 'calapan',
      incidentLocation: 'Calapan Public Market',
      incidentDate: new Date().toISOString().slice(0, 10),
      description: 'Jeepney driver refused to honor 20% student discount and demanded full fare.',
    };

    expect(vehicleReportSchema.safeParse(baseValid).success).toBe(true);

    const missingPlate = vehicleReportSchema.safeParse({
      ...baseValid,
      plateNumber: '',
      plateNotAvailable: false,
    });
    expect(missingPlate.success).toBe(false);

    const plateNotAvailable = vehicleReportSchema.safeParse({
      ...baseValid,
      plateNumber: '',
      plateNotAvailable: true,
    });
    expect(plateNotAvailable.success).toBe(true);

    const futureDate = new Date();
    futureDate.setDate(futureDate.getDate() + 10);
    const futureIncident = vehicleReportSchema.safeParse({
      ...baseValid,
      incidentDate: futureDate.toISOString().slice(0, 10),
    });
    expect(futureIncident.success).toBe(false);
  });
});
