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
      if (!user) throw new Error('Kailangan naka-sign in ka muna.');
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
        title: 'Naipadala na ang fare report',
        description:
          'Nakabinbin pa ito para i-check. Kapag na-approve bilang Gabay ng Komunidad, mananatili itong nakahiwalay sa Opisyal na taripa.',
        variant: 'success',
      });
    },
    onError: (err: Error) => {
      pushToast({ title: 'Hindi naipadala ang report', description: err.message, variant: 'error' });
    },
  });

  const editMutation = useMutation({
    mutationFn: async () => {
      if (!editingReport) throw new Error('Walang napiling report.');
      const numericFare = Number(editFarePaid);
      if (!Number.isFinite(numericFare) || numericFare <= 0) {
        throw new Error('Maglagay ng tamang halaga ng pamasahe.');
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
      pushToast({ title: 'Na-update na ang report', variant: 'success' });
    },
    onError: (err: Error) => {
      pushToast({ title: 'Hindi ma-update ang report', description: err.message, variant: 'error' });
    },
  });

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selected = Array.from(e.target.files ?? []).slice(0, 3);
    for (const file of selected) {
      const err = validateEvidenceFile(file);
      if (err) {
        pushToast({ title: 'Hindi pwede ang file', description: err, variant: 'error' });
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
        title: 'Hindi mabuksan ang ebidensya',
        description: err instanceof Error ? err.message : 'Storage error',
        variant: 'error',
      });
    }
  };

  return (
    <div className="space-y-6">
      <GlassCard variant="strong" className="p-6 space-y-1.5">
        <p className="text-xs font-bold uppercase tracking-widest text-[#C9182B]">
          Pag-report ng Pamasahe ng Mga Pasahero
        </p>
        <h1 className="font-display text-2xl font-extrabold text-[#29262B]">
          Mag-report at Tingnan ang Mga Sinumite
        </h1>
        <p className="text-sm text-[#777078]">
          I-report ang singil ng pamasahe sa Oriental Mindoro. Pwede pang i-edit ang nakabinbing report
          bago ma-review. Ang mga na-approve na report ng pasahero ay laging nakalabel bilang{' '}
          <strong className="text-[#29262B]">Gabay ng Komunidad</strong> maliban kung may opisyal na dokumento.
        </p>
      </GlassCard>

      <div className="grid gap-6 lg:grid-cols-12">
        {/* Submission Form */}
        <GlassCard variant="strong" className="p-6 lg:col-span-5 space-y-4 h-fit">
          <div className="flex items-center gap-2 text-[#C9182B]">
            <MessageSquarePlus className="h-5 w-5" />
            <h2 className="font-display text-lg font-bold text-[#29262B]">
              Bagong Fare Report
            </h2>
          </div>

          <form
            onSubmit={handleSubmit((vals) => submitMutation.mutate(vals))}
            className="space-y-3.5"
          >
            <div className="grid gap-3 sm:grid-cols-2">
              <div>
                <label className="mb-1 block text-xs font-bold uppercase tracking-wider text-[#777078]">
                  Saan Galing
                </label>
                <select
                  {...register('originMunicipalityId')}
                  className="glass-input w-full rounded-2xl px-3 py-2 text-sm"
                >
                  <option value="">Piliin...</option>
                  {municipalities.map((m) => (
                    <option key={m.id} value={m.id}>
                      {m.name}
                    </option>
                  ))}
                </select>
                {errors.originMunicipalityId && (
                  <p className="mt-1 text-xs text-[#C9182B]">{errors.originMunicipalityId.message}</p>
                )}
              </div>

              <div>
                <label className="mb-1 block text-xs font-bold uppercase tracking-wider text-[#777078]">
                  Saan Pupunta
                </label>
                <select
                  {...register('destinationMunicipalityId')}
                  className="glass-input w-full rounded-2xl px-3 py-2 text-sm"
                >
                  <option value="">Piliin...</option>
                  {municipalities.map((m) => (
                    <option key={m.id} value={m.id}>
                      {m.name}
                    </option>
                  ))}
                </select>
                {errors.destinationMunicipalityId && (
                  <p className="mt-1 text-xs text-[#C9182B]">
                    {errors.destinationMunicipalityId.message}
                  </p>
                )}
              </div>
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              <div>
                <label className="mb-1 block text-xs font-bold uppercase tracking-wider text-[#777078]">
                  Uri ng Sasakyan
                </label>
                <select
                  {...register('transportTypeId')}
                  className="glass-input w-full rounded-2xl px-3 py-2 text-sm"
                >
                  <option value="">Piliin...</option>
                  {transportTypes.map((tt) => (
                    <option key={tt.id} value={tt.id}>
                      {tt.name}
                    </option>
                  ))}
                </select>
                {errors.transportTypeId && (
                  <p className="mt-1 text-xs text-[#C9182B]">{errors.transportTypeId.message}</p>
                )}
              </div>

              <div>
                <label className="mb-1 block text-xs font-bold uppercase tracking-wider text-[#777078]">
                  Uri ng Pasahero
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
                <label className="mb-1 block text-xs font-bold uppercase tracking-wider text-[#777078]">
                  Binayaran (PHP)
                </label>
                <input
                  type="number"
                  step="0.25"
                  {...register('farePaid')}
                  placeholder="hal., 45.00"
                  className="glass-input w-full rounded-2xl px-3 py-2 text-sm"
                />
                {errors.farePaid && (
                  <p className="mt-1 text-xs text-[#C9182B]">{errors.farePaid.message}</p>
                )}
              </div>

              <div>
                <label className="mb-1 block text-xs font-bold uppercase tracking-wider text-[#777078]">
                  Petsa ng Biyahe
                </label>
                <input
                  type="date"
                  {...register('travelDate')}
                  className="glass-input w-full rounded-2xl px-3 py-2 text-sm"
                />
                {errors.travelDate && (
                  <p className="mt-1 text-xs text-[#C9182B]">{errors.travelDate.message}</p>
                )}
              </div>
            </div>

            <div>
              <label className="mb-1 block text-xs font-bold uppercase tracking-wider text-[#777078]">
                Detalye ng Sasakyan / Operator (Opsyonal)
              </label>
              <input
                type="text"
                {...register('operatorOrVehicleDetails')}
                placeholder="hal., Plate / Body no., TODA, o pangalan ng terminal"
                className="glass-input w-full rounded-2xl px-3 py-2 text-sm"
              />
            </div>

            <div>
              <label className="mb-1 block text-xs font-bold uppercase tracking-wider text-[#777078]">
                Dagdag na Detalye o Tala
              </label>
              <textarea
                rows={3}
                {...register('remarks')}
                placeholder="Ikwento ang detalye ng terminal, taripa na nakita, o iba pang tala..."
                className="glass-input w-full rounded-2xl px-3 py-2 text-sm"
              />
            </div>

            <div>
              <label className="mb-1 block text-xs font-bold uppercase tracking-wider text-[#777078]">
                Ebidensya (Opsyonal — JPG/PNG/WebP/PDF, max 5MB)
              </label>
              <label className="flex cursor-pointer items-center justify-center gap-2 rounded-2xl border border-dashed border-[#C9182B]/40 bg-[#F7F3EF]/75 p-3 text-xs font-semibold text-[#C9182B] hover:bg-[#F8E7EA]/80 transition">
                <FileUp className="h-4 w-4" />
                <span>
                  {evidenceFiles.length > 0
                    ? `${evidenceFiles.length} file(s) ang naka-attach`
                    : 'Mag-upload ng larawan ng ticket, resibo, o fare chart'}
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
                <ul className="mt-1.5 space-y-1 text-[11px] text-[#777078]">
                  {evidenceFiles.map((f) => (
                    <li key={f.name} className="flex items-center justify-between">
                      <span>{f.name}</span>
                      <button
                        type="button"
                        onClick={() => setEvidenceFiles((prev) => prev.filter((x) => x !== f))}
                        className="text-[#C9182B]"
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
              {submitMutation.isPending ? 'Ipinapadala...' : 'I-submit ang Fare Report'}
            </GlassButton>
          </form>
        </GlassCard>

        {/* Report History */}
        <div className="lg:col-span-7 space-y-4">
          <h2 className="font-display text-lg font-bold text-[#29262B] px-1">
            Mga Pinadala Kong Report ({myReports?.length ?? 0})
          </h2>

          {isLoading ? (
            <GlassSkeleton className="h-48" />
          ) : !myReports || myReports.length === 0 ? (
            <EmptyStateCard
              icon={MessageSquarePlus}
              title="Wala ka pang naipadala na fare report"
              description="Gamitin ang form sa kaliwa para i-share ang napansin mong pamasahe at masubaybayan dito."
            />
          ) : (
            <div className="space-y-3">
              {myReports.map((rep, idx) => (
                <GlassCard key={rep.id} variant="strong" staggerIndex={idx} className="p-5 space-y-3">
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <div>
                      <h3 className="font-display text-base font-extrabold text-[#29262B]">
                        {rep.origin?.name} → {rep.destination?.name}
                      </h3>
                      <p className="text-xs text-[#777078]">
                        {rep.transport_type?.name} •{' '}
                        {PASSENGER_CATEGORY_LABELS[rep.passenger_category]} • Petsa ng biyahe:{' '}
                        {formatDateSafe(rep.travel_date)}
                      </p>
                    </div>
                    <ReportStatusBadge status={rep.status} />
                  </div>

                  <div className="flex flex-wrap items-center justify-between gap-2 border-y border-[#E9E5E8]/35 py-2.5 text-sm">
                    <span className="font-display text-xl font-extrabold text-[#C9182B]">
                      {formatPhp(rep.fare_paid)}
                    </span>
                    {rep.operator_or_vehicle_details && (
                      <span className="text-xs text-[#777078]">
                        Sasakyan/Operator: {rep.operator_or_vehicle_details}
                      </span>
                    )}
                  </div>

                  {rep.remarks && <p className="text-xs text-[#29262B]/85">{rep.remarks}</p>}

                  {rep.admin_feedback && (
                    <div className="glass-pill-tile rounded-[20px] p-3 text-xs text-[#29262B]">
                      <strong>Sagot ng Admin:</strong> {rep.admin_feedback}
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
                          className="liquid-btn-secondary inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-[11px] font-bold"
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
                        variant="secondary"
                        size="sm"
                        onClick={() => {
                          setEditingReport(rep);
                          setEditFarePaid(String(rep.fare_paid));
                          setEditRemarks(rep.remarks ?? '');
                        }}
                      >
                        <Edit3 className="h-3.5 w-3.5" />
                        I-edit ang Report
                      </GlassButton>
                    </div>
                  )}

                  {editingReport?.id === rep.id && (
                    <div className="glass-pill-tile liquid-reveal-enter space-y-2.5 rounded-[22px] p-3.5">
                      <p className="text-xs font-bold text-[#C9182B]">I-edit ang Nakabinbing Report</p>
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
                          I-save
                        </GlassButton>
                        <GlassButton
                          type="button"
                          variant="glass"
                          size="sm"
                          onClick={() => setEditingReport(null)}
                        >
                          Kanselahin
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
