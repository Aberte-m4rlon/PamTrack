import { z } from 'zod';

export const ALLOWED_EVIDENCE_MIME_TYPES = [
  'image/jpeg',
  'image/png',
  'image/webp',
  'application/pdf',
] as const;

export const MAX_EVIDENCE_FILE_BYTES = 5 * 1024 * 1024; // 5 MB

export const loginSchema = z.object({
  email: z.string().trim().email('Maglagay ng tamang email address.'),
  password: z.string().min(8, 'Dapat ay may 8 characters o higit pa ang password.'),
});

export const registerSchema = z
  .object({
    fullName: z.string().trim().min(2, 'Ilagay ang iyong buong pangalan (min 2 characters).').max(120),
    email: z.string().trim().email('Maglagay ng tamang email address.'),
    homeMunicipalityId: z.string().optional(),
    password: z
      .string()
      .min(8, 'Dapat ay may 8 characters o higit pa ang password.')
      .regex(/[A-Z]/, 'Maglagay ng kahit isang malaking letra (uppercase).')
      .regex(/[0-9]/, 'Maglagay ng kahit isang numero.'),
    confirmPassword: z.string(),
    acceptTerms: z.literal(true, {
      errorMap: () => ({ message: 'Kailangang kumpirmahin ang Terms at Privacy Policy.' }),
    }),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: 'Hindi magkatugma ang mga password.',
    path: ['confirmPassword'],
  });

export const fareReportSchema = z.object({
  originMunicipalityId: z.string().min(1, 'Piliin kung saan nanggaling.'),
  destinationMunicipalityId: z.string().min(1, 'Piliin kung saan papunta.'),
  transportTypeId: z.string().min(1, 'Piliin ang uri ng sasakyan.'),
  farePaid: z.coerce
    .number({ invalid_type_error: 'Ilagay ang halaga ng pamasaheng binayaran.' })
    .positive('Ang pamasahe ay dapat higit sa zero.')
    .max(50000, 'Sobrang taas ng halaga para sa lokal na biyahe.'),
  passengerCategory: z.enum(['regular', 'student', 'senior_citizen', 'pwd']),
  travelDate: z
    .string()
    .min(1, 'Kailangan ang petsa ng biyahe.')
    .refine((dateStr) => {
      const chosen = new Date(dateStr);
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      return !Number.isNaN(chosen.getTime()) && chosen <= tomorrow;
    }, 'Hindi pwedeng sa hinaharap ang petsa ng biyahe.'),
  operatorOrVehicleDetails: z.string().trim().max(240).optional(),
  remarks: z.string().trim().max(1000).optional(),
});

export const officialFareSchema = z.object({
  originMunicipalityId: z.string().min(1, 'Kailangan ang pinanggalingan.'),
  destinationMunicipalityId: z.string().min(1, 'Kailangan ang pupuntahan.'),
  transportTypeId: z.string().min(1, 'Kailangan ang uri ng sasakyan.'),
  passengerCategory: z.enum(['regular', 'student', 'senior_citizen', 'pwd']),
  fareAmount: z.coerce.number().positive('Ang pamasahe ay dapat higit sa zero.').max(50000),
  issuingAuthority: z
    .string()
    .trim()
    .min(2, 'Kailangan ilagay kung aling ahensya (hal. LTFRB Region IV-B o LGU).'),
  officialDocumentReference: z
    .string()
    .trim()
    .min(3, 'Kailangan ang reference number ng opisyal na dokumento.'),
  sourceUrl: z
    .string()
    .trim()
    .url('Maglagay ng tamang https:// o http:// URL.')
    .optional()
    .or(z.literal('')),
  effectiveDate: z.string().min(1, 'Kailangan ang petsa kung kailan nagsimula.'),
  routeId: z.string().optional(),
  notes: z.string().trim().max(1000).optional(),
});

export const routeFormSchema = z
  .object({
    routeCode: z.string().trim().min(3, 'Kailangan ang route code.').max(50),
    routeName: z.string().trim().min(4, 'Kailangan ang pangalan ng ruta.').max(150),
    originMunicipalityId: z.string().min(1, 'Kailangan ang pinanggalingan.'),
    destinationMunicipalityId: z.string().min(1, 'Kailangan ang pupuntahan.'),
    transportTypeId: z.string().min(1, 'Kailangan ang uri ng sasakyan.'),
    operatorId: z.string().optional(),
    distanceKm: z.coerce.number().positive().optional().or(z.literal('')),
    estimatedDurationMin: z.coerce.number().int().positive().optional().or(z.literal('')),
    operatingNotes: z.string().trim().max(500).optional(),
  })
  .refine((d) => d.originMunicipalityId !== d.destinationMunicipalityId, {
    message: 'Dapat magkaiba ang pinanggalingan at pupuntahan.',
    path: ['destinationMunicipalityId'],
  });

export function validateEvidenceFile(file: File): string | null {
  if (!ALLOWED_EVIDENCE_MIME_TYPES.includes(file.type as (typeof ALLOWED_EVIDENCE_MIME_TYPES)[number])) {
    return `Hindi supported ang file na "${file.type}". Pwede lang: JPG, PNG, WebP, o PDF.`;
  }
  if (file.size > MAX_EVIDENCE_FILE_BYTES) {
    return `Lumampas sa 5 MB ang file na "${file.name}".`;
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
