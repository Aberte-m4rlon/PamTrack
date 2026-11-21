import { useMemo, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  ArrowLeft,
  Download,
  ExternalLink,
  Eye,
  History,
  Upload,
} from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/contexts/ToastContext';
import { useGovernmentAgencies } from '@/hooks/useReferenceData';
import {
  COMPLAINT_STATUS_META,
  downloadComplaintSummary,
  recommendAgenciesForReport,
  VEHICLE_EVIDENCE_TYPE_LABELS,
} from '@/lib/vehicleReporting';
import { formatDateSafe, formatDateTimeSafe, formatPhp } from '@/lib/utils';
import {
  addEvidenceToVehicleReport,
  fetchVehicleReportById,
  getVehicleEvidenceSignedUrl,
  updateMyVehicleReport,
} from '@/services/pamasaheApi';
import type { VehicleEvidenceType } from '@/types/database';
import {
  EmptyStateCard,
  GlassButton,
  GlassCard,
  GlassSkeleton,
} from '@/components/glass/GlassPrimitives';

export function VehicleComplaintDetailsPage() {
  const { id } = useParams<{ id: string }>();
  const { user } = useAuth();
  const { pushToast } = useToast();
  const queryClient = useQueryClient();

  const { data: report, isLoading } = useQuery({
    queryKey: ['vehicleReportDetail', id],
    queryFn: () => fetchVehicleReportById(id!),
    enabled: Boolean(id),
  });
  const { data: agencies } = useGovernmentAgencies();

  const [extraRemarks, setExtraRemarks] = useState('');
  const [extraFile, setExtraFile] = useState<File | null>(null);
  const [extraType, setExtraType] = useState<VehicleEvidenceType>('other_document');
  const [signedPreview, setSignedPreview] = useState<{
    url: string;
    isVideo: boolean;
    name: string;
  } | null>(null);

  const recommendedAgencies = useMemo(() => {
    if (!report) return [];
    return recommendAgenciesForReport({
      vehicleType: report.vehicle_type,
      selectedCategories: (report.categories ?? []).map((c) => c.category),
      agencies: agencies ?? [],
    });
  }, [report, agencies]);

  const addInfoMut = useMutation({
    mutationFn: async () => {
      if (!report || !user) throw new Error('Unauthorized.');
      if (extraFile) {
        await addEvidenceToVehicleReport({
          reportId: report.id,
          userId: user.id,
          file: extraFile,
          evidenceType: extraFile.type === 'video/mp4' ? 'video_recording' : extraType,
        });
      }
      if (extraRemarks.trim()) {
        await updateMyVehicleReport(report.id, {
          additionalRemarks: `${report.additional_remarks ? `${report.additional_remarks}\n` : ''}[Update ${new Date().toISOString().slice(0, 10)}]: ${extraRemarks.trim()}`,
        });
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['vehicleReportDetail', id] });
      setExtraRemarks('');
      setExtraFile(null);
      pushToast({ title: 'Additional information added', variant: 'success' });
    },
    onError: (err: Error) => {
      pushToast({ title: 'Update failed', description: err.message, variant: 'error' });
    },
  });

  const handleOpenEvidence = async (
    storagePath: string,
    fileType: string,
    name: string
  ) => {
    try {
      const url = await getVehicleEvidenceSignedUrl(storagePath);
      setSignedPreview({
        url,
        isVideo: fileType === 'video/mp4',
        name,
      });
    } catch (err) {
      pushToast({
        title: 'Cannot open evidence',
        description: err instanceof Error ? err.message : 'Storage error',
        variant: 'error',
      });
    }
  };

  if (isLoading) return <GlassSkeleton className="h-64" />;

  if (!report) {
    return (
      <EmptyStateCard
        title="Complaint record not found"
        description="This report does not exist or you are not authorized to access it."
        action={
          <Link to="/dashboard/vehicle-reports">
            <GlassButton variant="primary">Back to My Reports</GlassButton>
          </Link>
        }
      />
    );
  }

  const meta = COMPLAINT_STATUS_META[report.complaint_status];
  const canSupplement = [
    'Draft',
    'Submitted to Pamasahe Tracker',
    'Pending Initial Review',
    'Additional Information Required',
  ].includes(report.complaint_status);

  return (
    <div className="space-y-6">
      <Link
        to="/dashboard/vehicle-reports"
        className="inline-flex items-center gap-1.5 text-xs font-bold text-[#DC2626] hover:underline"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to My Vehicle Reports
      </Link>

      <GlassCard variant="strong" className="p-6 space-y-5">
        <div className="flex flex-wrap items-start justify-between gap-4 border-b border-[#FCA5A5]/35 pb-4">
          <div className="space-y-1">
            <p className="font-mono text-sm font-extrabold text-[#DC2626]">
              {report.reference_number}
            </p>
            <h1 className="font-display text-2xl font-extrabold text-[#24191D]">
              Reported {report.vehicle_type} Incident
            </h1>
            <p className="text-xs text-[#78716C]">
              Plate:{' '}
              <strong className="text-[#24191D]">
                {report.plate_not_available
                  ? 'Plate Number Not Available'
                  : report.plate_number || 'Unlisted'}
              </strong>{' '}
              • Municipality: <strong className="text-[#24191D]">{report.municipality?.name}</strong> • Date:{' '}
              {formatDateSafe(report.incident_date)}
            </p>
          </div>

          <div className="text-right space-y-1.5">
            <span
              className={`inline-block rounded-full px-3.5 py-1 text-xs font-bold ${meta.badgeClass}`}
            >
              {report.complaint_status}
            </span>
            <div>
              <GlassButton
                type="button"
                variant="secondary"
                size="sm"
                onClick={() => downloadComplaintSummary(report, recommendedAgencies)}
              >
                <Download className="h-3.5 w-3.5" />
                Download Complaint Summary
              </GlassButton>
            </div>
          </div>
        </div>

        <div className="grid gap-4 sm:grid-cols-2 text-xs text-[#24191D]">
          <div className="space-y-1.5">
            <p>
              <strong>Specific Location:</strong> {report.incident_location}
            </p>
            <p>
              <strong>Body / Color / Model:</strong>{' '}
              {[report.body_number, report.vehicle_color, report.vehicle_model]
                .filter(Boolean)
                .join(' / ') || 'Not provided'}
            </p>
            <p>
              <strong>Operator / Route Info:</strong>{' '}
              {[report.operator_name, report.route_info].filter(Boolean).join(' | ') ||
                'Not provided'}
            </p>
          </div>
          <div className="space-y-1.5">
            <p>
              <strong>Actual Fare Paid:</strong>{' '}
              {report.actual_fare !== null ? formatPhp(report.actual_fare) : 'N/A'}
            </p>
            <p>
              <strong>Expected Verified Fare:</strong>{' '}
              {report.expected_fare !== null ? formatPhp(report.expected_fare) : 'N/A'}
            </p>
            <p>
              <strong>Confidential Identity Requested:</strong>{' '}
              {report.is_confidential_identity ? 'Yes' : 'No'}
            </p>
          </div>
        </div>

        <div className="space-y-1.5">
          <p className="text-xs font-bold uppercase text-[#DC2626]">
            Alleged Violation Categories
          </p>
          <div className="flex flex-wrap gap-1.5">
            {(report.categories ?? []).map((c) => (
              <span
                key={c.id}
                className="rounded-full bg-[#FFE4E6] px-3 py-1 text-xs font-bold text-[#B91C1C]"
              >
                {c.category}
              </span>
            ))}
          </div>
        </div>

        <div className="rounded-2xl bg-[#FFF1F2]/75 border border-[#FFE4E6] p-4 text-xs space-y-1.5">
          <p className="font-bold text-[#24191D]">Reported Incident Description</p>
          <p className="whitespace-pre-line text-[#24191D]/90">{report.description}</p>
          {report.additional_remarks && (
            <p className="pt-2 text-[#78716C] whitespace-pre-line">
              <strong className="text-[#24191D]">Remarks:</strong> {report.additional_remarks}
            </p>
          )}
        </div>

        {/* Private Evidence Viewer */}
        <div className="space-y-2">
          <p className="text-xs font-bold uppercase text-[#DC2626]">
            Uploaded Supporting Evidence ({report.evidence?.length ?? 0})
          </p>
          {(report.evidence ?? []).length === 0 ? (
            <p className="text-xs text-[#78716C]">No media attached.</p>
          ) : (
            <div className="flex flex-wrap gap-2">
              {report.evidence?.map((ev) => (
                <GlassButton
                  key={ev.id}
                  type="button"
                  variant="glass"
                  size="sm"
                  onClick={() =>
                    handleOpenEvidence(ev.storage_path, ev.file_type, ev.original_filename)
                  }
                >
                  <Eye className="h-3.5 w-3.5 text-[#DC2626]" />
                  {ev.original_filename} ({VEHICLE_EVIDENCE_TYPE_LABELS[ev.evidence_type]})
                </GlassButton>
              ))}
            </div>
          )}

          {signedPreview && (
            <div className="rounded-2xl border border-[#FCA5A5]/60 bg-white/95 p-3 space-y-2">
              <div className="flex items-center justify-between text-xs font-bold text-[#24191D]">
                <span>{signedPreview.name}</span>
                <button
                  type="button"
                  onClick={() => setSignedPreview(null)}
                  className="text-[#DC2626] hover:underline"
                >
                  Close Preview
                </button>
              </div>
              {signedPreview.isVideo ? (
                <video
                  src={signedPreview.url}
                  controls
                  className="max-h-72 w-full rounded-xl bg-black"
                />
              ) : (
                <img
                  src={signedPreview.url}
                  alt={signedPreview.name}
                  className="max-h-72 rounded-xl object-contain"
                />
              )}
            </div>
          )}
        </div>

        {/* Supplement Evidence / Info if still eligible */}
        {canSupplement && (
          <div className="rounded-2xl border border-[#FFE4E6] bg-white/85 p-4 space-y-3 text-xs">
            <p className="font-bold text-[#DC2626]">
              Add Additional Information or Supporting Evidence
            </p>
            <textarea
              rows={2}
              value={extraRemarks}
              onChange={(e) => setExtraRemarks(e.target.value)}
              placeholder="Add clarifications requested by an administrator..."
              className="glass-input w-full rounded-xl p-2.5"
            />
            <div className="flex flex-wrap gap-2 items-center">
              <select
                value={extraType}
                onChange={(e) => setExtraType(e.target.value as VehicleEvidenceType)}
                className="glass-input rounded-xl px-2.5 py-1.5"
              >
                {Object.entries(VEHICLE_EVIDENCE_TYPE_LABELS).map(([k, lbl]) => (
                  <option key={k} value={k}>
                    {lbl}
                  </option>
                ))}
              </select>
              <input
                type="file"
                accept="image/jpeg,image/png,image/webp,video/mp4"
                onChange={(e) => setExtraFile(e.target.files?.[0] ?? null)}
              />
              <GlassButton
                type="button"
                variant="primary"
                size="sm"
                disabled={addInfoMut.isPending || (!extraRemarks.trim() && !extraFile)}
                onClick={() => addInfoMut.mutate()}
              >
                <Upload className="h-3.5 w-3.5" />
                Save Update
              </GlassButton>
            </div>
          </div>
        )}
      </GlassCard>

      {/* Recommended Authorities & Manual Submission Instructions */}
      <GlassCard variant="surface" className="p-6 space-y-3">
        <h2 className="font-display text-lg font-bold text-[#24191D]">
          Recommended Authorities &amp; Agency Referral Status
        </h2>
        {(report.referrals ?? []).length > 0 && (
          <div className="space-y-2 pb-2">
            {report.referrals?.map((ref) => (
              <div
                key={ref.id}
                className="rounded-2xl border border-[#FCA5A5] bg-[#FFF1F2] p-3 text-xs space-y-1"
              >
                <div className="flex justify-between font-bold text-[#B91C1C]">
                  <span>{ref.agency?.agency_name}</span>
                  <span>{ref.referral_status}</span>
                </div>
                {ref.external_reference_number && (
                  <p>External Agency Ref: {ref.external_reference_number}</p>
                )}
                {ref.referral_notes && <p>{ref.referral_notes}</p>}
              </div>
            ))}
          </div>
        )}

        <div className="grid gap-3 md:grid-cols-2">
          {recommendedAgencies.map((rec) => (
            <div key={rec.agency.id} className="rounded-2xl border border-[#FFE4E6] bg-white/85 p-4 text-xs space-y-1.5">
              <p className="font-bold text-sm text-[#24191D]">{rec.agency.agency_name}</p>
              <p className="text-[#78716C]">{rec.agency.submission_instructions}</p>
              <p className="font-semibold text-[#DC2626]">
                {rec.agency.verified_contact_information}
              </p>
              <a
                href={rec.agency.official_complaint_url || rec.agency.official_website}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-1 font-bold text-[#B91C1C] hover:underline"
              >
                Official Portal <ExternalLink className="h-3 w-3" />
              </a>
            </div>
          ))}
        </div>
      </GlassCard>

      {/* Status Timeline */}
      <GlassCard variant="strong" className="p-6 space-y-3">
        <h2 className="flex items-center gap-2 font-display text-lg font-bold text-[#24191D]">
          <History className="h-4 w-4 text-[#DC2626]" />
          Complaint Status History
        </h2>
        <div className="space-y-2">
          {(report.status_logs ?? []).map((log) => (
            <div
              key={log.id}
              className="flex flex-wrap items-center justify-between gap-2 rounded-2xl bg-white/85 border border-[#FFE4E6] p-3 text-xs"
            >
              <div>
                <p className="font-bold text-[#24191D]">
                  {log.previous_status ? `${log.previous_status} → ` : ''}
                  {log.new_status}
                </p>
                {log.remarks && <p className="text-[#78716C]">{log.remarks}</p>}
              </div>
              <span className="font-semibold text-[#DC2626]">
                {formatDateTimeSafe(log.created_at)}
              </span>
            </div>
          ))}
        </div>
      </GlassCard>
    </div>
  );
}
