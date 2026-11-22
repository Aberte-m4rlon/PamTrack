import { useMemo } from 'react';
import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { BarChart3 } from 'lucide-react';
import { useAdminVehicleReports } from '@/hooks/useReferenceData';
import { LIGHT_RED_THEME } from '@/lib/theme';
import { GlassCard, GlassSkeleton } from '@/components/glass/GlassPrimitives';

export function AdminVehicleAnalyticsPage() {
  const { data: reports, isLoading } = useAdminVehicleReports();

  const stats = useMemo(() => {
    const list = reports ?? [];
    const byType = new Map<string, number>();
    const byGroup = new Map<string, number>();
    const byMuni = new Map<string, number>();

    for (const r of list) {
      byType.set(r.vehicle_type, (byType.get(r.vehicle_type) ?? 0) + 1);
      const muni = r.municipality?.name ?? 'Unknown';
      byMuni.set(muni, (byMuni.get(muni) ?? 0) + 1);
      for (const c of r.categories ?? []) {
        byGroup.set(c.category_group, (byGroup.get(c.category_group) ?? 0) + 1);
      }
    }

    return {
      total: list.length,
      openCount: list.filter(
        (r) => !['Resolved', 'Closed', 'Rejected', 'Withdrawn'].includes(r.complaint_status)
      ).length,
      referredCount: list.filter((r) =>
        [
          'Referred to Appropriate Agency',
          'Acknowledged by Agency',
          'Under Agency Investigation',
        ].includes(r.complaint_status)
      ).length,
      typeChart: Array.from(byType.entries()).map(([name, count]) => ({ name, count })),
      groupChart: Array.from(byGroup.entries()).map(([name, count]) => ({ name, count })),
      muniList: Array.from(byMuni.entries()).sort((a, b) => b[1] - a[1]),
    };
  }, [reports]);

  return (
    <div className="space-y-6">
      <GlassCard variant="strong" className="p-6">
        <p className="text-xs font-bold uppercase tracking-widest text-[#C9182B]">
          Internal Compliance Metrics
        </p>
        <h1 className="font-display text-2xl font-extrabold text-[#29262B]">
          Vehicle Report Analytics
        </h1>
        <p className="text-xs text-[#777078]">
          Aggregated internal analytics only. Individual reports and unverified allegations are
          never exposed as a public driver or vehicle blacklist.
        </p>
      </GlassCard>

      {isLoading ? (
        <GlassSkeleton className="h-56" />
      ) : (
        <>
          <div className="grid gap-4 sm:grid-cols-3">
            <GlassCard variant="strong" className="p-4">
              <p className="text-xs font-bold uppercase text-[#777078]">Total Reports</p>
              <p className="mt-1 font-display text-2xl font-extrabold text-[#C9182B]">
                {stats.total}
              </p>
            </GlassCard>
            <GlassCard variant="strong" className="p-4">
              <p className="text-xs font-bold uppercase text-[#777078]">Active Review Queue</p>
              <p className="mt-1 font-display text-2xl font-extrabold text-[#B51224]">
                {stats.openCount}
              </p>
            </GlassCard>
            <GlassCard variant="strong" className="p-4">
              <p className="text-xs font-bold uppercase text-[#777078]">Agency Referrals</p>
              <p className="mt-1 font-display text-2xl font-extrabold text-[#C9182B]">
                {stats.referredCount}
              </p>
            </GlassCard>
          </div>

          <div className="grid gap-6 lg:grid-cols-2">
            <GlassCard variant="strong" className="p-5 space-y-3">
              <h2 className="flex items-center gap-2 font-display text-lg font-bold text-[#29262B]">
                <BarChart3 className="h-4 w-4 text-[#C9182B]" />
                Reports by Vehicle Category
              </h2>
              <div className="h-64 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={stats.typeChart}>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(120,113,108,0.16)" />
                    <XAxis dataKey="name" tick={{ fill: '#29262B', fontSize: 10 }} />
                    <YAxis allowDecimals={false} tick={{ fill: '#29262B', fontSize: 11 }} />
                    <Tooltip contentStyle={LIGHT_RED_THEME.charts.tooltipStyle} />
                    <Bar dataKey="count" fill="#C9182B" radius={[12, 12, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </GlassCard>

            <GlassCard variant="strong" className="p-5 space-y-3">
              <h2 className="font-display text-lg font-bold text-[#29262B]">
                Reports by Alleged Violation Group
              </h2>
              <div className="h-64 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={stats.groupChart}>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(120,113,108,0.16)" />
                    <XAxis dataKey="name" tick={{ fill: '#29262B', fontSize: 9 }} />
                    <YAxis allowDecimals={false} tick={{ fill: '#29262B', fontSize: 11 }} />
                    <Tooltip contentStyle={LIGHT_RED_THEME.charts.tooltipStyle} />
                    <Bar dataKey="count" fill="#C9182B" radius={[8, 8, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </GlassCard>
          </div>
        </>
      )}
    </div>
  );
}
