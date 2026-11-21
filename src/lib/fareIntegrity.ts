import type {
  FareMatrixRow,
  FareRecord,
  FareStatus,
  PassengerCategory,
  ReportStatus,
} from '@/types/database';

export const FARE_STATUS_META: Record<
  FareStatus,
  {
    label: string;
    shortLabel: string;
    badgeClass: string;
    dotClass: string;
    description: string;
  }
> = {
  verified_official: {
    label: 'VERIFIED OFFICIAL FARE',
    shortLabel: 'Verified Official',
    badgeClass:
      'bg-emerald-600/90 text-white border border-emerald-400/70 shadow-sm',
    dotClass: 'bg-emerald-400',
    description:
      'Backed by an official LTFRB fare order, LGU ordinance, or authorized operator tariff verified by an administrator.',
  },
  community_estimate: {
    label: 'COMMUNITY ESTIMATE',
    shortLabel: 'Community Estimate',
    badgeClass:
      'bg-amber-400/90 text-[#183329] border border-amber-300 shadow-sm',
    dotClass: 'bg-amber-500',
    description:
      'Derived from reviewed commuter reports. Helpful for budgeting, but NOT an officially issued government fare.',
  },
  pending_verification: {
    label: 'PENDING VERIFICATION',
    shortLabel: 'Pending Verification',
    badgeClass:
      'bg-slate-500/80 text-white border border-slate-300/60 shadow-sm',
    dotClass: 'bg-slate-300',
    description:
      'Submitted and awaiting administrator review against official transport documents.',
  },
  rejected_or_disputed: {
    label: 'REJECTED OR DISPUTED',
    shortLabel: 'Rejected / Disputed',
    badgeClass:
      'bg-red-600/90 text-white border border-red-400/70 shadow-sm',
    dotClass: 'bg-red-400',
    description:
      'Disputed or rejected due to conflicting reports or lack of valid supporting documentation.',
  },
  archived: {
    label: 'ARCHIVED',
    shortLabel: 'Archived',
    badgeClass: 'bg-slate-700/70 text-white border border-slate-400/50',
    dotClass: 'bg-slate-400',
    description: 'Superseded historical fare record retained for audit traceability.',
  },
};

export const REPORT_STATUS_META: Record<
  ReportStatus,
  { label: string; badgeClass: string }
> = {
  pending: {
    label: 'Pending',
    badgeClass: 'bg-slate-500/85 text-white border border-slate-300/60',
  },
  under_review: {
    label: 'Under Review',
    badgeClass: 'bg-sky-600/85 text-white border border-sky-300/60',
  },
  approved_community_estimate: {
    label: 'Approved as Community Estimate',
    badgeClass: 'bg-amber-400/90 text-[#183329] border border-amber-300',
  },
  verified_official: {
    label: 'Verified Official',
    badgeClass: 'bg-emerald-600/90 text-white border border-emerald-400/60',
  },
  rejected: {
    label: 'Rejected',
    badgeClass: 'bg-red-600/90 text-white border border-red-400/60',
  },
  disputed: {
    label: 'Disputed',
    badgeClass: 'bg-rose-700/90 text-white border border-rose-400/60',
  },
};

export const PASSENGER_CATEGORY_LABELS: Record<PassengerCategory, string> = {
  regular: 'Regular',
  student: 'Student',
  senior_citizen: 'Senior Citizen',
  pwd: 'Person with Disability (PWD)',
};

/**
 * Strictly separates verified official fares from community estimates.
 * Never promotes a community estimate into an official fare and never
 * invents a fare from distance.
 */
export function partitionFareRecords(records: FareRecord[]) {
  const active = records.filter((r) => !r.is_archived && !r.is_test_fixture);
  const officialFares = active.filter((r) => r.status === 'verified_official');
  const communityEstimates = active.filter(
    (r) => r.status === 'community_estimate'
  );
  const pendingOrDisputed = active.filter(
    (r) =>
      r.status === 'pending_verification' || r.status === 'rejected_or_disputed'
  );

  return {
    officialFares,
    communityEstimates,
    pendingOrDisputed,
  };
}

/**
 * Consolidates individual passenger-category fare rows into Fare Matrix rows
 * while strictly keeping distinct statuses separate (never merging community
 * estimates into official fare rows).
 */
export function buildFareMatrixRows(records: FareRecord[]): FareMatrixRow[] {
  const grouped = new Map<string, FareMatrixRow>();

  for (const r of records) {
    if (r.is_archived || r.is_test_fixture) continue;

    const originName = r.origin?.name ?? r.origin_municipality_id;
    const destinationName = r.destination?.name ?? r.destination_municipality_id;
    const transportTypeName = r.transport_type?.name ?? r.transport_type_id;

    const key = [
      r.origin_municipality_id,
      r.destination_municipality_id,
      r.transport_type_id,
      r.status,
    ].join('::');

    const existing = grouped.get(key) ?? {
      key,
      originId: r.origin_municipality_id,
      originName,
      destinationId: r.destination_municipality_id,
      destinationName,
      transportTypeId: r.transport_type_id,
      transportTypeName,
      status: r.status,
      regularFare: null,
      studentFare: null,
      seniorFare: null,
      pwdFare: null,
      issuingAuthority: r.issuing_authority,
      officialDocumentReference: r.official_document_reference,
      sourceUrl: r.source_url,
      lastVerifiedAt: r.last_verified_at,
      updatedAt: r.updated_at,
      primaryRecordId: r.id,
    };

    if (r.passenger_category === 'regular') existing.regularFare = r.fare_amount;
    if (r.passenger_category === 'student') existing.studentFare = r.fare_amount;
    if (r.passenger_category === 'senior_citizen') existing.seniorFare = r.fare_amount;
    if (r.passenger_category === 'pwd') existing.pwdFare = r.fare_amount;

    if (r.last_verified_at && (!existing.lastVerifiedAt || r.last_verified_at > existing.lastVerifiedAt)) {
      existing.lastVerifiedAt = r.last_verified_at;
    }
    if (r.updated_at > existing.updatedAt) {
      existing.updatedAt = r.updated_at;
    }

    grouped.set(key, existing);
  }

  return Array.from(grouped.values()).sort((a, b) =>
    a.originName.localeCompare(b.originName) ||
    a.destinationName.localeCompare(b.destinationName)
  );
}

/**
 * Validates that an official fare payload satisfies regulatory source rules
 * before submission.
 */
export function hasValidOfficialSource(input: {
  issuingAuthority?: string | null;
  officialDocumentReference?: string | null;
  effectiveDate?: string | null;
}): boolean {
  return Boolean(
    input.issuingAuthority?.trim() &&
      input.officialDocumentReference?.trim() &&
      input.officialDocumentReference.trim().length >= 3 &&
      input.effectiveDate?.trim()
  );
}
