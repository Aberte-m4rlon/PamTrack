import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { BarChart3, Clock, Navigation, Trash2 } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/contexts/ToastContext';
import { useMyTrips } from '@/hooks/useReferenceData';
import { formatDurationSeconds } from '@/lib/gpsUtils';
import { LIGHT_RED_THEME } from '@/lib/theme';
import { formatDateTimeSafe, formatPhp } from '@/lib/utils';
import { deleteMyLocationHistory } from '@/services/pamasaheApi';
import {
  ConfirmDialog,
  EmptyStateCard,
  GlassButton,
  GlassCard,
  GlassSkeleton,
} from '@/components/glass/GlassPrimitives';

export function TripAnalyticsPage() {
  const { user } = useAuth();
  const { pushToast } = useToast();
  const queryClient = useQueryClient();
  const { data: trips, isLoading } = useMyTrips();
  const [confirmClearOpen, setConfirmClearOpen] = useState(false);

  const deleteHistoryMutation = useMutation({
    mutationFn: () => deleteMyLocationHistory(true),
    onSuccess: (res) => {
      queryClient.invalidateQueries({ queryKey: ['myTrips', user?.id] });
      queryClient.invalidateQueries({ queryKey: ['locationSharing', user?.id] });
      setConfirmClearOpen(false);
      pushToast({
        title: 'Personal location & trip history deleted',
        description: `Removed ${res.points_deleted} GPS point(s) and ${res.trips_affected} trip(s).`,
        variant: 'success',
      });
    },
    onError: (err: Error) => {
      pushToast({ title: 'Deletion failed', description: err.message, variant: 'error' });
    },
  });

  const stats = useMemo(() => {
    const all = trips ?? [];
    const now = Date.now();
    const dayMs = 24 * 60 * 60 * 1000;

    let dailyCount = 0;
    let weeklyCount = 0;
    let monthlyCount = 0;
    let totalDistanceKm = 0;
    let recordedExpensePhp = 0;
    let estimatedExpensePhp = 0;

    const destCounts = new Map<string, number>();
    const modeCounts = new Map<string, number>();

    for (const t of all) {
      const ageMs = now - new Date(t.started_at).getTime();
      if (ageMs <= dayMs) dailyCount += 1;
      if (ageMs <= 7 * dayMs) weeklyCount += 1;
      if (ageMs <= 30 * dayMs) monthlyCount += 1;

      totalDistanceKm += Number(t.distance_km ?? 0);

      if (t.recorded_fare_amount !== null) {
        if (t.fare_expense_type === 'recorded') {
          recordedExpensePhp += Number(t.recorded_fare_amount);
        } else if (t.fare_expense_type === 'estimated') {
          estimatedExpensePhp += Number(t.recorded_fare_amount);
        }
      }

      if (t.destination?.name) {
        destCounts.set(t.destination.name, (destCounts.get(t.destination.name) ?? 0) + 1);
      }
      if (t.transport_type?.name) {
        modeCounts.set(t.transport_type.name, (modeCounts.get(t.transport_type.name) ?? 0) + 1);
      }
    }

    const topDestinations = Array.from(destCounts.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5);
    const modeChart = Array.from(modeCounts.entries()).map(([name, tripsCount]) => ({
      name,
      trips: tripsCount,
    }));

    return {
      dailyCount,
      weeklyCount,
      monthlyCount,
      totalDistanceKm: Number(totalDistanceKm.toFixed(2)),
      recordedExpensePhp,
      estimatedExpensePhp,
      topDestinations,
      modeChart,
    };
  }, [trips]);

  return (
    <div className="space-y-6">
      <GlassCard variant="strong" className="p-6 flex flex-wrap items-center justify-between gap-4">
        <div>
          <p className="text-xs font-bold uppercase tracking-widest text-[#C9182B]">
            Personal Travel Insights
          </p>
          <h1 className="font-display text-2xl font-extrabold text-[#29262B] sm:text-3xl">
            Trip History &amp; Analytics
          </h1>
          <p className="text-sm text-[#777078]">
            Track daily, weekly, and monthly trips, distances, and strictly separated recorded vs.
            estimated fare expenses.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link to="/trips">
            <GlassButton variant="primary" size="sm">
              <Navigation className="h-3.5 w-3.5" />
              New Live Trip
            </GlassButton>
          </Link>
          <GlassButton
            type="button"
            variant="danger"
            size="sm"
            disabled={!trips || trips.length === 0}
            onClick={() => setConfirmClearOpen(true)}
          >
            <Trash2 className="h-3.5 w-3.5" />
            Delete Location History
          </GlassButton>
        </div>
      </GlassCard>

      {/* Summary KPIs */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
        <GlassCard variant="strong" className="p-4">
          <p className="text-[11px] font-bold uppercase text-[#777078]">Daily / Weekly / Monthly</p>
          <p className="mt-1 font-display text-xl font-extrabold text-[#C9182B]">
            {stats.dailyCount} / {stats.weeklyCount} / {stats.monthlyCount}
          </p>
          <p className="text-[11px] text-[#777078]">Trips recorded</p>
        </GlassCard>

        <GlassCard variant="strong" className="p-4">
          <p className="text-[11px] font-bold uppercase text-[#777078]">Total Distance</p>
          <p className="mt-1 font-display text-2xl font-extrabold text-[#C9182B]">
            {stats.totalDistanceKm} km
          </p>
        </GlassCard>

        <GlassCard variant="strong" className="p-4">
          <p className="text-[11px] font-bold uppercase text-[#777078]">
            Recorded Expenses
          </p>
          <p className="mt-1 font-display text-2xl font-extrabold text-[#C9182B]">
            {formatPhp(stats.recordedExpensePhp)}
          </p>
          <p className="text-[11px] text-[#777078]">Official / exact paid</p>
        </GlassCard>

        <GlassCard variant="strong" className="p-4">
          <p className="text-[11px] font-bold uppercase text-[#777078]">
            Estimated Expenses
          </p>
          <p className="mt-1 font-display text-2xl font-extrabold text-[#B51224]">
            {formatPhp(stats.estimatedExpensePhp)}
          </p>
          <p className="text-[11px] text-[#777078]">Community reference only</p>
        </GlassCard>

        <GlassCard variant="strong" className="p-4">
          <p className="text-[11px] font-bold uppercase text-[#777078]">Top Destination</p>
          <p className="mt-1 font-display text-lg font-extrabold text-[#29262B]">
            {stats.topDestinations[0]?.[0] ?? 'None yet'}
          </p>
        </GlassCard>
      </div>

      {/* Mode Breakdown Chart + Frequent Locations */}
      <div className="grid gap-6 lg:grid-cols-12">
        <GlassCard variant="strong" className="p-5 lg:col-span-7 space-y-3">
          <h2 className="flex items-center gap-2 font-display text-lg font-bold text-[#29262B]">
            <BarChart3 className="h-4 w-4 text-[#C9182B]" />
            Frequently Used Transport Modes
          </h2>
          {stats.modeChart.length === 0 ? (
            <p className="text-xs text-[#777078]">Complete a trip to visualize mode breakdown.</p>
          ) : (
            <div className="h-56 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={stats.modeChart}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(120,113,108,0.16)" />
                  <XAxis dataKey="name" tick={{ fill: '#29262B', fontSize: 11 }} />
                  <YAxis allowDecimals={false} tick={{ fill: '#29262B', fontSize: 11 }} />
                  <Tooltip contentStyle={LIGHT_RED_THEME.charts.tooltipStyle} />
                  <Bar dataKey="trips" fill="#C9182B" radius={[12, 12, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
        </GlassCard>

        <GlassCard variant="strong" className="p-5 lg:col-span-5 space-y-3">
          <h2 className="font-display text-lg font-bold text-[#29262B]">
            Frequently Visited Destinations
          </h2>
          {stats.topDestinations.length === 0 ? (
            <p className="text-xs text-[#777078]">No destination history yet.</p>
          ) : (
            <div className="space-y-2">
              {stats.topDestinations.map(([name, count]) => (
                <div
                  key={name}
                  className="glass-pill-tile flex items-center justify-between rounded-full px-4 py-2.5 text-xs font-bold"
                >
                  <span className="text-[#29262B]">{name}</span>
                  <span className="rounded-full bg-[#F8E7EA] px-2.5 py-0.5 text-[#C9182B]">
                    {count} trip(s)
                  </span>
                </div>
              ))}
            </div>
          )}
        </GlassCard>
      </div>

      {/* Trip History List */}
      <div className="space-y-3">
        <h2 className="font-display text-lg font-bold text-[#29262B] px-1">
          Trip History ({trips?.length ?? 0})
        </h2>
        {isLoading ? (
          <GlassSkeleton className="h-44" />
        ) : !trips || trips.length === 0 ? (
          <EmptyStateCard
            icon={Clock}
            title="No trips recorded yet"
            description="Start a live trip from the Live Trip Monitor to record travel distance, time, and fare expenses."
            action={
              <Link to="/trips">
                <GlassButton variant="primary">Open Live Trip Monitor</GlassButton>
              </Link>
            }
          />
        ) : (
          <div className="space-y-3">
            {trips.map((t) => (
              <GlassCard key={t.id} variant="strong" className="p-4 flex flex-wrap items-center justify-between gap-3 text-xs">
                <div className="space-y-1">
                  <p className="font-display text-base font-bold text-[#29262B]">
                    {t.origin?.name ?? 'Origin'} → {t.destination?.name ?? 'Destination'}
                  </p>
                  <p className="text-[#777078]">
                    {t.transport_type?.name ?? 'Transit'} • {formatDateTimeSafe(t.started_at)} •{' '}
                    {t.distance_km} km • {formatDurationSeconds(t.duration_seconds)}
                  </p>
                </div>
                <div className="text-right space-y-1">
                  <span className="inline-block rounded-full bg-[#F8E7EA] px-2.5 py-0.5 font-bold uppercase text-[#C9182B]">
                    {t.status}
                  </span>
                  {t.recorded_fare_amount !== null && (
                    <p className="font-bold text-[#29262B]">
                      {formatPhp(t.recorded_fare_amount)}{' '}
                      <span className="text-[10px] uppercase text-[#B51224]">
                        ({t.fare_expense_type})
                      </span>
                    </p>
                  )}
                </div>
              </GlassCard>
            ))}
          </div>
        )}
      </div>

      <ConfirmDialog
        open={confirmClearOpen}
        onOpenChange={setConfirmClearOpen}
        title="Delete All Personal Location & Trip History?"
        description="This permanently deletes your GPS location points, location sessions, location sharing links, and trip history from Supabase. This action cannot be undone."
        confirmLabel="Delete My Location History"
        destructive
        loading={deleteHistoryMutation.isPending}
        onConfirm={() => deleteHistoryMutation.mutate()}
      />
    </div>
  );
}
