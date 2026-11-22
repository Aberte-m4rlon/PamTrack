import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Archive, CheckCircle2, PlusCircle } from 'lucide-react';
import { z } from 'zod';
import { useToast } from '@/contexts/ToastContext';
import {
  useFareRecords,
  useMunicipalities,
  useRoutes,
  useTransportTypes,
} from '@/hooks/useReferenceData';
import { PASSENGER_CATEGORY_LABELS } from '@/lib/fareIntegrity';
import { formatDateSafe, formatPhp } from '@/lib/utils';
import { officialFareSchema } from '@/lib/validation';
import { archiveFareRecord, publishOfficialFare } from '@/services/pamasaheApi';
import {
  ConfirmDialog,
  FareStatusBadge,
  GlassButton,
  GlassCard,
} from '@/components/glass/GlassPrimitives';

type OfficialFareValues = z.infer<typeof officialFareSchema>;

export function FareManagementPage() {
  const { pushToast } = useToast();
  const queryClient = useQueryClient();

  const { data: muniRes } = useMunicipalities();
  const { data: transportRes } = useTransportTypes();
  const { data: routes } = useRoutes();
  const { data: fareRecords } = useFareRecords(true);

  const municipalities = muniRes?.data ?? [];
  const transportTypes = transportRes?.data ?? [];

  const [archiveTargetId, setArchiveTargetId] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<OfficialFareValues>({
    resolver: zodResolver(officialFareSchema),
    defaultValues: {
      passengerCategory: 'regular',
      effectiveDate: new Date().toISOString().slice(0, 10),
    },
  });

  const publishMutation = useMutation({
    mutationFn: (vals: OfficialFareValues) =>
      publishOfficialFare({
        originMunicipalityId: vals.originMunicipalityId,
        destinationMunicipalityId: vals.destinationMunicipalityId,
        transportTypeId: vals.transportTypeId,
        passengerCategory: vals.passengerCategory,
        fareAmount: vals.fareAmount,
        issuingAuthority: vals.issuingAuthority,
        officialDocumentReference: vals.officialDocumentReference,
        effectiveDate: vals.effectiveDate,
        sourceUrl: vals.sourceUrl || undefined,
        routeId: vals.routeId || undefined,
        notes: vals.notes || undefined,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['fareRecords'] });
      queryClient.invalidateQueries({ queryKey: ['auditLogs'] });
      reset();
      pushToast({
        title: 'Official fare published',
        description: 'Document reference, verification timestamp, and audit trail saved.',
        variant: 'success',
      });
    },
    onError: (err: Error) => {
      pushToast({ title: 'Publish failed', description: err.message, variant: 'error' });
    },
  });

  const archiveMutation = useMutation({
    mutationFn: (id: string) => archiveFareRecord(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['fareRecords'] });
      setArchiveTargetId(null);
      pushToast({ title: 'Fare record archived', variant: 'info' });
    },
    onError: (err: Error) => {
      pushToast({ title: 'Archive failed', description: err.message, variant: 'error' });
    },
  });

  return (
    <div className="space-y-6">
      <GlassCard variant="strong" className="p-6">
        <p className="text-xs font-bold uppercase tracking-widest text-[#C9182B]">
          Official Tariff Registry
        </p>
        <h1 className="font-display text-2xl font-extrabold text-[#29262B]">
          Fare Management
        </h1>
        <p className="text-sm text-[#777078]">
          Publish verified official fare records backed by authentic LTFRB orders, LGU ordinances,
          or authorized operator tariffs, and archive outdated entries.
        </p>
      </GlassCard>

      <div className="grid gap-6 lg:grid-cols-12">
        <GlassCard variant="strong" className="p-6 lg:col-span-5 space-y-4 h-fit">
          <h2 className="flex items-center gap-2 font-display text-lg font-bold text-[#29262B]">
            <PlusCircle className="h-5 w-5 text-[#C9182B]" />
            Publish Official Fare Record
          </h2>

          <form
            onSubmit={handleSubmit((vals) => publishMutation.mutate(vals))}
            className="space-y-3"
          >
            <div className="grid gap-3 sm:grid-cols-2">
              <div>
                <select
                  {...register('originMunicipalityId')}
                  className="glass-input w-full rounded-2xl px-3 py-2 text-sm"
                >
                  <option value="">Origin LGU...</option>
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
                <select
                  {...register('destinationMunicipalityId')}
                  className="glass-input w-full rounded-2xl px-3 py-2 text-sm"
                >
                  <option value="">Destination LGU...</option>
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
              <select
                {...register('transportTypeId')}
                className="glass-input w-full rounded-2xl px-3 py-2 text-sm"
              >
                <option value="">Transport Mode...</option>
                {transportTypes.map((tt) => (
                  <option key={tt.id} value={tt.id}>
                    {tt.name}
                  </option>
                ))}
              </select>

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

            <div className="grid gap-3 sm:grid-cols-2">
              <div>
                <input
                  type="number"
                  step="0.25"
                  {...register('fareAmount')}
                  placeholder="Official Fare (PHP)"
                  className="glass-input w-full rounded-2xl px-3 py-2 text-sm"
                />
                {errors.fareAmount && (
                  <p className="mt-1 text-xs text-red-600">{errors.fareAmount.message}</p>
                )}
              </div>
              <input
                type="date"
                {...register('effectiveDate')}
                className="glass-input w-full rounded-2xl px-3 py-2 text-sm"
              />
            </div>

            <select
              {...register('routeId')}
              className="glass-input w-full rounded-2xl px-3 py-2 text-sm"
            >
              <option value="">Optional linked registered route...</option>
              {(routes ?? []).map((r) => (
                <option key={r.id} value={r.id}>
                  {r.route_code} — {r.route_name}
                </option>
              ))}
            </select>

            <div>
              <input
                type="text"
                {...register('issuingAuthority')}
                placeholder="Issuing Authority (e.g., LTFRB Region IV-B)"
                className="glass-input w-full rounded-2xl px-3 py-2 text-sm"
              />
              {errors.issuingAuthority && (
                <p className="mt-1 text-xs text-red-600">{errors.issuingAuthority.message}</p>
              )}
            </div>

            <div>
              <input
                type="text"
                {...register('officialDocumentReference')}
                placeholder="Official Document Ref (e.g., LTFRB MC 2026-...)"
                className="glass-input w-full rounded-2xl px-3 py-2 text-sm"
              />
              {errors.officialDocumentReference && (
                <p className="mt-1 text-xs text-red-600">
                  {errors.officialDocumentReference.message}
                </p>
              )}
            </div>

            <input
              type="url"
              {...register('sourceUrl')}
              placeholder="Official Source URL (https://...)"
              className="glass-input w-full rounded-2xl px-3 py-2 text-sm"
            />

            <textarea
              rows={2}
              {...register('notes')}
              placeholder="Discount rules or applicability notes..."
              className="glass-input w-full rounded-2xl px-3 py-2 text-xs"
            />

            <GlassButton
              type="submit"
              variant="primary"
              className="w-full"
              disabled={publishMutation.isPending}
            >
              <CheckCircle2 className="h-4 w-4" />
              {publishMutation.isPending ? 'Publishing...' : 'Publish Verified Official Fare'}
            </GlassButton>
          </form>
        </GlassCard>

        <GlassCard variant="strong" className="p-6 lg:col-span-7 space-y-4">
          <h2 className="font-display text-lg font-bold text-[#29262B]">
            All Fare Records ({fareRecords?.length ?? 0})
          </h2>
          <div className="space-y-2.5 max-h-[600px] overflow-y-auto pr-1">
            {(fareRecords ?? []).map((rec) => (
              <div
                key={rec.id}
                className="glass-pill-tile flex flex-wrap items-center justify-between gap-3 rounded-[20px] p-3.5 text-xs"
              >
                <div className="space-y-0.5">
                  <p className="font-bold text-sm text-[#29262B]">
                    {rec.origin?.name} → {rec.destination?.name}
                  </p>
                  <p className="text-[#777078]">
                    {rec.transport_type?.name} •{' '}
                    {PASSENGER_CATEGORY_LABELS[rec.passenger_category]} •{' '}
                    <strong className="text-[#C9182B]">{formatPhp(rec.fare_amount)}</strong>
                  </p>
                  <p className="text-[#777078]">
                    {rec.issuing_authority} ({rec.official_document_reference || 'Community'}) •{' '}
                    {formatDateSafe(rec.last_verified_at || rec.updated_at)}
                  </p>
                </div>

                <div className="flex items-center gap-2">
                  <FareStatusBadge status={rec.status} compact />
                  {!rec.is_archived && (
                    <GlassButton
                      type="button"
                      variant="secondary"
                      size="sm"
                      onClick={() => setArchiveTargetId(rec.id)}
                    >
                      <Archive className="h-3.5 w-3.5" />
                      Archive
                    </GlassButton>
                  )}
                </div>
              </div>
            ))}
          </div>
        </GlassCard>
      </div>

      <ConfirmDialog
        open={Boolean(archiveTargetId)}
        onOpenChange={(open) => !open && setArchiveTargetId(null)}
        title="Archive Fare Record?"
        description="Archived fares remain in historical audit records but are hidden from active public route searches."
        confirmLabel="Archive Record"
        loading={archiveMutation.isPending}
        onConfirm={() => {
          if (archiveTargetId) archiveMutation.mutate(archiveTargetId);
        }}
      />
    </div>
  );
}
