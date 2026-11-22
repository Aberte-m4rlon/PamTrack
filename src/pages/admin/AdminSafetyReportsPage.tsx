import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { ShieldAlert } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/contexts/ToastContext';
import { useAdminSafetyReports } from '@/hooks/useReferenceData';
import { formatDateTimeSafe } from '@/lib/utils';
import { updateSafetyReportAdmin } from '@/services/pamasaheApi';
import type { SafetyReportStatus } from '@/types/database';
import {
  EmptyStateCard,
  GlassButton,
  GlassCard,
  GlassSkeleton,
} from '@/components/glass/GlassPrimitives';

export function AdminSafetyReportsPage() {
  const { user } = useAuth();
  const { pushToast } = useToast();
  const queryClient = useQueryClient();
  const { data: reports, isLoading } = useAdminSafetyReports();
  const [notesMap, setNotesMap] = useState<Record<string, string>>({});

  const updateMut = useMutation({
    mutationFn: ({ id, status }: { id: string; status: SafetyReportStatus }) =>
      updateSafetyReportAdmin({
        reportId: id,
        status,
        adminNotes: notesMap[id] ?? '',
        reviewerId: user!.id,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['adminSafetyReports'] });
      pushToast({ title: 'Safety report updated & reporter notified', variant: 'success' });
    },
    onError: (err: Error) => {
      pushToast({ title: 'Update failed', description: err.message, variant: 'error' });
    },
  });

  return (
    <div className="space-y-6">
      <GlassCard variant="strong" className="p-6">
        <p className="text-xs font-bold uppercase tracking-widest text-[#DC2626]">
          Commuter Safety Moderation
        </p>
        <h1 className="font-display text-2xl font-extrabold text-[#24191D]">
          Safety Incident Reports
        </h1>
      </GlassCard>

      {isLoading ? (
        <GlassSkeleton className="h-48" />
      ) : !reports || reports.length === 0 ? (
        <EmptyStateCard
          icon={ShieldAlert}
          title="No safety reports submitted"
          description="Safety incident submissions from commuters will appear here for administrator action."
        />
      ) : (
        <div className="space-y-4">
          {reports.map((rep) => (
            <GlassCard key={rep.id} variant="strong" className="p-5 space-y-3 text-xs">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="glass-pill-tile rounded-full px-2.5 py-0.5 font-bold uppercase text-[#B91C1C]">
                    {rep.severity}
                  </span>
                  <span className="font-display text-base font-bold text-[#24191D]">
                    {rep.incident_type}
                  </span>
                </div>
                <span className="glass-pill-tile rounded-full px-3 py-1 font-bold uppercase text-[#DC2626]">
                  {rep.status}
                </span>
              </div>

              <p className="text-sm text-[#24191D]/85">{rep.description}</p>
              <p className="text-[#78716C]">
                Submitted {formatDateTimeSafe(rep.created_at)}
                {rep.vehicle_or_operator_details
                  ? ` • Vehicle: ${rep.vehicle_or_operator_details}`
                  : ''}
              </p>

              <div className="flex flex-wrap gap-2 items-center pt-1">
                <input
                  type="text"
                  value={notesMap[rep.id] ?? rep.admin_notes ?? ''}
                  onChange={(e) =>
                    setNotesMap((prev) => ({ ...prev, [rep.id]: e.target.value }))
                  }
                  placeholder="Administrator response / resolution notes..."
                  className="glass-input w-full min-w-0 sm:flex-1 sm:min-w-[220px] rounded-2xl px-3.5 py-2"
                />
                {(['investigating', 'resolved', 'dismissed'] as SafetyReportStatus[]).map(
                  (nextStatus) => (
                    <GlassButton
                      key={nextStatus}
                      type="button"
                      variant={nextStatus === 'resolved' ? 'primary' : 'secondary'}
                      size="sm"
                      disabled={updateMut.isPending}
                      onClick={() => updateMut.mutate({ id: rep.id, status: nextStatus })}
                    >
                      Mark {nextStatus}
                    </GlassButton>
                  )
                )}
              </div>
            </GlassCard>
          ))}
        </div>
      )}
    </div>
  );
}
