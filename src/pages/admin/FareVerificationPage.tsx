import { useMemo, useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import {
  AlertTriangle,
  CheckCircle2,
  Eye,
  FileCheck2,
  Flag,
  ShieldCheck,
  XCircle,
} from 'lucide-react';
import { useToast } from '@/contexts/ToastContext';
import { useAdminFareReports, useFareRecords } from '@/hooks/useReferenceData';
import { hasValidOfficialSource, PASSENGER_CATEGORY_LABELS } from '@/lib/fareIntegrity';
import { formatDateSafe, formatPhp } from '@/lib/utils';
import { getEvidenceSignedUrl, reviewFareReport } from '@/services/pamasaheApi';
import type { FareReport, ReportStatus } from '@/types/database';
import {
  EmptyStateCard,
  FareStatusBadge,
  GlassButton,
  GlassCard,
  GlassSkeleton,
  ReportStatusBadge,
} from '@/components/glass/GlassPrimitives';

export function FareVerificationPage() {
  const { pushToast } = useToast();
  const queryClient = useQueryClient();

  const { data: reports, isLoading } = useAdminFareReports();
  const { data: existingFares } = useFareRecords();

  const [statusFilter, setStatusFilter] = useState<'all' | ReportStatus>('pending');
  const [selectedReport, setSelectedReport] = useState<FareReport | null>(null);

  const [adminFeedback, setAdminFeedback] = useState('');
  const [flagSuspicious, setFlagSuspicious] = useState(false);
  const [issuingAuthority, setIssuingAuthority] = useState('');
  const [officialDocumentReference, setOfficialDocumentReference] = useState('');
  const [sourceUrl, setSourceUrl] = useState('');
  const [effectiveDate, setEffectiveDate] = useState('');

  const filteredReports = useMemo(() => {
    return (reports ?? []).filter((r) =>
      statusFilter === 'all' ? true : r.status === statusFilter
    );
  }, [reports, statusFilter]);

  const comparableFares = useMemo(() => {
    if (!selectedReport) return [];
    return (existingFares ?? []).filter(
      (f) =>
        f.origin_municipality_id === selectedReport.origin_municipality_id &&
        f.destination_municipality_id === selectedReport.destination_municipality_id &&
        f.transport_type_id === selectedReport.transport_type_id
    );
  }, [existingFares, selectedReport]);

  const reviewMutation = useMutation({
    mutationFn: async (newStatus: ReportStatus) => {
      if (!selectedReport) throw new Error('Select a report first.');

      if (
        newStatus === 'verified_official' &&
        !hasValidOfficialSource({
          issuingAuthority,
          officialDocumentReference,
          effectiveDate,
        })
      ) {
        throw new Error(
          'Publishing an official fare requires Issuing Authority, Official Document Reference, and Effective Date.'
        );
      }

      if ((newStatus === 'rejected' || newStatus === 'disputed') && !adminFeedback.trim()) {
        throw new Error('Provide clear administrator feedback when rejecting or disputing.');
      }

      return reviewFareReport({
        reportId: selectedReport.id,
        newStatus,
        adminFeedback: adminFeedback.trim() || undefined,
        flagSuspicious,
        issuingAuthority: issuingAuthority.trim() || undefined,
        officialDocumentReference: officialDocumentReference.trim() || undefined,
        sourceUrl: sourceUrl.trim() || undefined,
        effectiveDate: effectiveDate || undefined,
      });
    },
    onSuccess: (updated) => {
      queryClient.invalidateQueries({ queryKey: ['adminReports'] });
      queryClient.invalidateQueries({ queryKey: ['fareRecords'] });
      queryClient.invalidateQueries({ queryKey: ['auditLogs'] });
      setSelectedReport(null);
      setAdminFeedback('');
      setFlagSuspicious(false);
      setIssuingAuthority('');
      setOfficialDocumentReference('');
      setSourceUrl('');
      setEffectiveDate('');
      pushToast({
        title: `Report marked as ${updated.status.replace(/_/g, ' ')}`,
        description: 'Verification log, audit log, and reporter notification updated.',
        variant: 'success',
      });
    },
    onError: (err: Error) => {
      pushToast({ title: 'Verification action failed', description: err.message, variant: 'error' });
    },
  });

  const handleOpenEvidence = async (path: string) => {
    try {
      const signed = await getEvidenceSignedUrl(path);
      window.open(signed, '_blank', 'noopener,noreferrer');
    } catch (err) {
      pushToast({
        title: 'Cannot open evidence',
        description: err instanceof Error ? err.message : 'Storage error',
        variant: 'error',
      });
    }
  };

  return (
    <div className="space-y-6">
      <GlassCard variant="strong" className="p-6 space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-xs font-bold uppercase tracking-widest text-[#C9182B]">
              Core Verification Engine
            </p>
            <h1 className="font-display text-2xl font-extrabold text-[#29262B]">
              Fare Verification Workbench
            </h1>
            <p className="text-sm text-[#777078]">
              Inspect evidence, compare against existing records, approve community estimates, or
              verify official fares with mandatory LTFRB/LGU document references.
            </p>
          </div>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as 'all' | ReportStatus)}
            className="glass-input rounded-2xl px-3.5 py-2 text-sm font-semibold"
          >
            <option value="pending">Pending Queue</option>
            <option value="under_review">Under Review</option>
            <option value="approved_community_estimate">Approved Community Estimate</option>
            <option value="verified_official">Verified Official</option>
            <option value="disputed">Disputed</option>
            <option value="rejected">Rejected</option>
            <option value="all">All Reports</option>
          </select>
        </div>
      </GlassCard>

      <div className="grid gap-6 lg:grid-cols-12">
        {/* Queue List */}
        <div className="lg:col-span-5 space-y-3">
          {isLoading ? (
            <GlassSkeleton className="h-64" />
          ) : filteredReports.length === 0 ? (
            <EmptyStateCard
              icon={FileCheck2}
              title="No reports in this verification view"
              description="Submitted commuter reports appear here for evidence inspection and verification."
            />
          ) : (
            filteredReports.map((rep) => (
              <button
                key={rep.id}
                type="button"
                onClick={() => {
                  setSelectedReport(rep);
                  setAdminFeedback(rep.admin_feedback ?? '');
                  setFlagSuspicious(rep.is_flagged_suspicious);
                }}
                className={`w-full text-left glass-card-strong rounded-3xl p-4 transition border ${
                  selectedReport?.id === rep.id
                    ? 'border-[#C9182B] ring-2 ring-[#E9E5E8]/65'
                    : 'border-white/80 hover:bg-white/95'
                }`}
              >
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <p className="font-bold text-sm text-[#29262B]">
                      {rep.origin?.name} → {rep.destination?.name}
                    </p>
                    <p className="text-xs text-[#777078]">
                      {rep.transport_type?.name} •{' '}
                      {PASSENGER_CATEGORY_LABELS[rep.passenger_category]}
                    </p>
                  </div>
                  <ReportStatusBadge status={rep.status} />
                </div>
                <div className="mt-2 flex items-center justify-between text-xs">
                  <span className="font-display text-lg font-extrabold text-[#C9182B]">
                    {formatPhp(rep.fare_paid)}
                  </span>
                  <span className="text-[#777078]">
                    {rep.reporter?.full_name || rep.reporter?.email || 'Commuter'} •{' '}
                    {formatDateSafe(rep.travel_date)}
                  </span>
                </div>
              </button>
            ))
          )}
        </div>

        {/* Verification Inspector */}
        <div className="lg:col-span-7">
          {!selectedReport ? (
            <EmptyStateCard
              icon={ShieldCheck}
              title="Select a fare report to verify"
              description="Click any item from the queue to inspect supporting evidence, compare existing records, and execute a verified review action."
            />
          ) : (
            <GlassCard variant="strong" className="p-6 space-y-5">
              <div className="flex flex-wrap items-start justify-between gap-2 border-b border-[#E9E5E8]/35 pb-4">
                <div>
                  <ReportStatusBadge status={selectedReport.status} />
                  <h2 className="mt-2 font-display text-xl font-extrabold text-[#29262B]">
                    {selectedReport.origin?.name} → {selectedReport.destination?.name}
                  </h2>
                  <p className="text-xs text-[#777078]">
                    Reported by {selectedReport.reporter?.full_name} ({selectedReport.reporter?.email})
                    • Travel Date: {formatDateSafe(selectedReport.travel_date)}
                  </p>
                </div>
                <div className="glass-pill-tile rounded-[20px] px-4 py-2 text-right">
                  <p className="text-[10px] font-bold uppercase text-[#B51224]">Reported Paid</p>
                  <p className="font-display text-2xl font-extrabold text-[#C9182B] tabular-nums">
                    {formatPhp(selectedReport.fare_paid)}
                  </p>
                </div>
              </div>

              {/* Details & Supporting Evidence */}
              <div className="space-y-2 text-xs text-[#29262B]">
                <p>
                  <strong>Mode &amp; Passenger:</strong> {selectedReport.transport_type?.name} •{' '}
                  {PASSENGER_CATEGORY_LABELS[selectedReport.passenger_category]}
                </p>
                <p>
                  <strong>Vehicle / Operator:</strong>{' '}
                  {selectedReport.operator_or_vehicle_details || 'Not specified'}
                </p>
                <p>
                  <strong>Remarks:</strong> {selectedReport.remarks || 'No remarks provided.'}
                </p>

                <div className="pt-2">
                  <p className="font-bold text-[#29262B] mb-1.5">Supporting Evidence Files:</p>
                  {(selectedReport.evidence ?? []).length === 0 ? (
                    <p className="italic text-[#777078]">
                      No supporting files attached by reporter.
                    </p>
                  ) : (
                    <div className="flex flex-wrap gap-2">
                      {selectedReport.evidence?.map((ev) => (
                        <GlassButton
                          key={ev.id}
                          type="button"
                          variant="secondary"
                          size="sm"
                          onClick={() => handleOpenEvidence(ev.storage_path)}
                        >
                          <Eye className="h-3.5 w-3.5" />
                          Inspect {ev.file_name}
                        </GlassButton>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              {/* Comparison Against Existing Records */}
              <div className="glass-pill-tile rounded-[22px] p-4 space-y-2">
                <p className="text-xs font-bold uppercase tracking-wider text-[#C9182B]">
                  Existing Records for Same Corridor &amp; Mode ({comparableFares.length})
                </p>
                {comparableFares.length === 0 ? (
                  <p className="text-xs text-[#777078]">
                    No existing official or community fare records exist for this corridor yet.
                  </p>
                ) : (
                  <div className="space-y-1.5">
                    {comparableFares.map((cf) => (
                      <div
                        key={cf.id}
                        className="flex flex-wrap items-center justify-between gap-2 text-xs border-b border-black/5 pb-1.5"
                      >
                        <span>
                          {PASSENGER_CATEGORY_LABELS[cf.passenger_category]}:{' '}
                          <strong>{formatPhp(cf.fare_amount)}</strong>
                        </span>
                        <FareStatusBadge status={cf.status} compact />
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Verification Form Controls */}
              <div className="space-y-3 border-t border-[#E9E5E8]/35 pt-4">
                <div>
                  <label className="mb-1 block text-xs font-bold uppercase tracking-wider text-[#777078]">
                    Administrator Feedback / Notes
                  </label>
                  <textarea
                    rows={2}
                    value={adminFeedback}
                    onChange={(e) => setAdminFeedback(e.target.value)}
                    placeholder="Reason for approval, rejection, or verification notes..."
                    className="glass-input w-full rounded-2xl px-3.5 py-2 text-xs"
                  />
                </div>

                <label className="flex items-center gap-2 text-xs font-semibold text-[#B51224]">
                  <input
                    type="checkbox"
                    checked={flagSuspicious}
                    onChange={(e) => setFlagSuspicious(e.target.checked)}
                    className="accent-[#C9182B]"
                  />
                  Flag submission as suspicious / potential duplicate or anomaly
                </label>

                {/* Official Source Block (Required ONLY for Verified Official Fare) */}
                <div className="glass-pill-tile rounded-[22px] border-[#E9E5E8] p-4 space-y-3">
                  <p className="text-xs font-bold uppercase tracking-wider text-[#B51224]">
                    Official Source Verification (Required to Publish Official Fare)
                  </p>
                  <div className="grid gap-2.5 sm:grid-cols-2">
                    <input
                      type="text"
                      value={issuingAuthority}
                      onChange={(e) => setIssuingAuthority(e.target.value)}
                      placeholder="Authority (e.g. LTFRB Region IV-B / Sangguniang Bayan)"
                      className="glass-input rounded-xl px-3 py-2 text-xs"
                    />
                    <input
                      type="text"
                      value={officialDocumentReference}
                      onChange={(e) => setOfficialDocumentReference(e.target.value)}
                      placeholder="Doc Ref (e.g. MC 2026-001 / Ord. No. ...)"
                      className="glass-input rounded-xl px-3 py-2 text-xs"
                    />
                    <input
                      type="date"
                      value={effectiveDate}
                      onChange={(e) => setEffectiveDate(e.target.value)}
                      className="glass-input rounded-xl px-3 py-2 text-xs"
                    />
                    <input
                      type="url"
                      value={sourceUrl}
                      onChange={(e) => setSourceUrl(e.target.value)}
                      placeholder="Source URL (https://...)"
                      className="glass-input rounded-xl px-3 py-2 text-xs"
                    />
                  </div>
                </div>

                <div className="flex flex-wrap gap-2 pt-2">
                  <GlassButton
                    type="button"
                    variant="glass"
                    size="sm"
                    disabled={reviewMutation.isPending}
                    onClick={() => reviewMutation.mutate('under_review')}
                  >
                    Mark Under Review
                  </GlassButton>

                  <GlassButton
                    type="button"
                    variant="secondary"
                    size="sm"
                    disabled={reviewMutation.isPending}
                    onClick={() => reviewMutation.mutate('approved_community_estimate')}
                  >
                    <AlertTriangle className="h-3.5 w-3.5" />
                    Approve as Community Estimate
                  </GlassButton>

                  <GlassButton
                    type="button"
                    variant="primary"
                    size="sm"
                    disabled={
                      reviewMutation.isPending ||
                      !hasValidOfficialSource({
                        issuingAuthority,
                        officialDocumentReference,
                        effectiveDate,
                      })
                    }
                    onClick={() => reviewMutation.mutate('verified_official')}
                  >
                    <CheckCircle2 className="h-3.5 w-3.5" />
                    Publish as Verified Official
                  </GlassButton>

                  <GlassButton
                    type="button"
                    variant="danger"
                    size="sm"
                    disabled={reviewMutation.isPending}
                    onClick={() => reviewMutation.mutate('disputed')}
                  >
                    <Flag className="h-3.5 w-3.5" />
                    Dispute
                  </GlassButton>

                  <GlassButton
                    type="button"
                    variant="danger"
                    size="sm"
                    disabled={reviewMutation.isPending}
                    onClick={() => reviewMutation.mutate('rejected')}
                  >
                    <XCircle className="h-3.5 w-3.5" />
                    Reject
                  </GlassButton>
                </div>
              </div>
            </GlassCard>
          )}
        </div>
      </div>
    </div>
  );
}
