import { Link, useParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { ArrowLeft, CalendarCheck, ExternalLink, FileText, History, ShieldCheck } from 'lucide-react';
import { fetchFareRecordById, fetchVerificationLogs } from '@/services/pamasaheApi';
import { PASSENGER_CATEGORY_LABELS } from '@/lib/fareIntegrity';
import { formatDateSafe, formatDateTimeSafe, formatPhp } from '@/lib/utils';
import {
  EmptyStateCard,
  FareStatusBadge,
  GlassButton,
  GlassCard,
  GlassSkeleton,
} from '@/components/glass/GlassPrimitives';

export function FareDetailsPage() {
  const { id } = useParams<{ id: string }>();

  const { data: fare, isLoading } = useQuery({
    queryKey: ['fareRecord', id],
    queryFn: () => fetchFareRecordById(id!),
    enabled: Boolean(id),
  });

  const { data: logs } = useQuery({
    queryKey: ['verificationLogs', id],
    queryFn: () => fetchVerificationLogs(id),
    enabled: Boolean(id),
  });

  if (isLoading) {
    return <GlassSkeleton className="h-64" />;
  }

  if (!fare) {
    return (
      <EmptyStateCard
        title="Fare record not found"
        description="The requested fare record does not exist or has been archived."
        action={
          <Link to="/fare-matrix">
            <GlassButton variant="primary">Back to Fare Matrix</GlassButton>
          </Link>
        }
      />
    );
  }

  return (
    <div className="space-y-6">
      <Link to="/fare-matrix" className="inline-flex items-center gap-1.5 text-xs font-bold text-[#176B4B] hover:underline">
        <ArrowLeft className="h-4 w-4" />
        Back to Fare Matrix
      </Link>

      <GlassCard variant="strong" className="p-6 sm:p-8 space-y-6">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="space-y-1.5">
            <FareStatusBadge status={fare.status} />
            <h1 className="font-display text-2xl font-extrabold text-[#183329] sm:text-3xl">
              {fare.origin?.name} → {fare.destination?.name}
            </h1>
            <p className="text-sm font-semibold text-[#24966A]">
              {fare.transport_type?.name} • {PASSENGER_CATEGORY_LABELS[fare.passenger_category]}
            </p>
          </div>
          <div className="rounded-3xl bg-[#DFF7E8] px-6 py-4 text-right border border-[#10B981]/30">
            <p className="text-[11px] font-bold uppercase tracking-wider text-[#176B4B]">
              Published Amount
            </p>
            <p className="font-display text-4xl font-extrabold text-[#176B4B]">
              {formatPhp(fare.fare_amount)}
            </p>
          </div>
        </div>

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 border-t border-[#176B4B]/15 pt-5 text-sm">
          <div className="space-y-1">
            <p className="text-xs font-bold uppercase tracking-wider text-[#183329]/65 flex items-center gap-1.5">
              <ShieldCheck className="h-3.5 w-3.5 text-[#176B4B]" /> Issuing Authority
            </p>
            <p className="font-semibold text-[#183329]">
              {fare.issuing_authority || 'Community Submission'}
            </p>
          </div>

          <div className="space-y-1">
            <p className="text-xs font-bold uppercase tracking-wider text-[#183329]/65 flex items-center gap-1.5">
              <FileText className="h-3.5 w-3.5 text-[#176B4B]" /> Document Reference
            </p>
            <p className="font-semibold text-[#183329]">
              {fare.official_document_reference || 'No official reference attached'}
            </p>
          </div>

          <div className="space-y-1">
            <p className="text-xs font-bold uppercase tracking-wider text-[#183329]/65 flex items-center gap-1.5">
              <CalendarCheck className="h-3.5 w-3.5 text-[#176B4B]" /> Last Verified / Effective
            </p>
            <p className="font-semibold text-[#183329]">
              Verified: {formatDateSafe(fare.last_verified_at)} • Effective:{' '}
              {formatDateSafe(fare.effective_date)}
            </p>
          </div>
        </div>

        {fare.source_url && (
          <div>
            <a
              href={fare.source_url}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-1.5 text-sm font-bold text-[#176B4B] hover:underline"
            >
              Open Official Source Document <ExternalLink className="h-4 w-4" />
            </a>
          </div>
        )}

        {fare.notes && (
          <div className="rounded-2xl bg-white/70 p-4 text-xs text-[#183329]/85">
            <strong>Notes:</strong> {fare.notes}
          </div>
        )}
      </GlassCard>

      {/* Verification Trail */}
      <GlassCard variant="surface" className="p-6 space-y-4">
        <h2 className="flex items-center gap-2 font-display text-lg font-bold text-[#183329]">
          <History className="h-4 w-4 text-[#176B4B]" />
          Verification Audit Trail
        </h2>
        {!logs || logs.length === 0 ? (
          <p className="text-xs text-[#183329]/75">No verification audit entries recorded yet.</p>
        ) : (
          <div className="space-y-2.5">
            {logs.map((log) => (
              <div
                key={log.id}
                className="flex flex-wrap items-center justify-between gap-2 rounded-2xl bg-white/75 p-3.5 text-xs"
              >
                <div>
                  <p className="font-bold text-[#183329]">
                    {log.action.replace(/_/g, ' ')} → {log.new_status}
                  </p>
                  {log.source_reference && (
                    <p className="text-[#183329]/75">Ref: {log.source_reference}</p>
                  )}
                  {log.reason && <p className="text-[#183329]/75">{log.reason}</p>}
                </div>
                <span className="font-semibold text-[#176B4B]">
                  {formatDateTimeSafe(log.created_at)}
                </span>
              </div>
            ))}
          </div>
        )}
      </GlassCard>
    </div>
  );
}
