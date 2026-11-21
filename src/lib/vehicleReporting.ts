import type {
  ComplaintStatus,
  GovernmentAgency,
  VehicleEvidenceType,
  VehicleReport,
  VehicleTypeOption,
  ViolationCategoryGroup,
} from '@/types/database';

export const VEHICLE_TYPE_OPTIONS: VehicleTypeOption[] = [
  'Jeepney',
  'Modern Jeepney',
  'Tricycle',
  'Bus',
  'UV Express',
  'Multicab',
  'Taxi',
  'Other Public Utility Vehicle',
];

export const VIOLATION_CATEGORIES: Array<{
  group: ViolationCategoryGroup;
  items: string[];
}> = [
  {
    group: 'FARE VIOLATIONS',
    items: [
      'Overcharging',
      'Charging an incorrect fare',
      'Refusal to honor applicable passenger discounts',
      'Unreasonable additional charges',
    ],
  },
  {
    group: 'DRIVER BEHAVIOR',
    items: [
      'Reckless driving',
      'Dangerous overtaking',
      'Distracted driving',
      'Verbal harassment',
      'Passenger discrimination',
      'Refusal to provide service',
      'Other inappropriate behavior',
    ],
  },
  {
    group: 'VEHICLE SAFETY',
    items: [
      'Overloading',
      'Unsafe vehicle condition',
      'Defective vehicle equipment',
      'Dangerous passenger loading or unloading',
      'Suspected lack of required safety equipment',
    ],
  },
  {
    group: 'TRANSPORTATION REGULATIONS',
    items: [
      'Suspected unauthorized route',
      'Suspected unauthorized operation',
      'Route violations',
      'Other transportation-related complaints',
    ],
  },
  {
    group: 'OTHER',
    items: ['Lost belongings', 'Passenger disputes', 'Other incidents'],
  },
];

export const VEHICLE_EVIDENCE_TYPE_LABELS: Record<VehicleEvidenceType, string> = {
  vehicle_photo: 'Vehicle Photo',
  license_plate_photo: 'License Plate Photo',
  video_recording: 'Video Recording',
  receipt: 'Receipt / Ticket',
  other_document: 'Other Supporting Document',
};

export const ALL_COMPLAINT_STATUSES: ComplaintStatus[] = [
  'Draft',
  'Submitted to Pamasahe Tracker',
  'Pending Initial Review',
  'Under Review',
  'Additional Information Required',
  'Referred to Appropriate Agency',
  'Acknowledged by Agency',
  'Under Agency Investigation',
  'Resolved',
  'Closed',
  'Rejected',
  'Withdrawn',
];

export const COMPLAINT_STATUS_META: Record<
  ComplaintStatus,
  { badgeClass: string; isExternalAgencyStage: boolean }
> = {
  Draft: {
    badgeClass: 'bg-slate-200 text-slate-800 border border-slate-300',
    isExternalAgencyStage: false,
  },
  'Submitted to Pamasahe Tracker': {
    badgeClass: 'bg-sky-100 text-sky-900 border border-sky-300',
    isExternalAgencyStage: false,
  },
  'Pending Initial Review': {
    badgeClass: 'bg-amber-100 text-amber-900 border border-amber-300',
    isExternalAgencyStage: false,
  },
  'Under Review': {
    badgeClass: 'bg-indigo-100 text-indigo-900 border border-indigo-300',
    isExternalAgencyStage: false,
  },
  'Additional Information Required': {
    badgeClass: 'bg-orange-100 text-orange-900 border border-orange-300',
    isExternalAgencyStage: false,
  },
  'Referred to Appropriate Agency': {
    badgeClass: 'bg-teal-100 text-teal-900 border border-teal-300',
    isExternalAgencyStage: true,
  },
  'Acknowledged by Agency': {
    badgeClass: 'bg-emerald-100 text-emerald-900 border border-emerald-400',
    isExternalAgencyStage: true,
  },
  'Under Agency Investigation': {
    badgeClass: 'bg-emerald-600 text-white border border-emerald-400',
    isExternalAgencyStage: true,
  },
  Resolved: {
    badgeClass: 'bg-[#176B4B] text-white border border-emerald-400',
    isExternalAgencyStage: false,
  },
  Closed: {
    badgeClass: 'bg-slate-600 text-white border border-slate-400',
    isExternalAgencyStage: false,
  },
  Rejected: {
    badgeClass: 'bg-red-100 text-red-900 border border-red-300',
    isExternalAgencyStage: false,
  },
  Withdrawn: {
    badgeClass: 'bg-slate-300 text-slate-700 border border-slate-400',
    isExternalAgencyStage: false,
  },
};

export function normalizePlateNumber(raw: string): string {
  return raw.trim().toUpperCase().replace(/\s+/g, ' ');
}

export interface AgencyRecommendation {
  agency: GovernmentAgency;
  priority: 'primary' | 'secondary';
  reasons: string[];
}

/**
 * Smart Agency Routing Engine:
 * Recommends appropriate official authorities based on vehicle category,
 * selected alleged violation categories, and Oriental Mindoro jurisdiction.
 * Never automatically transmits reports externally without explicit user consent.
 */
export function recommendAgenciesForReport(input: {
  vehicleType: VehicleTypeOption;
  selectedCategories: string[];
  agencies: GovernmentAgency[];
}): AgencyRecommendation[] {
  const active = input.agencies.filter((a) => a.is_active);
  const byCode = new Map(active.map((a) => [a.agency_code, a]));

  const cats = new Set(input.selectedCategories);
  const recommendations: AgencyRecommendation[] = [];

  const hasFareOrRouteConcern =
    cats.has('Overcharging') ||
    cats.has('Charging an incorrect fare') ||
    cats.has('Refusal to honor applicable passenger discounts') ||
    cats.has('Unreasonable additional charges') ||
    cats.has('Suspected unauthorized route') ||
    cats.has('Suspected unauthorized operation') ||
    cats.has('Route violations') ||
    cats.has('Refusal to provide service');

  const hasSafetyOrDrivingConcern =
    cats.has('Reckless driving') ||
    cats.has('Dangerous overtaking') ||
    cats.has('Distracted driving') ||
    cats.has('Overloading') ||
    cats.has('Unsafe vehicle condition') ||
    cats.has('Defective vehicle equipment') ||
    cats.has('Dangerous passenger loading or unloading') ||
    cats.has('Suspected lack of required safety equipment');

  const hasHarassmentOrUrgentConcern =
    cats.has('Verbal harassment') ||
    cats.has('Passenger discrimination') ||
    cats.has('Other inappropriate behavior') ||
    cats.has('Reckless driving') ||
    cats.has('Dangerous overtaking');

  if (input.vehicleType === 'Tricycle') {
    const lgu = byCode.get('lgu_ormindoro');
    if (lgu) {
      recommendations.push({
        agency: lgu,
        priority: 'primary',
        reasons: [
          'Municipal tricycle franchises and local fare ordinances in Oriental Mindoro fall under City/Municipal LGU jurisdiction.',
        ],
      });
    }
  } else if (hasFareOrRouteConcern) {
    const ltfrb = byCode.get('ltfrb');
    if (ltfrb) {
      recommendations.push({
        agency: ltfrb,
        priority: 'primary',
        reasons: [
          `${input.vehicleType} fare compliance, passenger discounts, and franchise/route regulations fall under LTFRB jurisdiction.`,
        ],
      });
    }
  }

  if (hasSafetyOrDrivingConcern) {
    const lto = byCode.get('lto');
    if (lto) {
      recommendations.push({
        agency: lto,
        priority: recommendations.length === 0 ? 'primary' : 'secondary',
        reasons: [
          'Driver behavior, vehicle roadworthiness, equipment defects, and registration/licensing concerns fall under LTO enforcement.',
        ],
      });
    }
  }

  if (hasHarassmentOrUrgentConcern) {
    const pnp = byCode.get('pnp_hpg');
    if (pnp) {
      recommendations.push({
        agency: pnp,
        priority: recommendations.length === 0 ? 'primary' : 'secondary',
        reasons: [
          'Urgent road safety incidents, harassment, or potential traffic-related criminal offenses can be escalated to PNP / Highway Patrol Group.',
        ],
      });
    }
  }

  // Fallback for general/other complaints on non-tricycles
  if (recommendations.length === 0) {
    const fallback =
      input.vehicleType === 'Tricycle'
        ? byCode.get('lgu_ormindoro')
        : byCode.get('ltfrb') ?? byCode.get('lgu_ormindoro');
    if (fallback) {
      recommendations.push({
        agency: fallback,
        priority: 'primary',
        reasons: ['Primary transport regulatory destination matching this vehicle category.'],
      });
    }
  }

  return recommendations;
}

export function buildComplaintSummaryText(
  report: VehicleReport,
  recommendedAgencies: AgencyRecommendation[] = []
): string {
  const categories = (report.categories ?? [])
    .map((c) => `- [${c.category_group}] ${c.category}`)
    .join('\n');
  const evidence = (report.evidence ?? [])
    .map((e) => `- ${e.original_filename} (${e.evidence_type}, ${e.file_type})`)
    .join('\n');
  const agencyLines = recommendedAgencies
    .map(
      (rec) =>
        `* ${rec.agency.agency_name} (${rec.priority.toUpperCase()})\n  Website: ${rec.agency.official_website}\n  Contact: ${rec.agency.verified_contact_information}\n  Instructions: ${rec.agency.submission_instructions}`
    )
    .join('\n\n');

  return [
    '====================================================================',
    'PAMASAHE TRACKER – ORIENTAL MINDORO',
    'REPORTED INCIDENT / ALLEGED VIOLATION SUMMARY PACKET',
    '====================================================================',
    `Reference Number: ${report.reference_number}`,
    `Internal Pamasahe Tracker Status: ${report.complaint_status}`,
    `Recorded Date: ${report.created_at}`,
    '',
    'IMPORTANT DISCLAIMER:',
    'This summary documents a commuter-submitted Reported Incident / Alleged',
    'Violation logged in Pamasahe Tracker. Submitting a report here does NOT',
    'automatically file an official case with LTFRB, LTO, PNP, or an LGU.',
    '',
    '1. REPORTED VEHICLE INFORMATION',
    `- Vehicle Type: ${report.vehicle_type}`,
    `- Plate Number: ${
      report.plate_not_available
        ? 'Plate Number Not Available'
        : report.plate_number || 'Not provided'
    }`,
    `- Body / TODA Number: ${report.body_number || 'Not provided'}`,
    `- Color / Make / Model: ${[report.vehicle_color, report.vehicle_model].filter(Boolean).join(' / ') || 'Not provided'}`,
    `- Operator / Route Info: ${[report.operator_name, report.route_info].filter(Boolean).join(' | ') || 'Not provided'}`,
    '',
    '2. INCIDENT DETAILS',
    `- Municipality / City: ${report.municipality?.name || report.municipality_id}`,
    `- Specific Location: ${report.incident_location}`,
    `- Incident Date & Time: ${report.incident_date} ${report.incident_time || ''}`,
    `- Actual Fare Paid: ${report.actual_fare !== null ? `PHP ${report.actual_fare}` : 'N/A'}`,
    `- Expected Verified Fare: ${report.expected_fare !== null ? `PHP ${report.expected_fare}` : 'N/A'}`,
    '',
    '3. ALLEGED VIOLATION CATEGORIES',
    categories || '- None selected',
    '',
    '4. INCIDENT DESCRIPTION & REMARKS',
    report.description,
    report.additional_remarks ? `\nRemarks: ${report.additional_remarks}` : '',
    '',
    '5. SUPPORTING EVIDENCE FILES (Stored Privately)',
    evidence || '- No attachments uploaded',
    '',
    '6. RECOMMENDED REPORTING AUTHORITIES & MANUAL FILING CHANNELS',
    agencyLines || '- Review the Reporting Authority Directory inside Pamasahe Tracker.',
    '====================================================================',
  ].join('\n');
}

export function downloadComplaintSummary(
  report: VehicleReport,
  recommendedAgencies: AgencyRecommendation[] = []
) {
  const content = buildComplaintSummaryText(report, recommendedAgencies);
  const blob = new Blob([content], { type: 'text/plain;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `${report.reference_number}-complaint-summary.txt`;
  a.click();
  URL.revokeObjectURL(url);
}
