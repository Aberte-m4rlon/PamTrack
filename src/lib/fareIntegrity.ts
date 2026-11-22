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
      'bg-gradient-to-b from-[#C9182B]/90 to-[#B51224]/95 text-white border border-white/65 shadow-[inset_0_1px_1px_rgba(255,255,255,0.72),0_4px_12px_rgba(181,18,36,0.22)]',
    dotClass: 'bg-[#C9182B]',
    description:
      'Backed by an official LTFRB order, LGU ordinance, or authorized tariff.',
  },
  community_estimate: {
    label: 'COMMUNITY ESTIMATE',
    shortLabel: 'Community Estimate',
    badgeClass:
      'bg-[#F7F3EF]/85 text-[#B51224] border border-[#E9E5E8] shadow-[inset_0_1px_1px_rgba(255,255,255,0.94),0_4px_10px_rgba(41,38,43,0.08)]',
    dotClass: 'bg-[#C9182B]',
    description:
      'Commuter reference estimate for budgeting only.',
  },
  pending_verification: {
    label: 'PENDING VERIFICATION',
    shortLabel: 'Pending Verification',
    badgeClass:
      'bg-[#F8E7EA]/90 text-[#343039] border border-white/90 shadow-[inset_0_1px_1px_rgba(255,255,255,0.88)]',
    dotClass: 'bg-[#B51224]',
    description:
      'Awaiting review against transport documents.',
  },
  rejected_or_disputed: {
    label: 'REJECTED OR DISPUTED',
    shortLabel: 'Rejected / Disputed',
    badgeClass:
      'liquid-nav-active text-white border border-white/60 shadow-[inset_0_1px_1px_rgba(255,255,255,0.6),0_4px_12px_rgba(181,18,36,0.24)]',
    dotClass: 'bg-[#B51224]',
    description:
      'Flagged or rejected due to conflicting proof.',
  },
  archived: {
    label: 'ARCHIVED',
    shortLabel: 'Archived',
    badgeClass:
      'bg-white/60 text-[#343039] border border-white/80 shadow-[inset_0_1px_1px_rgba(255,255,255,0.75)]',
    dotClass: 'bg-[#343039]',
    description: 'Superseded historical fare record.',
  },
};

export const REPORT_STATUS_META: Record<
  ReportStatus,
  { label: string; badgeClass: string }
> = {
  pending: {
    label: 'Pending',
    badgeClass:
      'bg-white/75 text-[#343039] border border-white/85 shadow-[inset_0_1px_1px_rgba(255,255,255,0.85)]',
  },
  under_review: {
    label: 'Under Review',
    badgeClass:
      'bg-[#F8E7EA]/85 text-[#B51224] border border-[#E9E5E8] shadow-[inset_0_1px_1px_rgba(255,255,255,0.85)]',
  },
  approved_community_estimate: {
    label: 'Approved as Community Estimate',
    badgeClass:
      'bg-white/80 text-[#B51224] border border-[#E9E5E8] shadow-[inset_0_1px_1px_rgba(255,255,255,0.92)]',
  },
  verified_official: {
    label: 'Verified Official',
    badgeClass:
      'bg-gradient-to-b from-[#C9182B]/85 to-[#B51224]/90 text-white border border-white/65 shadow-[inset_0_1px_1px_rgba(255,255,255,0.7)]',
  },
  rejected: {
    label: 'Rejected',
    badgeClass:
      'liquid-nav-active text-white border border-white/60 shadow-[inset_0_1px_1px_rgba(255,255,255,0.6)]',
  },
  disputed: {
    label: 'Disputed',
    badgeClass:
      'liquid-nav-active text-white border border-white/60 shadow-[inset_0_1px_1px_rgba(255,255,255,0.6)]',
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
