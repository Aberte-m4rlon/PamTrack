import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Edit3,
  Eye,
  FileUp,
  MessageSquarePlus,
  Send,
  X,
} from 'lucide-react';
import { z } from 'zod';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/contexts/ToastContext';
import {
  useMunicipalities,
  useMyFareReports,
  useTransportTypes,
} from '@/hooks/useReferenceData';
import { PASSENGER_CATEGORY_LABELS } from '@/lib/fareIntegrity';
import { formatDateSafe, formatPhp } from '@/lib/utils';
import { fareReportSchema, validateEvidenceFile } from '@/lib/validation';
import {
  getEvidenceSignedUrl,
  submitFareReport,
  updatePendingFareReport,
} from '@/services/pamasaheApi';
import type { FareReport, PassengerCategory } from '@/types/database';
import {
  EmptyStateCard,
  GlassButton,
  GlassCard,
  GlassSkeleton,
  ReportStatusBadge,
} from '@/components/glass/GlassPrimitives';

type FareReportFormValues = z.infer<typeof fareReportSchema>;

export function MyReportsPage() {
  const { user, isConfigured } = useAuth();
  const { pushToast } = useToast();
  const queryClient = useQueryClient();

  const { data: muniRes } = useMunicipalities();
  const { data: transportRes } = useTransportTypes();
  const { data: myReports, isLoading } = useMyFareReports();

  const municipalities = muniRes?.data ?? [];
  const transportTypes = transportRes?.data ?? [];

  const [evidenceFiles, setEvidenceFiles] = useState<File[]>([]);
  const [editingReport, setEditingReport] = useState<FareReport | null>(null);
  const [editFarePaid, setEditFarePaid] = useState('');
  const [editRemarks, setEditRemarks] = useState('');

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<FareReportFormValues>({
    resolver: zodResolver(fareReportSchema),
    defaultValues: {
      passengerCategory: 'regular',
      travelDate: new Date().toISOString().slice(0, 10),
    },
  });

  const submitMutation = useMutation({
    mutationFn: async (values: FareReportFormValues) => {
      if (!user) throw new Error('You must be signed in.');
      return submitFareReport({
        reporterId: user.id,
        originMunicipalityId: values.originMunicipalityId,
        destinationMunicipalityId: values.destinationMunicipalityId,
        transportTypeId: values.transportTypeId,
        farePaid: values.farePaid,
        passengerCategory: values.passengerCategory,
        travelDate: values.travelDate,
        operatorOrVehicleDetails: values.operatorOrVehicleDetails,
        remarks: values.remarks,
        evidenceFiles,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['myReports', user?.id] });
      queryClient.invalidateQueries({ queryKey: ['notifications', user?.id] });
      reset({
        passengerCategory: 'regular',
        travelDate: new Date().toISOString().slice(0, 10),
      });
      setEvidenceFiles([]);
      pushToast({
        title: 'Fare report submitted',
        description:
          'Your report is queued as Pending. Approving it as a Community Estimate never alters Official fares.',
        variant: 'success',
      });
    },
    onError: (err: Error) => {
      pushToast({ title: 'Report submission failed', description: err.message, variant: 'error' });
    },
  });

  const editMutation = useMutation({
    mutationFn: async () => {
      if (!editingReport) throw new Error('No report selected.');
      const numericFare = Number(editFarePaid);
      if (!Number.isFinite(numericFare) || numericFare <= 0) {
        throw new Error('Enter a valid positive fare paid.');
      }
      return updatePendingFareReport(editingReport.id, {
        farePaid: numericFare,
        passengerCategory: editingReport.passenger_category as PassengerCategory,
        travelDate: editingReport.travel_date,
        operatorOrVehicleDetails: editingReport.operator_or_vehicle_details ?? undefined,
        remarks: editRemarks,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['myReports', user?.id] });
      setEditingReport(null);
      pushToast({ title: 'Pending report updated', variant: 'success' });
    },
    onError: (err: Error) => {
      pushToast({ title: 'Unable to update report', description: err.message, variant: 'error' });
    },
  });

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selected = Array.from(e.target.files ?? []).slice(0, 3);
    for (const file of selected) {
      const err = validateEvidenceFile(file);
      if (err) {
        pushToast({ title: 'Invalid evidence file', description: err, variant: 'error' });
        return;
      }
    }
    setEvidenceFiles(selected);
  };

  const handleViewEvidence = async (storagePath: string) => {
    try {
      const url = await getEvidenceSignedUrl(storagePath);
      window.open(url, '_blank', 'noopener,noreferrer');
    } catch (err) {
      pushToast({
        title: 'Unable to open evidence',
        description: err instanceof Error ? err.message : 'Storage error',
        variant: 'error',
      });
    }
  };

  return (
    <div className="space-y-6">
      <GlassCard variant="strong" className="p-6 space-y-1.5">
        <p className="text-xs font-bold uppercase tracking-widest text-[#176B4B]">
          Community Fare Reporting
        </p>
        <h1 className="font-display text-2xl font-extrabold text-[#183329]">
          Submit &amp; Track Fare Reports
        </h1>
        <p className="text-sm text-[#183329]/80">
          Report fares observed across Oriental Mindoro. Pending reports may be edited prior to
          administrator review. Approved community reports remain labeled strictly as{' '}
          <strong>Community Estimates</strong> unless matched to an official government order.
        </p>
      </GlassCard>

      <div className="grid gap-6 lg:grid-cols-12">
        {/* Submission Form */}
        <GlassCard variant="strong" className="p-6 lg:col-span-5 space-y-4 h-fit">
          <div className="flex items-center gap-2 text-[#176B4B]">
            <MessageSquarePlus className="h-5 w-5" />
            <h2 className="font-display text-lg font-bold text-[#183329]">
              New Fare Report
            </h2>
          </div>

          <form
            onSubmit={handleSubmit((vals) => submitMutation.mutate(vals))}
            className="space-y-3.5"
          >
            <div className="grid gap-3 sm:grid-cols-2">
              <div>
                <label className="mb-1 block text-xs font-bold uppercase tracking-wider text-[#183329]/75">
                  Origin
                </label>
                <select
                  {...register('originMunicipalityId')}
                  className="glass-input w-full rounded-2xl px-3 py-2 text-sm"
                >
                  <option value="">Select origin...</option>
                  {municipalities.map((m) => (
                    <option key={m.id} value={m.id}>
                      {m.name}
                    </option>
                  ))}
                </select>
                {errors.originMunicipalityId && (
                  <p className="mt-1 text-xs text-red-600">{errors.originMunicipalityId.message}</p>
                )}
              </div>

              <div>
                <label className="mb-1 block text-xs font-bold uppercase tracking-wider text-[#183329]/75">
                  Destination
                </label>
                <select
                  {...register('destinationMunicipalityId')}
                  className="glass-input w-full rounded-2xl px-3 py-2 text-sm"
                >
                  <option value="">Select destination...</option>
                  {municipalities.map((m) => (
                    <option key={m.id} value={m.id}>
                      {m.name}
                    </option>
                  ))}
                </select>
                {errors.destinationMunicipalityId && (
                  <p className="mt-1 text-xs text-red-600">
                    {errors.destinationMunicipalityId.message}
                  </p>
                )}
              </div>
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              <div>
                <label className="mb-1 block text-xs font-bold uppercase tracking-wider text-[#183329]/75">
                  Transport Type
                </label>
                <select
                  {...register('transportTypeId')}
                  className="glass-input w-full rounded-2xl px-3 py-2 text-sm"
                >
                  <option value="">Select mode...</option>
                  {transportTypes.map((tt) => (
                    <option key={tt.id} value={tt.id}>
                      {tt.name}
                    </option>
                  ))}
                </select>
                {errors.transportTypeId && (
                  <p className="mt-1 text-xs text-red-600">{errors.transportTypeId.message}</p>
                )}
              </div>

              <div>
                <label className="mb-1 block text-xs font-bold uppercase tracking-wider text-[#183329]/75">
                  Passenger Category
                </label>
                <select
                  {...register('passengerCategory')}
                  className="glass-input w-full rounded-2xl px-3 py-2 text-sm"
                >
                  {Object.entries(PASSENGER_CATEGORY_LABELS).map(([k, label]) => (
                    <option key={k} value={k}>
                      {label}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              <div>
                <label className="mb-1 block text-xs font-bold uppercase tracking-wider text-[#183329]/75">
                  Fare Paid (PHP)
                </label>
                <input
                  type="number"
                  step="0.25"
                  {...register('farePaid')}
                  placeholder="e.g., 45.00"
                  className="glass-input w-full rounded-2xl px-3 py-2 text-sm"
                />
                {errors.farePaid && (
                  <p className="mt-1 text-xs text-red-600">{errors.farePaid.message}</p>
                )}
              </div>

              <div>
                <label className="mb-1 block text-xs font-bold uppercase tracking-wider text-[#183329]/75">
                  Travel Date
                </label>
                <input
                  type="date"
                  {...register('travelDate')}
                  className="glass-input w-full rounded-2xl px-3 py-2 text-sm"
                />
                {errors.travelDate && (
                  <p className="mt-1 text-xs text-red-600">{errors.travelDate.message}</p>
                )}
              </div>
            </div>

            <div>
              <label className="mb-1 block text-xs font-bold uppercase tracking-wider text-[#183329]/75">
                Operator / Vehicle Details (Optional)
              </label>
              <input
                type="text"
                {...register('operatorOrVehicleDetails')}
                placeholder="e.g., Plate / Body number, TODA, or terminal name"
                className="glass-input w-full rounded-2xl px-3 py-2 text-sm"
              />
            </div>

            <div>
              <label className="mb-1 block text-xs font-bold uppercase tracking-wider text-[#183329]/75">
                Additional Remarks
              </label>
              <textarea
                rows={3}
                {...register('remarks')}
                placeholder="Share terminal details, posted fare matrix sightings, or notes..."
                className="glass-input w-full rounded-2xl px-3 py-2 text-sm"
              />
            </div>

            <div>
              <label className="mb-1 block text-xs font-bold uppercase tracking-wider text-[#183329]/75">
                Supporting Evidence (Optional — JPG/PNG/WebP/PDF, max 5MB)
              </label>
              <label className="flex cursor-pointer items-center justify-center gap-2 rounded-2xl border border-dashed border-[#176B4B]/40 bg-white/60 p-3 text-xs font-semibold text-[#176B4B] hover:bg-white/85 transition">
                <FileUp className="h-4 w-4" />
                <span>
                  {evidenceFiles.length > 0
                    ? `${evidenceFiles.length} file(s) attached`
                    : 'Upload ticket, receipt, or posted fare chart photo'}
                </span>
                <input
                  type="file"
                  multiple
                  accept="image/jpeg,image/png,image/webp,application/pdf"
                  onChange={handleFileChange}
                  className="hidden"
                />
              </label>
              {evidenceFiles.length > 0 && (
                <ul className="mt-1.5 space-y-1 text-[11px] text-[#183329]/80">
                  {evidenceFiles.map((f) => (
                    <li key={f.name} className="flex items-center justify-between">
                      <span>{f.name}</span>
                      <button
                        type="button"
                        onClick={() => setEvidenceFiles((prev) => prev.filter((x) => x !== f))}
                        className="text-red-600"
                      >
                        <X className="h-3.5 w-3.5" />
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </div>

            <GlassButton
              type="submit"
              variant="primary"
              className="w-full"
              disabled={submitMutation.isPending || !isConfigured}
            >
              <Send className="h-4 w-4" />
              {submitMutation.isPending ? 'Submitting Report...' : 'Submit Fare Report'}
            </GlassButton>
          </form>
        </GlassCard>

        {/* Report History */}
        <div className="lg:col-span-7 space-y-4">
          <h2 className="font-display text-lg font-bold text-[#183329] px-1">
            My Submitted Reports ({myReports?.length ?? 0})
          </h2>

          {isLoading ? (
            <GlassSkeleton className="h-48" />
          ) : !myReports || myReports.length === 0 ? (
            <EmptyStateCard
              icon={MessageSquarePlus}
              title="You have not submitted any fare reports yet"
              description="Submit your first fare observation using the form to track verification progress here."
            />
          ) : (
            <div className="space-y-3">
              {myReports.map((rep) => (
                <GlassCard key={rep.id} variant="strong" className="p-5 space-y-3">
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <div>
                      <h3 className="font-display text-base font-extrabold text-[#183329]">
                        {rep.origin?.name} → {rep.destination?.name}
                      </h3>
                      <p className="text-xs text-[#183329]/75">
                        {rep.transport_type?.name} •{' '}
                        {PASSENGER_CATEGORY_LABELS[rep.passenger_category]} • Travel date:{' '}
                        {formatDateSafe(rep.travel_date)}
                      </p>
                    </div>
                    <ReportStatusBadge status={rep.status} />
                  </div>

                  <div className="flex flex-wrap items-center justify-between gap-2 border-y border-[#176B4B]/10 py-2.5 text-sm">
                    <span className="font-display text-xl font-extrabold text-[#176B4B]">
                      {formatPhp(rep.fare_paid)}
                    </span>
                    {rep.operator_or_vehicle_details && (
                      <span className="text-xs text-[#183329]/75">
                        Vehicle/Operator: {rep.operator_or_vehicle_details}
                      </span>
                    )}
                  </div>

                  {rep.remarks && <p className="text-xs text-[#183329]/85">{rep.remarks}</p>}

                  {rep.admin_feedback && (
                    <div className="rounded-2xl bg-[#DFF7E8]/80 p-3 text-xs text-[#183329]">
                      <strong>Administrator Feedback:</strong> {rep.admin_feedback}
                    </div>
                  )}

                  {/* Evidence files */}
                  {(rep.evidence ?? []).length > 0 && (
                    <div className="flex flex-wrap gap-2">
                      {rep.evidence?.map((ev) => (
                        <button
                          key={ev.id}
                          type="button"
                          onClick={() => handleViewEvidence(ev.storage_path)}
                          className="inline-flex items-center gap-1.5 rounded-xl bg-white/80 px-2.5 py-1 text-[11px] font-bold text-[#176B4B] border border-white hover:bg-white"
                        >
                          <Eye className="h-3.5 w-3.5" />
                          {ev.file_name}
                        </button>
                      ))}
                    </div>
                  )}

                  {/* Edit button when status is still pending */}
                  {rep.status === 'pending' && editingReport?.id !== rep.id && (
                    <div className="pt-1">
                      <GlassButton
                        type="button"
                        variant="glass"
                        size="sm"
                        onClick={() => {
                          setEditingReport(rep);
                          setEditFarePaid(String(rep.fare_paid));
                          setEditRemarks(rep.remarks ?? '');
                        }}
                      >
                        <Edit3 className="h-3.5 w-3.5" />
                        Edit Pending Report
                      </GlassButton>
                    </div>
                  )}

                  {editingReport?.id === rep.id && (
                    <div className="space-y-2.5 rounded-2xl border border-white bg-white/80 p-3.5">
                      <p className="text-xs font-bold text-[#176B4B]">Edit Pending Report</p>
                      <input
                        type="number"
                        step="0.25"
                        value={editFarePaid}
                        onChange={(e) => setEditFarePaid(e.target.value)}
                        className="glass-input w-full rounded-xl px-3 py-1.5 text-sm"
                      />
                      <textarea
                        rows={2}
                        value={editRemarks}
                        onChange={(e) => setEditRemarks(e.target.value)}
                        className="glass-input w-full rounded-xl px-3 py-1.5 text-xs"
                      />
                      <div className="flex gap-2">
                        <GlassButton
                          type="button"
                          variant="primary"
                          size="sm"
                          onClick={() => editMutation.mutate()}
                          disabled={editMutation.isPending}
                        >
                          Save Changes
                        </GlassButton>
                        <GlassButton
                          type="button"
                          variant="glass"
                          size="sm"
                          onClick={() => setEditingReport(null)}
                        >
                          Cancel
                        </GlassButton>
                      </div>
                    </div>
                  )}
                </GlassCard>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
