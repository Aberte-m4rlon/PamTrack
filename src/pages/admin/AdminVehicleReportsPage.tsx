import { useMemo, useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import {
  AlertTriangle,
  Download,
  Eye,
  FileText,
  Search,
  ShieldAlert,
} from 'lucide-react';
import { useToast } from '@/contexts/ToastContext';
import {
  useAdminVehicleReports,
  useGovernmentAgencies,
  useMunicipalities,
} from '@/hooks/useReferenceData';
import {
  ALL_COMPLAINT_STATUSES,
  COMPLAINT_STATUS_META,
  downloadComplaintSummary,
  recommendAgenciesForReport,
  VEHICLE_TYPE_OPTIONS,
} from '@/lib/vehicleReporting';
import { formatDateSafe, formatPhp } from '@/lib/utils';
import {
  adminUpdateVehicleReport,
  getVehicleEvidenceSignedUrl,
} from '@/services/pamasaheApi';
import type {
  ComplaintStatus,
  ReferralStatus,
  VehicleReport,
  ViolationCategoryGroup,
} from '@/types/database';
import {
  EmptyStateCard,
  GlassButton,
  GlassCard,
  GlassSkeleton,
} from '@/components/glass/GlassPrimitives';

export function AdminVehicleReportsPage({
  presetGroup = 'ALL',
  pageTitle = 'Vehicle & Violation Reports',
}: {
  presetGroup?: 'ALL' | ViolationCategoryGroup;
  pageTitle?: string;
}) {
  const { pushToast } = useToast();
  const queryClient = useQueryClient();

  const { data: reports, isLoading } = useAdminVehicleReports();
  const { data: muniRes } = useMunicipalities();
  const { data: agencies } = useGovernmentAgencies(true);
  const municipalities = muniRes?.data ?? [];

  const [plateSearch, setPlateSearch] = useState('');
  const [vehicleTypeFilter, setVehicleTypeFilter] = useState('all');
  const [municipalityFilter, setMunicipalityFilter] = useState('all');
  const [groupFilter, setGroupFilter] = useState<'ALL' | ViolationCategoryGroup>(presetGroup);
  const [statusFilter, setStatusFilter] = useState<'all' | ComplaintStatus>('all');
  const [selected, setSelected] = useState<VehicleReport | null>(null);

  const [nextStatus, setNextStatus] = useState<ComplaintStatus>('Under Review');
  const [adminRemarks, setAdminRemarks] = useState('');
  const [selectedAgencyId, setSelectedAgencyId] = useState('');
  const [referralStatus, setReferralStatus] = useState<ReferralStatus>(
    'Referred by Administrator'
  );
  const [externalRef, setExternalRef] = useState('');
  const [referralNotes, setReferralNotes] = useState('');

  const [previewMedia, setPreviewMedia] = useState<{
    url: string;
    isVideo: boolean;
    name: string;
  } | null>(null);

  const plateCounts = useMemo(() => {
    const map = new Map<string, number>();
    for (const r of reports ?? []) {
      if (r.plate_number) {
        map.set(r.plate_number, (map.get(r.plate_number) ?? 0) + 1);
      }
    }
    return map;
  }, [reports]);

  const filteredReports = useMemo(() => {
    return (reports ?? []).filter((r) => {
      if (vehicleTypeFilter !== 'all' && r.vehicle_type !== vehicleTypeFilter) return false;
      if (municipalityFilter !== 'all' && r.municipality_id !== municipalityFilter) return false;
      if (statusFilter !== 'all' && r.complaint_status !== statusFilter) return false;
      if (
        groupFilter !== 'ALL' &&
        !(r.categories ?? []).some((c) => c.category_group === groupFilter)
      ) {
        return false;
      }
      if (plateSearch.trim()) {
        const q = plateSearch.trim().toLowerCase();
        const hay = `${r.plate_number ?? ''} ${r.reference_number} ${r.body_number ?? ''} ${r.operator_name ?? ''}`.toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    });
  }, [reports, vehicleTypeFilter, municipalityFilter, statusFilter, groupFilter, plateSearch]);

  const selectedRecommendations = useMemo(() => {
    if (!selected) return [];
    return recommendAgenciesForReport({
      vehicleType: selected.vehicle_type,
      selectedCategories: (selected.categories ?? []).map((c) => c.category),
      agencies: agencies ?? [],
    });
  }, [selected, agencies]);

  const updateMut = useMutation({
    mutationFn: async () => {
      if (!selected) throw new Error('Select a report first.');
      return adminUpdateVehicleReport({
        reportId: selected.id,
        newStatus: nextStatus,
        adminRemarks: adminRemarks.trim() || undefined,
        assignToMe: true,
        agencyId: selectedAgencyId || null,
        referralStatus: selectedAgencyId ? referralStatus : undefined,
        externalReference: externalRef.trim() || undefined,
        referralNotes: referralNotes.trim() || undefined,
      });
    },
    onSuccess: (updated) => {
      queryClient.invalidateQueries({ queryKey: ['adminVehicleReports'] });
      queryClient.invalidateQueries({ queryKey: ['adminAgencyReferrals'] });
      queryClient.invalidateQueries({ queryKey: ['auditLogs'] });
      setSelected(null);
      setExternalRef('');
      setReferralNotes('');
      setSelectedAgencyId('');
      pushToast({
        title: `${updated.reference_number} updated to ${updated.complaint_status}`,
        variant: 'success',
      });
    },
    onError: (err: Error) => {
      pushToast({ title: 'Update rejected', description: err.message, variant: 'error' });
    },
  });

  const handleViewMedia = async (
    storagePath: string,
    fileType: string,
    name: string
  ) => {
    try {
      const url = await getVehicleEvidenceSignedUrl(storagePath);
      setPreviewMedia({ url, isVideo: fileType === 'video/mp4', name });
    } catch (err) {
      pushToast({
        title: 'Evidence error',
        description: err instanceof Error ? err.message : 'Unable to load evidence',
        variant: 'error',
      });
    }
  };

  return (
    <div className="space-y-6">
      <GlassCard variant="strong" className="p-6 space-y-2">
        <p className="text-xs font-bold uppercase tracking-widest text-[#DC2626]">
          Administrator Complaint Review
        </p>
        <h1 className="font-display text-2xl font-extrabold text-[#24191D]">{pageTitle}</h1>
        <p className="text-xs sm:text-sm text-[#78716C]">
          Search by plate number or reference ID, inspect private photo/video evidence, detect
          duplicates, and prepare agency referrals. Alleged violations remain confidential until
          formally adjudicated.
        </p>
      </GlassCard>

      {/* Filter Bar */}
      <GlassCard variant="surface" className="p-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
        <div className="relative">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-[#A8A29E]" />
          <input
            type="text"
            value={plateSearch}
            onChange={(e) => setPlateSearch(e.target.value)}
            placeholder="Plate No. or PT-OM-..."
            className="glass-input w-full rounded-2xl pl-9 pr-3 py-2 text-xs"
          />
        </div>

        <select
          value={vehicleTypeFilter}
          onChange={(e) => setVehicleTypeFilter(e.target.value)}
          className="glass-input rounded-2xl px-3 py-2 text-xs"
        >
          <option value="all">All Vehicle Types</option>
          {VEHICLE_TYPE_OPTIONS.map((vt) => (
            <option key={vt} value={vt}>
              {vt}
            </option>
          ))}
        </select>

        <select
          value={municipalityFilter}
          onChange={(e) => setMunicipalityFilter(e.target.value)}
          className="glass-input rounded-2xl px-3 py-2 text-xs"
        >
          <option value="all">All 15 LGUs</option>
          {municipalities.map((m) => (
            <option key={m.id} value={m.id}>
              {m.name}
            </option>
          ))}
        </select>

        <select
          value={groupFilter}
          onChange={(e) => setGroupFilter(e.target.value as 'ALL' | ViolationCategoryGroup)}
          className="glass-input rounded-2xl px-3 py-2 text-xs"
        >
          <option value="ALL">All Incident Categories</option>
          <option value="FARE VIOLATIONS">Fare Violations</option>
          <option value="DRIVER BEHAVIOR">Driver Behavior</option>
          <option value="VEHICLE SAFETY">Vehicle Safety</option>
          <option value="TRANSPORTATION REGULATIONS">Transportation Regulations</option>
          <option value="OTHER">Other</option>
        </select>

        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value as 'all' | ComplaintStatus)}
          className="glass-input rounded-2xl px-3 py-2 text-xs"
        >
          <option value="all">All 12 Statuses</option>
          {ALL_COMPLAINT_STATUSES.map((s) => (
            <option key={s} value={s}>
              {s}
            </option>
          ))}
        </select>
      </GlassCard>

      <div className="grid gap-6 lg:grid-cols-12">
        {/* Report Queue */}
        <div className="lg:col-span-5 space-y-3">
          {isLoading ? (
            <GlassSkeleton className="h-56" />
          ) : filteredReports.length === 0 ? (
            <EmptyStateCard
              icon={ShieldAlert}
              title="No vehicle reports match filters"
              description="Submitted vehicle, driver, and transport complaints appear here for review."
            />
          ) : (
            filteredReports.map((rep) => {
              const dupCount = rep.plate_number ? plateCounts.get(rep.plate_number) ?? 1 : 1;
              return (
                <button
                  key={rep.id}
                  type="button"
                  onClick={() => {
                    setSelected(rep);
                    setNextStatus(rep.complaint_status);
                    setAdminRemarks(rep.admin_remarks ?? '');
                    setPreviewMedia(null);
                  }}
                  className={`w-full text-left glass-card-strong rounded-3xl p-4 space-y-2 border transition ${
                    selected?.id === rep.id
                      ? 'border-[#DC2626] ring-2 ring-[#FCA5A5]/65'
                      : 'border-white/80 hover:bg-white/95'
                  }`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <p className="font-mono text-[11px] font-extrabold text-[#DC2626]">
                        {rep.reference_number}
                      </p>
                      <p className="font-bold text-sm text-[#24191D]">
                        {rep.vehicle_type} •{' '}
                        {rep.plate_not_available
                          ? 'Plate N/A'
                          : rep.plate_number || 'Unlisted'}
                      </p>
                    </div>
                    <span
                      className={`rounded-full px-2.5 py-0.5 text-[10px] font-bold ${COMPLAINT_STATUS_META[rep.complaint_status].badgeClass}`}
                    >
                      {rep.complaint_status}
                    </span>
                  </div>

                  <div className="flex flex-wrap items-center justify-between gap-2 text-[11px] text-[#78716C]">
                    <span>
                      {rep.municipality?.name} • {formatDateSafe(rep.incident_date)}
                    </span>
                    {(rep.is_duplicate_flagged || dupCount > 1) && (
                      <span className="glass-pill-tile inline-flex items-center gap-1 rounded-full border-amber-300/75 px-2.5 py-0.5 font-bold text-amber-900">
                        <AlertTriangle className="h-3 w-3" />
                        {dupCount} report(s) on plate
                      </span>
                    )}
                  </div>
                </button>
              );
            })
          )}
        </div>

        {/* Report Inspector */}
        <div className="lg:col-span-7">
          {!selected ? (
            <EmptyStateCard
              icon={FileText}
              title="Select a vehicle complaint to review"
              description="Inspect plate details, review uploaded evidence, check recommended authorities, and manage referral status."
            />
          ) : (
            <GlassCard variant="strong" className="p-6 space-y-5 text-xs">
              <div className="flex flex-wrap items-start justify-between gap-3 border-b border-[#FCA5A5]/35 pb-3">
                <div>
                  <p className="font-mono text-sm font-extrabold text-[#DC2626]">
                    {selected.reference_number}
                  </p>
                  <h2 className="font-display text-xl font-extrabold text-[#24191D]">
                    Reported {selected.vehicle_type} (
                    {selected.plate_not_available
                      ? 'Plate Not Available'
                      : selected.plate_number}
                    )
                  </h2>
                  <p className="text-[#78716C]">
                    {selected.municipality?.name} • {selected.incident_location} •{' '}
                    {formatDateSafe(selected.incident_date)} {selected.incident_time ?? ''}
                  </p>
                </div>

                <GlassButton
                  type="button"
                  variant="secondary"
                  size="sm"
                  onClick={() =>
                    downloadComplaintSummary(selected, selectedRecommendations)
                  }
                >
                  <Download className="h-3.5 w-3.5" />
                  Export Summary
                </GlassButton>
              </div>

              <div className="grid gap-2 sm:grid-cols-2 text-[#24191D]">
                <p>
                  <strong>Body / Color / Model:</strong>{' '}
                  {[selected.body_number, selected.vehicle_color, selected.vehicle_model]
                    .filter(Boolean)
                    .join(' / ') || 'Not provided'}
                </p>
                <p>
                  <strong>Operator / Route:</strong>{' '}
                  {[selected.operator_name, selected.route_info].filter(Boolean).join(' | ') ||
                    'Not provided'}
                </p>
                <p>
                  <strong>Actual vs Expected Fare:</strong>{' '}
                  {selected.actual_fare !== null ? formatPhp(selected.actual_fare) : 'N/A'} vs{' '}
                  {selected.expected_fare !== null ? formatPhp(selected.expected_fare) : 'N/A'}
                </p>
                <p>
                  <strong>External Share Consent:</strong>{' '}
                  {selected.external_share_consent ? 'Granted by reporter' : 'Not granted'}
                </p>
              </div>

              <div className="flex flex-wrap gap-1.5">
                {(selected.categories ?? []).map((c) => (
                  <span
                    key={c.id}
                    className="rounded-full bg-[#FFE4E6] px-2.5 py-0.5 font-bold text-[#B91C1C]"
                  >
                    [{c.category_group}] {c.category}
                  </span>
                ))}
              </div>

              <div className="glass-pill-tile rounded-[20px] p-3.5 space-y-1">
                <p className="font-bold text-[#24191D]">Reported Incident Narrative</p>
                <p className="whitespace-pre-line text-[#24191D]/90">{selected.description}</p>
              </div>

              {/* Evidence Inspection */}
              <div className="space-y-2">
                <p className="font-bold text-[#24191D]">Supporting Evidence ({selected.evidence?.length ?? 0})</p>
                <div className="flex flex-wrap gap-2">
                  {(selected.evidence ?? []).map((ev) => (
                    <GlassButton
                      key={ev.id}
                      type="button"
                      variant="secondary"
                      size="sm"
                      onClick={() =>
                        handleViewMedia(ev.storage_path, ev.file_type, ev.original_filename)
                      }
                    >
                      <Eye className="h-3.5 w-3.5" />
                      Inspect {ev.original_filename}
                    </GlassButton>
                  ))}
                </div>
                {previewMedia && (
                  <div className="rounded-2xl border border-[#FCA5A5]/60 bg-white/95 p-3 space-y-2">
                    <div className="flex justify-between font-bold text-[#24191D]">
                      <span>{previewMedia.name}</span>
                      <button
                        type="button"
                        onClick={() => setPreviewMedia(null)}
                        className="text-[#DC2626] hover:underline"
                      >
                        Close
                      </button>
                    </div>
                    {previewMedia.isVideo ? (
                      <video
                        src={previewMedia.url}
                        controls
                        className="max-h-64 w-full rounded-xl bg-black"
                      />
                    ) : (
                      <img
                        src={previewMedia.url}
                        alt={previewMedia.name}
                        className="max-h-64 rounded-xl object-contain"
                      />
                    )}
                  </div>
                )}
              </div>

              {/* Admin Decision & Agency Referral Controls */}
              <div className="space-y-3 border-t border-[#FCA5A5]/35 pt-4">
                <p className="font-bold uppercase text-[#DC2626]">
                  Update Internal / Agency Status &amp; Referral
                </p>

                <div className="grid gap-2.5 sm:grid-cols-2">
                  <select
                    value={nextStatus}
                    onChange={(e) => setNextStatus(e.target.value as ComplaintStatus)}
                    className="glass-input rounded-xl px-3 py-2 font-semibold"
                  >
                    {ALL_COMPLAINT_STATUSES.map((s) => (
                      <option key={s} value={s}>
                        {s}
                      </option>
                    ))}
                  </select>

                  <select
                    value={selectedAgencyId}
                    onChange={(e) => setSelectedAgencyId(e.target.value)}
                    className="glass-input rounded-xl px-3 py-2"
                  >
                    <option value="">Optional: Log Agency Referral...</option>
                    {(agencies ?? []).map((ag) => (
                      <option key={ag.id} value={ag.id}>
                        {ag.agency_name}
                      </option>
                    ))}
                  </select>
                </div>

                {selectedAgencyId && (
                  <div className="glass-pill-tile grid gap-2 sm:grid-cols-2 rounded-[20px] p-3">
                    <select
                      value={referralStatus}
                      onChange={(e) => setReferralStatus(e.target.value as ReferralStatus)}
                      className="glass-input rounded-xl px-3 py-1.5"
                    >
                      <option value="Prepared for Manual Submission">
                        Prepared for Manual Submission
                      </option>
                      <option value="Referred by Administrator">Referred by Administrator</option>
                      <option value="Acknowledged by Agency">Acknowledged by Agency</option>
                      <option value="Under Agency Investigation">
                        Under Agency Investigation
                      </option>
                      <option value="Closed">Closed</option>
                    </select>
                    <input
                      type="text"
                      value={externalRef}
                      onChange={(e) => setExternalRef(e.target.value)}
                      placeholder="External Agency Ack. Reference (if received)"
                      className="glass-input rounded-xl px-3 py-1.5"
                    />
                    <input
                      type="text"
                      value={referralNotes}
                      onChange={(e) => setReferralNotes(e.target.value)}
                      placeholder="Referral preparation / transmittal notes..."
                      className="glass-input rounded-xl px-3 py-1.5 sm:col-span-2"
                    />
                  </div>
                )}

                <textarea
                  rows={2}
                  value={adminRemarks}
                  onChange={(e) => setAdminRemarks(e.target.value)}
                  placeholder="Administrator remarks visible to reporter & audit log..."
                  className="glass-input w-full rounded-xl p-2.5"
                />

                <GlassButton
                  type="button"
                  variant="primary"
                  disabled={updateMut.isPending}
                  onClick={() => updateMut.mutate()}
                >
                  {updateMut.isPending ? 'Saving...' : 'Save Review & Update Status'}
                </GlassButton>
              </div>
            </GlassCard>
          )}
        </div>
      </div>
    </div>
  );
}
