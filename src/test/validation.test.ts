import { describe, expect, it } from 'vitest';
import {
  fareReportSchema,
  officialFareSchema,
  registerSchema,
  validateEvidenceFile,
} from '@/lib/validation';

describe('Input & Security Validation Schemas', () => {
  it('validates commuter registration requirements and blocks weak passwords', () => {
    const bad = registerSchema.safeParse({
      fullName: 'Juan Dela Cruz',
      email: 'juan@example.com',
      password: 'password',
      confirmPassword: 'password',
      acceptTerms: true,
    });
    expect(bad.success).toBe(false);

    const good = registerSchema.safeParse({
      fullName: 'Juan Dela Cruz',
      email: 'juan@example.com',
      password: 'Password1',
      confirmPassword: 'Password1',
      acceptTerms: true,
    });
    expect(good.success).toBe(true);
  });

  it('allows intra-municipality local fare reports and rejects invalid amounts or future dates', () => {
    const intraTown = fareReportSchema.safeParse({
      originMunicipalityId: 'lgu-calapan-city',
      destinationMunicipalityId: 'lgu-calapan-city',
      transportTypeId: 'tt-tricycle',
      farePaid: 15,
      passengerCategory: 'regular',
      travelDate: '2026-01-10',
    });
    expect(intraTown.success).toBe(true);

    const futureDate = fareReportSchema.safeParse({
      originMunicipalityId: 'lgu-calapan-city',
      destinationMunicipalityId: 'lgu-baco',
      transportTypeId: 'tt-jeepney',
      farePaid: 25,
      passengerCategory: 'student',
      travelDate: '2099-01-10',
    });
    expect(futureDate.success).toBe(false);

    const validReport = fareReportSchema.safeParse({
      originMunicipalityId: 'lgu-calapan-city',
      destinationMunicipalityId: 'lgu-baco',
      transportTypeId: 'tt-jeepney',
      farePaid: 25,
      passengerCategory: 'student',
      travelDate: '2026-01-10',
      remarks: 'Observed at Calapan Public Market terminal.',
    });
    expect(validReport.success).toBe(true);
  });

  it('requires document reference and authority for official fare publishing', () => {
    const missingRef = officialFareSchema.safeParse({
      originMunicipalityId: 'lgu-calapan-city',
      destinationMunicipalityId: 'lgu-pinamalayan',
      transportTypeId: 'tt-uv-express',
      passengerCategory: 'regular',
      fareAmount: 150,
      issuingAuthority: '',
      officialDocumentReference: '',
      effectiveDate: '2026-01-01',
    });
    expect(missingRef.success).toBe(false);

    const validOfficial = officialFareSchema.safeParse({
      originMunicipalityId: 'lgu-calapan-city',
      destinationMunicipalityId: 'lgu-pinamalayan',
      transportTypeId: 'tt-uv-express',
      passengerCategory: 'regular',
      fareAmount: 150,
      issuingAuthority: 'LTFRB Region IV-B',
      officialDocumentReference: 'MC-2026-009',
      sourceUrl: 'https://ltfrb.gov.ph/',
      effectiveDate: '2026-01-01',
    });
    expect(validOfficial.success).toBe(true);
  });

  it('rejects unsupported file types and files over 5MB for evidence uploads', () => {
    const exeFile = new File(['abc'], 'payload.exe', { type: 'application/x-msdownload' });
    expect(validateEvidenceFile(exeFile)).toContain('Unsupported file type');

    const hugeBuffer = new Uint8Array(6 * 1024 * 1024);
    const bigPng = new File([hugeBuffer], 'huge.png', { type: 'image/png' });
    expect(validateEvidenceFile(bigPng)).toContain('5 MB upload limit');

    const okJpg = new File(['image-bytes'], 'ticket.jpg', { type: 'image/jpeg' });
    expect(validateEvidenceFile(okJpg)).toBeNull();
  });
});
