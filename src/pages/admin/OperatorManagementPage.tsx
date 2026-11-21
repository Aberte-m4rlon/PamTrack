import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Truck } from 'lucide-react';
import { useToast } from '@/contexts/ToastContext';
import { useOperators } from '@/hooks/useReferenceData';
import { upsertTransportOperator } from '@/services/pamasaheApi';
import type { TransportOperator } from '@/types/database';
import {
  EmptyStateCard,
  GlassButton,
  GlassCard,
} from '@/components/glass/GlassPrimitives';

export function OperatorManagementPage() {
  const { pushToast } = useToast();
  const queryClient = useQueryClient();
  const { data: operators } = useOperators();

  const statusMutation = useMutation({
    mutationFn: ({
      op,
      verification_status,
    }: {
      op: TransportOperator;
      verification_status: 'verified' | 'suspended' | 'pending';
    }) =>
      upsertTransportOperator({
        id: op.id,
        operator_name: op.operator_name,
        verification_status,
        verified_at: verification_status === 'verified' ? new Date().toISOString() : null,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['operators'] });
      pushToast({ title: 'Operator verification status updated', variant: 'success' });
    },
    onError: (err: Error) => {
      pushToast({ title: 'Update failed', description: err.message, variant: 'error' });
    },
  });

  return (
    <div className="space-y-6">
      <GlassCard variant="strong" className="p-6">
        <p className="text-xs font-bold uppercase tracking-widest text-[#176B4B]">Fleet Directory</p>
        <h1 className="font-display text-2xl font-extrabold text-[#183329]">
          Transport Operators
        </h1>
      </GlassCard>

      {!operators || operators.length === 0 ? (
        <EmptyStateCard
          icon={Truck}
          title="No transport operators registered yet"
          description="Transport operators who register via the Operator Portal appear here for franchise verification."
        />
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {operators.map((op) => (
            <GlassCard key={op.id} variant="strong" className="p-5 space-y-3">
              <div className="flex items-start justify-between">
                <div>
                  <h2 className="font-display text-lg font-bold text-[#183329]">
                    {op.operator_name}
                  </h2>
                  <p className="text-xs text-[#183329]/75">
                    Franchise: {op.franchise_or_permit_number || 'None'} •{' '}
                    {op.contact_phone || 'No phone'}
                  </p>
                </div>
                <span className="rounded-full bg-[#DFF7E8] px-3 py-1 text-[11px] font-bold uppercase text-[#176B4B]">
                  {op.verification_status}
                </span>
              </div>
              <div className="flex gap-2">
                <GlassButton
                  type="button"
                  variant="primary"
                  size="sm"
                  onClick={() => statusMutation.mutate({ op, verification_status: 'verified' })}
                >
                  Verify Operator
                </GlassButton>
                <GlassButton
                  type="button"
                  variant="danger"
                  size="sm"
                  onClick={() => statusMutation.mutate({ op, verification_status: 'suspended' })}
                >
                  Suspend
                </GlassButton>
              </div>
            </GlassCard>
          ))}
        </div>
      )}
    </div>
  );
}
