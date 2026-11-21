import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Building2 } from 'lucide-react';
import { useToast } from '@/contexts/ToastContext';
import { useMunicipalities } from '@/hooks/useReferenceData';
import { supabase } from '@/lib/supabase';
import { GlassButton, GlassCard } from '@/components/glass/GlassPrimitives';

export function MunicipalityManagementPage() {
  const { pushToast } = useToast();
  const queryClient = useQueryClient();
  const { data: muniRes } = useMunicipalities(true);
  const municipalities = muniRes?.data ?? [];

  const toggleActive = useMutation({
    mutationFn: async ({ id, isActive }: { id: string; isActive: boolean }) => {
      if (!supabase) throw new Error('Supabase not configured');
      const { error } = await supabase
        .from('municipalities')
        .update({ is_active: !isActive })
        .eq('id', id);
      if (error) throw new Error(error.message);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['municipalities'] });
      pushToast({ title: 'Municipality status updated', variant: 'success' });
    },
    onError: (err: Error) => {
      pushToast({ title: 'Update failed', description: err.message, variant: 'error' });
    },
  });

  return (
    <div className="space-y-6">
      <GlassCard variant="strong" className="p-6">
        <p className="text-xs font-bold uppercase tracking-widest text-[#176B4B]">
          Geospatial Master Registry
        </p>
        <h1 className="font-display text-2xl font-extrabold text-[#183329]">
          Municipality Management (15 LGUs)
        </h1>
      </GlassCard>

      <GlassCard variant="strong" className="overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[760px] text-left text-xs">
            <thead className="border-b border-[#176B4B]/15 bg-[#DFF7E8]/70 font-bold uppercase tracking-wider text-[#183329]">
              <tr>
                <th className="px-4 py-3">LGU Name</th>
                <th className="px-4 py-3">District</th>
                <th className="px-4 py-3">Coordinates</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3">Toggle</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#176B4B]/10">
              {municipalities.map((m) => (
                <tr key={m.id} className="hover:bg-white/60">
                  <td className="px-4 py-3 font-bold text-sm flex items-center gap-2">
                    <Building2 className="h-4 w-4 text-[#176B4B]" />
                    {m.name} {m.is_capital && '(Capital)'}
                  </td>
                  <td className="px-4 py-3">{m.district}</td>
                  <td className="px-4 py-3 font-mono">
                    {m.latitude.toFixed(4)}°N, {m.longitude.toFixed(4)}°E
                  </td>
                  <td className="px-4 py-3">
                    <span
                      className={`rounded-full px-2.5 py-0.5 font-bold ${
                        m.is_active
                          ? 'bg-emerald-100 text-[#176B4B]'
                          : 'bg-slate-200 text-slate-700'
                      }`}
                    >
                      {m.is_active ? 'Active' : 'Inactive'}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <GlassButton
                      type="button"
                      variant="glass"
                      size="sm"
                      disabled={!muniRes?.fromDatabase || toggleActive.isPending}
                      onClick={() => toggleActive.mutate({ id: m.id, isActive: m.is_active })}
                    >
                      {m.is_active ? 'Deactivate' : 'Activate'}
                    </GlassButton>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </GlassCard>
    </div>
  );
}
