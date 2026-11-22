import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import {
  Activity,
  CheckCircle2,
  FileCheck2,
  MapPin,
  MessageSquarePlus,
  Route as RouteIcon,
  ShieldCheck,
  Users,
} from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import {
  useAdminAggregatedAnalytics,
  useAdminFareReports,
  useFareRecords,
  useMunicipalities,
  useRoutes,
} from '@/hooks/useReferenceData';
import { partitionFareRecords } from '@/lib/fareIntegrity';
import { LIGHT_RED_THEME } from '@/lib/theme';
import { formatDateTimeSafe } from '@/lib/utils';
import { fetchAuditLogs, fetchUsersWithRoles } from '@/services/pamasaheApi';
import {
  GlassButton,
  GlassCard,
  GlassSkeleton,
} from '@/components/glass/GlassPrimitives';

export function AdminDashboardPage() {
  const { isConfigured, isAdmin } = useAuth();
  const { data: muniRes } = useMunicipalities(true);
  const { data: fares } = useFareRecords(true);
  const { data: routes } = useRoutes(true);
  const { data: reports } = useAdminFareReports();
  const { data: tripAnalytics } = useAdminAggregatedAnalytics();

  const { data: users, isLoading: usersLoading } = useQuery({
    queryKey: ['adminUsers'],
    queryFn: fetchUsersWithRoles,
    enabled: Boolean(isConfigured && isAdmin),
  });

  const { data: auditLogs } = useQuery({
    queryKey: ['auditLogs'],
    queryFn: fetchAuditLogs,
    enabled: Boolean(isConfigured && isAdmin),
  });

  const { officialFares, communityEstimates } = partitionFareRecords(fares ?? []);
  const pendingReports = (reports ?? []).filter(
    (r) => r.status === 'pending' || r.status === 'under_review'
  );
  const rejectedReports = (reports ?? []).filter(
    (r) => r.status === 'rejected' || r.status === 'disputed'
  );

  const chartData = [
    { name: 'Verified Official', count: officialFares.length },
    { name: 'Community Est.', count: communityEstimates.length },
    { name: 'Pending Reports', count: pendingReports.length },
    { name: 'Rejected/Disputed', count: rejectedReports.length },
  ];

  const stats = [
    {
      label: 'Registered Users',
      value: usersLoading ? '...' : (users?.length ?? 0),
      icon: Users,
      to: '/admin/users',
    },
    {
      label: 'LGUs Covered',
      value: muniRes?.data.length ?? 15,
      icon: MapPin,
      to: '/admin/municipalities',
    },
    {
      label: 'Route Records',
      value: routes?.length ?? 0,
      icon: RouteIcon,
      to: '/admin/routes',
    },
    {
      label: 'Verified Official Fares',
      value: officialFares.length,
      icon: CheckCircle2,
      to: '/admin/fares',
    },
    {
      label: 'Community Estimates',
      value: communityEstimates.length,
      icon: Activity,
      to: '/admin/fares',
    },
    {
      label: 'Pending Reports',
      value: pendingReports.length,
      icon: MessageSquarePlus,
      to: '/admin/verification',
    },
    {
      label: 'Active Trips (Agg.)',
      value: tripAnalytics?.active_trips ?? 0,
      icon: Activity,
      to: '/admin/trip-analytics',
    },
    {
      label: 'Open Safety Reports',
      value: tripAnalytics?.open_safety_reports ?? 0,
      icon: ShieldCheck,
      to: '/admin/safety-reports',
    },
  ];

  return (
    <div className="space-y-6">
      <GlassCard variant="rose" className="p-4 sm:p-6 flex flex-col sm:flex-row sm:flex-wrap sm:items-center sm:justify-between gap-4">
        <div className="min-w-0 space-y-1">
          <p className="text-[11px] sm:text-xs font-bold uppercase tracking-widest text-[#C9182B]">
            Protected Administrator Portal
          </p>
          <h1 className="font-display text-xl sm:text-3xl font-extrabold text-[#29262B]">
            Pamasahe Tracker Operations Center
          </h1>
          <p className="text-xs text-[#343039] sm:text-sm font-medium">
            Verify official LTFRB &amp; LGU tariffs, audit community reports, and manage all 15
            Oriental Mindoro transport corridors.
          </p>
        </div>

        <div className="flex flex-wrap gap-2 w-full sm:w-auto">
          <Link to="/admin/verification" className="w-full sm:w-auto">
            <GlassButton variant="primary" size="sm" className="w-full sm:w-auto">
              <FileCheck2 className="h-4 w-4" />
              Open Verification Queue ({pendingReports.length})
            </GlassButton>
          </Link>
          <Link to="/admin/fares" className="w-full sm:w-auto">
            <GlassButton variant="secondary" size="sm" className="w-full sm:w-auto">
              Publish Official Fare
            </GlassButton>
          </Link>
        </div>
      </GlassCard>

      {/* KPI Cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {stats.map((s) => (
          <Link key={s.label} to={s.to}>
            <GlassCard variant="strong" hoverable className="p-4 flex items-center justify-between rounded-[24px]">
              <div>
                <p className="text-[11px] font-bold uppercase tracking-wider text-[#777078]">
                  {s.label}
                </p>
                <p className="mt-1 font-display text-2xl font-extrabold text-[#C9182B] tabular-nums">
                  {s.value}
                </p>
              </div>
              <div className="glass-pill-tile rounded-2xl p-2.5 text-[#C9182B]">
                <s.icon className="h-5 w-5" />
              </div>
            </GlassCard>
          </Link>
        ))}
      </div>

      {/* Analytics + Recent Activity */}
      <div className="grid gap-6 lg:grid-cols-12">
        <GlassCard variant="strong" className="p-5 lg:col-span-6 space-y-4">
          <h2 className="font-display text-lg font-bold text-[#29262B]">
            Fare Verification Distribution
          </h2>
          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(120,113,108,0.16)" />
                <XAxis dataKey="name" tick={{ fill: '#29262B', fontSize: 11 }} />
                <YAxis allowDecimals={false} tick={{ fill: '#29262B', fontSize: 11 }} />
                <Tooltip contentStyle={LIGHT_RED_THEME.charts.tooltipStyle} />
                <Bar dataKey="count" fill="#C9182B" radius={[12, 12, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </GlassCard>

        <GlassCard variant="strong" className="p-5 lg:col-span-6 space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="font-display text-lg font-bold text-[#29262B]">
              Recent Administrative Activities
            </h2>
            <Link to="/admin/audit-logs" className="text-xs font-bold text-[#C9182B] hover:underline">
              Full Audit Logs →
            </Link>
          </div>
          {!auditLogs ? (
            <GlassSkeleton className="h-44" />
          ) : auditLogs.length === 0 ? (
            <p className="text-xs text-[#777078]">
              No administrative audit events logged yet. Every verification, official fare update,
              and role change is automatically recorded here.
            </p>
          ) : (
            <div className="space-y-2 max-h-64 overflow-y-auto pr-1">
              {auditLogs.slice(0, 8).map((log) => (
                <div
                  key={log.id}
                  className="glass-pill-tile rounded-[20px] p-3 text-xs"
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-bold text-[#C9182B]">
                      {log.action.replace(/_/g, ' ')}
                    </span>
                    <span className="text-[11px] text-[#777078]">
                      {formatDateTimeSafe(log.created_at)}
                    </span>
                  </div>
                  <p className="text-[#777078]">
                    Entity: {log.entity_type} ({log.entity_id ?? 'N/A'})
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
