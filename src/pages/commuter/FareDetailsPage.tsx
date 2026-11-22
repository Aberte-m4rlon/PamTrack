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
        title="Hindi makita ang rekord ng pamasahe"
        description="Wala o naka-archive na ang hinahanap mong rekord ng pamasahe."
        action={
          <Link to="/fare-matrix">
            <GlassButton variant="primary">Bumalik sa Fare Matrix</GlassButton>
          </Link>
        }
      />
    );
  }

  return (
    <div className="space-y-6">
      <Link to="/fare-matrix" className="inline-flex items-center gap-1.5 text-xs font-bold text-[#C9182B] hover:underline">
        <ArrowLeft className="h-4 w-4" />
        Bumalik sa Fare Matrix
      </Link>

      <GlassCard variant="strong" className="p-6 sm:p-8 space-y-6">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="space-y-1.5">
            <FareStatusBadge status={fare.status} />
            <h1 className="font-display text-2xl font-extrabold text-[#29262B] sm:text-3xl">
              {fare.origin?.name} → {fare.destination?.name}
            </h1>
            <p className="text-sm font-semibold text-[#B51224]">
              {fare.transport_type?.name} • {PASSENGER_CATEGORY_LABELS[fare.passenger_category]}
            </p>
          </div>
          <div className="glass-pill-tile rounded-[24px] px-6 py-4 text-right">
            <p className="text-[11px] font-bold uppercase tracking-wider text-[#B51224]">
              Nakalistang Pamasahe
            </p>
            <p className="font-display text-4xl font-extrabold text-[#C9182B] tabular-nums">
              {formatPhp(fare.fare_amount)}
            </p>
          </div>
        </div>

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 border-t border-white/75 pt-5 text-sm">
          <div className="space-y-1">
            <p className="text-xs font-bold uppercase tracking-wider text-[#777078] flex items-center gap-1.5">
              <ShieldCheck className="h-3.5 w-3.5 text-[#C9182B]" /> Pinagmulan ng Taripa
            </p>
            <p className="font-semibold text-[#29262B]">
              {fare.issuing_authority || 'Ulat ng Komunidad'}
            </p>
          </div>

          <div className="space-y-1">
            <p className="text-xs font-bold uppercase tracking-wider text-[#777078] flex items-center gap-1.5">
              <FileText className="h-3.5 w-3.5 text-[#C9182B]" /> Reference ng Dokumento
            </p>
            <p className="font-semibold text-[#29262B]">
              {fare.official_document_reference || 'Walang naka-attach na opisyal na reference'}
            </p>
          </div>

          <div className="space-y-1">
            <p className="text-xs font-bold uppercase tracking-wider text-[#777078] flex items-center gap-1.5">
              <CalendarCheck className="h-3.5 w-3.5 text-[#C9182B]" /> Huling Na-check / Epektibo
            </p>
            <p className="font-semibold text-[#29262B]">
              Na-check: {formatDateSafe(fare.last_verified_at)} • Epektibo:{' '}
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
              className="inline-flex items-center gap-1.5 text-sm font-bold text-[#C9182B] hover:underline"
            >
              Buksan ang Opisyal na Dokumento <ExternalLink className="h-4 w-4" />
            </a>
          </div>
        )}

        {fare.notes && (
          <div className="glass-pill-tile rounded-[20px] p-4 text-xs text-[#29262B]">
            <strong>Mga Tala:</strong> {fare.notes}
          </div>
        )}
      </GlassCard>

      {/* Verification Trail */}
      <GlassCard variant="surface" className="p-6 space-y-4">
        <h2 className="flex items-center gap-2 font-display text-lg font-bold text-[#29262B]">
          <History className="h-4 w-4 text-[#C9182B]" />
          Kasaysayan ng Pag-verify
        </h2>
        {!logs || logs.length === 0 ? (
          <p className="text-xs text-[#777078]">Wala pang naitalang review history dito.</p>
        ) : (
          <div className="space-y-2.5">
            {logs.map((log) => (
              <div
                key={log.id}
                className="flex flex-wrap items-center justify-between gap-2 rounded-2xl bg-white/85 border border-[#F8E7EA] p-3.5 text-xs"
              >
                <div>
                  <p className="font-bold text-[#29262B]">
                    {log.action.replace(/_/g, ' ')} → {log.new_status}
                  </p>
                  {log.source_reference && (
                    <p className="text-[#777078]">Ref: {log.source_reference}</p>
                  )}
                  {log.reason && <p className="text-[#777078]">{log.reason}</p>}
                </div>
                <span className="font-semibold text-[#C9182B]">
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
