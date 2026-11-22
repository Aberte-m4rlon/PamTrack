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
        <p className="text-xs font-bold uppercase tracking-widest text-[#DC2626]">
          Geospatial Master Registry
        </p>
        <h1 className="font-display text-2xl font-extrabold text-[#24191D]">
          Municipality Management (15 LGUs)
        </h1>
      </GlassCard>

      <GlassCard variant="strong">
        {/* Mobile Card Layout (< 768px) */}
        <div className="grid gap-3 p-3.5 md:hidden">
          {municipalities.map((m) => (
            <div key={m.id} className="glass-pill-tile rounded-[22px] p-4 space-y-2.5 text-xs">
              <div className="flex items-start justify-between gap-2">
                <div className="flex items-center gap-2 min-w-0">
                  <Building2 className="h-4 w-4 shrink-0 text-[#DC2626]" />
                  <p className="truncate font-display text-sm font-extrabold text-[#24191D]">
                    {m.name} {m.is_capital && '(Capital)'}
                  </p>
                </div>
                <span
                  className={`shrink-0 rounded-full border border-white/80 px-2.5 py-0.5 font-bold backdrop-blur-md ${
                    m.is_active
                      ? 'bg-[#FFE4E6]/90 text-[#B91C1C]'
                      : 'bg-white/75 text-[#4B3B40]'
                  }`}
                >
                  {m.is_active ? 'Active' : 'Inactive'}
                </span>
              </div>
              <div className="flex flex-wrap items-center justify-between gap-1 text-[#78716C]">
                <span>{m.district}</span>
                <span className="font-mono">
                  {m.latitude.toFixed(4)}°N, {m.longitude.toFixed(4)}°E
                </span>
              </div>
              <GlassButton
                type="button"
                variant="secondary"
                size="sm"
                className="w-full"
                disabled={!muniRes?.fromDatabase || toggleActive.isPending}
                onClick={() => toggleActive.mutate({ id: m.id, isActive: m.is_active })}
              >
                {m.is_active ? 'Deactivate' : 'Activate'}
              </GlassButton>
            </div>
          ))}
        </div>

        {/* Desktop/Tablet Table (>= 768px) */}
        <div className="hidden md:block overflow-x-auto">
          <table className="w-full min-w-[760px] text-left text-xs">
            <thead className="glass-table-head font-bold uppercase tracking-wider text-[#24191D]">
              <tr>
                <th className="px-4 py-3">LGU Name</th>
                <th className="px-4 py-3">District</th>
                <th className="px-4 py-3">Coordinates</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3">Toggle</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/60">
              {municipalities.map((m) => (
                <tr key={m.id} className="hover:bg-white/55 transition">
                  <td className="px-4 py-3 font-bold text-sm flex items-center gap-2 text-[#24191D]">
                    <Building2 className="h-4 w-4 text-[#DC2626]" />
                    {m.name} {m.is_capital && '(Capital)'}
                  </td>
                  <td className="px-4 py-3 text-[#78716C]">{m.district}</td>
                  <td className="px-4 py-3 font-mono text-[#78716C]">
                    {m.latitude.toFixed(4)}°N, {m.longitude.toFixed(4)}°E
                  </td>
                  <td className="px-4 py-3">
                    <span
                      className={`rounded-full border border-white/80 px-2.5 py-0.5 font-bold backdrop-blur-md ${
                        m.is_active
                          ? 'bg-[#FFE4E6]/90 text-[#B91C1C]'
                          : 'bg-white/75 text-[#4B3B40]'
                      }`}
                    >
                      {m.is_active ? 'Active' : 'Inactive'}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <GlassButton
                      type="button"
                      variant="secondary"
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
