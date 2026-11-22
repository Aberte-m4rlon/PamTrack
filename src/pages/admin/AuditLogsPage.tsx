import { useQuery } from '@tanstack/react-query';
import { FileText, History } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { formatDateTimeSafe } from '@/lib/utils';
import { fetchAuditLogs, fetchVerificationLogs } from '@/services/pamasaheApi';
import { GlassCard, GlassSkeleton } from '@/components/glass/GlassPrimitives';

export function AuditLogsPage() {
  const { isConfigured } = useAuth();
  const { data: auditLogs, isLoading: auditLoading } = useQuery({
    queryKey: ['auditLogs'],
    queryFn: fetchAuditLogs,
    enabled: isConfigured,
  });

  const { data: verificationLogs, isLoading: verifLoading } = useQuery({
    queryKey: ['verificationLogsAll'],
    queryFn: () => fetchVerificationLogs(),
    enabled: isConfigured,
  });

  return (
    <div className="space-y-6">
      <GlassCard variant="strong" className="p-6">
        <p className="text-xs font-bold uppercase tracking-widest text-[#C9182B]">
          Compliance &amp; Security
        </p>
        <h1 className="font-display text-2xl font-extrabold text-[#29262B]">
          Audit &amp; Verification Logs
        </h1>
      </GlassCard>

      <div className="grid gap-6 lg:grid-cols-2">
        <GlassCard variant="strong" className="p-5 space-y-3">
          <h2 className="flex items-center gap-2 font-display text-lg font-bold text-[#29262B]">
            <History className="h-4 w-4 text-[#C9182B]" />
            Fare Verification Trail
          </h2>
          {verifLoading ? (
            <GlassSkeleton className="h-48" />
          ) : (
            <div className="space-y-2 max-h-[500px] overflow-y-auto pr-1">
              {(verificationLogs ?? []).map((v) => (
                <div key={v.id} className="glass-pill-tile rounded-[20px] p-3 text-xs space-y-0.5">
                  <div className="flex justify-between font-bold text-[#C9182B]">
                    <span>{v.action}</span>
                    <span>{formatDateTimeSafe(v.created_at)}</span>
                  </div>
                  <p className="text-[#29262B]">
                    {v.previous_status ?? 'none'} → <strong>{v.new_status}</strong>
                  </p>
                  {v.source_reference && <p className="text-[#777078]">Doc Ref: {v.source_reference}</p>}
                  {v.reason && <p className="text-[#777078]">{v.reason}</p>}
                </div>
              ))}
            </div>
          )}
        </GlassCard>

        <GlassCard variant="strong" className="p-5 space-y-3">
          <h2 className="flex items-center gap-2 font-display text-lg font-bold text-[#29262B]">
            <FileText className="h-4 w-4 text-[#C9182B]" />
            System Audit Logs
          </h2>
          {auditLoading ? (
            <GlassSkeleton className="h-48" />
          ) : (
            <div className="space-y-2 max-h-[500px] overflow-y-auto pr-1">
              {(auditLogs ?? []).map((a) => (
                <div key={a.id} className="glass-pill-tile rounded-[20px] p-3 text-xs space-y-0.5">
                  <div className="flex justify-between font-bold text-[#29262B]">
                    <span>{a.action}</span>
                    <span className="text-[#C9182B]">{formatDateTimeSafe(a.created_at)}</span>
                  </div>
                  <p className="text-[#777078]">
                    Role: {a.actor_role ?? 'system'} • {a.entity_type} ({a.entity_id ?? 'N/A'})
                  </p>
                </div>
              ))}
            </div>
          )}
        </GlassCard>
      </div>
    </div>
  );
}
