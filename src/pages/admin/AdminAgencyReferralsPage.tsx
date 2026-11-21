import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Send } from 'lucide-react';
import { useToast } from '@/contexts/ToastContext';
import { useAdminAgencyReferrals } from '@/hooks/useReferenceData';
import { formatDateSafe } from '@/lib/utils';
import { updateAgencyReferralRecord } from '@/services/pamasaheApi';
import type { ReferralStatus } from '@/types/database';
import {
  EmptyStateCard,
  GlassButton,
  GlassCard,
  GlassSkeleton,
} from '@/components/glass/GlassPrimitives';

export function AdminAgencyReferralsPage() {
  const { pushToast } = useToast();
  const queryClient = useQueryClient();
  const { data: referrals, isLoading } = useAdminAgencyReferrals();

  const [extRefs, setExtRefs] = useState<Record<string, string>>({});
  const [statuses, setStatuses] = useState<Record<string, ReferralStatus>>({});
  const [notes, setNotes] = useState<Record<string, string>>({});

  const updateMut = useMutation({
    mutationFn: (id: string) =>
      updateAgencyReferralRecord({
        referralId: id,
        referralStatus: statuses[id] ?? 'Referred by Administrator',
        externalReferenceNumber: extRefs[id],
        referralNotes: notes[id],
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['adminAgencyReferrals'] });
      pushToast({ title: 'Agency referral updated', variant: 'success' });
    },
    onError: (err: Error) => {
      pushToast({ title: 'Update failed', description: err.message, variant: 'error' });
    },
  });

  return (
    <div className="space-y-6">
      <GlassCard variant="strong" className="p-6">
        <p className="text-xs font-bold uppercase tracking-widest text-[#DC2626]">
          External Coordination Tracking
        </p>
        <h1 className="font-display text-2xl font-extrabold text-[#24191D]">
          Agency Referrals
        </h1>
      </GlassCard>

      {isLoading ? (
        <GlassSkeleton className="h-48" />
      ) : !referrals || referrals.length === 0 ? (
        <EmptyStateCard
          icon={Send}
          title="No agency referrals recorded yet"
          description="Referrals prepared by consented commuters or administrators appear here for tracking external agency acknowledgments."
        />
      ) : (
        <div className="space-y-3">
          {referrals.map((r: any) => (
            <GlassCard key={r.id} variant="strong" className="p-5 space-y-3 text-xs">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div>
                  <p className="font-mono font-extrabold text-[#DC2626]">
                    {r.report?.reference_number ?? r.report_id}
                  </p>
                  <p className="font-bold text-sm text-[#24191D]">
                    {r.agency?.agency_name}
                  </p>
                  <p className="text-[#78716C]">
                    Vehicle: {r.report?.vehicle_type} ({r.report?.plate_number || 'Plate N/A'}) •
                    Created: {formatDateSafe(r.created_at)}
                  </p>
                </div>
                <span className="rounded-full bg-[#FFE4E6] px-3 py-1 font-bold text-[#B91C1C]">
                  {r.referral_status}
                </span>
              </div>

              <div className="grid gap-2 sm:grid-cols-3">
                <select
                  value={statuses[r.id] ?? r.referral_status}
                  onChange={(e) =>
                    setStatuses((prev) => ({
                      ...prev,
                      [r.id]: e.target.value as ReferralStatus,
                    }))
                  }
                  className="glass-input rounded-xl px-3 py-1.5"
                >
                  <option value="Prepared for Manual Submission">
                    Prepared for Manual Submission
                  </option>
                  <option value="Submitted Externally by Reporter">
                    Submitted Externally by Reporter
                  </option>
                  <option value="Referred by Administrator">Referred by Administrator</option>
                  <option value="Acknowledged by Agency">Acknowledged by Agency</option>
                  <option value="Under Agency Investigation">Under Agency Investigation</option>
                  <option value="Closed">Closed</option>
                </select>
                <input
                  type="text"
                  value={extRefs[r.id] ?? r.external_reference_number ?? ''}
                  onChange={(e) =>
                    setExtRefs((prev) => ({ ...prev, [r.id]: e.target.value }))
                  }
                  placeholder="External Agency Ref #"
                  className="glass-input rounded-xl px-3 py-1.5"
                />
                <input
                  type="text"
                  value={notes[r.id] ?? r.referral_notes ?? ''}
                  onChange={(e) =>
                    setNotes((prev) => ({ ...prev, [r.id]: e.target.value }))
                  }
                  placeholder="Referral notes"
                  className="glass-input rounded-xl px-3 py-1.5"
                />
              </div>

              <GlassButton
                type="button"
                variant="primary"
                size="sm"
                onClick={() => updateMut.mutate(r.id)}
              >
                Save Referral Record
              </GlassButton>
            </GlassCard>
          ))}
        </div>
      )}
    </div>
  );
}
