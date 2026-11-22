import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { Activity, ShieldCheck } from 'lucide-react';
import { useAdminAggregatedAnalytics } from '@/hooks/useReferenceData';
import { LIGHT_RED_THEME } from '@/lib/theme';
import { GlassCard, GlassSkeleton } from '@/components/glass/GlassPrimitives';

export function AdminTripAnalyticsPage() {
  const { data, isLoading } = useAdminAggregatedAnalytics();

  return (
    <div className="space-y-6">
      <GlassCard variant="strong" className="p-6 space-y-1.5">
        <p className="text-xs font-bold uppercase tracking-widest text-[#DC2626]">
          Privacy-Preserving Operations Analytics
        </p>
        <h1 className="font-display text-2xl font-extrabold text-[#24191D]">
          Aggregated Trip Analytics
        </h1>
        <p className="flex items-center gap-1.5 text-xs text-[#78716C]">
          <ShieldCheck className="h-4 w-4 text-[#DC2626]" />
          Individual commuter GPS trails and personal coordinates are strictly protected by RLS and
          never exposed here. Only aggregated usage counts are shown.
        </p>
      </GlassCard>

      {isLoading || !data ? (
        <GlassSkeleton className="h-56" />
      ) : (
        <>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <GlassCard variant="strong" className="p-4">
              <p className="text-[11px] font-bold uppercase text-[#78716C]">Active Trips</p>
              <p className="mt-1 font-display text-2xl font-extrabold text-[#DC2626]">
                {data.active_trips}
              </p>
            </GlassCard>
            <GlassCard variant="strong" className="p-4">
              <p className="text-[11px] font-bold uppercase text-[#78716C]">Completed Trips</p>
              <p className="mt-1 font-display text-2xl font-extrabold text-[#DC2626]">
                {data.completed_trips}
              </p>
            </GlassCard>
            <GlassCard variant="strong" className="p-4">
              <p className="text-[11px] font-bold uppercase text-[#78716C]">
                Total Distance Logged
              </p>
              <p className="mt-1 font-display text-2xl font-extrabold text-[#DC2626]">
                {data.total_distance_km} km
              </p>
            </GlassCard>
            <GlassCard variant="strong" className="p-4">
              <p className="text-[11px] font-bold uppercase text-[#78716C]">
                GPS-Consented Accounts
              </p>
              <p className="mt-1 font-display text-2xl font-extrabold text-[#B91C1C]">
                {data.gps_consented_users}
              </p>
            </GlassCard>
          </div>

          <GlassCard variant="strong" className="p-5 space-y-3">
            <h2 className="flex items-center gap-2 font-display text-lg font-bold text-[#24191D]">
              <Activity className="h-4 w-4 text-[#DC2626]" />
              Aggregated Transportation Mode Usage
            </h2>
            {data.mode_usage.length === 0 ? (
              <p className="text-xs text-[#78716C]">No trip telemetry logged yet.</p>
            ) : (
              <div className="h-64 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={data.mode_usage}>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(120,113,108,0.16)" />
                    <XAxis dataKey="mode_name" tick={{ fill: '#24191D', fontSize: 11 }} />
                    <YAxis allowDecimals={false} tick={{ fill: '#24191D', fontSize: 11 }} />
                    <Tooltip contentStyle={LIGHT_RED_THEME.charts.tooltipStyle} />
                    <Bar dataKey="trip_count" fill="#DC2626" radius={[12, 12, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            )}
          </GlassCard>
        </>
      )}
    </div>
  );
}
