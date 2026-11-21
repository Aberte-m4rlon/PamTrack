import { z } from 'zod';

export const ALLOWED_EVIDENCE_MIME_TYPES = [
  'image/jpeg',
  'image/png',
  'image/webp',
  'application/pdf',
] as const;

export const MAX_EVIDENCE_FILE_BYTES = 5 * 1024 * 1024; // 5 MB

export const loginSchema = z.object({
  email: z.string().trim().email('Please enter a valid email address.'),
  password: z.string().min(8, 'Password must be at least 8 characters.'),
});

export const registerSchema = z
  .object({
    fullName: z.string().trim().min(2, 'Full name must be at least 2 characters.').max(120),
    email: z.string().trim().email('Please enter a valid email address.'),
    homeMunicipalityId: z.string().optional(),
    password: z
      .string()
      .min(8, 'Password must be at least 8 characters.')
      .regex(/[A-Z]/, 'Include at least one uppercase letter.')
      .regex(/[0-9]/, 'Include at least one number.'),
    confirmPassword: z.string(),
    acceptTerms: z.literal(true, {
      errorMap: () => ({ message: 'You must agree to the Terms and Privacy Policy.' }),
    }),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: 'Passwords do not match.',
    path: ['confirmPassword'],
  });

export const fareReportSchema = z.object({
  originMunicipalityId: z.string().min(1, 'Select an origin municipality.'),
  destinationMunicipalityId: z.string().min(1, 'Select a destination municipality.'),
  transportTypeId: z.string().min(1, 'Select a transportation type.'),
  farePaid: z.coerce
    .number({ invalid_type_error: 'Enter the fare amount paid.' })
    .positive('Fare paid must be greater than zero.')
    .max(50000, 'Fare amount exceeds realistic provincial threshold.'),
  passengerCategory: z.enum(['regular', 'student', 'senior_citizen', 'pwd']),
  travelDate: z
    .string()
    .min(1, 'Travel date is required.')
    .refine((dateStr) => {
      const chosen = new Date(dateStr);
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      return !Number.isNaN(chosen.getTime()) && chosen <= tomorrow;
    }, 'Travel date cannot be in the future.'),
  operatorOrVehicleDetails: z.string().trim().max(240).optional(),
  remarks: z.string().trim().max(1000).optional(),
});

export const officialFareSchema = z.object({
  originMunicipalityId: z.string().min(1, 'Origin is required.'),
  destinationMunicipalityId: z.string().min(1, 'Destination is required.'),
  transportTypeId: z.string().min(1, 'Transport type is required.'),
  passengerCategory: z.enum(['regular', 'student', 'senior_citizen', 'pwd']),
  fareAmount: z.coerce.number().positive('Fare amount must be greater than zero.').max(50000),
  issuingAuthority: z
    .string()
    .trim()
    .min(2, 'Issuing authority (e.g., LTFRB Region IV-B or Municipal LGU) is required.'),
  officialDocumentReference: z
    .string()
    .trim()
    .min(3, 'Official document / memorandum reference is required.'),
  sourceUrl: z
    .string()
    .trim()
    .url('Enter a valid https:// or http:// URL.')
    .optional()
    .or(z.literal('')),
  effectiveDate: z.string().min(1, 'Effective date is required.'),
  routeId: z.string().optional(),
  notes: z.string().trim().max(1000).optional(),
});

export const routeFormSchema = z
  .object({
    routeCode: z.string().trim().min(3, 'Route code is required.').max(50),
    routeName: z.string().trim().min(4, 'Route name is required.').max(150),
    originMunicipalityId: z.string().min(1, 'Origin is required.'),
    destinationMunicipalityId: z.string().min(1, 'Destination is required.'),
    transportTypeId: z.string().min(1, 'Transport type is required.'),
    operatorId: z.string().optional(),
    distanceKm: z.coerce.number().positive().optional().or(z.literal('')),
    estimatedDurationMin: z.coerce.number().int().positive().optional().or(z.literal('')),
    operatingNotes: z.string().trim().max(500).optional(),
  })
  .refine((d) => d.originMunicipalityId !== d.destinationMunicipalityId, {
    message: 'Origin and destination must differ.',
    path: ['destinationMunicipalityId'],
  });

export function validateEvidenceFile(file: File): string | null {
  if (!ALLOWED_EVIDENCE_MIME_TYPES.includes(file.type as (typeof ALLOWED_EVIDENCE_MIME_TYPES)[number])) {
    return `Unsupported file type "${file.type}". Allowed: JPG, PNG, WebP, or PDF.`;
  }
  if (file.size > MAX_EVIDENCE_FILE_BYTES) {
    return `File "${file.name}" exceeds the 5 MB upload limit.`;
  }
  return null;
}

export const ALLOWED_VEHICLE_EVIDENCE_MIME_TYPES = [
  'image/jpeg',
  'image/png',
  'image/webp',
  'video/mp4',
] as const;

export const MAX_VEHICLE_IMAGE_BYTES = 5 * 1024 * 1024; // 5 MB
export const MAX_VEHICLE_VIDEO_BYTES = 25 * 1024 * 1024; // 25 MB

export function validateVehicleEvidenceFile(file: File): string | null {
  if (
    !ALLOWED_VEHICLE_EVIDENCE_MIME_TYPES.includes(
      file.type as (typeof ALLOWED_VEHICLE_EVIDENCE_MIME_TYPES)[number]
    )
  ) {
    return `Unsupported file type "${file.type}". Allowed: JPG, JPEG, PNG, WEBP, or MP4.`;
  }
  const maxBytes =
    file.type === 'video/mp4' ? MAX_VEHICLE_VIDEO_BYTES : MAX_VEHICLE_IMAGE_BYTES;
  if (file.size > maxBytes) {
    return `File "${file.name}" exceeds the ${
      file.type === 'video/mp4' ? '25 MB video' : '5 MB image'
    } upload limit.`;
  }
  return null;
}

export const vehicleReportSchema = z
  .object({
    plateNotAvailable: z.boolean().default(false),
    plateNumber: z.string().trim().max(24).optional(),
    vehicleType: z.enum([
      'Jeepney',
      'Modern Jeepney',
      'Tricycle',
      'Bus',
      'UV Express',
      'Multicab',
      'Taxi',
      'Other Public Utility Vehicle',
    ]),
    bodyNumber: z.string().trim().max(40).optional(),
    vehicleColor: z.string().trim().max(40).optional(),
    vehicleModel: z.string().trim().max(80).optional(),
    operatorName: z.string().trim().max(120).optional(),
    routeInfo: z.string().trim().max(160).optional(),
    originMunicipalityId: z.string().optional(),
    destinationMunicipalityId: z.string().optional(),
    municipalityId: z.string().min(1, 'Select the municipality where the incident occurred.'),
    incidentLocation: z
      .string()
      .trim()
      .min(3, 'Provide the specific street, barangay, terminal, or landmark.'),
    incidentDate: z
      .string()
      .min(1, 'Incident date is required.')
      .refine((dateStr) => {
        const chosen = new Date(dateStr);
        const tomorrow = new Date();
        tomorrow.setDate(tomorrow.getDate() + 1);
        return !Number.isNaN(chosen.getTime()) && chosen <= tomorrow;
      }, 'Incident date cannot be in the future.'),
    incidentTime: z.string().optional(),
    description: z
      .string()
      .trim()
      .min(15, 'Describe the reported incident in at least 15 characters.')
      .max(2500),
    actualFare: z.coerce
      .number()
      .nonnegative('Actual fare cannot be negative.')
      .max(50000)
      .optional()
      .or(z.literal('')),
    additionalRemarks: z.string().trim().max(1000).optional(),
    isConfidentialIdentity: z.boolean().default(false),
    externalShareConsent: z.boolean().default(false),
  })
  .superRefine((data, ctx) => {
    if (!data.plateNotAvailable) {
      const cleaned = (data.plateNumber ?? '').trim();
      if (cleaned.length < 2 || !/^[A-Za-z0-9\-\s]+$/.test(cleaned)) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ['plateNumber'],
          message:
            'Enter a valid vehicle plate number (letters/numbers) or check "Plate Number Not Available".',
        });
      }
    }
  });
