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
      'bg-[#16A34A]/92 text-white border border-white/50 shadow-sm',
    dotClass: 'bg-[#16A34A]',
    description:
      'Backed by an official LTFRB fare order, LGU ordinance, or authorized operator tariff verified by an administrator.',
  },
  community_estimate: {
    label: 'COMMUNITY ESTIMATE',
    shortLabel: 'Community Estimate',
    badgeClass:
      'bg-gradient-to-b from-amber-300/95 to-amber-400/95 text-[#24191D] border border-white/80 shadow-sm',
    dotClass: 'bg-amber-500',
    description:
      'Derived from reviewed commuter reports. Helpful for budgeting, but NOT an officially issued government fare.',
  },
  pending_verification: {
    label: 'PENDING VERIFICATION',
    shortLabel: 'Pending Verification',
    badgeClass:
      'bg-stone-600/85 text-white border border-white/45 shadow-sm',
    dotClass: 'bg-stone-300',
    description:
      'Submitted and awaiting administrator review against official transport documents.',
  },
  rejected_or_disputed: {
    label: 'REJECTED OR DISPUTED',
    shortLabel: 'Rejected / Disputed',
    badgeClass:
      'bg-gradient-to-b from-[#EF4444] to-[#B91C1C] text-white border border-white/45 shadow-sm',
    dotClass: 'bg-[#DC2626]',
    description:
      'Disputed or rejected due to conflicting reports or lack of valid supporting documentation.',
  },
  archived: {
    label: 'ARCHIVED',
    shortLabel: 'Archived',
    badgeClass: 'bg-stone-700/80 text-white border border-white/40',
    dotClass: 'bg-stone-400',
    description: 'Superseded historical fare record retained for audit traceability.',
  },
};

export const REPORT_STATUS_META: Record<
  ReportStatus,
  { label: string; badgeClass: string }
> = {
  pending: {
    label: 'Pending',
    badgeClass: 'bg-stone-600/85 text-white border border-white/45 shadow-sm',
  },
  under_review: {
    label: 'Under Review',
    badgeClass: 'bg-[#2563EB]/92 text-white border border-white/45 shadow-sm',
  },
  approved_community_estimate: {
    label: 'Approved as Community Estimate',
    badgeClass: 'bg-gradient-to-b from-amber-300/95 to-amber-400/95 text-[#24191D] border border-white/80 shadow-sm',
  },
  verified_official: {
    label: 'Verified Official',
    badgeClass: 'bg-[#16A34A]/92 text-white border border-white/45 shadow-sm',
  },
  rejected: {
    label: 'Rejected',
    badgeClass: 'bg-gradient-to-b from-[#EF4444] to-[#B91C1C] text-white border border-white/45 shadow-sm',
  },
  disputed: {
    label: 'Disputed',
    badgeClass: 'bg-[#B91C1C]/95 text-white border border-white/45 shadow-sm',
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
